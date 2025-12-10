// src/components/auth/AdminRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isEmailAdmin } from "@/lib/adminAllowlist";

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-light-pink flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function AdminRoute({ children }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  // Still show loader until Firebase auth is ready
  if (!authReady) return <FullPageLoader />;

  const isAdmin = !!user && isEmailAdmin(user.email);

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}
