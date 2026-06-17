// src/components/auth/AdminRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/pages/admin/hooks/useAdminAuth";
import { AdminDiagnostics } from "@/pages/admin/components/AdminDiagnostics";
import { isDemoAdminSession } from "@/lib/demoAuth";

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-clean-bg flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, authReady, allowlistInfo, authReason } = useAdminAuth();
  const location = useLocation();

  const isDemoAdmin = isDemoAdminSession();

  const isDev = import.meta.env.DEV;
  const debugParam = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("debug") === "1";
  }, [location.search]);
  
  const canShowDiagnostics = isDev || (isAdmin && debugParam);

  if (!isDemoAdmin && (!authReady || loading)) return <FullPageLoader />;

  if (!isAdmin && !isDemoAdmin) {
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
