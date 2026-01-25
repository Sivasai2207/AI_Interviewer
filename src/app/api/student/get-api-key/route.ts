import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { decryptApiKey } from "@/lib/utils/crypto";

export const dynamic = 'force-dynamic';

/**
 * GET /api/student/get-api-key
 * 
 * Securely fetches and decrypts the user's Gemini API key for client-side use.
 * This endpoint requires authentication and only returns the key to the owner.
 */
export async function GET(request: NextRequest) {
    try {
        // Get auth token from header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.split("Bearer ")[1];

        // Verify the token
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const uid = decodedToken.uid;

        // Fetch user's encrypted API key
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Check if API key exists and is verified
        if (userData.aiKey?.status !== "verified" || !userData.aiKeyEncrypted) {
            return NextResponse.json(
                { error: "API key not verified. Please add your API key in profile settings." },
                { status: 400 }
            );
        }

        // Decrypt the API key
        let apiKey: string;
        try {
            apiKey = decryptApiKey(userData.aiKeyEncrypted);
        } catch (error) {
            console.error("Failed to decrypt API key:", error);
            return NextResponse.json(
                { error: "Failed to decrypt API key" },
                { status: 500 }
            );
        }

        // Return the decrypted key
        // Note: This is secure because:
        // 1. Only authenticated users can access this
        // 2. Users can only get their own key
        // 3. The key was already provided by the user
        return NextResponse.json({ apiKey });

    } catch (error: any) {
        console.error("[get-api-key] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
