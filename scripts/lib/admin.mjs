// Firebase Admin SDK for local scripts.
//
//  • Emulators:  pass --emulators (or set USE_EMULATORS=1). No credentials needed.
//  • Real project: either `gcloud auth application-default login`, or download a service-account
//                key (Firebase console › Project settings › Service accounts) and set
//                GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json. Never commit that file.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

if (process.argv.includes('--emulators')) process.env.USE_EMULATORS = '1';

export const PROJECT_ID = process.env.FIREBASE_PROJECT || 'jae-parts-dev';
export const BUCKET = process.env.FIREBASE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;
export const USING_EMULATORS = process.env.USE_EMULATORS === '1' || !!process.env.FIRESTORE_EMULATOR_HOST;

if (process.env.USE_EMULATORS === '1') {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
}

const app = initializeApp(USING_EMULATORS
  ? { projectId: PROJECT_ID, storageBucket: BUCKET }
  : { credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });

export const db = getFirestore(app);
export const auth = getAuth(app);
export const bucket = getStorage(app).bucket();

export function publicUrl(path, token) {
  const base = USING_EMULATORS ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

console.log(`→ Firebase ${USING_EMULATORS ? 'EMULATORS' : 'project'}: ${PROJECT_ID}`);
