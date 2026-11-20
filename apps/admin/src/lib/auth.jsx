import { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';

// Admin access = Firebase Auth user with custom claim { admin: true }.
// Grant it with:  node scripts/set-admin.mjs you@example.com   (see README)
const Ctx = createContext(null);

export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ user: null, isAdmin: false, ready: false });

  useEffect(() => onIdTokenChanged(auth, async (user) => {
    if (!user) { setState({ user: null, isAdmin: false, ready: true }); return; }
    const token = await user.getIdTokenResult();
    setState({ user, isAdmin: token.claims.admin === true, ready: true });
  }), []);

  const value = {
    ...state,
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    refreshClaims: () => auth.currentUser?.getIdToken(true),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAdmin = () => useContext(Ctx);
