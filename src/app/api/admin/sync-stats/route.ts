import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const { orgId } = await request.json();

        if (!orgId) {
            return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
        }

        // 1. Count Students
        const studentsSnapshot = await adminDb
            .collection("users")
            .where("orgId", "==", orgId)
            .where("role", "==", "student")
            .count()
            .get();

        const studentCount = studentsSnapshot.data().count;

        // 2. Count Faculty/Staff
        const facultySnapshot = await adminDb
            .collection("users")
            .where("orgId", "==", orgId)
            .where("role", "==", "staff") // Assuming role is 'staff' in DB
            .count()
            .get();

        const staffCount = facultySnapshot.data().count;

        // 3. Update Organization Stats
        await adminDb.collection("organizations").doc(orgId).update({
            "stats.studentCount": studentCount,
            "stats.staffCount": staffCount,
            updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`[SyncStats] Updated org ${orgId}: Students=${studentCount}, Staff=${staffCount}`);

        return NextResponse.json({
            success: true,
            stats: { studentCount, staffCount }
        });

    } catch (error: any) {
        console.error("Sync Stats Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to sync stats" },
            { status: 500 }
        );
    }
}
