import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateTargetRoles } from "@/lib/roleCatalog";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, orgId, targetRoles } = body;

        if (!uid || !orgId || !targetRoles) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (uid, orgId, targetRoles)" },
                { status: 400 }
            );
        }

        // Validate roles against catalog
        const validation = validateTargetRoles(targetRoles);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: 400 }
            );
        }

        // Verify user exists and is a student in the org
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        if (userData.orgId !== orgId) {
            return NextResponse.json(
                { success: false, error: "User does not belong to this organization" },
                { status: 403 }
            );
        }

        if (userData.role !== "student") {
            return NextResponse.json(
                { success: false, error: "Only students can update target roles" },
                { status: 403 }
            );
        }

        // Update user profile with target roles and onboarding status
        await adminDb.collection("users").doc(uid).update({
            targetRoles: targetRoles,
            "onboarding.completed": true,
            "onboarding.completedAt": FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[UpdateTargetRoles] Updated roles for user ${uid}:`, targetRoles);

        return NextResponse.json({
            success: true,
            message: "Target roles updated successfully",
        });

    } catch (error: any) {
        console.error("[UpdateTargetRoles] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update target roles" },
            { status: 500 }
        );
    }
}
