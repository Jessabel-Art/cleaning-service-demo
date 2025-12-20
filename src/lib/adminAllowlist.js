// src/lib/adminAllowlist.js
// Centralized helper to compute the admin allowlist from env vars.
// Uses VITE_ADMIN_EMAIL (primary) and optional VITE_EXTRA_ADMINS (comma-separated).
// All addresses are normalized to lowercase.

export function buildAdminAllowlist() {
  const primary = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
  const extras = (import.meta.env.VITE_EXTRA_ADMINS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set([primary, ...extras].filter(Boolean));
}

// Build admin UID allowlist from env with hardcoded fallbacks
export function buildAdminUidAllowlist() {
  const fallbackUids = [
    "1Ku2G5K7EnMBOT5tHCleuL0tDPzY1",
    "tcNfL171F4eglLReiutPzYvQaNv12",
  ];
  const envUids = (import.meta.env.VITE_ADMIN_UIDS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  return new Set([...fallbackUids, ...envUids]);
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
