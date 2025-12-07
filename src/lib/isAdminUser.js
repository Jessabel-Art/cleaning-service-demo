// src/lib/isAdminUser.js
export const ADMIN_EMAILS = [
  'jessabel.santos@gmail.com',
  'sanchezservices24@yahoo.com',
];

export function isAdminUser(user, profile) {
  if (!user) return false;

  const email = (user.email || '').toLowerCase();
  const role = (profile?.role || '').toLowerCase();

  if (ADMIN_EMAILS.includes(email)) return true;
  if (role === 'admin' || role === 'owner') return true;

  return false;
}
