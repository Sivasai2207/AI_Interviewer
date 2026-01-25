/**
 * Interview Turn Controller - Half-Duplex State Machine (CheatingDaddy-style)
 * 
 * States:
 * - KICKOFF: Initial state, waiting for first model greeting
 * - MODEL_SPEAKING: Tess is talking, mic audio blocked
 * - LISTENING: User is talking, mic audio allowed  
 * - COMMITTING: User stopped, finalizing transcript, sending text turn
 * 
 * Key Rules:
 * 1. Mic audio only streams during LISTENING state
 * 2. On turnComplete → transition to LISTENING
 * 3. On speech_end (VAD) → commit answer → MODEL_SPEAKING
 * 4. On generationComplete → reset buffers for clean next turn
 */

import type { GeminiLiveClient } from "@/lib/gemini/live-client";

export type InterviewState = "KICKOFF" | "MODEL_SPEAKING" | "LISTENING" | "COMMITTING";

export interface InterviewTurnControllerConfig {
    onStateChange?: (state: InterviewState, prevState: InterviewState) => void;
    onUserFinalText?: (cleanText: string) => void;
    onReadyToListen?: () => void;
}

export class InterviewTurnController {
    private state: InterviewState = "KICKOFF";
    private geminiClient: GeminiLiveClient | null = null;
    private awaitingUserAnswer: boolean = false;
    private config: InterviewTurnControllerConfig;
    private turnCount: number = 0;
    private lastCommitTime: number = 0;
    private minCommitIntervalMs: number = 2000; // Prevent rapid commits

    constructor(config?: InterviewTurnControllerConfig) {
        this.config = config || {};
    }

    /**
     * Bind the Gemini client reference
     */
    setGeminiClient(client: GeminiLiveClient | null): void {
        this.geminiClient = client;
    }

    /**
     * Get current state
     */
    getState(): InterviewState {
        return this.state;
    }

    /**
     * Get turn count
     */
    getTurnCount(): number {
        return this.turnCount;
    }

    /**
     * Check if mic should forward audio frames
     * Only true when in LISTENING state
     */
    shouldForwardMic(): boolean {
        return this.state === "LISTENING";
    }

    /**
     * Check if currently listening for user answer
     */
    isListening(): boolean {
        return this.state === "LISTENING" && this.awaitingUserAnswer;
    }

    /**
     * Called when kickoff completes and model starts speaking
     */
    onKickoffSent(): void {
        console.log("[TurnController] Kickoff sent → MODEL_SPEAKING");
        this.transition("MODEL_SPEAKING");
    }

    /**
     * Called when Gemini finishes speaking (turn complete)
     * Transitions to LISTENING state after cooldown
     */
    onModelTurnComplete(): void {
        console.log("[TurnController] Model turn complete → LISTENING");
        this.awaitingUserAnswer = true;
        this.transition("LISTENING");
        this.config.onReadyToListen?.();
    }

    /**
     * Called when audio starts playing (model is speaking)
     * Ensures we're in MODEL_SPEAKING state
     */
    onAudioReceived(): void {
        // Only transition if we're in KICKOFF (first audio) or not already speaking
        if (this.state === "KICKOFF") {
            console.log("[TurnController] First audio → MODEL_SPEAKING");
            this.transition("MODEL_SPEAKING");
        } else if (this.state === "LISTENING" || this.state === "COMMITTING") {
            // Model started responding before we expected, adjust state
            this.awaitingUserAnswer = false;
            this.transition("MODEL_SPEAKING");
        }
    }

    /**
     * Called when interrupted (user barged in)
     * Transitions to LISTENING immediately
     */
    onInterrupted(): void {
        console.log("[TurnController] Interrupted → LISTENING");
        this.awaitingUserAnswer = true;
        this.transition("LISTENING");
    }

    /**
     * Called when generation completes (clean buffer reset point)
     */
    onGenerationComplete(): void {
        console.log("[TurnController] Generation complete - buffers can reset");
        // This is a signal that the model's output is finalized
        // Used for clean turn boundaries (CheatingDaddy pattern)
    }

    /**
     * Called when user finished speaking (VAD + TurnManager says end)
     * Commits the user answer and transitions to MODEL_SPEAKING
     */
    commitUserAnswer(cleanText: string): void {
        const now = Date.now();

        if (!this.awaitingUserAnswer) {
            console.warn("[TurnController] Not awaiting user answer, ignoring commit");
            return;
        }

        if (!cleanText || cleanText.trim().length < 2) {
            console.warn("[TurnController] Empty or too short text, ignoring commit");
            return;
        }

        // Prevent rapid commits (debounce)
        if (now - this.lastCommitTime < this.minCommitIntervalMs) {
            console.warn("[TurnController] Commit too fast, ignoring (debounce)");
            return;
        }

        console.log(`[TurnController] Committing user answer (${cleanText.length} chars)`);

        this.awaitingUserAnswer = false;
        this.lastCommitTime = now;
        this.turnCount++;
        this.transition("COMMITTING");

        // Notify listener of final text
        this.config.onUserFinalText?.(cleanText);

        // Send committed text turn with follow-up instruction
        if (this.geminiClient?.connected) {
            this.geminiClient.sendCommittedTextTurn(cleanText);
        }

        // Immediately transition to MODEL_SPEAKING (model will respond)
        this.transition("MODEL_SPEAKING");
    }

    /**
     * Force transition to MODEL_SPEAKING (e.g., when audio starts playing)
     */
    setModelSpeaking(): void {
        if (this.state !== "MODEL_SPEAKING") {
            console.log("[TurnController] Forcing MODEL_SPEAKING");
            this.awaitingUserAnswer = false;
            this.transition("MODEL_SPEAKING");
        }
    }

    /**
     * Check if we should generate a rolling summary
     */
    shouldGenerateSummary(): boolean {
        return this.turnCount > 0 && this.turnCount % 5 === 0;
    }

    /**
     * Reset controller state (for new interview or reconnection)
     */
    reset(): void {
        console.log("[TurnController] Resetting to KICKOFF state");
        this.state = "KICKOFF";
        this.awaitingUserAnswer = false;
        this.turnCount = 0;
        this.lastCommitTime = 0;
    }

    /**
     * Reset for session resumption (keeps turn count)
     */
    resumeSession(): void {
        console.log("[TurnController] Resuming session → MODEL_SPEAKING");
        this.state = "MODEL_SPEAKING";
        this.awaitingUserAnswer = false;
    }

    private transition(newState: InterviewState): void {
        const prevState = this.state;
        if (prevState === newState) return;

        console.log(`[TurnController] ${prevState} → ${newState}`);
        this.state = newState;
        this.config.onStateChange?.(newState, prevState);
    }
}
