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
  const { user, isAdmin, loading, allowlistInfo, authReason } = useAdminAuth();
  const location = useLocation();

  // Check for ?debug=1 query param
  const showDebug = React.useMemo(() => {
    if (import.meta.env.DEV) return true;
    const params = new URLSearchParams(location.search);
    return params.get("debug") === "1";
  }, [location.search]);

  // Still show loader until Firebase auth is ready or admin checks completed
  if (loading) return <FullPageLoader />;

  if (!isAdmin) {
    if (showDebug) {
      console.log("[AdminRoute] blocked", { user, allowlistInfo, authReason, from: location.pathname });
      return <AdminDiagnostics user={user} isAdmin={isAdmin} allowlistInfo={allowlistInfo} authReason={authReason} />;
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
      {showDebug && <AdminDiagnostics user={user} isAdmin={isAdmin} allowlistInfo={allowlistInfo} authReason={authReason} />}
      {children}
    </>
  );
}
