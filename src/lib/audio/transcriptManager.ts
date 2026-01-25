/**
 * Transcript Manager - Accumulates and Manages Interview Transcripts
 * 
 * Features:
 * - Accumulates streaming transcripts (both user and AI)
 * - Supports "freeze" operation for turn commitment
 * - Maintains interview history for context
 * - Generates rolling summaries for long interviews
 */

export interface TranscriptEntry {
    speaker: "user" | "ai";
    text: string;
    timestamp: number;
    isFinal: boolean;
}

export interface InterviewContext {
    resumeText: string;
    targetRole: string;
    experienceYears: number;
    turnCount: number;
    rollingSummary: string;
    lastQuestionAsked: string;
}

export class TranscriptManager {
    private currentUserText: string = "";
    private currentAiText: string = "";
    private history: TranscriptEntry[] = [];
    private context: InterviewContext;

    // Callbacks
    private onUserTextUpdate?: (text: string) => void;
    private onAiTextUpdate?: (text: string) => void;

    constructor(
        context: Partial<InterviewContext> = {},
        onUserTextUpdate?: (text: string) => void,
        onAiTextUpdate?: (text: string) => void
    ) {
        this.context = {
            resumeText: context.resumeText || "",
            targetRole: context.targetRole || "Software Engineer",
            experienceYears: context.experienceYears || 0,
            turnCount: 0,
            rollingSummary: "",
            lastQuestionAsked: "",
        };
        this.onUserTextUpdate = onUserTextUpdate;
        this.onAiTextUpdate = onAiTextUpdate;
    }

    /**
     * Append streaming user transcript (from Gemini inputTranscription)
     */
    appendUserText(text: string): void {
        this.currentUserText = text;
        this.onUserTextUpdate?.(text);
    }

    /**
     * Append streaming AI transcript (from Gemini outputTranscription)
     */
    appendAiText(text: string): void {
        this.currentAiText = text;
        this.onAiTextUpdate?.(text);
    }

    /**
     * Get current (unfrozen) user text
     */
    getCurrentUserText(): string {
        return this.currentUserText;
    }

    /**
     * Get current (unfrozen) AI text
     */
    getCurrentAiText(): string {
        return this.currentAiText;
    }

    /**
     * Commit (freeze) the current user turn
     * Returns the final transcript text (cleaned)
     */
    commitUserTurn(): string {
        const finalText = this.cleanTranscript(this.currentUserText);

        if (finalText) {
            this.history.push({
                speaker: "user",
                text: finalText,
                timestamp: Date.now(),
                isFinal: true,
            });
            this.context.turnCount++;
        }

        this.currentUserText = "";
        console.log(`[TranscriptManager] Committed user turn (${finalText.length} chars)`);

        return finalText;
    }

    /**
     * Get cleaned version of current user text (without committing)
     */
    getCleanedUserText(): string {
        return this.cleanTranscript(this.currentUserText);
    }

    /**
     * Clean transcript: remove filler words and immediate word repeats
     */
    cleanTranscript(text: string): string {
        if (!text) return "";

        let s = text.replace(/\s+/g, " ").trim();

        // Remove common filler words (but NOT "not" or meaningful words)
        s = s.replace(/\b(uh+|um+|erm+|hmm+|like|you know|basically|actually|literally|i mean)\b/gi, "");

        // Remove immediate word repeats: "I I" -> "I", "the the" -> "the"
        s = s.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");

        // Clean up multiple spaces and trim
        s = s.replace(/\s+/g, " ").trim();

        return s;
    }

    /**
     * Commit (freeze) the current AI turn
     * Returns the final transcript text
     */
    commitAiTurn(): string {
        const finalText = this.currentAiText.trim();

        if (finalText) {
            this.history.push({
                speaker: "ai",
                text: finalText,
                timestamp: Date.now(),
                isFinal: true,
            });
            this.context.lastQuestionAsked = finalText;
        }

        this.currentAiText = "";
        console.log(`[TranscriptManager] Committed AI turn (${finalText.length} chars)`);

        return finalText;
    }

    /**
     * Get the full interview history
     */
    getHistory(): TranscriptEntry[] {
        return [...this.history];
    }

    /**
     * Get the last N turns of conversation
     */
    getRecentHistory(n: number = 5): TranscriptEntry[] {
        return this.history.slice(-n);
    }

    /**
     * Get interview context
     */
    getContext(): InterviewContext {
        return { ...this.context };
    }

    /**
     * Update rolling summary (call periodically, e.g., every 5 turns)
     */
    updateRollingSummary(summary: string): void {
        this.context.rollingSummary = summary;
        console.log(`[TranscriptManager] Updated rolling summary`);
    }

    /**
     * Check if it's time to generate a new rolling summary
     */
    shouldGenerateSummary(): boolean {
        return this.context.turnCount > 0 && this.context.turnCount % 5 === 0;
    }

    /**
     * Get a prompt for generating a rolling summary
     */
    getSummaryPrompt(): string {
        const recentHistory = this.getRecentHistory(10);
        const historyText = recentHistory
            .map(e => `${e.speaker === "user" ? "Candidate" : "Interviewer"}: ${e.text}`)
            .join("\n\n");

        return `Summarize this interview segment in 5-8 bullet points. Focus on:
- Technical skills demonstrated
- Specific technologies/frameworks mentioned
- Strengths and weaknesses observed
- Key claims to verify

Interview segment:
${historyText}`;
    }

    /**
     * Build the committed turn message for Gemini
     * This is what gets sent as a text turn with turnComplete: true
     */
    buildCommittedTurnMessage(userTranscript: string): string {
        return `[CANDIDATE RESPONSE]
${userTranscript}

[INSTRUCTION]
The candidate has finished speaking. Now ask your next ruthless follow-up question.
- If they were vague, demand specifics
- If they mentioned a technology, probe deeper
- If they made a claim, ask for metrics/evidence
- Keep it to ONE focused question`;
    }

    /**
     * Build session resumption message (for reconnect)
     */
    buildResumptionMessage(): string {
        return `[SESSION RESUMED]
Interview Context:
- Role: ${this.context.targetRole}
- Experience: ${this.context.experienceYears} years
- Turns so far: ${this.context.turnCount}

${this.context.rollingSummary ? `Summary so far:\n${this.context.rollingSummary}\n` : ""}
Last question asked: ${this.context.lastQuestionAsked || "None yet"}

Continue the interview from where we left off. Ask your next question.`;
    }

    /**
     * Reset for a new interview
     */
    reset(): void {
        this.currentUserText = "";
        this.currentAiText = "";
        this.history = [];
        this.context.turnCount = 0;
        this.context.rollingSummary = "";
        this.context.lastQuestionAsked = "";
    }
}
