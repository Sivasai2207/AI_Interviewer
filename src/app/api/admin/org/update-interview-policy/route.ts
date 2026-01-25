import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/admin/org/update-interview-policy
 * Updates organization interview policy settings
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orgId, actorUid, policy } = body;

        if (!orgId || !actorUid || !policy) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify actor is admin of this org
        const actorDoc = await adminDb.collection("users").doc(actorUid).get();
        const actorData = actorDoc.data();

        if (!actorData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const isOrgAdmin = actorData.orgId === orgId &&
            ["super_admin", "admin", "staff"].includes(actorData.role);
        const isPlatformOwner = actorData.role === "platform_owner";

        if (!isOrgAdmin && !isPlatformOwner) {
            return NextResponse.json(
                { success: false, error: "Insufficient permissions" },
                { status: 403 }
            );
        }

        // Validate policy fields
        const validatedPolicy = {
            requireConsent: policy.requireConsent ?? true,
            recordAudio: policy.recordAudio ?? true,
            recordVideo: policy.recordVideo ?? false,
            captureTranscript: policy.captureTranscript ?? true,
            tabSwitchMonitoring: policy.tabSwitchMonitoring ?? true,
            maxTabSwitchWarnings: Math.max(1, Math.min(10, policy.maxTabSwitchWarnings ?? 2)),
            autoEndOnViolation: policy.autoEndOnViolation ?? true,
            requireIdentityVerification: policy.requireIdentityVerification ?? false,
            retentionDays: Math.max(30, Math.min(365, policy.retentionDays ?? 180)),
            policyText: policy.policyText || "",
            policyLink: policy.policyLink || "",
        };

        // Update organization
        await adminDb.collection("organizations").doc(orgId).update({
            interviewPolicy: validatedPolicy,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Log the change
        await adminDb.collection("orgChangeLogs").add({
            orgId,
            actorUid,
            actorEmail: actorData.email,
            action: "INTERVIEW_POLICY_UPDATED",
            timestamp: FieldValue.serverTimestamp(),
            metadata: { policy: validatedPolicy },
        });

        console.log(`[InterviewPolicy] Updated for org ${orgId}`);

        return NextResponse.json({
            success: true,
            policy: validatedPolicy,
        });

    } catch (error: any) {
        console.error("[InterviewPolicy] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update policy" },
            { status: 500 }
        );
    }
}
