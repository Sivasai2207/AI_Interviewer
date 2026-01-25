export class AudioRecorder {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private onDataAvailable: (data: string) => void;
    private onVolume?: (volume: number) => void;
    private isRecording = false;

    constructor(onDataAvailable: (data: string) => void, onVolume?: (volume: number) => void) {
        this.onDataAvailable = onDataAvailable;
        this.onVolume = onVolume;
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

            // Handle potential sample rate mismatch
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create a dedicated offline context at 16k if needed or use main context and resample
            // The simplest reliable way for real-time is to use the context rate and downsample manually

            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Set buffer size to handle system sample rates
            // 2048 samples at 48k is ~42ms. at 44.1k is ~46ms (Reduced from 4096 to improve latency)
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isRecording) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate Volume (RMS)
                if (this.onVolume) {
                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) {
                        sum += inputData[i] * inputData[i];
                    }
                    const rms = Math.sqrt(sum / inputData.length);
                    // Normalize broadly 0-100
                    const vol = Math.min(100, Math.round(rms * 1000));
                    this.onVolume(vol);
                }

                const sourceRate = e.inputBuffer.sampleRate;

                // Downsample to 16kHz
                const targetRate = 16000;
                const downsampledData = this.downsampleBuffer(inputData, sourceRate, targetRate);

                // Convert to PCM 16-bit
                const pcm16 = this.floatTo16BitPCM(downsampledData);
                const base64 = this.arrayBufferToBase64(pcm16);

                this.onDataAvailable(base64);
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isRecording = true;

        } catch (err) {
            console.error("Error starting audio recorder:", err);
            throw err;
        }
    }

    stop() {
        if (!this.isRecording) return;
        this.isRecording = false;

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

            // Linear interpolation
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
}
