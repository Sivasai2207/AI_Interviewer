import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/student/precheck/submit
 * Saves pre-interview consent and rules acknowledgment
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            interviewId,
            orgId,
            uid,
            rulesAccepted,
            consentAccepted,
            consentVersion,
            identityVerification
        } = body;

        if (!interviewId || !orgId || !uid) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!rulesAccepted || !consentAccepted) {
            return NextResponse.json(
                { success: false, error: "Rules and consent must be accepted" },
                { status: 400 }
            );
        }

        // Verify interview exists and belongs to user
        const interviewRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("interviews")
            .doc(interviewId);

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

        // Build update object
        const updateData: Record<string, any> = {
            precheck: {
                rulesAcceptedAt: FieldValue.serverTimestamp(),
                consentAcceptedAt: FieldValue.serverTimestamp(),
                consentVersion: consentVersion || "v1.0",
            },
            proctoring: {
                tabSwitchCount: 0,
                warningsIssued: 0,
                endedForViolation: false,
            },
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Add identity verification if provided
        if (identityVerification) {
            updateData.identityVerification = {
                required: true,
                submittedAt: FieldValue.serverTimestamp(),
                idCardUrl: identityVerification.idCardUrl || null,
                selfieUrl: identityVerification.selfieUrl || null,
            };
        }

        await interviewRef.update(updateData);

        console.log(`[Precheck] Saved for interview ${interviewId}`);

        return NextResponse.json({
            success: true,
            message: "Precheck completed successfully",
        });

    } catch (error: any) {
        console.error("[Precheck] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to save precheck" },
            { status: 500 }
        );
    }
}
