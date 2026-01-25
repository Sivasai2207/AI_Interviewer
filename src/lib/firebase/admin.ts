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
        } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            // Use individual environment variables (easier for Vercel)
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log("[Firebase Admin] Initialized with individual environment variables");
        } else {
            // Use Application Default Credentials (development/GCP)
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
