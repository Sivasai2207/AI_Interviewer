import { Timestamp } from "firebase/firestore";

// =====================
// WebSocket Connection States
// =====================
export type ConnectionState =
    | "IDLE"                    // Not connected
    | "CONNECTING_KEY"          // Fetching API key
    | "CONNECTING_SOCKET"       // Opening WebSocket
    | "HANDSHAKING"             // Sent setup, waiting for setupComplete
    | "READY"                   // AI session configured (setupComplete)
    | "STREAMING"               // Audio flowing
    | "ERROR"                   // Connection failed
    | "ENDED";                  // Interview ended

export interface ServerControlMessage {
    type: "READY" | "ERROR" | "AUDIO" | "TRANSCRIPT" | "END";
    code?: string;
    message?: string;
    data?: string; // base64 audio data
    speaker?: "ai" | "user";
    text?: string;
}

// =====================
// Violation Tracking (Kiosk Mode)
// =====================
export type ViolationType =
    | "fullscreen_exit"
    | "tab_switch"
    | "window_blur"
    | "focus_loss";

export interface ViolationLog {
    type: ViolationType;
    timestamp: Timestamp;
    count: number;
    action: "warning" | "terminated";
    details?: string;
}

export interface MalpracticeReport {
    reason: string;
    timestamp: Timestamp;
    evidenceCount: number;
    violations: ViolationLog[];
    terminated: boolean;
}

export interface UserViolationHistory {
    totalCount: number;
    incidents: Array<{
        interviewId: string;
        date: Timestamp;
        type: ViolationType;
        terminated: boolean;
    }>;
}
