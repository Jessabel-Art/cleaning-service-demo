import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearDemoSession,
  createDemoUser,
  findDemoCredential,
  getDemoSession,
  setDemoSession,
} from "@/lib/demoAuth";

const AuthCtx = createContext(null);

function createLocalUser({ email, displayName }) {
  return {
    uid: "demo-local-user",
    displayName: displayName || "Demo User",
    email: email || "demo.user@example.com",
    phoneNumber: null,
    isDemo: true,
    demoRole: "client",
    username: "clientdemo",
  };
}

export function AuthProvider({ children }) {
  const [demoSession, setDemoSessionState] = useState(() => getDemoSession());
  const [localUser, setLocalUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const user = demoSession ? createDemoUser(demoSession) : localUser;

  const signIn = useCallback(async (username, password) => {
    const demoCredential = findDemoCredential(username, password);
    if (!demoCredential) {
      throw new Error("invalid-demo-credentials");
    }

    const nextDemoSession = setDemoSession(demoCredential);
    setDemoSessionState(nextDemoSession);
    setLocalUser(null);
    return { user: createDemoUser(nextDemoSession), demo: true };
  }, []);

  const signUp = useCallback(async (email, password, displayName = "") => {
    if (!email || !password) {
      throw new Error("Email and password are required for this demo action.");
    }

    clearDemoSession();
    setDemoSessionState(null);
    const nextUser = createLocalUser({ email, displayName });
    setLocalUser(nextUser);
    return { user: nextUser, demo: true };
  }, []);

  const signOut = useCallback(async () => {
    clearDemoSession();
    setDemoSessionState(null);
    setLocalUser(null);
  }, []);

  const resetPassword = useCallback(async () => ({ demo: true }), []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      signIn,
      signUp,
      resetPassword,
      signOut,
    }),
    [user, authReady, signIn, signUp, resetPassword, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
