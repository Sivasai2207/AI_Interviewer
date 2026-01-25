/**
 * Kiosk Mode Utilities
 * Fullscreen enforcement and violation tracking for interview integrity
 */

import { Timestamp } from "firebase/firestore";
import type { ViolationLog, ViolationType } from "@/types/interview-live";

const MAX_VIOLATIONS = 3;

/**
 * Request fullscreen mode
 */
export async function enterFullscreen(): Promise<boolean> {
    try {
        await document.documentElement.requestFullscreen();
        return true;
    } catch (error) {
        console.error("Failed to enter fullscreen:", error);
        return false;
    }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
        await document.exitFullscreen();
    }
}

/**
 * Check if currently in fullscreen
 */
export function isFullscreenActive(): boolean {
    return !!document.fullscreenElement;
}

/**
 * Create a violation log entry
 */
export function createViolation(type: ViolationType, count: number): ViolationLog {
    return {
        type,
        timestamp: Timestamp.now(),
        count,
        action: count >= MAX_VIOLATIONS ? "terminated" : "warning",
        details: `Violation #${count}: ${type.replace(/_/g, " ")}`,
    };
}

/**
 * Check if violations warrant termination
 */
export function shouldTerminate(violationCount: number): boolean {
    return violationCount > MAX_VIOLATIONS;
}

/**
 * Get warning message for violation count
 */
export function getViolationMessage(count: number): string {
    if (count === 1) {
        return "⚠️ Warning: Attempted to leave fullscreen. This has been logged.";
    } else if (count === 2) {
        return "⚠️ Second Warning: Do not leave fullscreen again. Next violation will end the interview.";
    } else if (count === 3) {
        return "⚠️ Final Warning: One more violation and your interview will be terminated.";
    } else {
        return "🚨 Malpractice Detected: Interview terminated due to repeated violations.";
    }
}
