import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/student/create-interview
 * Creates a new interview session and updates org stats
 */
export async function POST(request: NextRequest) {
    console.log("[CreateInterview] Request received");
    try {
        const body = await request.json();
        const {
            orgId,
            uid,
            roleApplied,
            targetIndustry,
            jdYearsRequired,
            jdText,
            hasJD,
            mode,
            durationMin
        } = body;

        if (!orgId || !uid || !roleApplied) {
            console.error("[CreateInterview] Missing required fields");
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify user belongs to org (optional but recommended)
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists || userDoc.data()?.orgId !== orgId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: User not in organization" },
                { status: 403 }
            );
        }

        const interviewData = {
            uid,
            orgId,
            roleApplied,
            targetIndustry: targetIndustry || "Technology",
            jdYearsRequired: jdYearsRequired || "0",
            jdText: jdText || "",
            hasJD: hasJD || false,
            mode: mode || "voice",
            durationMin: durationMin || 15,
            resumeText: body.resumeText || "",
            status: "created",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            endedEarly: false,
            // Initialize empty subcollection fields structure if needed, 
            // but Firestore creates them on demand.
        };

        const docRef = await adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("interviews")
            .add(interviewData);

        // Update org stats (atomic increment)
        await adminDb.collection("organizations").doc(orgId).update({
            "stats.interviewCount": FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[CreateInterview] Created ${docRef.id} for user ${uid}`);

        return NextResponse.json({
            success: true,
            interviewId: docRef.id,
        });

    } catch (error: any) {
        console.error("[CreateInterview] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to create interview" },
            { status: 500 }
        );
    }
}
