import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  buildAdminAllowlist,
  buildAdminUidAllowlist,
  checkAdminAuth,
} from "@/lib/adminAllowlist";
import { db } from "@/lib/firebase";

const EMPTY_RESULT = { allowed: false, reason: "not_admin", checks: {} };

export function useAdminAuth() {
  const { user, authReady } = useAuth();
  const [state, setState] = useState({
    loading: true,
    result: EMPTY_RESULT,
    error: null,
    adminDocFetched: false,
    profileFetched: false,
  });

  useEffect(() => {
    let cancelled = false;

    if (!authReady) {
      setState((current) => ({ ...current, loading: true }));
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setState({
        loading: false,
        result: EMPTY_RESULT,
        error: null,
        adminDocFetched: false,
        profileFetched: false,
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    Promise.allSettled([
      getDoc(doc(db, "admins", user.uid)),
      getDoc(doc(db, "profiles", user.uid)),
    ])
      .then(([adminResult, profileResult]) => {
        if (cancelled) return;

        const adminSnap =
          adminResult.status === "fulfilled" ? adminResult.value : null;
        const profileSnap =
          profileResult.status === "fulfilled" ? profileResult.value : null;
        const error =
          adminResult.status === "rejected"
            ? adminResult.reason
            : profileResult.status === "rejected"
            ? profileResult.reason
            : null;

        setState({
          loading: false,
          result: checkAdminAuth({
            user,
            adminDocActive:
              adminSnap?.exists() && adminSnap.data()?.active === true,
            profileRole: profileSnap?.exists()
              ? profileSnap.data()?.role
              : null,
          }),
          error,
          adminDocFetched: Boolean(adminSnap?.exists()),
          profileFetched: Boolean(profileSnap?.exists()),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  const allowlistInfo = useMemo(
    () => ({
      emailAllowlist: Array.from(buildAdminAllowlist()),
      uidAllowlist: Array.from(buildAdminUidAllowlist()),
      emailLower: user?.email?.toLowerCase() || null,
      uid: user?.uid || null,
      checks: state.result.checks,
      adminDocFetched: state.adminDocFetched,
      profileFetched: state.profileFetched,
    }),
    [state, user]
  );

  return {
    user,
    isAdmin: state.result.allowed,
    loading: !authReady || state.loading,
    authReady,
    error: state.error,
    allowlistInfo,
    authReason: state.result.reason,
  };
}
