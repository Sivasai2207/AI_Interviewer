import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orgId, confirmationText, actorUid, actorEmail } = body;

        if (!orgId || !confirmationText) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get organization data
        const orgDoc = await adminDb.collection("organizations").doc(orgId).get();

        if (!orgDoc.exists) {
            return NextResponse.json(
                { success: false, error: "Organization not found" },
                { status: 404 }
            );
        }

        const orgData = orgDoc.data();

        // Verify confirmation text matches organization name
        if (confirmationText !== orgData?.name) {
            return NextResponse.json(
                { success: false, error: "Confirmation text does not match organization name" },
                { status: 400 }
            );
        }

        console.log(`[DeleteOrganization] Starting deletion of org: ${orgData?.name} (${orgId})`);

        // Step 1: Get all users in this organization
        const usersSnapshot = await adminDb
            .collection("users")
            .where("orgId", "==", orgId)
            .get();

        let deletedUsersCount = 0;
        const userDeletionPromises: Promise<void>[] = [];

        // Step 2: Delete each user from Auth and Firestore
        usersSnapshot.forEach((doc) => {
            const userId = doc.id;

            const deletePromise = (async () => {
                try {
                    // Delete from Firebase Auth
                    await adminAuth.deleteUser(userId);
                    console.log(`[DeleteOrganization] Deleted auth for user: ${userId}`);
                } catch (authError: any) {
                    // If user doesn't exist in Auth, that's okay
                    if (authError.code !== "auth/user-not-found") {
                        console.error(`[DeleteOrganization] Error deleting auth for ${userId}:`, authError);
                    }
                }

                // Delete from Firestore
                await adminDb.collection("users").doc(userId).delete();
                console.log(`[DeleteOrganization] Deleted Firestore doc for user: ${userId}`);
            })();

            userDeletionPromises.push(deletePromise);
        });

        await Promise.all(userDeletionPromises);
        deletedUsersCount = usersSnapshot.size;

        console.log(`[DeleteOrganization] Deleted ${deletedUsersCount} users`);

        // Step 3: Delete organization change logs
        const changeLogsSnapshot = await adminDb
            .collection("orgChangeLogs")
            .where("orgId", "==", orgId)
            .get();

        const logDeletePromises = changeLogsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(logDeletePromises);

        console.log(`[DeleteOrganization] Deleted ${changeLogsSnapshot.size} change logs`);

        // Step 4: Delete impersonation sessions
        const impersonationSnapshot = await adminDb
            .collection("impersonationSessions")
            .where("orgId", "==", orgId)
            .get();

        const impersonationDeletePromises = impersonationSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(impersonationDeletePromises);

        console.log(`[DeleteOrganization] Deleted ${impersonationSnapshot.size} impersonation sessions`);

        // Step 5: Delete interviews (if any)
        const interviewsSnapshot = await adminDb
            .collection("interviews")
            .where("orgId", "==", orgId)
            .get();

        const interviewDeletePromises = interviewsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(interviewDeletePromises);

        console.log(`[DeleteOrganization] Deleted ${interviewsSnapshot.size} interviews`);

        // Step 6: Delete the organization document itself
        await adminDb.collection("organizations").doc(orgId).delete();
        console.log(`[DeleteOrganization] Deleted organization document`);

        // Step 7: Delete org slug reference
        if (orgData?.slug) {
            await adminDb.collection("orgSlugs").doc(orgData.slug).delete();
            console.log(`[DeleteOrganization] Deleted org slug: ${orgData.slug}`);
        }

        // Log platform action using adminDb
        if (actorUid && actorEmail) {
            await adminDb.collection("platformAuditLogs").add({
                actorUid,
                actorEmail,
                action: "ORG_DELETED",
                targetOrgId: orgId,
                targetOrgName: orgData?.name || "Unknown",
                metadata: {
                    deletedUsers: deletedUsersCount,
                    deletedChangeLogs: changeLogsSnapshot.size,
                    deletedInterviews: interviewsSnapshot.size,
                },
                timestamp: new Date(),
            });
        }

        console.log(`[DeleteOrganization] Successfully deleted organization: ${orgData?.name}`);

        return NextResponse.json({
            success: true,
            deletedUsers: deletedUsersCount,
            message: `Organization "${orgData?.name}" and all associated data have been permanently deleted.`,
        });
    } catch (error: any) {
        console.error("[DeleteOrganization] Error:", error);

        return NextResponse.json(
            { success: false, error: error.message || "Failed to delete organization" },
            { status: 500 }
        );
    }
}
