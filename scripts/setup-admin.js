#!/usr/bin/env node

/**
 * Admin Setup Script
 * 
 * This script creates the initial admin account for the AI Interviewer portal.
 * 
 * Usage:
 * 1. First, create a user account in Firebase Console or via the app
 * 2. Run: node scripts/setup-admin.js <email>
 * 
 * Example:
 * node scripts/setup-admin.js admin@college.edu
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Check for email argument
const email = process.argv[2];

if (!email) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     AI Interviewer Admin Setup                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Creates or promotes a user to Admin role.                        ║
║                                                                    ║
║  OPTION 1: Set up via Firebase Console (Recommended)              ║
║  ─────────────────────────────────────────────────────────────────║
║  1. Go to console.firebase.google.com                             ║
║  2. Open your project > Firestore Database                        ║
║  3. Navigate to users collection                                   ║
║  4. Find the user document and add/update:                        ║
║     role: "admin"                                                  ║
║                                                                    ║
║  OPTION 2: Create fresh admin account                             ║
║  ─────────────────────────────────────────────────────────────────║
║  1. First, sign up via Google in the app (as admin@college.edu)   ║
║  2. Then run: node scripts/setup-admin.js admin@college.edu       ║
║                                                                    ║
║  NOTE: This script requires Firebase Admin SDK credentials.       ║
║  Download service account key from Firebase Console and set:       ║
║  GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  process.exit(0);
}

async function setupAdmin() {
  try {
    // Initialize Firebase Admin
    initializeApp();
    
    const db = getFirestore();
    const auth = getAuth();
    
    console.log(`\n🔍 Looking for user: ${email}`);
    
    // Find user by email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      console.error(`\n❌ User not found: ${email}`);
      console.log('Please make sure the user has signed up first.\n');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.displayName || user.uid}`);
    
    // Update user profile in Firestore
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing profile
      await userRef.update({
        role: 'admin',
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Updated existing profile to admin role');
    } else {
      // Create new profile
      await userRef.set({
        email: user.email,
        displayName: user.displayName || 'Admin',
        role: 'admin',
        settings: {},
        apiKeyStatus: 'unknown',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Created new admin profile');
    }
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                      ✅ Admin Setup Complete!                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  User: ${email.padEnd(50)}║
║  Role: admin                                                       ║
║                                                                    ║
║  The user can now log in and access the Admin Portal at /admin    ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
    `);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you have set GOOGLE_APPLICATION_CREDENTIALS environment variable.\n');
    process.exit(1);
  }
}

setupAdmin();
