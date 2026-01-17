import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        // Check if we have service account credentials
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccount) {
            try {
                // Use service account (production)
                const serviceAccountConfig = JSON.parse(serviceAccount);

                // Fix newline characters in private_key if they are escaped
                if (serviceAccountConfig.private_key) {
                    serviceAccountConfig.private_key = serviceAccountConfig.private_key.replace(/\\n/g, '\n');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountConfig),
                });
            } catch (parseError) {
                console.error("[Firebase Admin] Failed to parse service account JSON:", parseError);
                // Fallback to default credentials so app doesn't crash on export
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                });
            }
        } else {
            // Use Application Default Credentials (development)
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }

        console.log("[Firebase Admin] Initialized successfully");
    } catch (error) {
        console.error("[Firebase Admin] Initialization error:", error);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
