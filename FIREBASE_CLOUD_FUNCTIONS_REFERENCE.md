# Firebase Cloud Functions & Server-Side Operations Reference

## Summary
This document maps all Firebase Cloud Functions, callable endpoints, HTTP endpoints, Firestore triggers, and async server operations across the Sanchez Services codebase.

---

## 🔹 FIREBASE FUNCTIONS INITIALIZATION

### Frontend Functions Client
**File:** [src/lib/firebase.js](src/lib/firebase.js#L4)  
**Lines:** 1-50

```javascript
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const functions = getFunctions(app);

// Functions emulator: only use on localhost in browser (for cloud function testing)
if (typeof location !== 'undefined' && location.hostname === "localhost") {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch {
    // avoid crash if called twice in hot-reload
  }
}

export { app, auth, db, functions };
```

---

## 🔵 CLOUD FUNCTIONS (Backend - CommonJS)

### File: [functions/index.js](functions/index.js)

#### CONFIGURATION & INITIALIZATION
**Lines:** 1-70
- Firebase Admin SDK initialization: `admin.initializeApp()`
- Firestore instance: `const db = admin.firestore()`
- Stripe configuration loaded from `functions.config().stripe`
- Admin allowlist emails and UIDs defined
- Dev mode detection: `const IS_DEV = process.env.NODE_ENV !== 'production' || process.env.FUNCTIONS_EMULATOR === 'true'`

#### 1. **sweepCompleteBookings** (HTTP Trigger)
**Type:** `functions.https.onRequest`  
**Lines:** 232-420  
**Description:** Auto-completes confirmed bookings after 2-hour grace period; optionally deletes test/cancelled bookings  
**Auth:** Optional Bearer token verification (admin-only)  
**Endpoint:** HTTP POST with CORS support  
**Request Body:**
- `dryRun` (boolean): Preview changes without committing
- `removeTestBookings` (boolean): Delete bookings with "test" in notes
- `removeCancelledDeclined` (boolean): Delete cancelled/declined bookings

**Key Operations:**
```javascript
exports.sweepCompleteBookings = functions.https.onRequest(async (req, res) => {
  // CORS + preflight handling
  // Optional Bearer token auth (admin verification)
  // Updates booking status to "completed" if endAt > 2 hours ago
  // Returns { ok: true, updated, logs: { autoCompleted, deletedTestBookings, deletedCancelledBookings } }
});
```

#### 2. **enqueueBookingEmail** (Firestore Trigger)
**Type:** `functions.firestore.document('bookings/{bookingId}').onWrite`  
**Lines:** 422-710  
**Description:** Triggered on booking create/update; enqueues email to customer and admin notifications  
**Trigger Events:**
- Create → sends "received" email
- Status change (confirmed/declined) → sends status email
- Time change (reschedule) → sends "updated" email

**Operations:**
```javascript
exports.enqueueBookingEmail = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    // Writes to 'mail' collection for Email Extension processing
    // Customer emails: received, confirm, decline, updated
    // Admin emails: admin_new_booking, admin_rescheduled, admin_cancelled
    // Deduplication: uses emailQueuedAt + mailLastKind (10-minute window)
  });
```

**Email Types Sent:**
- "received": Initial booking confirmation
- "confirm": Booking confirmed
- "decline": Booking declined
- "updated": Booking reschedule
- "admin_new_booking": New booking alert to admins
- "admin_rescheduled": Reschedule alert to admins
- "admin_cancelled": Cancellation alert to admins

#### 3. **migrateProfiles_fullNameToName** (HTTP Trigger - Admin Only)
**Type:** `functions.https.onRequest`  
**Lines:** 718-800  
**Description:** One-off data migration: moves `profiles.fullName` → `profiles.name`  
**Auth:** Bearer token required, admin verification  
**Request Body:**
```javascript
{ dryRun: true/false }
```

#### 4. **checkBookingConflict** (Callable)
**Type:** `functions.https.onCall`  
**Lines:** 802-970  
**Description:** Checks if new booking overlaps with existing confirmed/scheduled bookings  
**Requires Auth:** Yes (any signed-in user)  
**Request Data:**
```javascript
{ startAt, endAt, dateKey, ignoreId }
```

**Response:**
```javascript
{ 
  conflict: boolean,
  with?: string  // Conflict summary if conflict found
}
```

**Key Logic:**
- Queries all "pending", "confirmed", "scheduled" bookings for the day
- Checks for time overlaps using `hasOverlap(s1, e1, s2, e2)`
- Returns first conflict found or `{ conflict: false }`

#### 5. **getDayAvailability** (Callable)
**Type:** `functions.https.onCall`  
**Lines:** 948-1115  
**Description:** Returns aggregated day availability (blocked slots, capacity info) without PII  
**Requires Auth:** Yes (any signed-in user)  
**Request Data:**
```javascript
{
  dateKey: "2025-04-05",
  timeOptions: ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM"],
  slotCapacity: 1,
  dailyCapacity: 6,
  durationMinutes: 120,
  ignoreBookingId?: "bookingId"  // For editing existing bookings
}
```

**Response:**
```javascript
{
  dateKey: "2025-04-05",
  fullyBooked: false,
  blockedSlots: ["09:00 AM", "11:00 AM"],  // Time slots at capacity
  slotCounts: { "09:00 AM": 1, "11:00 AM": 1, ... },  // Count per slot
  dayCountBlocking: 2  // Total blocking bookings
}
```

#### 6. **generateInvoicePdf** (Callable)
**Type:** `functions.https.onCall`  
**Lines:** 1116-1228  
**Description:** Generates PDF invoice for a booking; returns signed URL or Base64  
**Requires Auth:** Yes + admin verification  
**Request Data:**
```javascript
{ bookingId, orderCode }
```

**Response:**
```javascript
{ 
  url: "https://storage.googleapis.com/..."  // Signed URL (1 hour expiry)
  // OR
  pdfBase64: "JVBERi0xLjQ..."  // Base64-encoded PDF if upload fails
}
```

#### 7-9. **Availability Maintenance Firestore Triggers**

**7a. onBookingCreate**
**Type:** `functions.firestore.document('bookings/{id}').onCreate`  
**Lines:** 1230-1242  
**Function:** Increments slot/day counter if booking blocks capacity

**7b. onBookingDelete**
**Type:** `functions.firestore.document('bookings/{id}').onDelete`  
**Lines:** 1242-1254  
**Function:** Decrements slot/day counter if booking was blocking capacity

**7c. onBookingUpdate**
**Type:** `functions.firestore.document('bookings/{id}').onUpdate`  
**Lines:** 1254-1297  
**Function:** Updates capacity counters if status or date/time changed

#### 8. **rebuildAvailabilityForDay** (Callable - Admin Only)
**Type:** `functions.https.onCall`  
**Lines:** 1298-1356  
**Description:** Manually rebuild availability count for a single date  
**Requires Auth:** Yes + specific admin UIDs (`1Ku2G5K7EnMBOT5tHCleuL0tDPz1`, `tcNfLl71F4egLReiutPzYvQaNvl2`)  
**Request Data:**
```javascript
{ dateKey: "2025-04-05" }
```

**Response:**
```javascript
{ dateKey, dayCount, taken: { "09:00 AM": 1, ... } }
```

#### 9-11. **Review Management Firestore Triggers**

**9. onReviewCreate**
**Type:** `functions.firestore.document('reviews/{id}').onCreate`  
**Lines:** 1357-1375  
**Function:** Sets defaults (status='pending', createdAt timestamp, emailLower normalization)

**10. onReviewUpdate**
**Type:** `functions.firestore.document('reviews/{id}').onUpdate`  
**Lines:** 1375-1390  
**Function:** Sets publishedAt timestamp when review status → "approved"

**11. onReviewApprove**
**Type:** `functions.firestore.document('reviews/{id}').onUpdate`  
**Lines:** 1423-1445  
**Function:** Copies approved review to `approved_reviews` collection (denormalization)

#### 12. **approveReview** (Callable - Admin Only)
**Type:** `functions.https.onCall`  
**Lines:** 1390-1406  
**Description:** Admin approval endpoint for reviews  
**Requires Auth:** Yes + admin verification  
**Request Data:**
```javascript
{ id: "reviewId" }
```

**Updates:**
- `status: "approved"`
- `publishedAt: serverTimestamp()`
- `updatedAt: serverTimestamp()`

#### 13. **declineReview** (Callable - Admin Only)
**Type:** `functions.https.onCall`  
**Lines:** 1407-1422  
**Description:** Admin decline endpoint for reviews  
**Requires Auth:** Yes + admin verification  
**Request Data:**
```javascript
{ id: "reviewId" }
```

**Updates:**
- `status: "declined"`
- `updatedAt: serverTimestamp()`

#### 14. **createStripeCheckoutSession** (Callable)
**Type:** `functions.https.onCall`  
**Lines:** 1448-1615  
**Description:** Creates Stripe Checkout session for deposit or remaining balance payment  
**Requires Auth:** Yes  
**Requires Config:** `stripe.secret_key`, `stripe.frontend_url` configured  
**Request Data:**
```javascript
{
  bookingId: "booking123",
  totalPrice: 150,
  depositAmount: 50,
  remainingBalance: 100,
  customerEmail: "customer@example.com",
  customerName: "John Doe",
  mode: "deposit" | "remaining_balance",
  purpose: "deposit" | "remaining_balance"
}
```

**Response:**
```javascript
{ url: "https://checkout.stripe.com/..." }
```

**Key Operations:**
- Calculates gross amount including Stripe fees (2.9% + $0.30)
- Creates Stripe Checkout session with metadata
- Returns URL for frontend redirect

#### 15. **stripeWebhook** (HTTP Trigger - Webhook)
**Type:** `functions.https.onRequest`  
**Lines:** 1621-1794  
**Description:** Handles Stripe webhook events (payment_intent.succeeded)  
**Auth:** Stripe signature verification  
**Requires Config:** `stripe.signing_secret`  
**Webhook Event Handling:**

**Case: payment_intent.succeeded**
```javascript
// Extracts metadata:
{
  bookingId,
  mode: "deposit" | "remaining_balance",
  depositAmount,
  totalPrice,
  remainingBalance,
  estimated_stripe_fee,
  gross_charge_amount
}

// Updates booking:
if (mode === "remaining_balance") {
  paid += remaining_balance
  remainingBalance = 0
  // If balance reaches 0 and not cancelled, status → "completed"
}

if (mode === "deposit") {
  depositPaid = true
  // Also updates depositPaymentIntentId, stripeCustomerId, etc.
  // May enqueue additional payment link for remaining balance
}
```

---

## 📱 FRONTEND ASYNC OPERATIONS & CLOUD FUNCTION CALLS

### 1. [src/lib/db.js](src/lib/db.js) - Client-Side Function Wrappers

#### **checkConflictsTransactional()**
**Lines:** 197-230  
**Type:** httpsCallable wrapper  
**Function:** Calls `checkBookingConflict` Cloud Function  
```javascript
export async function checkConflictsTransactional(startDate, endDate, ignoreId = null) {
  const checkConflict = httpsCallable(functions, 'checkBookingConflict');
  const result = await checkConflict({
    startAt: startDate,
    endAt: endDate,
    ignoreId: ignoreId || null,
  });
  return result.data || { conflict: false };
}
```

#### **getDayAvailability()**
**Lines:** 235-277  
**Type:** httpsCallable wrapper  
**Function:** Calls `getDayAvailability` Cloud Function  
```javascript
export async function getDayAvailability(
  dateKey, timeOptions, slotCapacity, dailyCapacity, 
  durationMinutes, ignoreBookingId = null
) {
  const getAvailability = httpsCallable(functions, 'getDayAvailability');
  const result = await getAvailability({
    dateKey,
    timeOptions,
    slotCapacity,
    dailyCapacity,
    durationMinutes,
    ignoreBookingId: ignoreBookingId || null,
  });
  return result.data || { /* default response */ };
}
```

#### **createBookingWithConflictCheck()**
**Lines:** 303-444  
**Type:** Client-side booking creation with conflict detection  
**Operations:**
1. Normalizes all timestamp fields (startAt, endAt, scheduledAt)
2. Calls `checkConflictsTransactional()` to verify no overlaps
3. Throws error if conflict found
4. Writes to `bookings` collection via Firestore SDK
5. Firestore rules enforce ownership-based access

```javascript
export async function createBookingWithConflictCheck(uid, data) {
  // Normalize timestamps
  let startAtTimestamp = normalizeTimestamp(data.startAt, 'startAt');
  let endAtTimestamp = normalizeTimestamp(data.endAt, 'endAt');
  let scheduledAtTimestamp = normalizeTimestamp(data.scheduledAt, 'scheduledAt');
  
  // Check conflicts via Cloud Function
  const conflictCheck = await checkConflictsTransactional(startDate, endDate, null);
  if (conflictCheck.conflict) {
    throw new Error(`Time slot conflict: ${conflictCheck.with}`);
  }
  
  // Write to Firestore (rules apply)
  await addDoc(collection(db, 'bookings'), cleanData);
}
```

#### **hasOverlap()**
**Lines:** 291-306  
**Type:** Utility function  
**Function:** Checks if two time ranges overlap
```javascript
export function hasOverlap(cs, ce, es, ee) {
  return cs < ee && ce > es;  // Adjacent slots are NOT considered overlapping
}
```

#### **onSnapshot (Real-time Listener)**
**Lines:** 499-510  
**Type:** Firestore listener  
**Function:** Subscribes to real-time booking updates
```javascript
export function watchUserBookings(uid, callback) {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
    orderBy('startAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    // Real-time updates
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
```

---

### 2. [src/pages/BookingPage.jsx](src/pages/BookingPage.jsx) - Booking Creation Flow

#### **getDayAvailability Call**
**Lines:** 900-945  
**Type:** async call with .then().catch()  
**Trigger:** Date field changes  
**Operation:**
```javascript
useEffect(() => {
  if (!form.date || !currentUser) return;
  
  setLoadingDay(true);
  const dateKey = format(form.date, 'yyyy-MM-dd');
  const durationMinutes = Math.round(estimate.duration * 60);

  getDayAvailability(
    dateKey,
    getTimeOptionsForDate(form.date),
    SLOT_CAPACITY,
    DAILY_CAPACITY,
    durationMinutes,
    isEditing ? bookingId : null
  )
    .then((result) => {
      setDayAvailability(result);
      setLoadingDay(false);
    })
    .catch((err) => {
      console.error('Failed to fetch day availability:', err);
      setLoadingDay(false);
    });
}, [form.date, estimate.duration, isEditing, bookingId, currentUser]);
```

#### **handleProceedToCheckout()**
**Lines:** 956-1016  
**Type:** Async submit handler  
**Key Steps:**
1. Validates form input
2. Checks conflicts via `checkConflictsTransactional()`
3. Calls `createBookingWithConflictCheck()` to write booking
4. If new booking: calls `createStripeCheckoutSession()` Cloud Function
5. Redirects to Stripe Checkout or confirmation page

```javascript
const handleProceedToCheckout = async () => {
  // ... validation ...
  
  const conflictCheck = await checkConflictsTransactional(
    startDate, endDate,
    isEditing ? bookingId : null
  );
  if (conflictCheck.conflict) {
    // Show error and abort
    return;
  }
  
  // Create or update booking
  if (isEditing && bookingId) {
    await updateDoc(doc(db, "bookings", bookingId), { /* updates */ });
    navigate(`/confirm?bookingId=${bookingId}`);
  } else {
    const ref = await createBookingWithConflictCheck(uid, payloadBase);
    const newBookingId = ref.id;
    
    // Call Stripe function
    const funcs = await import("firebase/functions");
    const { getFunctions, httpsCallable } = funcs;
    const functionsClient = getFunctions(auth?.app || undefined);
    const createSession = httpsCallable(functionsClient, "createStripeCheckoutSession");
    
    const resp = await createSession(sessionPayload);
    window.location.href = resp?.data?.url;
  }
};
```

---

### 3. [src/pages/PaymentCenterPage.jsx](src/pages/PaymentCenterPage.jsx) - Balance Payment

#### **handlePayRemainingBalance()**
**Lines:** 880-920  
**Type:** Async payment handler  
**Operation:**

```javascript
const handlePayRemainingBalance = async () => {
  if (!nextUpcoming || amountDue <= 0) return;
  
  setPaying(true);
  
  const createCheckoutSession = httpsCallable(
    functions,
    "createStripeCheckoutSession"
  );
  
  const result = await createCheckoutSession({
    bookingId: nextUpcoming.id,
    totalPrice: info.totalPrice,
    depositAmount: info.depositAmount,
    remainingBalance: info.remainingBalance,
    customerEmail,
    customerName,
    mode: "remaining_balance",
    purpose: "remaining_balance",
  });
  
  const url = result?.data?.url;
  if (url) {
    window.location.href = url;  // Redirect to Stripe
  }
};
```

---

### 4. [src/pages/ClientPortalPage.jsx](src/pages/ClientPortalPage.jsx) - Review Submission

**Real-time Booking Listener**
**Type:** onSnapshot  
**Trigger:** Component mount / user change  
**Operation:**
```javascript
useEffect(() => {
  if (!currentUser?.uid) return;
  
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', currentUser.uid),
    orderBy('startAt', 'desc')
  );
  
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Update state with real-time bookings
  });
}, [currentUser?.uid]);
```

---

### 5. [src/pages/admin/CalendarView.jsx](src/pages/admin/CalendarView.jsx) - Admin Calendar

**Real-time Bookings for Calendar**
**Type:** onSnapshot + where filter  
**Operation:**
```javascript
useEffect(() => {
  if (!currentUser?.uid) return;
  
  const q = query(
    collection(db, 'bookings'),
    where('dateKey', '==', selectedDateKey),
    orderBy('startAt', 'asc')
  );
  
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(/* transform to calendar format */);
    setCalendarEvents(events);
  });
}, [selectedDateKey, currentUser?.uid]);
```

---

### 6. [src/pages/admin/ReviewsView.jsx](src/pages/admin/ReviewsView.jsx) - Admin Review Management

**Real-time Reviews Listener**  
**Callable Functions:**
- `approveReview` (httpsCallable)
- `declineReview` (httpsCallable)

```javascript
// Listen to pending reviews
const q = query(
  collection(db, 'reviews'),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
);

return onSnapshot(q, (snap) => {
  setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

// Approve review
const handleApprove = async (reviewId) => {
  const approveReview = httpsCallable(functions, 'approveReview');
  await approveReview({ id: reviewId });
};

// Decline review
const handleDecline = async (reviewId) => {
  const declineReview = httpsCallable(functions, 'declineReview');
  await declineReview({ id: reviewId });
};
```

---

### 7. [src/pages/admin/MaintenanceView.jsx](src/pages/admin/MaintenanceView.jsx) - Admin Utilities

**Sweep Complete Bookings (HTTP Trigger)**
**Callable:** Via fetch + Bearer token  
**Operation:**

```javascript
const handleSweep = async () => {
  const token = await currentUser.getIdToken();
  
  const response = await fetch(
    `https://.../sweepCompleteBookings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dryRun: false,
        removeTestBookings: true,
        removeCancelledDeclined: false
      })
    }
  );
  
  const result = await response.json();
  // Display { autoCompletedCount, deletedTestBookingsCount, ... }
};
```

**Rebuild Availability (Callable)**
**Operation:**

```javascript
const handleRebuildAvailability = async (dateKey) => {
  const rebuildAvailabilityForDay = httpsCallable(
    functions,
    'rebuildAvailabilityForDay'
  );
  
  const result = await rebuildAvailabilityForDay({ dateKey });
  // Returns { dateKey, dayCount, taken }
};
```

**Batch Write Operations (writeBatch)**
```javascript
const batch = writeBatch(db);

for (const bookingId of selectedBookings) {
  const ref = doc(db, 'bookings', bookingId);
  batch.update(ref, { status: 'cancelled' });
}

await batch.commit();
```

---

## 🔒 FIRESTORE RULES & SECURITY

**File:** [firestore.rules](firestore.rules)

**Key Security Models:**
1. **Ownership-based read access:**
   - `where('userId', '==', auth.uid)`
   - `where('contact.emailLower', '==', emailLower)`
   - `where('ownerKeys', 'array-contains', uid_or_email_key)`

2. **Cloud Function admin operations:**
   - `checkBookingConflict` - Server reads all bookings to check conflicts
   - `getDayAvailability` - Server returns aggregated data without PII
   - `createStripeCheckoutSession` - Creates payment session with metadata
   - `stripeWebhook` - Updates booking payment status

3. **Admin-only operations:**
   - `approveReview`, `declineReview` - Admin comment/status changes
   - `rebuildAvailabilityForDay` - Admin maintenance
   - `sweepCompleteBookings` - Admin auto-complete

---

## ⚕️ EMAIL PROCESSING PIPELINE

**Email Collection Write:** `mail` collection  
**Email Extension:** Firebase Extensions (ext-firestore-send-email)  
**Trigger:** Document write to `mail` collection  

**Mail Document Schema:**
```javascript
{
  to: ["customer@email.com"],
  message: {
    subject: "Sanchez Services: ...",
    html: "<p>...</p>",
    text: "..."
  },
  meta: {
    bookingId: "booking123",
    kind: "received|confirm|decline|updated|admin_*",
    status: "pending|confirmed|...",
    queuedBy: "function_enqueueBookingEmail",
    requestId: "event-id"
  },
  createdAt: Timestamp
}
```

---

## 📊 AVAILABILITY SYSTEM

**Collection:** `availability`  
**Document ID:** `yyyy-MM-dd` (date key)  
**Structure:**
```javascript
{
  dateKey: "2025-04-05",
  takenSlotsByTime: {
    "09:00 AM": 1,
    "11:00 AM": 0,
    "01:00 PM": 1,
    "03:00 PM": 0
  },
  dayCount: 2,  // Total blocking bookings
  _capacity: {
    slot: 1,  // Per-slot capacity
    day: 6,   // Daily capacity
    timeOptions: ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM"]
  },
  updatedAt: Timestamp
}
```

**Triggers:**
- `onBookingCreate`: Increments counter if status blocks capacity
- `onBookingDelete`: Decrements counter
- `onBookingUpdate`: Adjusts for status/date changes
- `rebuildAvailabilityForDay`: Admin manual rebuild

---

## 💳 STRIPE INTEGRATION

**Payment Flow:**
1. `createStripeCheckoutSession` Cloud Function creates checkout session
2. Frontend redirects to `session.url` (Stripe Checkout)
3. Customer completes payment
4. Stripe webhook → `stripeWebhook` HTTP function
5. Function updates booking with payment status

**Payment Metadata:**
```javascript
{
  bookingId: "booking123",
  mode: "deposit" | "remaining_balance",
  depositAmount: 50.00,
  totalPrice: 150.00,
  remainingBalance: 100.00,
  estimated_stripe_fee: 4.65,
  gross_charge_amount: 54.65  // (deposit + fee)
}
```

**Booking Payment Fields Updated by Webhook:**
```javascript
// Deposit payment:
{
  depositPaid: true,
  depositPaymentIntentId: "pi_xxx",
  stripeCustomerId: "cus_xxx",
  // ...
}

// Remaining balance payment:
{
  paid: 150.00,
  remainingBalance: 0,
  balancePaymentIntentId: "pi_xxx",
  balancePaymentMethod: "card_stripe",
  balanceStripeNetAmount: 100.00,
  balanceStripeFeeAmount: 2.90,
  balanceStripeGrossAmount: 102.90,
  status: "completed"  // If remaining == 0 and not cancelled
}
```

---

## 🔄 REAL-TIME UPDATES (onSnapshot Listeners)

**Subscribes:**
1. **User Bookings**: `collection('bookings').where('userId', '==', uid)`
2. **Admin Calendar**: `collection('bookings').where('dateKey', '==', dateKey)`
3. **Admin Reviews**: `collection('reviews').where('status', '==', 'pending')`
4. **Client Portal**: Real-time booking status updates

**Firestore Rules:** Enforce ownership on client-side subscriptions

---

## ⏱️ ASYNC OPERATIONS SUMMARY

| Operation | Type | Trigger | Purpose |
|-----------|------|---------|---------|
| `getDayAvailability()` | httpsCallable | Date selection | Fetch availability for booking form |
| `checkConflictsTransactional()` | httpsCallable | Before booking create | Verify time slot availability |
| `createBookingWithConflictCheck()` | Client write | Submit booking | Create booking + check conflicts |
| `createStripeCheckoutSession()` | httpsCallable | Proceed to checkout | Initiate payment session |
| `enqueueBookingEmail` | Firestore trigger (onWrite) | Booking create/update | Queue customer/admin emails |
| `sweepCompleteBookings` | HTTP endpoint | Admin action | Auto-complete old bookings |
| `stripeWebhook` | HTTP endpoint | Stripe event | Process payment notifications |
| `approveReview()` | httpsCallable | Admin action | Mark review as approved |
| `declineReview()` | httpsCallable | Admin action | Mark review as declined |
| `onSnapshot` listeners | Firestore | Component mount | Subscribe to real-time updates |

---

## 🚀 DEPLOYMENT NOTES

**Cloud Functions:**
- Region: Default (us-central1)
- Runtime: Node.js 18+ (firebase-functions/v1)

**Configuration:**
```bash
firebase functions:config:set \
  stripe.secret_key="sk_..." \
  stripe.frontend_url="https://sanchezservices.com" \
  stripe.signing_secret="whsec_..."
```

**Environment:**
- `NODE_ENV`: production (or set FUNCTIONS_EMULATOR=true for dev)
- `SLOT_CAPACITY`: 1 (bookings per slot)
- `DAILY_CAPACITY`: 6 (bookings per day)
- `SWEEP_REQUIRE_AUTH`: true (require Bearer token for sweep)

---

## 📝 KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| [functions/index.js](functions/index.js) | All Cloud Functions |
| [src/lib/firebase.js](src/lib/firebase.js) | Firebase SDK initialization |
| [src/lib/db.js](src/lib/db.js) | Firestore client wrappers |
| [src/pages/BookingPage.jsx](src/pages/BookingPage.jsx) | Booking creation UI |
| [src/pages/PaymentCenterPage.jsx](src/pages/PaymentCenterPage.jsx) | Payment UI |
| [src/pages/ClientPortalPage.jsx](src/pages/ClientPortalPage.jsx) | Client dashboard |
| [src/pages/admin/CalendarView.jsx](src/pages/admin/CalendarView.jsx) | Admin calendar |
| [src/pages/admin/ReviewsView.jsx](src/pages/admin/ReviewsView.jsx) | Admin review management |
| [src/pages/admin/MaintenanceView.jsx](src/pages/admin/MaintenanceView.jsx) | Admin utilities |
| [firestore.rules](firestore.rules) | Security rules |

---

## ⚠️ CRITICAL DEPENDENCIES

**Server-Side Processing:**
- Firebase Cloud Functions
- Firebase Admin SDK
- Stripe API (for payments)
- Firebase Firestore (database)
- Firebase Email Extension (for mail sending)

**Frontend Dependencies:**
- firebase/functions (httpsCallable)
- firebase/firestore (onSnapshot, queries)
- firebase/auth (authentication)
- react (for components & hooks)

---

Generated: April 5, 2026
