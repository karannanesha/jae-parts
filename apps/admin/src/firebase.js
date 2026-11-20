import { createFirebase } from '@jae/shared/firebase.js';

// Web app "admin" in the jae-parts-dev project. These values are public identifiers, not secrets.
const firebaseConfig = {
  apiKey: 'AIzaSyCNn6MTBBTLDKMTXIdmNrcB7JgW7Q90EWU',
  authDomain: 'jae-parts-dev.firebaseapp.com',
  projectId: 'jae-parts-dev',
  storageBucket: 'jae-parts-dev.firebasestorage.app',
  messagingSenderId: '744815827156',
  appId: '1:744815827156:web:9d74a1e7520697a28ec341',
};

export const { app, auth, db, storage, functions } = createFirebase(firebaseConfig, {
  useEmulators: import.meta.env.VITE_USE_EMULATORS === 'true',
});
