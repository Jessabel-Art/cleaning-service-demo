// src/components/auth/OwnerRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/firebase';

export default function OwnerRoute({ children }) {
  const location = useLocation();
  const ownerUid = import.meta.env.VITE_OWNER_UID;
  const user = auth.currentUser;

  // If no logged-in user, push to portal login
  if (!user) {
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }

  // Only allow the configured owner UID
  if (user.uid !== ownerUid) {
    return <Navigate to="/" replace />;
  }

  return children;
}
