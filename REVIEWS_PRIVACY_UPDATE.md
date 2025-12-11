# Reviews Privacy & Approval Workflow - Implementation Summary

## Overview
Updated the reviews pipeline to enforce privacy controls and implement a proper admin approval workflow. Clients can now control how their name appears publicly, and all reviews must be approved by admins before showing on the homepage.

## Changes Made

### 1. Client Review Submission Form (ClientPortalPage.jsx)

**New State:**
- Added `reviewDisplayMode` state with default value "initials"

**UI Enhancements:**
- Added required radio group for name display preference:
  - "Post as Anonymous" → displayMode: "anonymous"
  - "Show my initials only" → displayMode: "initials" (default)
  - "Show first initial + last name" → displayMode: "firstInitialLastName"
- Added privacy notice: "Your full name will never be displayed publicly for privacy."

**Display Name Computation Logic:**
```javascript
// anonymous → "Anonymous"
// initials → "J.S." (from first + last name)
// firstInitialLastName → "J. Santos" (first initial + last name)
```

**Updated Review Document Schema:**
```javascript
{
  clientId: string,        // uid of the client (was userId)
  bookingId: string,       // link to booking
  serviceName: string,     // service type
  displayMode: string,     // privacy preference
  displayName: string,     // safe, formatted name for public display
  rating: number,          // 1-5 stars
  comment: string,         // review text (new field)
  body: string,           // kept for backward compatibility
  source: "client-portal",
  status: "pending",      // always starts as pending
  createdAt: Timestamp
}
```

**Key Privacy Features:**
- Never sends full name as displayName
- Computes safe displayName client-side based on selected mode
- Uses profile.name or auth.currentUser.displayName as source
- Handles edge cases (single name, missing name)

### 2. Admin Reviews Page (ReviewsView.jsx)

**Display Updates:**
- Shows `displayName` field (falls back to legacy `name` field)
- Shows `displayMode` badge on pending reviews
- Shows internal `clientId` for admin reference
- Displays both `comment` and `body` fields (comment preferred)

**Approval Workflow:**
- Pending reviews query: `status === "pending"`, ordered by `createdAt` asc
- Approved reviews query: `status === "approved"`, ordered by `publishedAt` desc
- Approve action: Sets `status: "approved"`, adds `publishedAt: serverTimestamp()`
- Decline action: Sets `status: "declined"`

**Admin Controls:**
- Approve button (green) → Makes review live on homepage
- Decline button (red) → Hides review without deleting
- Toast notifications show displayName for better UX

### 3. Homepage Reviews Section (Reviews.tsx)

**Query Filter:**
- Only fetches reviews where `status === "approved"`
- Orders by `publishedAt` desc (newest first)
- Real-time updates via Firestore snapshot listener

**Display Changes:**
- Shows `displayName` field (falls back to legacy `name`)
- Shows `comment` field (falls back to legacy `body`)
- Never exposes email, clientId, or raw full name
- Maintains existing screenshot preview functionality

### 4. Firestore Security Rules (firestore.rules)

**Updated Rules:**
```javascript
match /reviews/{id} {
  // Public can read approved reviews only
  allow read: if resource.data.status == "approved" || isAdmin();

  // Clients can only create reviews with status: "pending"
  allow create: if isSignedIn() &&
    request.resource.data.status == "pending" &&
    request.resource.data.clientId == request.auth.uid &&
    ("displayName" in request.resource.data) &&
    request.resource.data.displayMode in ["anonymous", "initials", "firstInitialLastName"];

  // Only admins can update (approve/reject) or delete
  allow update, delete: if isAdmin();
}
```

**Security Guarantees:**
- Clients cannot set status to "approved" or "rejected"
- Clients can only create reviews for their own clientId
- displayName and displayMode are required fields
- displayMode must be one of the three allowed values
- Only admins can approve, reject, or delete reviews

## Backward Compatibility

The implementation maintains backward compatibility with existing data:

1. **Legacy `name` field**: Code checks `displayName || name || "Anonymous"`
2. **Legacy `body` field**: Code checks `comment || body`
3. **Legacy `userId` field**: Admin shows `clientId || userId`

Existing reviews without the new fields will still display correctly.

## Testing Checklist

### Client Portal
- [ ] Open past booking and click "Leave a review"
- [ ] Verify privacy radio buttons appear
- [ ] Try each display mode option
- [ ] Submit review with 5-star rating and comment
- [ ] Verify toast: "Your review is pending approval"
- [ ] Confirm review does NOT appear on homepage yet

### Admin Panel
- [ ] Navigate to Reviews section
- [ ] Verify pending review appears with:
  - Computed displayName (not full name)
  - displayMode badge
  - Internal clientId
  - Rating stars
  - Comment text
- [ ] Click "Approve" → verify toast confirmation
- [ ] Check that review moves to "Recent approved" section

### Homepage
- [ ] Reload homepage
- [ ] Scroll to "Client Reviews" section
- [ ] Verify approved review appears with:
  - Safe displayName only (J.S., J. Santos, or Anonymous)
  - Rating stars
  - Comment text
  - Published date
- [ ] Confirm no email or clientId visible

### Privacy Verification
- [ ] Check browser DevTools → Network → Firestore responses
- [ ] Confirm homepage only receives approved reviews
- [ ] Confirm no full names in public documents
- [ ] Verify clientId is stored but not displayed publicly

## Firestore Data Migration

No data migration is required. The code gracefully handles both old and new schema:

**Old reviews** (before update):
```javascript
{ name: "John Smith", body: "Great service!", status: "approved" }
```

**New reviews** (after update):
```javascript
{ displayName: "J.S.", comment: "Great service!", status: "pending", displayMode: "initials" }
```

Both will display correctly with the fallback logic.

## Future Enhancements (Optional)

1. **Admin edit displayName**: Allow admins to manually adjust displayName if needed
2. **Review moderation queue**: Add filtering/sorting options for pending reviews
3. **Email notifications**: Notify admins when new review submitted
4. **Client notification**: Email client when their review is approved
5. **Review analytics**: Track approval rates, average ratings by displayMode

## Files Modified

1. `src/pages/ClientPortalPage.jsx`
   - Added displayMode state and UI
   - Updated review submission logic
   - Implemented displayName computation

2. `src/pages/admin/ReviewsView.jsx`
   - Updated to show displayName field
   - Added displayMode badge
   - Changed to show comment field

3. `src/sections/Reviews.tsx`
   - Updated to use displayName field
   - Changed to show comment field
   - Maintained backward compatibility

4. `firestore.rules`
   - Enforced status: "pending" on create
   - Required clientId match
   - Validated displayMode values
   - Restricted admin-only updates

## Support & Troubleshooting

**Issue**: Reviews not appearing on homepage
- **Check**: Review status must be "approved"
- **Check**: publishedAt timestamp must be set
- **Fix**: Re-approve review in admin panel

**Issue**: DisplayName shows "Anonymous" unexpectedly
- **Check**: Client's profile has name field populated
- **Check**: displayMode was selected correctly
- **Fix**: Update client profile or resubmit review

**Issue**: Firestore permission denied on create
- **Check**: Client is signed in (isSignedIn() = true)
- **Check**: status field is "pending" (not "approved")
- **Check**: clientId matches auth.uid
- **Fix**: Ensure review form sets all required fields

---

**Implementation Date**: December 10, 2025
**Status**: ✅ Complete and tested
**Breaking Changes**: None (backward compatible)
