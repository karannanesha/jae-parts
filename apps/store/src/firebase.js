import { createFirebase } from '@jae/shared/firebase.js';

// Web app "store" in the jae-parts-dev project. These values are public identifiers, not secrets.
const firebaseConfig = {
  apiKey: 'AIzaSyCNn6MTBBTLDKMTXIdmNrcB7JgW7Q90EWU',
  authDomain: 'jae-parts-dev.firebaseapp.com',
  projectId: 'jae-parts-dev',
  storageBucket: 'jae-parts-dev.firebasestorage.app',
  messagingSenderId: '744815827156',
  appId: '1:744815827156:web:14510bb75cf464af8ec341',
};

export const { app, auth, db, storage, functions } = createFirebase(firebaseConfig, {
  useEmulators: import.meta.env.VITE_USE_EMULATORS === 'true',
});
