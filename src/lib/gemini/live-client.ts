"use client";

/**
 * Gemini Live API Client
 * 
 * This client connects directly to the Gemini Live API from the browser
 * using the official @google/genai SDK.
 */

import { GoogleGenAI, Modality } from "@google/genai";

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export interface GeminiLiveConfig {
    apiKey: string;
    systemInstruction: string;
    voiceName?: string;
    onReady?: () => void;
    onInterrupted?: () => void;
    onAudio?: (audioData: string) => void;
    onVolume?: (volume: number) => void;
    onText?: (text: string) => void;
    onUserText?: (text: string) => void;
    onTurnComplete?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

export class GeminiLiveClient {
    private ai: GoogleGenAI;
    private session: any = null;
    private config: GeminiLiveConfig;
    private isReady = false;
    private responseQueue: any[] = [];
    private isLoopRunning = false;

    constructor(config: GeminiLiveConfig) {
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async connect(): Promise<void> {
        console.log("[GeminiLive] Connecting via SDK...");

        try {
            this.session = await this.ai.live.connect({
                model: MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    // Enable transcriptions for both input and output
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2000,
                        candidateCount: 1,
                    },
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: this.config.voiceName || "Kore"
                            }
                        }
                    },
                    systemInstruction: {
                        parts: [{ text: this.config.systemInstruction }]
                    }
                },
                callbacks: {
                    onopen: () => {
                        console.log("[GeminiLive] ✓ Connected to Gemini Live API");
                        this.isReady = true;

                        // Start the message processing loop
                        this.startMessageLoop();

                        this.config.onReady?.();
                    },
                    onmessage: (message: any) => {
                        this.responseQueue.push(message);
                    },
                    onerror: (e: any) => {
                        console.error("[GeminiLive] Error:", e?.message || e);
                        this.config.onError?.(new Error(e?.message || "Unknown error"));
                    },
                    onclose: (e: any) => {
                        console.log("[GeminiLive] Connection closed:", e?.reason || "Unknown reason");
                        this.isReady = false;
                        this.isLoopRunning = false;
                        this.config.onClose?.();
                    },
                },
            });

            console.log("[GeminiLive] Session created successfully");
        } catch (error: any) {
            console.error("[GeminiLive] Connection failed:", error);
            throw error;
        }
    }

    private async startMessageLoop(): Promise<void> {
        if (this.isLoopRunning) return;
        this.isLoopRunning = true;

        console.log("[GeminiLive] Starting async message loop");

        try {
            while (this.isLoopRunning) {
                const msg = this.responseQueue.shift();
                if (!msg) {
                    await new Promise((r) => setTimeout(r, 5));
                    continue;
                }

                this.processMessage(msg);
            }
        } catch (error) {
            console.error("[GeminiLive] Error in message loop:", error);
            this.isLoopRunning = false;
        }
    }

    private processMessage(message: any): void {
        try {
            const sc = message.serverContent;

            // Handle Interruption
            if (sc?.interrupted) {
                console.log("[GeminiLive] Content interrupted");
                this.config.onInterrupted?.();
            }

            // Handle Output Audio / Parts
            const parts = sc?.modelTurn?.parts || [];
            for (const part of parts) {
                if (part.inlineData?.data) {
                    const base64Data = part.inlineData.data;
                    this.config.onAudio?.(base64Data);

                    // Calculate volume for visualization
                    if (this.config.onVolume) {
                        this.calculateVolume(base64Data);
                    }
                }
                // Handle direct text if present (rare in audio mode but possible)
                if (part.text) {
                    this.config.onText?.(part.text);
                }
            }

            // Handle Input Transcription (User speaking)
            if (sc?.inputTranscription?.text) {
                this.config.onUserText?.(sc.inputTranscription.text);
            }

            // Handle Output Transcription (AI speaking/typing)
            if (sc?.outputTranscription?.text) {
                this.config.onText?.(sc.outputTranscription.text);
            }

            // Handle Turn Complete
            if (sc?.turnComplete) {
                this.config.onTurnComplete?.();
            }
        } catch (e) {
            console.error("[GeminiLive] Message processing error:", e);
        }
    }

    private calculateVolume(base64Data: string): void {
        try {
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const pcmData = new Int16Array(bytes.buffer);

            let sum = 0;
            for (let i = 0; i < pcmData.length; i++) {
                sum += pcmData[i] * pcmData[i];
            }
            const rms = Math.sqrt(sum / pcmData.length);
            const vol = Math.min(100, Math.round((rms / 20000) * 100));

            this.config.onVolume?.(vol);
        } catch (e) {
            console.error("[GeminiLive] Error calculating volume:", e);
        }
    }

    sendAudio(base64Audio: string): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send audio - not connected");
            return;
        }

        this.session.sendRealtimeInput({
            audio: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000"
            }
        });
    }

    sendText(text: string): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send text - not connected");
            return;
        }

        this.session.sendClientContent({
            turns: [{
                role: "user",
                parts: [{ text }]
            }],
            turnComplete: true
        });
    }

    sendIntroKick(introDirective: string): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send intro kick - not connected");
            return;
        }

        console.log("[GeminiLive] Sending intro kick to trigger Tess introduction...");

        this.session.sendClientContent({
            turns: [{
                role: "user",
                parts: [{ text: introDirective }]
            }],
            turnComplete: true
        });
    }

    disconnect(): void {
        this.isLoopRunning = false;
        if (this.session) {
            try {
                this.session.close();
            } catch { }
            this.session = null;
        }
        this.isReady = false;
    }

    get connected(): boolean {
        return this.isReady && this.session !== null;
    }
}
