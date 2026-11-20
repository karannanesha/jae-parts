// Creates the Firebase app + services for one web app (store or admin).
// When VITE_USE_EMULATORS=true, everything talks to the local Emulator Suite
// (`npm run emulators` at the repo root) instead of the real dev project.

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

export const FUNCTIONS_REGION = 'asia-south1';

export function createFirebase(config, { useEmulators = false } = {}) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);

  if (useEmulators) {
    const host = '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
  }

  return { app, auth, db, storage, functions };
}
