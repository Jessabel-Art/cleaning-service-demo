// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const google = new GoogleAuthProvider();

  const value = useMemo(
    () => ({
      user,
      authReady,
      signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signUp: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      signInWithGoogle: () => signInWithPopup(auth, google),
      resetPassword: (email) => sendPasswordResetEmail(auth, email),
      signOut: () => fbSignOut(auth),
    }),
    [user, authReady]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
