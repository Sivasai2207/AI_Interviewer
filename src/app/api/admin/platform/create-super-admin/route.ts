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
        const { orgId, email, displayName, phoneNumber, actorUid, actorEmail } = body;

        if (!orgId || !email || !displayName) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Generate temporary password
        const tempPassword = generateTempPassword(8);

        // Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password: tempPassword,
            displayName,
            phoneNumber: phoneNumber || undefined,
            emailVerified: false,
        });

        console.log("[CreateSuperAdmin] Created auth user:", userRecord.uid);

        // Create user profile in Firestore
        const userProfile = {
            email,
            displayName,
            phoneNumber: phoneNumber || null,
            role: "super_admin",
            orgId,
            status: "active",
            mustResetPassword: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await adminDb.collection("users").doc(userRecord.uid).set(userProfile);

        console.log("[CreateSuperAdmin] Created Firestore profile");

        // Update organization's super admin list (optional, for tracking)
        const orgRef = adminDb.collection("organizations").doc(orgId);
        await orgRef.update({
            updatedAt: new Date(),
        });

        // Log platform action using adminDb
        if (actorUid && actorEmail) {
            await adminDb.collection("platformAuditLogs").add({
                actorUid,
                actorEmail,
                action: "SUPER_ADMIN_CREATED",
                targetOrgId: orgId,
                metadata: {
                    targetEmail: email,
                    targetName: displayName,
                    targetUid: userRecord.uid,
                },
                timestamp: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            tempPassword,
            userId: userRecord.uid,
        });
    } catch (error: any) {
        console.error("[CreateSuperAdmin] Error:", error);

        // Handle specific Firebase errors
        if (error.code === "auth/email-already-exists") {
            return NextResponse.json(
                { success: false, error: "A user with this email already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message || "Failed to create super admin" },
            { status: 500 }
        );
    }
}
