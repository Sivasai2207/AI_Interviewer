# Vercel Deployment Guide

This app uses Firebase Admin SDK which requires a service account for server-side operations (Firestore, Auth).

## Required Environment Variables on Vercel

### 1. FIREBASE_SERVICE_ACCOUNT_KEY

**This is the most common cause of the "Could not load the default credentials" error.**

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Project Settings** → **Service Accounts**
3. Click **"Generate new private key"** → Download the JSON file
4. **Convert to single-line JSON** (for Vercel compatibility):
   ```bash
   node -e "console.log(JSON.stringify(require('./YOUR_SERVICE_ACCOUNT.json')))"
   ```
5. Copy the output (entire JSON string, **including quotes**)
6. In Vercel Dashboard → **Settings** → **Environment Variables**:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the JSON string
   - **Environments:** Production, Preview, Development

### 2. ENCRYPTION_KEY

Used to encrypt user API keys at rest.

```bash
# Generate a new encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to Vercel:
- **Name:** `ENCRYPTION_KEY`
- **Value:** The 64-character hex string

### 3. Firebase Client Config (NEXT_PUBLIC_*)

All `NEXT_PUBLIC_*` variables from `.env.local.example` must also be added to Vercel.

## Troubleshooting

### "Could not load the default credentials"
→ `FIREBASE_SERVICE_ACCOUNT_KEY` is missing or malformed.

### API Key verify/save fails
→ Check `ENCRYPTION_KEY` is set.

### Interview creation fails
→ Check all Firebase client variables are set.

## Quick Checklist

| Variable | Type | Required |
|:---|:---|:---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Secret | ✅ |
| `ENCRYPTION_KEY` | Secret | ✅ |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | ✅ |
