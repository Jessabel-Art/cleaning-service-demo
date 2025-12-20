// pages/admin/hooks/useAdminAuth.js
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildAdminAllowlist } from "@/lib/adminAllowlist";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Unified admin check used by AdminRoute, header, and admin pages.
// Sources: env allowlist, /admins/{uid} doc, profiles/{uid}.role, auth custom claim "admin".
export function useAdminAuth() {
  const { user, authReady } = useAuth();
  const [details, setDetails] = useState({
    allowlistMatch: false,
    adminsDoc: false,
    profileRole: null,
    claimsAdmin: false,
    checkedAt: null,
    loading: false,
    error: null,
  });

  const allowlistInfo = useMemo(() => {
    const allowlistSet = buildAdminAllowlist();
    const emailLower = user?.email ? user.email.toLowerCase() : null;
    return {
      allowlist: Array.from(allowlistSet),
      allowlistMatch: emailLower ? allowlistSet.has(emailLower) : false,
      emailLower,
    };
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setDetails((prev) => ({
        ...prev,
        allowlistMatch: false,
        adminsDoc: false,
        profileRole: null,
        claimsAdmin: false,
        checkedAt: new Date().toISOString(),
        loading: false,
        error: null,
      }));
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      setDetails((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [adminSnap, profileSnap, tokenResult] = await Promise.all([
          getDoc(doc(db, "admins", user.uid)),
          getDoc(doc(db, "profiles", user.uid)),
          user.getIdTokenResult().catch(() => null),
        ]);

        const roleRaw = profileSnap.exists() ? profileSnap.data()?.role : null;
        if (cancelled) return;
        setDetails({
          allowlistMatch: allowlistInfo.allowlistMatch,
          adminsDoc: adminSnap.exists(),
          profileRole: roleRaw ? String(roleRaw).toLowerCase() : null,
          claimsAdmin: !!tokenResult?.claims?.admin,
          checkedAt: new Date().toISOString(),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        console.warn("[useAdminAuth] fetch error", err);
        setDetails((prev) => ({
          ...prev,
          loading: false,
          error: err?.message || String(err),
          checkedAt: new Date().toISOString(),
        }));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, allowlistInfo.allowlistMatch]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = details.profileRole;
    const roleIsAdmin = role === "admin" || role === "owner";
    return (
      allowlistInfo.allowlistMatch ||
      details.adminsDoc ||
      roleIsAdmin ||
      details.claimsAdmin
    );
  }, [user, details.adminsDoc, details.profileRole, details.claimsAdmin, allowlistInfo.allowlistMatch]);

  const loading = !authReady || details.loading;

  return {
    user,
    isAdmin,
    loading,
    authReady,
    details: {
      ...details,
      allowlist: allowlistInfo.allowlist,
      emailLower: allowlistInfo.emailLower,
    },
  };
}
