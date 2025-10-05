// src/components/auth/OwnerRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const OWNER_UID = import.meta.env.VITE_OWNER_UID; // set this in .env

export default function OwnerRoute({ children }) {
  const [init, setInit] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setInit(false);
    });
    return () => unsub();
  }, []);

  if (init) {
    return (
      <div className="py-20 flex justify-center">
        <p className="text-plum/70">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Only allow the exact owner UID
  if (!OWNER_UID || user.uid !== OWNER_UID) {
    return <Navigate to="/" replace />;
  }

  return children;
}
