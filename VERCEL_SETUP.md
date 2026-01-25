# 🚀 Vercel Deployment Setup

## Required Environment Variables

You MUST add these variables in **Vercel Dashboard > Project > Settings > Environment Variables**:

### 1. Firebase Client SDK (NEXT_PUBLIC_*)

These are already set if your app loads at all. Verify they exist:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `interview-ai-1f679` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID |

---

### 2. Firebase Admin SDK (SERVER-SIDE) ⚠️ CRITICAL

These are needed for API routes to work. Add BOTH:

| Variable | Value |
|----------|-------|
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@interview-ai-1f679.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | The entire private key block (see below) |

**To get the private key:**
```bash
node scripts/extract-firebase-env.js
```

---

### 3. Encryption Key ⚠️ CRITICAL

| Variable | Value |
|----------|-------|
| `ENCRYPTION_KEY` | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2` |

> ⚠️ This MUST match what's in your local `.env.local`. If different, users' stored API keys won't decrypt!

---

## Firestore Index Required

Click this link to create the required index:

👉 [Create Composite Index](https://console.firebase.google.com/v1/r/project/interview-ai-1f679/firestore/indexes?create_composite=ClVwcm9qZWN0cy9pbnRlcnZpZXctYWktMWY2NzkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2ludGVydmlld3MvaW5kZXhlcy9fEAEaBwoDdWlkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

---

## After Adding Variables

1. **Redeploy**: Go to Deployments tab, click the `...` menu, and select "Redeploy"
2. **Test**: Try creating an interview again
3. **Check Logs**: If still failing, check Vercel Logs for `[Firebase Admin]` messages
