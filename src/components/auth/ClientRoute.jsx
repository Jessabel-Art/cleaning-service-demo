// src/components/auth/ClientRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-light-pink flex items-center justify-center">
      <div
        className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

/**
 * Robust client-only route.
 * Expects AuthContext to provide: { user, loading } or { user, status: 'loading'|'ready' }.
 */
export default function ClientRoute({ children }) {
  const location = useLocation();
  const ctx = useAuth?.() || {};
  const { user } = ctx;

  // Normalize loading flag from different context shapes
  const loading =
    (typeof ctx.loading === 'boolean' && ctx.loading) ||
    (typeof ctx.status === 'string' && ctx.status === 'loading') ||
    typeof user === 'undefined';

  if (loading) return <FullPageLoader />;

  if (!user) {
    // preserve where the user wanted to go
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
