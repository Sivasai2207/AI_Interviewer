export class AudioPlayer {
    private audioContext: AudioContext | null = null;
    private nextStartTime = 0;
    private isPlaying = false;
    private activeSources: AudioBufferSourceNode[] = [];
    private playbackRate = 24000;

    constructor(sampleRate = 24000) {
        this.playbackRate = sampleRate;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    playChunk(base64Data: string) {
        if (!base64Data) return;

        try {
            const binary = window.atob(base64Data);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // PCM 16-bit Int (Little Endian)
            const view = new DataView(bytes.buffer);
            const pcmData = new Float32Array(len / 2);
            for (let i = 0; i < len / 2; i++) {
                // Convert int16 to float32 (-1 to 1)
                const int16 = view.getInt16(i * 2, true);
                pcmData[i] = int16 / 32768.0;
            }

            this.scheduleBuffer(pcmData);
        } catch (e) {
            console.error("Error playing chunk:", e);
        }
    }

    private scheduleBuffer(pcmData: Float32Array) {
        if (!this.audioContext) return;

        const buffer = this.audioContext.createBuffer(1, pcmData.length, this.playbackRate);
        buffer.getChannelData(0).set(pcmData);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Schedule playback
        const currentTime = this.audioContext.currentTime;
        // Ensure play time is in the future
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime;
        }

        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        // Track source
        this.activeSources.push(source);
        source.onended = () => {
            this.activeSources = this.activeSources.filter(s => s !== source);
        };
    }

    clear() {
        // Stop all currently playing sources
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        this.activeSources = [];
        this.nextStartTime = 0;

        // Reset context time reference if possible (not possible directly, but nextStartTime reset helps)
        if (this.audioContext) {
            this.nextStartTime = this.audioContext.currentTime;
        }
    }

    stop() {
        this.clear();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
