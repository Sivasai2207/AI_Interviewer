import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
    try {
        const { uid, updates } = await request.json();

        if (!uid || !updates) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Update password if provided
        if (updates.password) {
            await adminAuth.updateUser(uid, {
                password: updates.password,
            });
            console.log(`[API] Updated password for user ${uid}`);
        }

        // Update Firestore profile
        const firestoreUpdates: any = {};
        if (updates.displayName) firestoreUpdates.displayName = updates.displayName;
        if (updates.email) firestoreUpdates.email = updates.email;
        if (updates.department) firestoreUpdates.department = updates.department;

        if (Object.keys(firestoreUpdates).length > 0) {
            await adminDb.collection("users").doc(uid).update(firestoreUpdates);
            console.log(`[API] Updated Firestore profile for user ${uid}`);
        }

        // Update Auth email if changed
        if (updates.email) {
            await adminAuth.updateUser(uid, {
                email: updates.email,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API] Update user error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update user" },
            { status: 500 }
        );
    }
}
