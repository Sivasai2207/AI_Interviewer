import { Timestamp } from "firebase/firestore";

// =====================
// Role Types (3-Tier)
// =====================
export type PlatformRole = "platform_owner";
export type OrgRole = "super_admin" | "staff" | "student";
export type UserRole = PlatformRole | OrgRole;

// =====================
// Platform Types
// =====================
export interface PlatformAdmin {
    uid: string;
    email: string;
    displayName: string;
    role: "platform_owner";
    status: "active" | "disabled";
    createdAt: Timestamp;
}

export interface PlatformAuditLog {
    id: string;
    actorUid: string;
    actorEmail: string;
    action:
    | "ORG_CREATED"
    | "ORG_SUSPENDED"
    | "ORG_REACTIVATED"
    | "ORG_DELETED"
    | "IMPERSONATE_STARTED"
    | "IMPERSONATE_ENDED"
    | "SUPER_ADMIN_CREATED"
    | "STAFF_CREATED"
    | "STUDENT_CREATED"
    | "PASSWORD_RESET";
    targetOrgId?: string;
    targetOrgName?: string;
    targetUid?: string;
    targetEmail?: string;
    timestamp: Timestamp;
    metadata?: Record<string, unknown>;
}

// =====================
// Organization Types
// =====================
export type OrgStatus = "active" | "suspended" | "deleted";

export interface Organization {
    id: string;
    name: string;
    slug: string;
    status: OrgStatus;
    superAdminUid?: string;
    superAdminEmail?: string;
    createdByPlatformUid: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    limits?: {
        maxStudents: number;
        maxStaff: number;
        maxInterviewsPerMonth: number;
    };
    stats: {
        studentCount: number;
        staffCount: number;
        interviewCount: number;
    };
    settings?: {
        logo?: string;
        primaryColor?: string;
        allowGoogleSignIn?: boolean;
    };
}

export interface OrgSlugMapping {
    slug: string;
    orgId: string;
}

// =====================
// Impersonation Types
// =====================
export type ImpersonationStatus = "active" | "ended";

export interface ImpersonationSession {
    id: string;
    platformUid: string;
    platformEmail: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    targetRole: "super_admin" | "staff";
    createdAt: Timestamp;
    expiresAt: Timestamp;
    endedAt?: Timestamp;
    status: ImpersonationStatus;
}

// =====================
// User Profile (Org-Scoped)
// =====================
export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role: OrgRole;
    orgId: string;
    registrationNumber?: string;
    department?: string;
    createdBy?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    settings: UserSettings;
    apiKeyStatus: "valid" | "invalid" | "unknown";
    apiKeyEncrypted?: string;
}

export interface UserSettings {
    defaultIndustry?: string;
    defaultMode?: InterviewMode;
    theme?: "light" | "dark" | "system";
}

// =====================
// Interview Types
// =====================
export type InterviewMode = "fresher" | "intermediate" | "professional" | "voice";
export type InterviewStatus = "created" | "live" | "ended" | "report_ready";

export interface Interview {
    id: string;
    uid: string;
    orgId: string;
    createdAt: Timestamp;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    durationMin: number;
    mode: InterviewMode;
    roleApplied: string;
    targetIndustry: string;
    hasJD: boolean;
    jdText?: string;
    jdYearsRequired?: string;
    resumeText: string;
    resumeFileName?: string;
    status: InterviewStatus;
    endedEarly: boolean;
    lastActiveAt?: Timestamp;
}

export type InterviewEventType =
    | "question_asked"
    | "candidate_answer"
    | "followup_question"
    | "note_update"
    | "timer_warning"
    | "mode_switch"
    | "start"
    | "end";

export interface InterviewEvent {
    id: string;
    type: InterviewEventType;
    timestamp: Timestamp;
    payload: {
        text?: string;
        questionNumber?: number;
        references?: string[];
        tags?: string[];
    };
}

export interface TranscriptChunk {
    id: string;
    timestamp: Timestamp | Date;
    speaker: "interviewer" | "candidate" | "system";
    text: string;
    sequenceNumber: number;
    confidence?: number;
}

export interface InterviewNote {
    id: string;
    claim: string;
    evidence: string;
    depthScore: number;
    clarityScore: number;
    redFlags: string[];
    strengths: string[];
    followupIdeas: string[];
}

// =====================
// Report Types
// =====================
export type HiringVerdict =
    | "strong_hire"
    | "hire"
    | "lean_hire"
    | "lean_no"
    | "no";

export interface InterviewReport {
    id: string;
    overallScore: number;
    breakdown: {
        fundamentals: number;
        projectDepth: number;
        problemSolving: number;
        systemDesign: number;
        communication: number;
        roleFit: number;
    };
    strengths: Array<{
        point: string;
        evidence: string;
    }>;
    weaknesses: Array<{
        point: string;
        evidence: string;
    }>;
    redFlags: string[];
    missedOpportunities: string[];
    actionPlan: {
        sevenDay: string[];
        thirtyDay: string[];
    };
    practiceQuestions: string[];
    jdAlignmentNotes?: string;
    feedback?: string;
    verdict: HiringVerdict;
    generatedAt: Timestamp;
}

// =====================
// Admin Portal Types
// =====================
export interface StudentListItem {
    id: string;
    displayName: string;
    email: string;
    registrationNumber: string;
    department?: string;
    interviewCount: number;
    averageScore: number | null;
    lastInterviewAt?: Timestamp;
}

export interface StudentPerformanceStats {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number | null;
    scoreHistory: Array<{
        date: string;
        score: number;
        interviewId: string;
    }>;
    skillBreakdown: {
        fundamentals: number;
        projectDepth: number;
        problemSolving: number;
        systemDesign: number;
        communication: number;
        roleFit: number;
    } | null;
    strengths: string[];
    weaknesses: string[];
    recentInterviews: Interview[];
}

export interface BulkUploadRow {
    name: string;
    email: string;
    registrationNumber: string;
    department?: string;
}

export interface BulkUploadResult {
    success: boolean;
    created: number;
    failed: number;
    errors: Array<{
        row: number;
        email: string;
        error: string;
    }>;
}

// =====================
// Platform Dashboard Stats
// =====================
export interface PlatformStats {
    totalOrganizations: number;
    activeOrganizations: number;
    totalStudents: number;
    totalStaff: number;
    totalInterviews: number;
    interviewsToday: number;
    interviewsThisWeek: number;
    interviewsThisMonth: number;
    averageScoreGlobal: number | null;
}

export interface OrgStats {
    studentCount: number;
    staffCount: number;
    interviewCount: number;
    completedInterviews: number;
    averageScore: number | null;
    interviewsToday: number;
    interviewsThisWeek: number;
}

// =====================
// Gemini/AI Types
// =====================
export interface GeminiMessage {
    role: "user" | "model";
    parts: Array<{ text: string }>;
}

export interface InterviewContext {
    role: string;
    industry: string;
    mode: InterviewMode;
    durationMin: number;
    resumeText: string;
    hasJD: boolean;
    jdText?: string;
    jdYears?: string;
}

// =====================
// UI State Types
// =====================
export interface TimerState {
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    isWarning: boolean;
}

export interface QuestionState {
    currentQuestion: string;
    questionNumber: number;
    previousQuestions: Array<{
        question: string;
        answer: string;
    }>;
}

// =====================
// Store Types
// =====================
export interface AuthStore {
    user: {
        uid: string;
        email: string | null;
        displayName: string | null;
    } | null;
    userProfile: UserProfile | null;
    platformAdmin: PlatformAdmin | null;
    role: UserRole | null;
    orgId: string | null;
    orgSlug: string | null;
    impersonationSession: ImpersonationSession | null;
    apiKey: string | null;
    apiKeyStatus: "valid" | "invalid" | "unknown";
    isLoading: boolean;
    setUser: (user: AuthStore["user"]) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setPlatformAdmin: (admin: PlatformAdmin | null) => void;
    setRole: (role: UserRole | null) => void;
    setOrgId: (orgId: string | null) => void;
    setOrgSlug: (slug: string | null) => void;
    setImpersonation: (session: ImpersonationSession | null) => void;
    setApiKey: (key: string | null) => void;
    setApiKeyStatus: (status: "valid" | "invalid" | "unknown") => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

export interface InterviewStore {
    interview: Interview | null;
    isLoading: boolean;
    error: string | null;
    timer: TimerState;
    currentQuestion: string;
    questionNumber: number;
    previousQA: Array<{ question: string; answer: string }>;
    transcript: TranscriptChunk[];
    isAITyping: boolean;
    isEvaluatorMode: boolean;
    setInterview: (interview: Interview | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    updateTimer: (timer: Partial<TimerState>) => void;
    addToTranscript: (chunk: Omit<TranscriptChunk, "id" | "timestamp">) => void;
    setCurrentQuestion: (question: string) => void;
    incrementQuestionNumber: () => void;
    addQA: (qa: { question: string; answer: string }) => void;
    setAITyping: (typing: boolean) => void;
    setEvaluatorMode: (mode: boolean) => void;
    reset: () => void;
}
