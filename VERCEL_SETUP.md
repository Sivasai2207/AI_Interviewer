# Fixing Firebase Admin on Vercel

The error `Could not load the default credentials` happens because Vercel doesn't have access to your local JSON key file. 

We have updated the code to support standard Environment Variables. You need to add these two variables to your Vercel Project Settings:

1. `FIREBASE_CLIENT_EMAIL`
2. `FIREBASE_PRIVATE_KEY`

## How to get the values

We created a helper script to extract these values from your local JSON file.

1. Run this command in your terminal:
   ```bash
   node scripts/extract-firebase-env.js
   ```

2. Represents:
   *   **FIREBASE_CLIENT_EMAIL**: Copy the email address shown.
   *   **FIREBASE_PRIVATE_KEY**: Copy the *entire* private key string (including `-----BEGIN PRIVATE KEY...` and `...END PRIVATE KEY-----`).

3. Go to your Vercel Dashboard -> Project -> Settings -> Environment Variables.
4. Add the new variables.
5. **Redeploy** your project (or push a new commit) for changes to take effect.
