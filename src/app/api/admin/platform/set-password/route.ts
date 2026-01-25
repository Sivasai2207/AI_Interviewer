import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, password, orgId, actorUid, actorEmail } = body;

        if (!uid || !password || !orgId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Get user info for logging
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Update password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: password,
        });

        console.log("[SetPassword] Updated auth password for:", uid);

        // Set mustResetPassword flag in Firestore
        await adminDb.collection("users").doc(uid).update({
            mustResetPassword: true,
            updatedAt: new Date(),
        });

        console.log("[SetPassword] Updated Firestore profile with mustResetPassword: true");

        // Log platform action using adminDb
        if (actorUid && actorEmail) {
            await adminDb.collection("platformAuditLogs").add({
                actorUid,
                actorEmail,
                action: "ADMIN_PASSWORD_SET",
                targetOrgId: orgId,
                metadata: {
                    targetUid: uid,
                    targetEmail: userData.email,
                    targetName: userData.displayName,
                },
                timestamp: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            message: "Password updated successfully. User will be required to change it on next login.",
        });
    } catch (error: any) {
        console.error("[SetPassword] Error:", error);

        return NextResponse.json(
            { success: false, error: error.message || "Failed to set password" },
            { status: 500 }
        );
    }
}
