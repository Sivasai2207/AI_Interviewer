import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { encryptApiKey, maskApiKey } from "@/lib/utils/crypto";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { uid, orgId, apiKey } = await req.json();

        if (!uid || !apiKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        console.log(`[VerifyKey] Verifying key for user ${uid}`);

        // 1. Verify with ListModels API (recommended approach)
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
                { method: "GET" }
            );

            console.log(`[VerifyKey] ListModels response status: ${response.status}`);

            if (response.status === 200) {
                // Key is valid
                const data = await response.json();
                console.log(`[VerifyKey] Key is valid, found ${data.models?.length || 0} models`);
            } else if (response.status === 401 || response.status === 403) {
                // Invalid or unauthorized key
                console.error(`[VerifyKey] Key is invalid (${response.status})`);
                return NextResponse.json({
                    ok: false,
                    error: "The API key provided is not valid or does not have access."
                });
            } else if (response.status === 429) {
                // Quota exceeded but key is valid
                console.warn("[VerifyKey] Quota exceeded but key is valid");
                // We'll still save the key as verified, but warn the user
            } else {
                // Other error
                const errorText = await response.text();
                console.error(`[VerifyKey] Unexpected status ${response.status}:`, errorText);
                return NextResponse.json({
                    ok: false,
                    error: `Verification failed with status ${response.status}. Please try again.`
                });
            }

        } catch (error: any) {
            console.error("[VerifyKey] Network error during verification:", error);
            return NextResponse.json({
                ok: false,
                error: "Network error during verification. Please check your internet connection."
            });
        }

        // 2. Encrypt and Save on Success
        try {
            const encryptedKey = encryptApiKey(apiKey);
            const maskedKey = maskApiKey(apiKey);

            const userRef = adminDb.collection("users").doc(uid);
            await userRef.update({
                aiKey: {
                    status: "verified",
                    masked: maskedKey,
                    verifiedAt: Timestamp.now(),
                    lastCheckedAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                },
                aiKeyEncrypted: encryptedKey
            });

            console.log("[VerifyKey] Key saved successfully");

            return NextResponse.json({
                ok: true,
                status: "verified",
                masked: maskedKey
            });

        } catch (dbError: any) {
            console.error("[VerifyKey] Database error:", dbError);
            return NextResponse.json({ error: "Failed to save key to secure storage" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("[VerifyKey] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
