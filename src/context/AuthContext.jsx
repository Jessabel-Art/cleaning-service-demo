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
  const [user, setUser] = useState(null);       // null = no user, value = authed
  const [authReady, setAuthReady] = useState(false); // false until Firebase resolves

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const google = useMemo(() => new GoogleAuthProvider(), []);

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
    [user, authReady, google]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    if (import.meta?.env?.DEV) {
      // Dev-only hint to help locate missing provider usage without breaking unrelated pages
      // The actual error is still thrown to fail only the component tree that calls useAuth
      // so that routes like ClientRoute/AdminRoute surface the problem clearly.
      // eslint-disable-next-line no-console
      console.warn('useAuth called without AuthProvider context. Ensure your app is wrapped in <AuthProvider>.');
    }
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
