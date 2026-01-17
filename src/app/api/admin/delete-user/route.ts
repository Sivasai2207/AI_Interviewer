import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const { uid, orgId, role, actor } = await request.json();

        if (!uid || !orgId || !role) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1. Delete from Firebase Auth
        try {
            await adminAuth.deleteUser(uid);
            console.log(`[API] Deleted user ${uid} from Firebase Auth`);
        } catch (authError: any) {
            console.error("[API] Error deleting from Auth:", authError);
            if (authError.code === 'auth/user-not-found') {
                // User already deleted from Auth, proceed to clean up Firestore
                console.log("[API] User not found in Auth, continuing...");
            }
        }

        // 2. Delete from Firestore
        await adminDb.collection("users").doc(uid).delete();
        console.log(`[API] Deleted user ${uid} from Firestore`);

        // 3. Update org stats (Safely)
        const orgRef = adminDb.collection("organizations").doc(orgId);
        const statsField = role === "student" ? "studentCount" : "staffCount";

        try {
            await adminDb.runTransaction(async (t) => {
                const orgDoc = await t.get(orgRef);
                if (!orgDoc.exists) return; // Should not happen

                const data = orgDoc.data();
                const currentCount = data?.stats?.[statsField] || 0;

                // Prevent negative counts and fix them if they exist
                let newCount = currentCount - 1;
                if (currentCount <= 0) {
                    newCount = 0; // Reset to 0 if it was 0 or negative
                }

                t.update(orgRef, {
                    [`stats.${statsField}`]: newCount
                });
            });
        } catch (statsError) {
            console.error("[API] Error updating stats:", statsError);
            // Don't fail the request just because stats failed
        }

        // 4. Log to Change Logs
        if (actor) {
            try {
                const logData = {
                    action: "DELETE_USER",
                    actorId: actor.uid,
                    actorName: actor.name || "Unknown Admin",
                    actorRole: actor.role || "admin",
                    targetId: uid,
                    targetRole: role,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                };

                await adminDb
                    .collection("organizations")
                    .doc(orgId)
                    .collection("changeLogs")
                    .add(logData);
            } catch (logError) {
                console.error("[API] Error logging change:", logError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] Delete user error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete user" },
            { status: 500 }
        );
    }
}
