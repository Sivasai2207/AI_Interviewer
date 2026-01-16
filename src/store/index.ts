import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    InterviewStore,
    AuthStore,
    TimerState,
    TranscriptChunk,
    UserRole,
    UserProfile,
    PlatformAdmin,
    ImpersonationSession,
} from "@/types";

// Default timer state
const defaultTimer: TimerState = {
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    isWarning: false,
};

// Interview Store
export const useInterviewStore = create<InterviewStore>()((set) => ({
    interview: null,
    isLoading: false,
    error: null,
    timer: defaultTimer,
    currentQuestion: "",
    questionNumber: 0,
    previousQA: [],
    transcript: [],
    isAITyping: false,
    isEvaluatorMode: false,

    setInterview: (interview) => set({ interview }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    updateTimer: (timerUpdate) =>
        set((state) => ({
            timer: { ...state.timer, ...timerUpdate },
        })),
    addToTranscript: (chunk) =>
        set((state) => ({
            transcript: [
                ...state.transcript,
                { ...chunk, id: `chunk-${Date.now()}`, timestamp: new Date() } as TranscriptChunk,
            ],
        })),
    setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
    incrementQuestionNumber: () =>
        set((state) => ({ questionNumber: state.questionNumber + 1 })),
    addQA: (qa) =>
        set((state) => ({ previousQA: [...state.previousQA, qa] })),
    setAITyping: (isAITyping) => set({ isAITyping }),
    setEvaluatorMode: (isEvaluatorMode) => set({ isEvaluatorMode }),
    reset: () =>
        set({
            interview: null,
            isLoading: false,
            error: null,
            timer: defaultTimer,
            currentQuestion: "",
            questionNumber: 0,
            previousQA: [],
            transcript: [],
            isAITyping: false,
            isEvaluatorMode: false,
        }),
}));

// Auth Store with Multi-Tenant Support
export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            userProfile: null,
            platformAdmin: null,
            role: null,
            orgId: null,
            orgSlug: null,
            impersonationSession: null,
            apiKey: null,
            apiKeyStatus: "unknown",
            isLoading: true,

            setUser: (user) => set({ user }),
            setUserProfile: (userProfile) =>
                set({
                    userProfile,
                    role: userProfile?.role || null,
                    orgId: userProfile?.orgId || null,
                }),
            setPlatformAdmin: (platformAdmin) =>
                set({
                    platformAdmin,
                    role: platformAdmin ? "platform_owner" : null,
                }),
            setRole: (role) => set({ role }),
            setOrgId: (orgId) => set({ orgId }),
            setOrgSlug: (orgSlug) => set({ orgSlug }),
            setImpersonation: (impersonationSession) => set({ impersonationSession }),
            setApiKey: (apiKey) => set({ apiKey }),
            setApiKeyStatus: (apiKeyStatus) => set({ apiKeyStatus }),
            setLoading: (isLoading) => set({ isLoading }),
            reset: () =>
                set({
                    user: null,
                    userProfile: null,
                    platformAdmin: null,
                    role: null,
                    orgId: null,
                    orgSlug: null,
                    impersonationSession: null,
                    apiKey: null,
                    apiKeyStatus: "unknown",
                    isLoading: false,
                }),
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                apiKey: state.apiKey,
                apiKeyStatus: state.apiKeyStatus,
                orgSlug: state.orgSlug,
            }),
        }
    )
);
