// src/lib/adminAllowlist.js
// Centralized admin allowlists (single source of truth)
// Email allowlist: from env vars + hardcoded fallbacks
// UID allowlist: from env vars + hardcoded fallbacks

// Hardcoded fallback admin emails (must match firestore.rules)
export const FALLBACK_ADMIN_EMAILS = [
  'jessabel.santos@gmail.com',
  'sanchezservices24@yahoo.com',
];

// Hardcoded fallback admin UIDs (must match firestore.rules)
export const FALLBACK_ADMIN_UIDS = [
  "1Ku2G5K7EnMBOT5tHCleuL0tDPz1",
  "tcNfLl71F4egLReiutPzYvQaNvl2",
];

export function buildAdminAllowlist() {
  const primary = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
  const extras = (import.meta.env.VITE_EXTRA_ADMINS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Combine env vars with fallbacks
  return new Set([primary, ...extras, ...FALLBACK_ADMIN_EMAILS]
    .filter(Boolean)
    .map((e) => String(e).toLowerCase()));
}

// Build admin UID allowlist from env with hardcoded fallbacks
export function buildAdminUidAllowlist() {
  const envUids = (import.meta.env.VITE_ADMIN_UIDS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  return new Set([...FALLBACK_ADMIN_UIDS, ...envUids]);
}

export function isEmailAdmin(email) {
  if (!email) return false;
  const allowlist = buildAdminAllowlist();
  return allowlist.has(String(email).toLowerCase());
}

export function isUidAdmin(uid) {
  if (!uid) return false;
  const allowlist = buildAdminUidAllowlist();
  return allowlist.has(uid);
}

// Structured authorization checker with diagnostic info
// Returns { allowed: boolean, reason: string, checks: { ... } }
export function checkAdminAuth(user, profile) {
  const checks = {
    emailMatch: false,
    uidMatch: false,
    profileRole: false,
  };

  if (!user) {
    return {
      allowed: false,
      reason: "No user object provided",
      checks,
    };
  }

  const email = (user.email || "").toLowerCase();
  const uid = user.uid || null;
  const role = (profile?.role || "").toLowerCase();

  // Check email allowlist
  if (email) {
    const emailAllowlist = buildAdminAllowlist();
    checks.emailMatch = emailAllowlist.has(email);
  }

  // Check UID allowlist
  if (uid) {
    const uidAllowlist = buildAdminUidAllowlist();
    checks.uidMatch = uidAllowlist.has(uid);
  }

  // Check profile role
  if (role === "admin" || role === "owner") {
    checks.profileRole = true;
  }

  const allowed = checks.emailMatch || checks.uidMatch || checks.profileRole;

  let reason = "Denied: not in allowlist";
  if (checks.emailMatch) reason = "Granted: email allowlist match";
  else if (checks.uidMatch) reason = "Granted: UID allowlist match";
  else if (checks.profileRole) reason = "Granted: profile role (admin/owner)";

  // Dev logging
  if (import.meta.env.DEV) {
    const authCheckLog = {
      timestamp: new Date().toISOString(),
      user: { uid, email, emailVerified: user.emailVerified },
      checks,
      allowed,
      reason,
    };
    // Log with a clear marker for filtering console output
    console.log("%c[Admin Auth Check]", "color: #8B5A8E; font-weight: bold", authCheckLog);
  }

  return { allowed, reason, checks };
}
