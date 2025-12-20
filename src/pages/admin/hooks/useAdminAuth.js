// pages/admin/hooks/useAdminAuth.js
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { checkAdminAuth, buildAdminAllowlist, buildAdminUidAllowlist } from "@/lib/adminAllowlist";

// Unified admin check used by AdminRoute, header, and admin pages.
// Uses centralized checkAdminAuth() for consistency.
// NO Firestore reads to avoid permission errors for non-admin users.
export function useAdminAuth() {
  const { user, authReady } = useAuth();

  const authResult = useMemo(() => {
    if (!user) {
      return {
        allowed: false,
        reason: "No user signed in",
        checks: { emailMatch: false, uidMatch: false, profileRole: false },
      };
    }
    // Use centralized auth checker
    return checkAdminAuth(user, null);
  }, [user]);

  const allowlistInfo = useMemo(() => {
    const emailAllowlist = buildAdminAllowlist();
    const uidAllowlist = buildAdminUidAllowlist();
    
    return {
      emailAllowlist: Array.from(emailAllowlist),
      uidAllowlist: Array.from(uidAllowlist),
      emailMatch: authResult.checks.emailMatch,
      uidMatch: authResult.checks.uidMatch,
      profileRole: authResult.checks.profileRole,
      emailLower: user?.email ? user.email.toLowerCase() : null,
      uid: user?.uid || null,
      checkedAt: new Date().toISOString(),
    };
  }, [authResult, user?.email, user?.uid]);

  const isAdmin = authResult.allowed;

  return {
    user,
    isAdmin,
    loading: !authReady,
    authReady,
    error: null,
    // Diagnostic details for dev debugging
    allowlistInfo,
    authReason: authResult.reason, // Why was access granted/denied
  };
}
