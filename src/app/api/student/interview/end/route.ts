import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/student/interview/end
 * Ends an interview (normal or due to violation)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { interviewId, orgId, uid, reason, endedForViolation } = body;

        if (!interviewId || !orgId || !uid) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
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

        // Update interview status
        await interviewRef.update({
            status: "ended",
            endedAt: FieldValue.serverTimestamp(),
            endedEarly: endedForViolation || false,
            "proctoring.endedForViolation": endedForViolation || false,
            endReason: reason || "normal",
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Log the end event
        await interviewRef.collection("events").add({
            type: "end",
            timestamp: FieldValue.serverTimestamp(),
            metadata: {
                reason: reason || "normal",
                endedForViolation: endedForViolation || false,
            },
        });

        console.log(`[InterviewEnd] Interview ${interviewId} ended. Violation: ${endedForViolation}`);

        return NextResponse.json({
            success: true,
            message: endedForViolation
                ? "Interview ended due to policy violation"
                : "Interview ended successfully",
        });

    } catch (error: any) {
        console.error("[InterviewEnd] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to end interview" },
            { status: 500 }
        );
    }
}
