// src/components/auth/AdminRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/pages/admin/hooks/useAdminAuth";
import { AdminDiagnostics } from "@/pages/admin/components/AdminDiagnostics";

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-light-pink flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, authReady, allowlistInfo, authReason } = useAdminAuth();
  const location = useLocation();

  // Determine diagnostic visibility:
  // 1. Always show in DEV mode
  // 2. Show in prod only if user is admin AND ?debug=1 present
  const isDev = import.meta.env.DEV;
  const debugParam = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("debug") === "1";
  }, [location.search]);
  
  const canShowDiagnostics = isDev || (isAdmin && debugParam);

  // Show loader if still initializing auth OR admin check not yet complete
  if (!authReady || loading) return <FullPageLoader />;

  // Only block if auth is settled AND user is not admin
  if (!isAdmin) {
    if (canShowDiagnostics) {
      console.log("[AdminRoute] blocked", { user, authReason, from: location.pathname });
      return <AdminDiagnostics user={user} isAdmin={isAdmin} allowlistInfo={allowlistInfo} authReason={authReason} isDev={isDev} />;
    }
    return (
      <Navigate
        to="/"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return (
    <>
      {canShowDiagnostics && <AdminDiagnostics user={user} isAdmin={isAdmin} allowlistInfo={allowlistInfo} authReason={authReason} isDev={isDev} />}
      {children}
    </>
  );
}
