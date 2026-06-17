import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export function useAdminAuth() {
  const { user, authReady } = useAuth();
  const isAdmin = user?.demoRole === "admin";

  const allowlistInfo = useMemo(
    () => ({
      emailAllowlist: [],
      uidAllowlist: [],
      emailLower: user?.email?.toLowerCase() || null,
      uid: user?.uid || null,
      checks: { demoAdmin: isAdmin },
      adminDocFetched: false,
      profileFetched: false,
    }),
    [isAdmin, user]
  );

  return {
    user,
    isAdmin,
    loading: !authReady,
    authReady,
    error: null,
    allowlistInfo,
    authReason: isAdmin ? "demo_admin" : "not_admin",
  };
}
