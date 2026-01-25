"use client";

/**
 * Gemini Live API Client with Manual VAD Support
 * 
 * Connects to the Gemini Live API with:
 * - Manual VAD control (activityStart/activityEnd)
 * - 20ms frame ingestion
 * - Session rolling support for long interviews
 */

import { GoogleGenAI, Modality } from "@google/genai";

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const SESSION_MAX_MS = 12 * 60 * 1000; // 12 minutes before rolling

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
    onGenerationComplete?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    onSessionRolling?: () => void;
}

export class GeminiLiveClient {
    private ai: GoogleGenAI;
    private session: any = null;
    private config: GeminiLiveConfig;
    private isReady = false;
    private responseQueue: any[] = [];
    private isLoopRunning = false;
    private sessionStartTime: number = 0;
    private isActivityActive = false;

    constructor(config: GeminiLiveConfig) {
        this.config = config;
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async connect(): Promise<void> {
        console.log("[GeminiLive] Connecting with manual VAD...");

        try {
            this.session = await this.ai.live.connect({
                model: MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    // Enable transcriptions
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    // Enable sliding window context compression for long interviews
                    contextWindowCompression: { slidingWindow: {} },
                    // Disable automatic VAD - we control turn-taking manually
                    realtimeInputConfig: {
                        automaticActivityDetection: {
                            disabled: true
                        }
                    },
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
                        console.log("[GeminiLive] ✓ Connected with manual VAD enabled");
                        this.isReady = true;
                        this.sessionStartTime = Date.now();
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
                console.log("[GeminiLive] Content interrupted - user barged in");
                this.config.onInterrupted?.();
            }

            // Handle Output Audio / Parts
            const parts = sc?.modelTurn?.parts || [];
            for (const part of parts) {
                if (part.inlineData?.data) {
                    const base64Data = part.inlineData.data;
                    this.config.onAudio?.(base64Data);

                    if (this.config.onVolume) {
                        this.calculateVolume(base64Data);
                    }
                }
                if (part.text) {
                    this.config.onText?.(part.text);
                }
            }

            // Handle Input Transcription (User speaking)
            if (sc?.inputTranscription?.text) {
                this.config.onUserText?.(sc.inputTranscription.text);
            }

            // Handle Output Transcription (AI speaking)
            if (sc?.outputTranscription?.text) {
                this.config.onText?.(sc.outputTranscription.text);
            }

            // Handle Turn Complete
            if (sc?.turnComplete) {
                this.config.onTurnComplete?.();
            }

            // Handle Generation Complete (CheatingDaddy-style - useful for turn lifecycle)
            if (sc?.generationComplete) {
                console.log("[GeminiLive] Generation complete");
                this.config.onGenerationComplete?.();
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

    // ========== Manual VAD Control ==========

    /**
     * Signal that user started speaking.
     * Call this when your client-side VAD detects speech start.
     */
    sendActivityStart(): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send activityStart - not connected");
            return;
        }

        if (this.isActivityActive) {
            // Already in an active turn, skip
            return;
        }

        console.log("[GeminiLive] → activityStart");
        this.isActivityActive = true;
        this.session.sendRealtimeInput({ activityStart: {} });
    }

    /**
     * Signal that user stopped speaking.
     * Call this when your client-side VAD detects end of speech.
     */
    sendActivityEnd(): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send activityEnd - not connected");
            return;
        }

        if (!this.isActivityActive) {
            // Not in an active turn, skip
            return;
        }

        console.log("[GeminiLive] → activityEnd");
        this.isActivityActive = false;
        this.session.sendRealtimeInput({ activityEnd: {} });
    }

    /**
     * Send a 20ms audio frame (640 bytes PCM16 @ 16kHz).
     * Only call this while activity is active (between activityStart and activityEnd).
     */
    sendAudioFrame(base64Audio: string): void {
        if (!this.session || !this.isReady) {
            return;
        }

        // Check for session roll
        if (this.shouldRollSession()) {
            this.config.onSessionRolling?.();
            // In a full implementation, you would reconnect and rehydrate here
            // For now, just log a warning
            console.warn("[GeminiLive] ⚠️ Session approaching 12 min limit - consider rolling");
        }

        this.session.sendRealtimeInput({
            audio: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000"
            }
        });
    }

    /**
     * Legacy method for compatibility - sends audio without frame splitting.
     * Prefer sendAudioFrame for proper 20ms chunks.
     */
    sendAudio(base64Audio: string): void {
        this.sendAudioFrame(base64Audio);
    }

    private shouldRollSession(): boolean {
        const elapsed = Date.now() - this.sessionStartTime;
        return elapsed >= SESSION_MAX_MS;
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
        this.isActivityActive = false;
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

    get activityActive(): boolean {
        return this.isActivityActive;
    }

    get sessionAgeMs(): number {
        return Date.now() - this.sessionStartTime;
    }

    // ========== Production Interview Features ==========

    private turnCount: number = 0;
    private lastRehydrationContext: string = "";

    /**
     * Send a committed user turn with turnComplete: true
     * This is the KEY method for reliable turn-taking in long interviews.
     * Use this after Turn Manager commits, not raw audio streaming.
     */
    sendCommittedTurn(text: string): void {
        if (!this.session || !this.isReady) {
            console.warn("[GeminiLive] Cannot send committed turn - not connected");
            return;
        }

        console.log(`[GeminiLive] → Committed turn (${text.length} chars)`);
        this.turnCount++;

        // End any active audio activity first
        if (this.isActivityActive) {
            this.sendActivityEnd();
        }

        this.session.sendClientContent({
            turns: [{
                role: "user",
                parts: [{ text }]
            }],
            turnComplete: true
        });
    }

    /**
     * Send committed user answer with follow-up instruction for the model.
     * This ensures the model responds with the next question.
     */
    sendCommittedTextTurn(userAnswer: string, followUpInstruction?: string): void {
        const defaultInstruction = "Now ask the next follow-up question (one question only).";
        const finalMessage = `My answer:\n${userAnswer}\n\n${followUpInstruction || defaultInstruction}`;
        this.sendCommittedTurn(finalMessage);
    }

    /**
     * Send kickoff message to start the interview
     * This guarantees Tess greets and asks the first question
     */
    sendKickoff(candidateName: string, role: string, experienceYears: number): void {
        const kickoffPrompt = `[SYSTEM] Start the interview now.

Step 1: Greet ${candidateName} professionally in one sentence.
Step 2: Ask your first technical question based on the resume.

Context:
- Role: ${role}
- Experience: ${experienceYears} years

Keep it brief and professional. Ask ONE specific question.`;

        console.log("[GeminiLive] Sending interview kickoff...");
        this.sendCommittedTurn(kickoffPrompt);
    }

    /**
     * Reconnect and rehydrate context for session resumption
     */
    async reconnectWithContext(rehydrationContext: string): Promise<void> {
        this.lastRehydrationContext = rehydrationContext;

        try {
            // Disconnect current session
            this.disconnect();

            // Wait a moment
            await new Promise(r => setTimeout(r, 500));

            // Reconnect
            await this.connect();

            // Send rehydration context
            if (rehydrationContext) {
                console.log("[GeminiLive] Rehydrating session context...");
                this.sendCommittedTurn(rehydrationContext);
            }
        } catch (error) {
            console.error("[GeminiLive] Reconnection failed:", error);
            throw error;
        }
    }

    /**
     * Get the current turn count
     */
    getTurnCount(): number {
        return this.turnCount;
    }

    /**
     * Check if it's time to generate a rolling summary (every 5 turns)
     */
    shouldGenerateSummary(): boolean {
        return this.turnCount > 0 && this.turnCount % 5 === 0;
    }

    /**
     * Reset turn count (for new interview)
     */
    resetTurnCount(): void {
        this.turnCount = 0;
    }
}
