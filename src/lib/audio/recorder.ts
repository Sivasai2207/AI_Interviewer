/**
 * AudioRecorder with 20ms Frame Splitting and VAD
 * 
 * Emits exactly 640-byte (20ms @ 16kHz PCM16) frames for optimal
 * Gemini Live transcription and turn detection.
 * 
 * Interview-optimized thresholds for pause-tolerant turn detection.
 */

// VAD Configuration
interface VadConfig {
    speechOnThreshold: number;  // RMS threshold to detect speech start
    speechOffThreshold: number; // RMS threshold to detect speech end (hysteresis)
    endSilenceMs: number;       // Silence duration to consider end of turn (for simple VAD)
    minSpeechMs: number;        // Minimum speech duration before end detection
}

// Interview-optimized defaults (adjusted for natural pauses)
const DEFAULT_VAD_CONFIG: VadConfig = {
    speechOnThreshold: 0.015,   // Slightly lower to catch softer speech
    speechOffThreshold: 0.010,  // Lower threshold for hysteresis
    endSilenceMs: 2500,         // 2.5s pause tolerance (Turn Manager will use this)
    minSpeechMs: 200,           // 200ms confirms real speech
};

// 20ms frame at 16kHz PCM16 = 640 bytes
const FRAME_MS = 20;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2; // 16-bit
const BYTES_PER_FRAME = Math.round(SAMPLE_RATE * (FRAME_MS / 1000) * BYTES_PER_SAMPLE); // 640

export class AudioRecorder {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private onDataAvailable: (data: string) => void;
    private onVolume?: (volume: number) => void;
    private onVadStart?: () => void;
    private onVadEnd?: () => void;
    private onSpeechFrame?: (isSpeaking: boolean, rms: number) => void; // For Turn Manager
    private isRecording = false;

    // VAD State
    private vadConfig: VadConfig;
    private inSpeech = false;
    private speechMs = 0;
    private silenceMs = 0;

    // Frame buffer for splitting into exact 20ms chunks
    private frameBuffer: Uint8Array = new Uint8Array(0);

    constructor(
        onDataAvailable: (data: string) => void,
        onVolume?: (volume: number) => void,
        onVadStart?: () => void,
        onVadEnd?: () => void,
        vadConfig?: Partial<VadConfig>,
        onSpeechFrame?: (isSpeaking: boolean, rms: number) => void
    ) {
        this.onDataAvailable = onDataAvailable;
        this.onVolume = onVolume;
        this.onVadStart = onVadStart;
        this.onVadEnd = onVadEnd;
        this.onSpeechFrame = onSpeechFrame;
        this.vadConfig = { ...DEFAULT_VAD_CONFIG, ...vadConfig };
    }

    async start() {
        if (this.isRecording) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Use 2048 buffer for ~42ms at 48kHz
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isRecording) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const sourceRate = e.inputBuffer.sampleRate;

                // Downsample to 16kHz
                const downsampledData = this.downsampleBuffer(inputData, sourceRate, SAMPLE_RATE);

                // Convert to PCM 16-bit
                const pcm16 = this.floatTo16BitPCM(downsampledData);
                const pcmBytes = new Uint8Array(pcm16);

                // Buffer and split into 20ms frames
                this.processFrames(pcmBytes);
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isRecording = true;
            console.log("[AudioRecorder] Started with 20ms frame splitting and VAD");

        } catch (err) {
            console.error("[AudioRecorder] Error starting:", err);
            throw err;
        }
    }

    private processFrames(incoming: Uint8Array): void {
        // Concatenate with existing buffer
        const combined = new Uint8Array(this.frameBuffer.length + incoming.length);
        combined.set(this.frameBuffer, 0);
        combined.set(incoming, this.frameBuffer.length);

        let offset = 0;

        // Extract and process 20ms frames
        while (offset + BYTES_PER_FRAME <= combined.length) {
            const frame = combined.slice(offset, offset + BYTES_PER_FRAME);
            offset += BYTES_PER_FRAME;

            // Calculate RMS for VAD and volume
            const rms = this.calculateRms(frame);

            // Update volume callback
            if (this.onVolume) {
                const vol = Math.min(100, Math.round(rms * 1000));
                this.onVolume(vol);
            }

            // Process VAD
            const vadEvent = this.updateVad(rms);

            if (vadEvent === "speech_start" && this.onVadStart) {
                console.log("[AudioRecorder] VAD: Speech started");
                this.onVadStart();
            }
            if (vadEvent === "speech_end" && this.onVadEnd) {
                console.log("[AudioRecorder] VAD: Speech ended (silence:", this.vadConfig.endSilenceMs, "ms)");
                this.onVadEnd();
            }

            // Emit speech frame data for Turn Manager (pause-tolerant detection)
            if (this.onSpeechFrame) {
                const isSpeaking = vadEvent === "speech_start" || vadEvent === "speech";
                this.onSpeechFrame(isSpeaking, rms);
            }

            // Emit frame as base64
            const base64Frame = this.arrayBufferToBase64(frame.buffer);
            this.onDataAvailable(base64Frame);
        }

        // Store remaining bytes for next iteration
        this.frameBuffer = combined.slice(offset);
    }

    private calculateRms(pcmBytes: Uint8Array): number {
        const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
        const numSamples = pcmBytes.length / 2;
        let sum = 0;

        for (let i = 0; i < numSamples; i++) {
            const sample = view.getInt16(i * 2, true) / 32768;
            sum += sample * sample;
        }

        return Math.sqrt(sum / Math.max(1, numSamples));
    }

    private updateVad(rms: number): "speech_start" | "speech_end" | "speech" | "speech_silence" | "silence" {
        const { speechOnThreshold, speechOffThreshold, endSilenceMs, minSpeechMs } = this.vadConfig;

        if (!this.inSpeech) {
            if (rms >= speechOnThreshold) {
                this.inSpeech = true;
                this.speechMs = FRAME_MS;
                this.silenceMs = 0;
                return "speech_start";
            }
            return "silence";
        } else {
            if (rms >= speechOffThreshold) {
                this.speechMs += FRAME_MS;
                this.silenceMs = 0;
                return "speech";
            }

            this.silenceMs += FRAME_MS;

            if (this.speechMs >= minSpeechMs && this.silenceMs >= endSilenceMs) {
                this.inSpeech = false;
                this.speechMs = 0;
                this.silenceMs = 0;
                return "speech_end";
            }

            return "speech_silence";
        }
    }

    stop() {
        if (!this.isRecording) return;
        this.isRecording = false;

        // Reset VAD state
        this.inSpeech = false;
        this.speechMs = 0;
        this.silenceMs = 0;
        this.frameBuffer = new Uint8Array(0);

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        console.log("[AudioRecorder] Stopped");
    }

    private downsampleBuffer(buffer: Float32Array, sampleRate: number, targetRate: number): Float32Array {
        if (targetRate === sampleRate) {
            return buffer;
        }

        const sampleRateRatio = sampleRate / targetRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }

            result[offsetResult] = count > 0 ? accum / count : 0;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }

        return result;
    }

    private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output.buffer;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    // Getters for external state checking
    get isSpeaking(): boolean {
        return this.inSpeech;
    }
}
