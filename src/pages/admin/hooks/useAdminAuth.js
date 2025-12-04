// pages/admin/hooks/useAdminAuth.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
// 🔧 adjust this import if your auth lives somewhere else
import { auth } from "../../../lib/firebase";

// Optional: restrict to specific admin emails via env
// e.g. VITE_ADMIN_EMAILS="owner@example.com,assistant@example.com"
const ADMIN_EMAILS = (import.meta?.env?.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const email = firebaseUser.email?.toLowerCase() || "";
      const allowed =
        ADMIN_EMAILS.length === 0 ? true : ADMIN_EMAILS.includes(email);

      setUser(firebaseUser);
      setIsAdmin(allowed);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, isAdmin, loading };
}
