import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

const AuthContext = createContext({ user: null, ready: false, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); }), []);

  const logout = () => signOut(auth);
  return <AuthContext.Provider value={{ user, ready, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
