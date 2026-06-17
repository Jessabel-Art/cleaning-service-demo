import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isDemoClientSession } from '@/lib/demoAuth';

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-clean-bg flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function ClientRoute({ children }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  const isDemoClient = isDemoClientSession();

  if (!authReady) return <FullPageLoader />;
  if (!user && !isDemoClient) {
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
