// src/components/auth/AdminRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/pages/admin/hooks/useAdminAuth";

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-light-pink flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, details } = useAdminAuth();
  const location = useLocation();

  // Still show loader until Firebase auth is ready or admin checks completed
  if (loading) return <FullPageLoader />;

  const devDebugPanel = (
    <div className="p-4 m-4 rounded-lg border border-dashed border-plum/30 bg-white text-sm text-plum space-y-1">
      <div className="font-semibold">Admin gate debug (dev only)</div>
      <div>uid: {user?.uid || "(none)"}</div>
      <div>email: {user?.email || "(none)"}</div>
      <div>allowlist match: {String(details?.allowlistMatch)}</div>
      <div>allowlist values: {(details?.allowlist || []).join(", ") || "(empty)"}</div>
      <div>/admins doc exists: {String(details?.adminsDoc)}</div>
      <div>profile role: {details?.profileRole || "(none)"}</div>
      <div>custom claims admin: {String(details?.claimsAdmin)}</div>
      <div>checkedAt: {details?.checkedAt || "(pending)"}</div>
      {details?.error && <div className="text-red-600">error: {details.error}</div>}
    </div>
  );

  if (!isAdmin) {
    if (import.meta.env.DEV) {
      console.log("[AdminRoute] blocked", { user, details, from: location.pathname });
      return devDebugPanel;
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
      {import.meta.env.DEV && devDebugPanel}
      {children}
    </>
  );
}
