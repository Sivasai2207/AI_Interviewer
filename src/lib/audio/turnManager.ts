/**
 * Turn Manager - Pause-Tolerant Interview Turn Detection
 * 
 * State Machine:
 * - IDLE: Waiting for speech
 * - SPEAKING: User is actively speaking
 * - IN_PAUSE: User paused (thinking), waiting to see if they resume
 * - COMMITTING: Finalizing the turn, about to send to AI
 * 
 * Key Features:
 * - 2.5s pause tolerance (user can think)
 * - 5s hard end (forces turn commit)
 * - Minimum speech duration before commit (1.5s)
 */

export type TurnState = "IDLE" | "SPEAKING" | "IN_PAUSE" | "COMMITTING";

export interface TurnManagerConfig {
    speechStartMs: number;      // Time of speech to confirm start (default: 200ms)
    pauseToleranceMs: number;   // Max pause before considering turn end (default: 2500ms)
    hardEndMs: number;          // Force end after this silence (default: 5000ms)
    minSpeechMs: number;        // Minimum speech before allowing commit (default: 1500ms)
    onStateChange?: (state: TurnState, prevState: TurnState) => void;
    onTurnCommit?: (totalSpeechMs: number) => void;
}

const DEFAULT_CONFIG: TurnManagerConfig = {
    speechStartMs: 200,
    pauseToleranceMs: 2500,
    hardEndMs: 5000,
    minSpeechMs: 1500,
};

export class TurnManager {
    private config: TurnManagerConfig;
    private state: TurnState = "IDLE";
    private speechStartTime: number = 0;
    private totalSpeechMs: number = 0;
    private silenceStartTime: number = 0;
    private lastFrameTime: number = 0;

    constructor(config?: Partial<TurnManagerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Process a VAD event from the audio recorder
     * @param isSpeaking Whether speech is currently detected
     * @param frameMs Duration of this audio frame in milliseconds
     */
    processVadFrame(isSpeaking: boolean, frameMs: number = 20): void {
        const now = Date.now();
        this.lastFrameTime = now;

        switch (this.state) {
            case "IDLE":
                if (isSpeaking) {
                    // Start tracking potential speech
                    if (this.speechStartTime === 0) {
                        this.speechStartTime = now;
                    }

                    // Confirm speech started after threshold
                    const speechDuration = now - this.speechStartTime;
                    if (speechDuration >= this.config.speechStartMs) {
                        this.transition("SPEAKING");
                        this.totalSpeechMs = speechDuration;
                    }
                } else {
                    // Reset speech start tracking
                    this.speechStartTime = 0;
                }
                break;

            case "SPEAKING":
                if (isSpeaking) {
                    // Continue speaking, accumulate duration
                    this.totalSpeechMs += frameMs;
                    this.silenceStartTime = 0;
                } else {
                    // User paused, enter pause state
                    this.silenceStartTime = now;
                    this.transition("IN_PAUSE");
                }
                break;

            case "IN_PAUSE":
                if (isSpeaking) {
                    // User resumed speaking, go back to SPEAKING
                    this.silenceStartTime = 0;
                    this.transition("SPEAKING");
                    this.totalSpeechMs += frameMs;
                } else {
                    // Still in pause, check thresholds
                    const silenceDuration = now - this.silenceStartTime;

                    // Hard end: force commit after long silence
                    if (silenceDuration >= this.config.hardEndMs) {
                        this.commitTurn();
                        return;
                    }

                    // Soft end: commit if spoke enough and paused long enough
                    if (silenceDuration >= this.config.pauseToleranceMs &&
                        this.totalSpeechMs >= this.config.minSpeechMs) {
                        this.commitTurn();
                        return;
                    }
                }
                break;

            case "COMMITTING":
                // Shouldn't receive frames in this state, but just reset if we do
                this.reset();
                break;
        }
    }

    /**
     * Force commit the current turn (e.g., user pressed a button)
     */
    forceCommit(): void {
        if (this.state === "SPEAKING" || this.state === "IN_PAUSE") {
            this.commitTurn();
        }
    }

    /**
     * Get current state
     */
    getState(): TurnState {
        return this.state;
    }

    /**
     * Get total speech duration in current turn
     */
    getTotalSpeechMs(): number {
        return this.totalSpeechMs;
    }

    /**
     * Get current silence duration (if in pause)
     */
    getCurrentSilenceMs(): number {
        if (this.state === "IN_PAUSE" && this.silenceStartTime > 0) {
            return Date.now() - this.silenceStartTime;
        }
        return 0;
    }

    /**
     * Check if currently in an active turn (speaking or paused)
     */
    isInTurn(): boolean {
        return this.state === "SPEAKING" || this.state === "IN_PAUSE";
    }

    /**
     * Reset the turn manager to IDLE state
     */
    reset(): void {
        this.state = "IDLE";
        this.speechStartTime = 0;
        this.totalSpeechMs = 0;
        this.silenceStartTime = 0;
    }

    private transition(newState: TurnState): void {
        const prevState = this.state;
        if (prevState === newState) return;

        console.log(`[TurnManager] ${prevState} → ${newState}`);
        this.state = newState;
        this.config.onStateChange?.(newState, prevState);
    }

    private commitTurn(): void {
        const finalSpeechMs = this.totalSpeechMs;

        this.transition("COMMITTING");
        console.log(`[TurnManager] Committing turn (${finalSpeechMs}ms of speech)`);

        this.config.onTurnCommit?.(finalSpeechMs);

        // Reset to IDLE after commit
        this.reset();
        this.transition("IDLE");
    }
}
