import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/student/interview/event
 * Logs proctoring events (tab switches, focus lost, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { interviewId, orgId, uid, eventType, metadata } = body;

        if (!interviewId || !orgId || !uid || !eventType) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const validEventTypes = [
            "TAB_HIDDEN",
            "WINDOW_BLUR",
            "FULLSCREEN_EXIT",
            "COPY_PASTE",
            "MIC_MUTED",
            "WARNING_SHOWN",
        ];

        if (!validEventTypes.includes(eventType)) {
            return NextResponse.json(
                { success: false, error: "Invalid event type" },
                { status: 400 }
            );
        }

        const interviewRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("interviews")
            .doc(interviewId);

        // Verify interview
        const interviewDoc = await interviewRef.get();
        if (!interviewDoc.exists) {
            return NextResponse.json(
                { success: false, error: "Interview not found" },
                { status: 404 }
            );
        }

        const interviewData = interviewDoc.data();
        if (interviewData?.uid !== uid) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 403 }
            );
        }

        // Add event to subcollection
        await interviewRef.collection("events").add({
            type: eventType,
            timestamp: FieldValue.serverTimestamp(),
            metadata: metadata || {},
        });

        // Update proctoring counters
        const currentProctoring = interviewData?.proctoring || {
            tabSwitchCount: 0,
            warningsIssued: 0,
            endedForViolation: false,
        };

        const isTabSwitch = ["TAB_HIDDEN", "WINDOW_BLUR", "FULLSCREEN_EXIT"].includes(eventType);
        const isWarning = eventType === "WARNING_SHOWN";

        await interviewRef.update({
            "proctoring.tabSwitchCount": isTabSwitch
                ? FieldValue.increment(1)
                : currentProctoring.tabSwitchCount,
            "proctoring.warningsIssued": isWarning
                ? FieldValue.increment(1)
                : currentProctoring.warningsIssued,
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[InterviewEvent] ${eventType} logged for ${interviewId}`);

        return NextResponse.json({
            success: true,
            tabSwitchCount: isTabSwitch
                ? (currentProctoring.tabSwitchCount || 0) + 1
                : currentProctoring.tabSwitchCount,
            warningsIssued: isWarning
                ? (currentProctoring.warningsIssued || 0) + 1
                : currentProctoring.warningsIssued,
        });

    } catch (error: any) {
        console.error("[InterviewEvent] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to log event" },
            { status: 500 }
        );
    }
}
