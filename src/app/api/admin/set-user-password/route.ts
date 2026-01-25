import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, password, orgId, actorUid, actorEmail } = body;

        if (!uid || !password || !orgId || !actorUid) {
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

        // 1. Verify Actor Permissions
        const actorDoc = await adminDb.collection("users").doc(actorUid).get();
        const actorData = actorDoc.data();

        if (!actorData) {
            return NextResponse.json(
                { success: false, error: "Actor not found" },
                { status: 403 }
            );
        }

        // Check if actor is platform super admin/owner OR org admin for this specific org
        const isPlatformAdmin = actorData.role === "platform_owner" || actorData.role === "super_admin"; // Note: 'role' on user doc might be platform role
        const isOrgAdmin = actorData.orgId === orgId && (actorData.role === "admin" || actorData.role === "super_admin");

        // We also check 'platformRole' field if it exists, to be safe, as schema might vary
        const hasPlatformPrivileges = isPlatformAdmin || actorData.platformRole === "owner" || actorData.platformRole === "super_admin";

        if (!isOrgAdmin && !hasPlatformPrivileges) {
            return NextResponse.json(
                { success: false, error: "Insufficient permissions" },
                { status: 403 }
            );
        }

        // 2. Verify Target User
        const targetDoc = await adminDb.collection("users").doc(uid).get();
        const targetData = targetDoc.data();

        if (!targetData) {
            return NextResponse.json(
                { success: false, error: "Target user not found" },
                { status: 404 }
            );
        }

        // Ensure target belongs to the same org (unless actor is platform admin)
        if (!hasPlatformPrivileges && targetData.orgId !== orgId) {
            return NextResponse.json(
                { success: false, error: "Target user does not belong to your organization" },
                { status: 403 }
            );
        }

        // 3. Update Password
        await adminAuth.updateUser(uid, {
            password: password,
        });

        // 4. Set Force Reset Flag
        await adminDb.collection("users").doc(uid).update({
            mustResetPassword: true,
            updatedAt: new Date(),
        });

        // 5. Log Action
        if (actorUid && actorEmail) {
            await adminDb.collection("orgChangeLogs").add({
                orgId,
                action: "PASSWORD_OVERRIDE",
                actorUid,
                actorEmail,
                actorName: actorData.displayName || "Unknown",
                actorRole: actorData.role || "unknown",
                targetUid: uid,
                targetEmail: targetData.email,
                targetRole: targetData.role || "unknown",
                details: "Manual password override by admin",
                timestamp: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            message: "Password updated successfully",
        });

    } catch (error: any) {
        console.error("[SetUserPassword] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to set password" },
            { status: 500 }
        );
    }
}
