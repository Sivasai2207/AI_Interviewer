import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { interviewId, orgId, uid, violations, violationCount } = await req.json();

        if (!interviewId || !orgId || !uid) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify user session
        const token = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            await adminAuth.verifySessionCookie(token, true);
        } catch {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const interviewRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("interviews")
            .doc(interviewId);

        // Mark interview as terminated for malpractice
        await interviewRef.update({
            status: "terminated_malpractice",
            terminatedForMalpractice: true,
            terminatedAt: FieldValue.serverTimestamp(),
            malpracticeReport: {
                reason: "Multiple fullscreen violations detected",
                timestamp: FieldValue.serverTimestamp(),
                evidenceCount: violationCount,
                violations,
                terminated: true,
            },
        });

        // Update user profile with malpractice flag
        const userRef = adminDb.collection("users").doc(uid);
        await userRef.update({
            [`violations.malpracticeIncidents`]: FieldValue.arrayUnion({
                interviewId,
                date: FieldValue.serverTimestamp(),
                reason: "Multiple fullscreen violations",
                violationCount,
            }),
        });

        // Also update organization member stats
        const memberRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("members")
            .doc(uid);

        await memberRef.update({
            malpracticeCount: FieldValue.increment(1),
            lastMalpracticeDate: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error logging malpractice:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
