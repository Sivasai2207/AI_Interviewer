import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ViolationLog } from "@/types/interview-live";

export async function POST(req: NextRequest) {
    try {
        const { interviewId, orgId, uid, violation } = await req.json();

        if (!interviewId || !orgId || !uid || !violation) {
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

        // Add violation to interview log
        await interviewRef.update({
            violations: FieldValue.arrayUnion(violation),
            violationCount: FieldValue.increment(1),
            lastViolationAt: FieldValue.serverTimestamp(),
        });

        // Also log to user profile for admin visibility
        const userRef = adminDb.collection("users").doc(uid);
        await userRef.update({
            [`violations.totalCount`]: FieldValue.increment(1),
            [`violations.incidents`]: FieldValue.arrayUnion({
                interviewId,
                date: FieldValue.serverTimestamp(),
                type: violation.type,
                terminated: violation.action === "terminated",
            }),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error logging violation:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
