import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// Generate random password
function generateTempPassword(length = 8): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, orgId, actorUid, actorEmail } = body;

        if (!uid || !orgId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
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

        // Generate new temporary password
        const tempPassword = generateTempPassword(8);

        // Update password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: tempPassword,
        });

        console.log("[ResetAdminPassword] Updated auth password for:", uid);

        // Set mustResetPassword flag in Firestore
        await adminDb.collection("users").doc(uid).update({
            mustResetPassword: true,
            updatedAt: new Date(),
        });

        console.log("[ResetAdminPassword] Updated Firestore profile");

        // Log platform action using adminDb
        if (actorUid && actorEmail) {
            await adminDb.collection("platformAuditLogs").add({
                actorUid,
                actorEmail,
                action: "ADMIN_PASSWORD_RESET",
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
            tempPassword,
        });
    } catch (error: any) {
        console.error("[ResetAdminPassword] Error:", error);

        return NextResponse.json(
            { success: false, error: error.message || "Failed to reset password" },
            { status: 500 }
        );
    }
}
