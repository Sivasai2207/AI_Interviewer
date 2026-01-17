# Setting Up Firebase Admin Credentials

To delete users and perform other administrative actions locally, the application needs **Admin Privileges**. This is provided via a **Service Account Key**.

## Step 1: Generate the Key
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Open your project.
3. Click the **Gear Icon** (Settings) > **Project settings**.
4. Go to the **Service accounts** tab.
5. Click **Generate new private key**.
6. This will download a `.json` file to your computer.

## Step 2: Format the Key
The content of the JSON file needs to be added to your `.env.local` file. Since `.env` files don't handle newlines well, you should flatten the JSON into a single line.

**Example JSON:**
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgEqh..."
  ...
}
```

## Step 3: Add to Environment Variables
1. Open `.env.local` in your project root.
2. Add a new variable `FIREBASE_SERVICE_ACCOUNT_KEY`.
3. Paste the **entire JSON content** as the value. Use single quotes `'` around the value to be safe.

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
```

> **Note:** Make sure you copy the entire content of the JSON file.

## Step 4: Restart Server
Stop your running server (Ctrl+C) and restart it:
```bash
npm run dev
```

## Why is this needed?
Deleting users is a sensitive operation. The Firebase Client SDK (what runs in the browser) **cannot** delete other users for security reasons. We use the **Admin SDK** on the server (Next.js API Routes) to perform this action securely, and the Admin SDK requires this Service Account to prove it has permission.
