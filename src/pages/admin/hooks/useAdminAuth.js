// pages/admin/hooks/useAdminAuth.js
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildAdminAllowlist, buildAdminUidAllowlist } from "@/lib/adminAllowlist";

// Unified admin check used by AdminRoute, header, and admin pages.
// Sources: VITE_ADMIN_UIDS and VITE_ADMIN_EMAILS (with hardcoded fallbacks).
// NO Firestore reads to avoid permission errors for non-admin users.
export function useAdminAuth() {
  const { user, authReady } = useAuth();

  const allowlistInfo = useMemo(() => {
    const emailAllowlist = buildAdminAllowlist();
    const uidAllowlist = buildAdminUidAllowlist();
    const emailLower = user?.email ? user.email.toLowerCase() : null;
    const uid = user?.uid || null;

    const emailMatch = emailLower ? emailAllowlist.has(emailLower) : false;
    const uidMatch = uid ? uidAllowlist.has(uid) : false;

    return {
      emailAllowlist: Array.from(emailAllowlist),
      uidAllowlist: Array.from(uidAllowlist),
      emailMatch,
      uidMatch,
      emailLower,
      uid,
    };
  }, [user?.email, user?.uid]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return allowlistInfo.emailMatch || allowlistInfo.uidMatch;
  }, [user, allowlistInfo.emailMatch, allowlistInfo.uidMatch]);

  return {
    user,
    isAdmin,
    loading: !authReady,
    authReady,
    error: null,
    details: {
      allowlistMatch: allowlistInfo.emailMatch || allowlistInfo.uidMatch,
      emailAllowlist: allowlistInfo.emailAllowlist,
      uidAllowlist: allowlistInfo.uidAllowlist,
      emailLower: allowlistInfo.emailLower,
      uid: allowlistInfo.uid,
      checkedAt: new Date().toISOString(),
    },
  };
}
