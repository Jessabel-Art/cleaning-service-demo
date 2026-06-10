function splitEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildAdminAllowlist() {
  const primary = String(import.meta.env.VITE_ADMIN_EMAIL || "").trim();
  return new Set(
    [primary, ...splitEnv(import.meta.env.VITE_EXTRA_ADMINS)]
      .filter(Boolean)
      .map((email) => email.toLowerCase())
  );
}

export function buildAdminUidAllowlist() {
  return new Set(splitEnv(import.meta.env.VITE_ADMIN_UIDS));
}

export function checkAdminAuth({
  user,
  adminDocActive = false,
  profileRole = null,
}) {
  const checks = {
    adminsDoc: adminDocActive === true,
    profileRole: ["admin", "owner"].includes(
      String(profileRole || "").toLowerCase()
    ),
    envEmail: Boolean(
      user?.email &&
        buildAdminAllowlist().has(String(user.email).toLowerCase())
    ),
    envUid: Boolean(user?.uid && buildAdminUidAllowlist().has(user.uid)),
  };

  const allowed = Object.values(checks).some(Boolean);
  const reason = checks.adminsDoc
    ? "admins_doc"
    : checks.profileRole
    ? "profile_role"
    : checks.envUid
    ? "env_uid"
    : checks.envEmail
    ? "env_email"
    : "not_admin";

  return { allowed, reason, checks };
}
