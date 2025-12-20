# Admin Access Quick Reference

## Both Admin UIDs (Verified)
```
Admin 1: Y1Ku2G5K7EnMBOT5tHCleuL0tDPz1
Admin 2: tcNfLl71F4egLReiutPzYvQaNvl2
```

## Admin Emails (Verified)
```
jessabel.santos@gmail.com
sanchezservices24@yahoo.com
```

## Authorization Sources (Priority Order)

1. **UID Match** - Hardcoded UIDs in `buildAdminUidAllowlist()`
2. **Email Match** - Hardcoded emails in `buildAdminAllowlist()`
3. **Environment Variables** - `VITE_ADMIN_UIDS` and `VITE_ADMIN_EMAILS`
4. **Firestore /admins/{uid}** - Document exists check (rules only)
5. **Firestore /profiles/{uid}.role** - role = "admin" or "owner" (rules only)

## How to Debug Access Issues

### In Development:
1. Open any admin page (e.g., `/admin`)
2. Diagnostic panel appears automatically
3. Check which allowlist match failed

### In Production:
1. Add `?debug=1` to any admin URL
2. Example: `https://yoursite.com/admin?debug=1`
3. View full diagnostic panel

### What to Check:
- ✅ UID matches one of the two admin UIDs
- ✅ Email matches one of the admin emails  
- ✅ Firebase Auth shows correct project
- ✅ No console errors about Firestore permissions

## Common Issues & Solutions

### "Access Denied" for Admin User
1. Check diagnostic panel - which match failed?
2. Verify UID/email spelling (case-sensitive for UID)
3. Check Firebase project ID is correct
4. Clear browser cache and sign in again

### "Permission Denied" Firestore Errors
1. Deploy latest `firestore.rules` with correct UIDs
2. Run `firebase deploy --only firestore:rules`
3. Wait 1-2 minutes for rules to propagate

### One Admin Works, Other Doesn't
- This was the bug we fixed!
- Ensure both UIDs are correct (no typos)
- Both should now have identical access

## Where Admin Logic Lives

**Single Source of Truth:**
```
src/pages/admin/hooks/useAdminAuth.js
```

**Used By:**
- All admin pages (CalendarView, ReviewsView, etc.)
- AdminRoute component (route guard)
- AdminDiagnostics component (debug panel)

**DO NOT:**
- Add manual `auth.onAuthStateChanged` in admin pages
- Create new allowlist arrays in components
- Bypass `useAdminAuth()` hook

## Firestore Rules Alignment

Client and server authorization must match. When updating admin logic:

1. Update `src/lib/adminAllowlist.js`
2. Update `firestore.rules` `isAdmin()` function
3. Deploy both: `npm run build && firebase deploy`

## Emergency Access

If both admins are locked out:

1. Go to Firebase Console → Authentication
2. Find user by email
3. Copy their exact UID
4. Add UID to `src/lib/adminAllowlist.js` `fallbackUids` array
5. Add UID to `firestore.rules` `isWhitelistedUid()` array
6. Deploy: `npm run build && firebase deploy`
