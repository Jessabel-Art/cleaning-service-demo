// src/lib/isAdminUser.js
// Import from centralized allowlist (single source of truth)
import { buildAdminAllowlist, buildAdminUidAllowlist, checkAdminAuth, FALLBACK_ADMIN_EMAILS } from './adminAllowlist';

// Re-export for backwards compatibility
export const ADMIN_EMAILS = FALLBACK_ADMIN_EMAILS;

/**
 * Legacy function: check if user is admin (simple boolean).
 * Prefer checkAdminAuth() for detailed diagnostic info.
 */
export function isAdminUser(user, profile) {
  if (!user) return false;

  const result = checkAdminAuth(user, profile);
  return result.allowed;
}

/**
 * Enhanced function: check admin auth with diagnostic details.
 * Returns { allowed, reason, checks }
 */
export function checkUserAdmin(user, profile) {
  return checkAdminAuth(user, profile);
}
