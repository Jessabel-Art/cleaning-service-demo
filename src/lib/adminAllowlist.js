// src/lib/adminAllowlist.js
// Centralized admin auth helpers.
// Single source of truth for prod: admins/{uid}.active === true OR profiles/{uid}.role in ["admin", "owner"].
// Allowlist is a DEV-ONLY fallback to unblock local testing without Firestore writes.

// Hardcoded DEV fallback admin emails (keep in sync with functions dev fallback)
export const FALLBACK_ADMIN_EMAILS = [
  'jessabel.santos@gmail.com',
  'sanchezservices24@yahoo.com',
];

// Hardcoded DEV fallback admin UIDs (keep in sync with functions dev fallback)
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

// Structured authorization checker with diagnostic info.
// Arguments (object):
//   user: Firebase user object (required)
//   adminDocActive: boolean (true if admins/{uid}.active === true)
//   profileRole: string role from profiles/{uid}.role
//   allowDevFallback: boolean (when true, allowlist fallback is permitted)
// Returns { allowed, reason, checks }
export function checkAdminAuth({ user, adminDocActive = false, profileRole = null, allowDevFallback = false }) {
  const checks = {
    allowlistEmail: false,
    allowlistUid: false,
    adminsDoc: false,
    profileRole: false,
  };

  if (!user) {
    return {
      allowed: false,
      reason: "not_admin",
      checks,
    };
  }

  const email = (user.email || "").toLowerCase();
  const uid = user.uid || null;
  const role = (profileRole || "").toLowerCase();

  // DEV-only allowlist fallback (for local testing)
  if (allowDevFallback) {
    if (email) {
      const emailAllowlist = buildAdminAllowlist();
      checks.allowlistEmail = emailAllowlist.has(email);
    }
    if (uid) {
      const uidAllowlist = buildAdminUidAllowlist();
      checks.allowlistUid = uidAllowlist.has(uid);
    }
  }

  // Firestore-backed signals (prod source of truth)
  if (adminDocActive === true) {
    checks.adminsDoc = true;
  }

  if (role === "admin" || role === "owner") {
    checks.profileRole = true;
  }

  const allowed =
    checks.adminsDoc ||
    checks.profileRole ||
    checks.allowlistUid ||
    checks.allowlistEmail;

  let reason = "not_admin";
  if (checks.adminsDoc) reason = "admins_doc";
  else if (checks.profileRole) reason = "profile_role";
  else if (checks.allowlistUid) reason = "allowlist_uid";
  else if (checks.allowlistEmail) reason = "allowlist_email";

  // Dev logging (helpful for diagnosing mismatches)
  if (import.meta.env.DEV) {
    const authCheckLog = {
      timestamp: new Date().toISOString(),
      user: { uid, email, emailVerified: user.emailVerified },
      checks,
      allowed,
      reason,
    };
    console.log("%c[Admin Auth Check]", "color: #8B5A8E; font-weight: bold", authCheckLog);
  }

  return { allowed, reason, checks };
}
