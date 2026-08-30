// backend/firebase.ts
import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Path to the service‑account JSON key.
// • If you set the env var GOOGLE_APPLICATION_CREDENTIALS, it will be used.
// • Otherwise we fall back to a file placed next to this module.
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    path.resolve(__dirname, 'firebase-key.json');

// Initialise the Firebase Admin SDK (once per process)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath as string),
    });
}

// Export Firestore for use in `server.ts`
export const db = admin.firestore();
