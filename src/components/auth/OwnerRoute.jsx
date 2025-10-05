import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'sanchezservices24@yahoo.com';

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] bg-light-pink flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-plum/20 border-t-gold animate-spin" />
    </div>
  );
}

export default function OwnerRoute({ children }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return <FullPageLoader />;

  const isOwner =
    !!user && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();

  if (!isOwner) {
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
