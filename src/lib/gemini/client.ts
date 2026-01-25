import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import {
    CORE_CONSTITUTION,
    MODE_PROMPTS,
    EVALUATOR_PROMPT,
    HARD_BOUNDARY_PROMPT,
    INTERRUPTION_PROMPT,
    IDLE_PROMPT,
    OUTPUT_PROTOCOL,
    buildRoleFocusPrompt,
    buildTimingPrompt,
    buildOpeningMessage,
    JD_ALIGNMENT_PROMPT
} from "./prompts";
import type { InterviewContext, InterviewMode, GeminiMessage } from "@/types";

const MODEL_NAME = "gemini-2.0-flash";
const FIRST_QUESTION_PROMPT = "I am ready. Please start the interview as per your system instructions.";

function buildTimerWarningPrompt(remainingSeconds: number): string {
    if (remainingSeconds <= 30) return "SYSTEM UPDATE: 30 seconds remaining. Conclude the interview immediately.";
    if (remainingSeconds <= 120) return "SYSTEM UPDATE: 2 minutes remaining. Begin wrap-up phase.";
    return "";
}

export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private chat: ChatSession | null = null;
    private isEvaluatorMode = false;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
    }

    // Validate API key by making a small request
    async validateKey(): Promise<boolean> {
        try {
            const result = await this.model.generateContent("Say 'valid' if you can read this.");
            const response = result.response.text();
            return response.toLowerCase().includes("valid");
        } catch (error) {
            console.error("API key validation failed:", error);
            return false;
        }
    }

    // Initialize interview session with context
    async initializeInterview(context: InterviewContext): Promise<string> {
        // Safe mode selection (fallback to intermediate if voice or unknown)
        const modeKey = (['fresher', 'intermediate', 'professional'].includes(context.mode)
            ? context.mode
            : 'intermediate') as keyof typeof MODE_PROMPTS;

        const parts = [
            CORE_CONSTITUTION,
            INTERRUPTION_PROMPT,
            MODE_PROMPTS[modeKey],
            buildRoleFocusPrompt(context.role),
            context.hasJD ? JD_ALIGNMENT_PROMPT : "",
            HARD_BOUNDARY_PROMPT,
            buildTimingPrompt(context.durationMin),
            IDLE_PROMPT,
            OUTPUT_PROTOCOL,
            `CONTEXT PACK:`,
            `- Role: ${context.role}`,
            `- Mode: ${context.mode}`,
            `- Start immediately with proper introduction.`,
            `- RESUME TEXT:`,
            context.resumeText
        ];

        if (context.hasJD && context.jdText) {
            parts.push(`- JOB DESCRIPTION:`, context.jdText);
        }

        const systemInstruction = parts.join("\n\n");

        this.model = this.genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction,
        });

        this.chat = this.model.startChat({
            history: [],
        });

        this.isEvaluatorMode = false;

        // Get first question
        const result = await this.chat.sendMessage(FIRST_QUESTION_PROMPT);
        return result.response.text();
    }

    // Send candidate answer and get next question/response
    async sendMessage(
        message: string,
        timeRemainingSeconds?: number
    ): Promise<string> {
        if (!this.chat) {
            throw new Error("Interview session not initialized");
        }

        let fullMessage = message;

        // Add timer warning if applicable
        if (timeRemainingSeconds !== undefined) {
            const timerPrompt = buildTimerWarningPrompt(timeRemainingSeconds);
            if (timerPrompt) {
                fullMessage = `${message}\n\n${timerPrompt}`;
            }

            // Switch to evaluator mode if time is up
            if (timeRemainingSeconds <= 120 && !this.isEvaluatorMode) {
                // Ensure we don't switch multiple times or logic might be handled by system prompt awareness
                // But explicit switch is safer
            }
        }

        const result = await this.chat.sendMessage(fullMessage);
        return result.response.text();
    }

    // Switch to evaluator mode and generate report
    async switchToEvaluatorMode(): Promise<string> {
        if (!this.chat) {
            throw new Error("Interview session not initialized");
        }

        this.isEvaluatorMode = true;

        const result = await this.chat.sendMessage(EVALUATOR_PROMPT);
        return result.response.text();
    }

    // Generate report for ended-early sessions
    async generateReport(
        context: InterviewContext,
        transcript: Array<{ speaker: string; text: string }>
    ): Promise<string> {
        const systemInstruction = `${EVALUATOR_PROMPT}

INTERVIEW CONTEXT:
Role: ${context.role}
Industry: ${context.industry}
Mode: ${context.mode}
${context.hasJD ? `JD: ${context.jdText}` : "No JD provided"}`;

        const model = this.genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction,
        });

        const transcriptText = transcript
            .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
            .join("\n\n");

        const result = await model.generateContent(
            `Here is the interview transcript. Generate the evaluation report:\n\n${transcriptText}`
        );

        return result.response.text();
    }

    // Check if in evaluator mode
    getIsEvaluatorMode(): boolean {
        return this.isEvaluatorMode;
    }

    // End session
    endSession(): void {
        this.chat = null;
        this.isEvaluatorMode = false;
    }
}

// Singleton-style factory for client instances
let clientInstance: GeminiClient | null = null;

export function getGeminiClient(apiKey: string): GeminiClient {
    if (!clientInstance || true) {
        // Always create new instance for different API keys
        clientInstance = new GeminiClient(apiKey);
    }
    return clientInstance;
}

export function clearGeminiClient(): void {
    if (clientInstance) {
        clientInstance.endSession();
        clientInstance = null;
    }
}
