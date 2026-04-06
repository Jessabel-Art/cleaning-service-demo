// Cloud Functions (CommonJS) — existing behavior + availability maintenance + review helpers.

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { calculateGrossFromNet } = require('./stripeFeeMath');

try { admin.initializeApp(); } catch (_) {}
const db = admin.firestore();

/* ==============================
   CONFIG & CONSTANTS
   ============================== */

// capacity knobs (optional .env during deploy; falls back to sane defaults)
const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY || 1);
const DAILY_CAPACITY = Number(process.env.DAILY_CAPACITY || 6);

// These must match the slots shown in the UI
const TIME_OPTIONS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'];

// Admin allowlist (must be lowercase) — used only for DEV fallback & notifications
const ADMIN_EMAILS = new Set([
  'jessabel.santos@gmail.com',
  'sanchezservices24@yahoo.com',
]);

// Admin UID fallback allowlist (DEV only)
const ADMIN_UIDS = new Set([
  '1Ku2G5K7EnMBOT5tHCleuL0tDPz1',
  'tcNfLl71F4egLReiutPzYvQaNvl2',
]);

const IS_DEV = process.env.NODE_ENV !== 'production' || process.env.FUNCTIONS_EMULATOR === 'true';

// default: require auth for sweep unless explicitly disabled
const REQUIRE_AUTH = process.env.SWEEP_REQUIRE_AUTH !== 'false';

// ==============================
// STRIPE CONFIG (checkout sessions)
// ==============================
//
// Requires:
// firebase functions:config:set \
//   stripe.secret_key="sk_test_..." \
//   stripe.frontend_url="https://..." \
//
const stripeConfig = functions.config().stripe || {};
const STRIPE_SECRET_KEY = stripeConfig.secret_key || null;
const FRONTEND_URL = stripeConfig.frontend_url || null;
const STRIPE_SIGNING_SECRET = stripeConfig.signing_secret || null;

let stripe = null;
if (STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Stripe:', err);
  }
} else {
  console.warn('Stripe not configured: stripe.secret_key is missing. Stripe-dependent functions will return errors.');
}

/* ==============================
   UTILS
   ============================== */

function toJsDate(tsOrDate) {
  if (!tsOrDate) return null;
  if (typeof tsOrDate.toDate === 'function') return tsOrDate.toDate();
  if (tsOrDate instanceof Date) return tsOrDate;
  const d = new Date(tsOrDate);
  return Number.isNaN(d.getTime()) ? null : d;
}
function canonicalTs(obj) {
  // Prefer scheduledAt; fall back to startAt
  return obj?.scheduledAt || obj?.startAt || null;
}
function toDateKey(tsOrDate) {
  const d = toJsDate(tsOrDate);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function to12h(tsOrDate) {
  const d = toJsDate(tsOrDate);
  if (!d) return '09:00 AM';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}
function blocksCapacity(status) {
  const s = String(status || '').toLowerCase();
  return !['declined', 'cancelled', 'cancelled', 'completed', 'expired', 'refunded'].includes(s);
}

function isTestBooking(b) {
  const notes = (b && b.notes ? String(b.notes) : "").toLowerCase();
  // super simple rule: any mention of "test" in notes marks it as a test booking
  return notes.includes("test");
}

function nearestSlotLabel(startAt, explicitLabel) {
  if (explicitLabel && TIME_OPTIONS.includes(explicitLabel)) return explicitLabel;

  const d = toJsDate(startAt) || new Date();
  const currMin = d.getHours() * 60 + d.getMinutes();

  const parse = (s) => {
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  let best = TIME_OPTIONS[0], bestDiff = Infinity;
  for (const opt of TIME_OPTIONS) {
    const diff = Math.abs(parse(opt) - currMin);
    if (diff < bestDiff) { best = opt; bestDiff = diff; }
  }
  return best;
}
function keysFromBooking(b) {
  const ts = canonicalTs(b);
  if (!ts) return null;
  const dateKey = b.dateKey || toDateKey(ts);
  if (!dateKey) return null;
  const timeLabel = nearestSlotLabel(ts, b.timeLabel || to12h(ts));
  return { dateKey, timeLabel };
}

// IMPORTANT: don’t overwrite the entire map of taken slots.
// Use a field path update so other time buckets remain intact.
async function applyDelta({ dateKey, timeLabel }, delta) {
  if (!dateKey || !timeLabel) return;
  const ref = db.collection('availability').doc(dateKey);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const taken = data.takenSlotsByTime || {};
    const prev = Number(taken[timeLabel] || 0);
    const next = Math.max(0, prev + delta);

    const update = {
      dateKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // simple daily counter (may go negative during rebuild; corrected by rebuild task)
      dayCount: admin.firestore.FieldValue.increment(delta),
      _capacity: { slot: SLOT_CAPACITY, day: DAILY_CAPACITY, timeOptions: TIME_OPTIONS },
    };
    update[`takenSlotsByTime.${timeLabel}`] = next;

    if (snap.exists) {
      tx.update(ref, update);
    } else {
      tx.set(ref, update, { merge: true });
    }
  });
}

function fmtDateTime(ts) {
  const d = toJsDate(ts);
  if (!d) return { dateStr: 'TBD', timeStr: '' };
  return {
    dateStr: d.toLocaleDateString(),
    timeStr: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

// Core admin check shared across HTTP handlers (single source of truth)
async function isAdminByUidAndEmail(uid, emailLower, allowFallback = IS_DEV) {
  if (!uid) return false;

  if (allowFallback) {
    if (ADMIN_UIDS.has(uid)) return true;
    if (emailLower && ADMIN_EMAILS.has(emailLower)) return true;
  }

  try {
    const [adminDoc, profileDoc] = await Promise.all([
      db.doc(`admins/${uid}`).get(),
      db.doc(`profiles/${uid}`).get(),
    ]);

    if (adminDoc.exists) {
      const data = adminDoc.data() || {};
      if (data.active === true) return true;
    }

    if (profileDoc.exists) {
      const role = (profileDoc.data().role || '').toLowerCase();
      if (role === 'admin' || role === 'owner') return true;
    }
  } catch (err) {
    console.error('isAdminByUidAndEmail error', err);
  }

  return false;
}

// Server-side admin check aligned with Firestore rules
async function isAdminServer(context) {
  const uid = context?.auth?.uid || null;
  const emailLower = (context?.auth?.token?.email || '').toLowerCase();
  return isAdminByUidAndEmail(uid, emailLower, IS_DEV);
}

/* ==============================
   SWEEP COMPLETE BOOKINGS (with CORS + auth)
   ============================== */

// default: require auth unless SWEEP_REQUIRE_AUTH is explicitly set to "false"
// (REQUIRE_AUTH is declared earlier to avoid redeclaration)

function parseBoolean(input, defaultVal) {
  if (input === undefined || input === null) return defaultVal;
  if (typeof input === 'boolean') return input;
  const s = String(input).toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return defaultVal;
}

// === sweepCompleteBookings with proper CORS + optional auth ===
exports.sweepCompleteBookings = functions.https.onRequest(async (req, res) => {
  // DEBUG: Log every single request that hits this handler
  console.log("SWEEP HIT", { method: req.method, origin: req.headers.origin, url: req.url, headers: req.headers });
  
  // --- CORS: always send a permissive header so the browser is happy ---
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  // Make responses cacheable per-origin by proxies
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Safety: only allow POST for the real work
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  // --- Optional auth layer (real security instead of CORS hacks) ---
  if (REQUIRE_AUTH) {
    try {
      const header = req.headers.authorization || '';
      const m = header.match(/^Bearer (.+)$/);
      if (!m) {
        return res
          .status(401)
          .json({ ok: false, error: 'Missing Bearer token in Authorization header' });
      }

      const idToken = m[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      const emailLower = (decoded.email || '').toLowerCase();
      const uid = decoded.uid;

      // Only allow admins (admins/{uid}.active or profile role). DEV fallback uses allowlist.
      const allowed = await isAdminByUidAndEmail(uid, emailLower, IS_DEV);
      if (!allowed) {
        return res.status(403).json({ ok: false, error: 'Admins only' });
      }
    } catch (err) {
      console.error('Auth check failed for sweepCompleteBookings', err);
      return res
        .status(401)
        .json({ ok: false, error: 'Invalid or expired admin token' });
    }
  }

  // --- Core sweep logic ---
  try {
    // graceMs: how long after endAt before auto-completing (default 2h)
    const graceMs = parseInt(req.query.graceMs || '7200000', 10);
    const now = Date.now();

    const body = req.body || {};

    // Flags from client (with safe defaults)
    const dryRun = parseBoolean(body.dryRun, false);
    const removeTestBookings = parseBoolean(body.removeTestBookings, true);
    const removeCancelledDeclined = parseBoolean(body.removeCancelledDeclined, false);

    console.log('sweepCompleteBookings starting', {
      graceMs,
      dryRun,
      removeTestBookings,
      removeCancelledDeclined,
    });

    // One pass over all bookings (this is fine for a small project like this)
    const snap = await db.collection('bookings').get();

    const batch = db.batch();

    const autoCompleted = [];
    const deletedTestBookings = [];
    const deletedCancelledBookings = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const id = docSnap.id;

      const statusRaw = data.status || '';
      const status = String(statusRaw).toLowerCase();

      const notesStr = (data.notes || '').toString().toLowerCase();
      const isTest = notesStr.includes('test');

      const isCancelledOrDeclined =
        status === 'cancelled' ||
        status === 'cancelled' ||
        status === 'declined';

      // 1) Delete explicit "test" bookings based on notes
      if (removeTestBookings && isTest) {
        deletedTestBookings.push({
          id,
          beforeStatus: statusRaw || null,
          reason: 'notes contains "test"',
        });

        if (!dryRun) {
          batch.delete(docSnap.ref);
        }
        return; // do not also auto-complete / double-handle
      }

      // 2) Optionally delete cancelled / declined bookings
      if (removeCancelledDeclined && isCancelledOrDeclined) {
        deletedCancelledBookings.push({
          id,
          beforeStatus: statusRaw || null,
          reason: 'cancelled/declined status',
        });

        if (!dryRun) {
          batch.delete(docSnap.ref);
        }
        return;
      }

      // 3) Auto-complete confirmed bookings whose endAt is older than graceMs
      if (status === 'confirmed') {
        const endAtMs = toJsDate(data.endAt)?.getTime() ?? null;
        if (endAtMs && now - endAtMs >= graceMs) {
          autoCompleted.push({
            id,
            beforeStatus: statusRaw || null,
            afterStatus: 'completed',
            endAt: data.endAt || null,
          });

          if (!dryRun) {
            batch.update(docSnap.ref, {
              status: 'completed',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }
    });

    // Commit changes if not dry-run and there is something to write
    if (!dryRun && (autoCompleted.length || deletedTestBookings.length || deletedCancelledBookings.length)) {
      await batch.commit();
    }

    console.log('sweepCompleteBookings finished', {
      dryRun,
      autoCompleted: autoCompleted.length,
      deletedTestBookings: deletedTestBookings.length,
      deletedCancelledBookings: deletedCancelledBookings.length,
    });

    // Keep old "updated" field for compatibility with the UI
    return res.status(200).json({
      ok: true,
      dryRun,
      updated: autoCompleted.length, // legacy summary: how many were auto-completed

      // Counts for quick display/debug
      autoCompletedCount: autoCompleted.length,
      deletedTestBookingsCount: deletedTestBookings.length,
      deletedCancelledBookingsCount: deletedCancelledBookings.length,

      // Structured logs for the UI (MaintenanceView can read json.logs)
      logs: {
        autoCompleted,
        deletedTestBookings,
        deletedCancelledBookings,
      },
    });
  } catch (e) {
    console.error('sweepCompleteBookings error', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});


/* ==============================
   EMAIL ENQUEUE FOR BOOKINGS
   ============================== */

// Firestore trigger: when a booking is created or updated, enqueue an email into 'mail' collection
// FIXES:
// - Also send on reschedule (scheduledAt change) as "updated"
// - Dedup via recent emailQueuedAt AND mailLastKind
exports.enqueueBookingEmail = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const bookingId = context.params.bookingId;
    const requestId = context.eventId || null;
    const beforeExists = change.before.exists;
    const afterExists = change.after.exists;

    try {
      const before = beforeExists ? change.before.data() : null;
      const after = afterExists ? change.after.data() : null;
      const booking = after || before;

      // Determine event kind early, based on existence and state changes
      let kind = null;
      if (!beforeExists && afterExists) {
        // Create event: always send "received"
        kind = 'received';
      } else if (beforeExists && afterExists) {
        // Update event: check status or timestamp changes
        if (before.status !== after.status) {
          if (after.status === 'confirmed') kind = 'confirm';
          else if (after.status === 'declined') kind = 'decline';
          else kind = 'updated'; // other status changes
        } else {
          // reschedule detection: scheduledAt or startAt changed
          const prevMs = toJsDate(canonicalTs(before))?.getTime() || 0;
          const nextMs = toJsDate(canonicalTs(after))?.getTime() || 0;
          if (prevMs !== nextMs) {
            kind = 'updated';
          }
        }
      }

      console.log(`enqueueBookingEmail triggered for booking ${bookingId}`, {
        requestId,
        beforeExists,
        afterExists,
        computedKind: kind,
      });

      if (!booking) {
        console.log(`No booking data for ${bookingId}, skipping`, { requestId });
        return null;
      }

      const contactEmail = booking?.contact?.email;
      if (!contactEmail) {
        console.log(`Booking ${bookingId} has no contact.email, skipping`, {
          requestId,
          contact: booking?.contact,
        });
        return null;
      }

      if (!kind) {
        console.log(`No email kind determined for ${bookingId}, skipping`, {
          requestId,
          beforeExists,
          afterExists,
          beforeStatus: before?.status,
          afterStatus: after?.status,
          beforeScheduledAt: before?.scheduledAt,
          afterScheduledAt: after?.scheduledAt,
          beforeStartAt: before?.startAt,
          afterStartAt: after?.startAt,
        });
        return null;
      }

      // dedupe: if we recently queued the same kind, skip
      const queuedAt = booking.emailQueuedAt ? toJsDate(booking.emailQueuedAt) : null;
      const lastKind = booking.mailLastKind || null;

      // recent dedupe window (10 minutes) per kind
      if (queuedAt && lastKind === kind) {
        const ageMs = Date.now() - queuedAt.getTime();
        console.log(`booking ${bookingId} lastKind=${lastKind} queuedAt=${queuedAt} ageMs=${ageMs}`);
        if (ageMs < 10 * 60 * 1000) {
          console.log(`Skipping email for ${bookingId} — ${kind} already queued ${ageMs}ms ago`);
          return null;
        }
      }

      const dt = canonicalTs(booking);
      const { dateStr, timeStr } = fmtDateTime(dt);
      const name = booking.contact?.name || '';
      const service = booking.serviceName || booking.service || 'cleaning';

      let subject = `Sanchez Services: Update for your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
      let html = `<p>Hi ${name},</p><p>Your booking is updated for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>`;
      let text = `Hi ${name}, Your booking is updated for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`;

      if (kind === 'confirm') {
        subject = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} is confirmed`;
        html = `<p>Hi ${name},</p><p>Your <strong>${service}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>`;
        text = `Hi ${name}, Your ${service} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`;
      } else if (kind === 'decline') {
        subject = `Sanchez Services: Update on your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
        html = `<p>Hi ${name},</p><p>We are sorry but your booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong> has been declined. Please reply or contact us to reschedule.</p>`;
        text = `Hi ${name}, We are sorry but your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''} has been declined. Please contact us to reschedule.`;
      } else if (kind === 'received') {
        subject = `Sanchez Services: We received your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
        html = `<p>Hi ${name},</p><p>We received your <strong>${service}</strong> booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>. We’ll confirm shortly.</p>`;
        text = `Hi ${name}, We received your ${service} booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}. We’ll confirm shortly.`;
      }

      // Prepare mail doc with booking metadata for traceability
      console.log(`Preparing to enqueue email for booking ${bookingId}`, {
        requestId,
        contactEmail,
        bookingStatus: booking.status,
        kind,
      });

      const mailDoc = {
        to: [contactEmail],
        message: { subject, html, text },
        meta: { bookingId, kind, status: booking.status, queuedBy: 'function_enqueueBookingEmail', requestId },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const added = await db.collection('mail').add(mailDoc);
      console.log(`mail doc created ${added.id} for booking ${bookingId}`);

      // mark booking with emailQueuedAt + lastKind to avoid duplicate sends
      if (after) {
        try {
          await change.after.ref.update({
            emailQueuedAt: admin.firestore.FieldValue.serverTimestamp(),
            mailLastKind: kind
          });
        } catch (uErr) {
          console.warn(`Could not update booking ${bookingId} with emailQueuedAt/mailLastKind`, uErr);
        }
      }

      console.log(`Enqueued "${kind}" email for booking ${bookingId} -> ${contactEmail}`);

      // ========== ADMIN NOTIFICATIONS ==========
      // Detect admin events: new booking, reschedule, cancellation

      let adminEventType = null;
      let adminKind = null;
      let adminNotifiedAtField = null;

      // isCreate: !beforeExists && afterExists
      if (!beforeExists && afterExists) {
        adminEventType = 'create';
        adminKind = 'admin_new_booking';
        adminNotifiedAtField = 'adminNewNotifiedAt';
      }

      // isReschedule: beforeExists && afterExists AND canonicalTs differs
      if (beforeExists && afterExists && !adminEventType) {
        const beforeMs = toJsDate(canonicalTs(before))?.getTime() || 0;
        const afterMs = toJsDate(canonicalTs(after))?.getTime() || 0;
        if (beforeMs && afterMs && beforeMs !== afterMs) {
          adminEventType = 'reschedule';
          adminKind = 'admin_rescheduled';
          adminNotifiedAtField = 'adminRescheduleNotifiedAt';
        }
      }

      // isCancellation: beforeExists && afterExists AND status changed to cancelled/cancelled
      if (beforeExists && afterExists && !adminEventType) {
        const beforeStatus = (before?.status || '').toLowerCase();
        const afterStatus = (after?.status || '').toLowerCase();
        if (beforeStatus !== afterStatus && (afterStatus === 'cancelled' || afterStatus === 'cancelled')) {
          adminEventType = 'cancel';
          adminKind = 'admin_cancelled';
          adminNotifiedAtField = 'adminCancelNotifiedAt';
        }
      }

      console.log(`Admin event detection for ${bookingId}`, {
        requestId,
        adminEventType: adminEventType || 'none',
        adminKind: adminKind || 'none',
      });

      // If we have an admin event, check dedup and enqueue
      if (adminEventType && adminKind && adminNotifiedAtField && after) {
        // Check if already notified
        if (after[adminNotifiedAtField]) {
          console.log(`Admin notification skipped for ${bookingId}: ${adminKind} already sent`, {
            requestId,
            field: adminNotifiedAtField,
            notifiedAt: after[adminNotifiedAtField],
          });
        } else {
          // Build admin email content
          const adminRecipients = Array.from(ADMIN_EMAILS);
          const customerName = booking.contact?.name || 'Customer';
          const customerEmail = booking.contact?.email || 'N/A';
          const customerPhone = booking.contact?.phone || 'N/A';
          
          const addr = booking.address || {};
          const addressLine = [
            addr.line1 || '',
            addr.city || '',
            addr.state || '',
            addr.zip || ''
          ].filter(Boolean).join(', ') || 'Address not provided';

          let adminSubject = '';
          let adminHtml = '';
          let adminText = '';

          if (adminKind === 'admin_new_booking') {
            adminSubject = `New booking request: ${service} on ${dateStr}${timeStr ? ` ${timeStr}` : ''}`;
            adminHtml = `<p><strong>New booking request</strong></p>
<p>Booking ID: ${bookingId}</p>
<p>Service: ${service}</p>
<p>Status: ${booking.status || 'pending'}</p>
<p>Date/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}</p>
<p>Customer: ${customerName}</p>
<p>Email: ${customerEmail}</p>
<p>Phone: ${customerPhone}</p>
<p>Address: ${addressLine}</p>`;
            adminText = `New booking request\nBooking ID: ${bookingId}\nService: ${service}\nStatus: ${booking.status || 'pending'}\nDate/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\nAddress: ${addressLine}`;
          } else if (adminKind === 'admin_rescheduled') {
            const oldDt = canonicalTs(before);
            const { dateStr: oldDateStr, timeStr: oldTimeStr } = fmtDateTime(oldDt);
            adminSubject = `Booking rescheduled: ${service} now on ${dateStr}${timeStr ? ` ${timeStr}` : ''}`;
            adminHtml = `<p><strong>Booking rescheduled</strong></p>
<p>Booking ID: ${bookingId}</p>
<p>Service: ${service}</p>
<p>Status: ${booking.status || 'pending'}</p>
<p>Old Date/Time: ${oldDateStr}${oldTimeStr ? ` ${oldTimeStr}` : ''}</p>
<p>New Date/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}</p>
<p>Customer: ${customerName}</p>
<p>Email: ${customerEmail}</p>
<p>Phone: ${customerPhone}</p>
<p>Address: ${addressLine}</p>`;
            adminText = `Booking rescheduled\nBooking ID: ${bookingId}\nService: ${service}\nStatus: ${booking.status || 'pending'}\nOld Date/Time: ${oldDateStr}${oldTimeStr ? ` ${oldTimeStr}` : ''}\nNew Date/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\nAddress: ${addressLine}`;
          } else if (adminKind === 'admin_cancelled') {
            adminSubject = `Booking cancelled: ${service} on ${dateStr}${timeStr ? ` ${timeStr}` : ''}`;
            adminHtml = `<p><strong>Booking cancelled</strong></p>
<p>Booking ID: ${bookingId}</p>
<p>Service: ${service}</p>
<p>Status: ${booking.status}</p>
<p>Date/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}</p>
<p>Customer: ${customerName}</p>
<p>Email: ${customerEmail}</p>
<p>Phone: ${customerPhone}</p>
<p>Address: ${addressLine}</p>`;
            adminText = `Booking cancelled\nBooking ID: ${bookingId}\nService: ${service}\nStatus: ${booking.status}\nDate/Time: ${dateStr}${timeStr ? ` ${timeStr}` : ''}\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone}\nAddress: ${addressLine}`;
          }

          // Enqueue admin mail doc
          const adminMailDoc = {
            to: adminRecipients,
            message: { subject: adminSubject, html: adminHtml, text: adminText },
            meta: { bookingId, kind: adminKind, status: booking.status, queuedBy: 'function_enqueueBookingEmail', requestId },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          try {
            const adminMailAdded = await db.collection('mail').add(adminMailDoc);
            console.log(`Admin notification queued: ${adminKind} for booking ${bookingId}, mail doc ${adminMailAdded.id}`, { requestId });

            // Update the corresponding adminNotifiedAt field
            const updatePayload = {};
            updatePayload[adminNotifiedAtField] = admin.firestore.FieldValue.serverTimestamp();
            await change.after.ref.update(updatePayload);
            console.log(`Updated ${adminNotifiedAtField} for booking ${bookingId}`, { requestId });
          } catch (adminErr) {
            console.error(`Failed to enqueue admin notification for ${bookingId}`, {
              requestId,
              adminKind,
              error: adminErr?.message || String(adminErr),
            });
          }
        }
      }

      return null;
    } catch (e) {
      console.error('enqueueBookingEmail error', {
        requestId,
        bookingId,
        error: e?.message || String(e),
        stack: e?.stack,
      });
      return null;
    }
  });


/* ==============================
   ONE-OFF: MIGRATE profiles.fullName -> profiles.name
   Admin-only endpoint. Safe to call with ?dryRun=true (default true).
   Usage: POST to the function URL with optional JSON { dryRun: false }
   Response: { ok, dryRun, totalProfiles, toUpdateCount, updatedCount, sampleIds }
   ============================== */
exports.migrateProfiles_fullNameToName = functions.https.onRequest(async (req, res) => {
  // CORS + preflight (permissive for admin tooling)
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  // Auth: require a Bearer idToken from an admin user
  try {
    const header = req.headers.authorization || '';
    const m = header.match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ ok: false, error: 'Missing Bearer token' });
    const idToken = m[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const emailLower = (decoded.email || '').toLowerCase();
    const uid = decoded.uid;

    if (!(await isAdminByUidAndEmail(uid, emailLower, IS_DEV))) {
      return res.status(403).json({ ok: false, error: 'Admins only' });
    }

    const body = req.body || {};
    const dryRun = body.dryRun === undefined ? true : Boolean(body.dryRun);

    console.log('migrateProfiles_fullNameToName starting', { dryRun, requestedBy: emailLower, uid });

    const snap = await db.collection('profiles').get();
    const totalProfiles = snap.size;
    const toUpdate = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const hasName = (data.name && String(data.name).trim()) || false;
      const hasFullName = (data.fullName && String(data.fullName).trim()) || false;
      if (!hasName && hasFullName) {
        toUpdate.push({ id: docSnap.id, fullName: String(data.fullName).trim() });
      }
    });

    const toUpdateCount = toUpdate.length;
    let updatedCount = 0;
    const sampleIds = toUpdate.slice(0, 20).map((u) => u.id);

    if (!dryRun && toUpdateCount > 0) {
      // Commit in chunks of 500
      const chunks = [];
      for (let i = 0; i < toUpdate.length; i += 500) chunks.push(toUpdate.slice(i, i + 500));

      for (const chunk of chunks) {
        const batch = db.batch();
        for (const item of chunk) {
          const ref = db.collection('profiles').doc(item.id);
          batch.update(ref, {
            name: item.fullName,
            migrated_fullNameToNameAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
        updatedCount += chunk.length;
      }
    }

    console.log('migrateProfiles_fullNameToName finished', { dryRun, totalProfiles, toUpdateCount, updatedCount });

    return res.status(200).json({ ok: true, dryRun, totalProfiles, toUpdateCount, updatedCount, sampleIds });
  } catch (err) {
    console.error('migrateProfiles_fullNameToName error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


/* ==============================
   CHECK BOOKING CONFLICT (callable)
   - Checks if a new booking would conflict with existing confirmed/scheduled bookings.
   - Uses admin credentials to safely read all bookings for a given date.
   - Returns { conflict: boolean, with?: string } where with is a conflict summary.
   ============================== */

exports.checkBookingConflict = functions.https.onCall(async (data, context) => {
  // Require authentication (any signed-in user can check conflicts)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to check booking conflicts.'
    );
  }

  const { startAt, endAt, dateKey, ignoreId } = data || {};

  if (!startAt || !endAt) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: startAt and endAt.'
    );
  }

  try {
    // Parse timestamps
    let startDate, endDate;

    if (typeof startAt === 'object' && startAt.seconds) {
      // Firestore Timestamp-like object { seconds, nanoseconds }
      startDate = new Date(startAt.seconds * 1000);
    } else if (startAt instanceof Date) {
      startDate = startAt;
    } else if (typeof startAt === 'string') {
      startDate = new Date(startAt);
    } else if (typeof startAt === 'number') {
      startDate = new Date(startAt);
    } else {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'startAt must be a valid timestamp.'
      );
    }

    if (typeof endAt === 'object' && endAt.seconds) {
      endDate = new Date(endAt.seconds * 1000);
    } else if (endAt instanceof Date) {
      endDate = endAt;
    } else if (typeof endAt === 'string') {
      endDate = new Date(endAt);
    } else if (typeof endAt === 'number') {
      endDate = new Date(endAt);
    } else {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'endAt must be a valid timestamp.'
      );
    }

    // Set search window: start of the candidate start day to end of that day
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Query all blocking bookings for that day: pending, confirmed, scheduled (admin read)
    const snap = await db.collection('bookings')
      .where('startAt', '>=', admin.firestore.Timestamp.fromDate(dayStart))
      .where('startAt', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
      .where('status', 'in', ['pending', 'confirmed', 'scheduled'])
      .get();

    // Helper to check if two time ranges overlap
    const hasOverlap = (s1, e1, s2, e2) => {
      return s1 < e2 && e1 > s2;
    };

    // Check each booking for conflicts
    for (const docSnap of snap.docs) {
      if (ignoreId && docSnap.id === ignoreId) continue;

      const booking = docSnap.data();
      const status = String(booking.status || '').toLowerCase();

      // Skip non-blocking statuses (double-check, though query already filters)
      if (status === 'cancelled' || status === 'declined' || status === 'completed') {
        continue;
      }

      // Extract booking times
      const bookingStart = booking.startAt?.toDate?.()
        ? booking.startAt.toDate()
        : booking.startAt instanceof Date
        ? booking.startAt
        : booking.scheduledAt?.toDate?.()
        ? booking.scheduledAt.toDate()
        : booking.scheduledAt instanceof Date
        ? booking.scheduledAt
        : null;

      let bookingEnd = booking.endAt?.toDate?.()
        ? booking.endAt.toDate()
        : booking.endAt instanceof Date
        ? booking.endAt
        : null;

      if (!bookingStart) continue;

      // If no explicit end time, calculate from duration
      if (!bookingEnd && bookingStart) {
        const durationMin = Number(booking.durationMinutes || booking.durationHours ? booking.durationHours * 60 : 120);
        bookingEnd = new Date(bookingStart.getTime() + durationMin * 60 * 1000);
      }

      if (!bookingEnd) continue;

      // Check for overlap with new booking
      if (hasOverlap(startDate, endDate, bookingStart, bookingEnd)) {
        const timeStr = bookingStart.toLocaleString();
        const endTimeStr = bookingEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          conflict: true,
          with: `${booking.serviceName || booking.service || 'Booking'} — ${timeStr} to ${endTimeStr}`,
        };
      }
    }

    // No conflicts found
    return { conflict: false };
  } catch (err) {
    console.error('checkBookingConflict error', {
      uid: context.auth?.uid,
      startAt,
      endAt,
      error: err?.message || String(err),
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check booking conflicts.'
    );
  }
});

/* ==============================
   GET DAY AVAILABILITY (callable)
   - Returns aggregated availability for a given day
   - Input: { dateKey: "yyyy-MM-dd", timeOptions: string[], slotCapacity: number, dailyCapacity: number, durationMinutes: number, ignoreBookingId?: string }
   - Blocks on: pending, confirmed, scheduled
   - Returns: { dateKey, fullyBooked: boolean, blockedSlots: string[], slotCounts: Record<string, number>, dayCountBlocking: number }
   - NO PII/booking details returned
   ============================== */

exports.getDayAvailability = functions.https.onCall(async (data, context) => {
  // Require authentication (any signed-in user can check availability)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to check availability.'
    );
  }

  const { dateKey, timeOptions, slotCapacity, dailyCapacity, durationMinutes, ignoreBookingId } = data || {};

  if (!dateKey || !timeOptions || !Array.isArray(timeOptions) || !slotCapacity || !dailyCapacity || !durationMinutes) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing or invalid required fields: dateKey, timeOptions (array), slotCapacity, dailyCapacity, durationMinutes.'
    );
  }

  try {
    // Parse dateKey to get day bounds
    const parts = dateKey.split('-');
    if (parts.length !== 3) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'dateKey must be in format "yyyy-MM-dd".'
      );
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const dayStart = new Date(year, month, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid dateKey.'
      );
    }

    // Query all blocking bookings for that day (admin read): pending, confirmed, scheduled
    const snap = await db.collection('bookings')
      .where('startAt', '>=', admin.firestore.Timestamp.fromDate(dayStart))
      .where('startAt', '<=', admin.firestore.Timestamp.fromDate(dayEnd))
      .where('status', 'in', ['pending', 'confirmed', 'scheduled'])
      .get();

    const blockingBookings = snap.docs
      .map(doc => {
        const booking = doc.data();
        const bookingStart = booking.startAt?.toDate?.()
          ? booking.startAt.toDate()
          : booking.startAt instanceof Date
          ? booking.startAt
          : booking.scheduledAt?.toDate?.()
          ? booking.scheduledAt.toDate()
          : booking.scheduledAt instanceof Date
          ? booking.scheduledAt
          : null;

        let bookingEnd = booking.endAt?.toDate?.()
          ? booking.endAt.toDate()
          : booking.endAt instanceof Date
          ? booking.endAt
          : null;

        if (!bookingStart) return null;

        // If no explicit end, calculate from duration
        if (!bookingEnd && bookingStart) {
          const durationMin = Number(booking.durationMinutes || (booking.durationHours ? booking.durationHours * 60 : 120));
          bookingEnd = new Date(bookingStart.getTime() + durationMin * 60 * 1000);
        }

        if (!bookingEnd) return null;

        return {
          id: doc.id,
          startAt: bookingStart,
          endAt: bookingEnd,
        };
      })
      .filter(b => b !== null);

    // Helper: check if two time ranges overlap
    const hasOverlap = (s1, e1, s2, e2) => {
      return s1 < e2 && e1 > s2;
    };

    // For each time option, count overlaps and check if slot is fully booked
    const slotCounts = {};
    const blockedSlots = [];

    for (const timeStr of timeOptions) {
      // Parse time string (e.g., "09:00 AM") and create start/end for that slot
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) continue;

      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();

      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const slotStart = new Date(year, month, day, hour, minute, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

      // Count how many blocking bookings overlap this slot
      let overlapCount = 0;

      for (const booking of blockingBookings) {
        // Skip the booking being edited (if provided)
        if (ignoreBookingId && booking.id === ignoreBookingId) continue;

        if (hasOverlap(slotStart, slotEnd, booking.startAt, booking.endAt)) {
          overlapCount += 1;
        }
      }

      slotCounts[timeStr] = overlapCount;

      // Mark slot as blocked if it reached slot capacity
      if (overlapCount >= slotCapacity) {
        blockedSlots.push(timeStr);
      }
    }

    // Check if the entire day is at or over capacity
    const totalBlockingBookings = blockingBookings
      .filter(b => !ignoreBookingId || b.id !== ignoreBookingId)
      .length;

    const dayCountBlocking = totalBlockingBookings;
    const fullyBooked = dayCountBlocking >= dailyCapacity;

    return {
      dateKey,
      fullyBooked,
      blockedSlots,
      slotCounts,
      dayCountBlocking,
    };
  } catch (err) {
    if (err.code && err.code.startsWith('invalid-argument')) {
      throw err; // Re-throw validation errors
    }
    console.error('getDayAvailability error', {
      uid: context.auth?.uid,
      dateKey,
      error: err?.message || String(err),
    });
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get availability.'
    );
  }
});

/* ==============================
   GENERATE INVOICE PDF (callable)
   - Admin-only callable that renders a small invoice HTML to PDF using Puppeteer,
     uploads to the project's default Cloud Storage bucket, and returns a signed URL.
   - Falls back to returning a base64 PDF if Storage is not configured or upload fails.
   ============================== */

exports.generateInvoicePdf = functions.https.onCall(async (data, context) => {
  // Only admins may call this
  try {
    const allowed = await isAdminServer(context);
    if (!allowed) {
      throw new functions.https.HttpsError('permission-denied', 'Admins only');
    }
  } catch (err) {
    console.error('generateInvoicePdf auth check failed', err);
    throw new functions.https.HttpsError('internal', 'Auth check failed');
  }

  const bookingId = data && data.bookingId;
  if (!bookingId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing bookingId');
  }

  try {
    const snap = await db.collection('bookings').doc(String(bookingId)).get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Booking not found');
    }
    const booking = snap.data() || {};

    // Build a minimal invoice HTML. Keep it simple and self-contained to avoid external assets.
    const orderCode = String(bookingId);
    const invoiceDate = new Date().toLocaleDateString();
    const addr = (booking.address && typeof booking.address === 'string')
      ? booking.address
      : (booking.contact && booking.contact.address) || 'Address on file';
    const service = booking.serviceName || booking.service || 'Service';
    const amount = Number(booking.amount || booking.price || booking.cost || 0).toFixed(2);

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Invoice ${orderCode}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:20px}header{display:flex;align-items:center;gap:12px;margin-bottom:18px}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px;border-bottom:1px solid #eee}tfoot td{border-top:2px solid #ddd}</style></head><body><header><div><h1>Invoice</h1><div>Invoice #: <strong>${orderCode}</strong></div><div>Date: ${invoiceDate}</div></div></header><section><div><strong>Bill to:</strong><div style="white-space:pre-line;margin-top:6px">${String(addr)}</div></div></section><section><table><thead><tr><th style="text-align:left">Description</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td>${service}</td><td style="text-align:right">$${amount}</td></tr></tbody><tfoot><tr><td style="text-align:left"><strong>Total</strong></td><td style="text-align:right"><strong>$${amount}</strong></td></tr></tfoot></table></section></body></html>`;

    // Use pdf-lib to generate a simple invoice PDF server-side (avoids Chromium downloads)
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const marginLeft = 50;
    let y = 800;

    // Header
    page.drawText('Invoice', { x: marginLeft, y, size: 20, font: helvetica, color: rgb(0.07, 0.07, 0.07) });
    y -= 28;

    page.drawText(`Invoice #: ${orderCode}`, { x: marginLeft, y, size: 11, font: helvetica });
    y -= 16;
    page.drawText(`Date: ${invoiceDate}`, { x: marginLeft, y, size: 11, font: helvetica });
    y -= 22;

    // Bill to
    page.drawText('Bill to:', { x: marginLeft, y, size: 12, font: helvetica });
    y -= 14;
    const addrLines = String(addr).split('\n');
    addrLines.forEach((line) => {
      page.drawText(line, { x: marginLeft, y, size: 11, font: helvetica });
      y -= 14;
    });

    y -= 6;

    // Table header
    const descX = marginLeft;
    const amtX = 500;
    page.drawText('Description', { x: descX, y, size: 11, font: helvetica });
    page.drawText('Amount', { x: amtX, y, size: 11, font: helvetica });
    y -= 14;
    page.drawLine({ start: { x: marginLeft, y }, end: { x: 540, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 8;

    // Single line item (service)
    page.drawText(service, { x: descX, y, size: 11, font: helvetica });
    page.drawText(`$${amount}`, { x: amtX, y, size: 11, font: helvetica });
    y -= 18;

    // Total
    y -= 6;
    page.drawLine({ start: { x: marginLeft, y }, end: { x: 540, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 18;
    page.drawText('Total', { x: descX, y, size: 12, font: helvetica });
    page.drawText(`$${amount}`, { x: amtX, y, size: 12, font: helvetica });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Try to upload to default storage bucket
    try {
      const bucket = admin.storage().bucket();
      const filename = `invoices/${orderCode}-${Date.now()}.pdf`;
      const file = bucket.file(filename);
      await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });

      // Generate a signed URL (valid 1 hour)
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 });
      return { url: signedUrl };
    } catch (uploadErr) {
      console.warn('Could not upload PDF to storage, returning base64', uploadErr);
      return { pdfBase64: pdfBuffer.toString('base64') };
    }
  } catch (e) {
    console.error('generateInvoicePdf error', e);
    throw new functions.https.HttpsError('internal', String(e?.message || e));
  }
});

/* ==============================
   AVAILABILITY MAINTENANCE
   ============================== */

// Create → increment if the booking blocks capacity
exports.onBookingCreate = functions.firestore
  .document('bookings/{id}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!blocksCapacity(data.status)) return null;
    const keys = keysFromBooking(data);
    if (!keys) return null;
    await applyDelta(keys, +1);
    return null;
  });

// Delete → decrement if the booking had blocked capacity
exports.onBookingDelete = functions.firestore
  .document('bookings/{id}')
  .onDelete(async (snap) => {
    const data = snap.data();
    if (!blocksCapacity(data.status)) return null;
    const keys = keysFromBooking(data);
    if (!keys) return null;
    await applyDelta(keys, -1);
    return null;
  });

// Update → handle status and date/time changes
exports.onBookingUpdate = functions.firestore
  .document('bookings/{id}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    const beforeBlocks = blocksCapacity(before.status);
    const afterBlocks = blocksCapacity(after.status);

    const beforeKeys = keysFromBooking(before);
    const afterKeys = keysFromBooking(after);

    if (!beforeBlocks && !afterBlocks) return null;

    // blocking → non-blocking
    if (beforeBlocks && !afterBlocks && beforeKeys) {
      await applyDelta(beforeKeys, -1);
      return null;
    }
    // non-blocking → blocking
    if (!beforeBlocks && afterBlocks && afterKeys) {
      await applyDelta(afterKeys, +1);
      return null;
    }

    // still blocking, but slot changed
    const changed =
      !beforeKeys ||
      !afterKeys ||
      beforeKeys.dateKey !== afterKeys.dateKey ||
      beforeKeys.timeLabel !== afterKeys.timeLabel;

    if (changed && beforeKeys && afterKeys) {
      await applyDelta(beforeKeys, -1);
      await applyDelta(afterKeys, +1);
    }
    return null;
  });

/**
 * Optional admin-only callable to rebuild a given day.
 * Call with { dateKey: "YYYY-MM-DD" }
 * Restrict UID below to your admin UID.
 */
exports.rebuildAvailabilityForDay = functions.https.onCall(async (data, context) => {
  const OWNER_UID = '1Ku2G5K7EnMBOT5tHCleuL0tDPz1';
  const OWNER_UID_2 = 'tcNfLl71F4egLReiutPzYvQaNvl2';
  if (context.auth?.uid !== OWNER_UID && context.auth?.uid !== OWNER_UID_2) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const dateKey = String(data?.dateKey || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new functions.https.HttpsError('invalid-argument', 'dateKey must be YYYY-MM-DD');
  }

  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);

  // Collect bookings that use scheduledAt OR startAt within this day
  const seen = new Set();
  const rows = [];

  const q1 = await db.collection('bookings')
    .where('scheduledAt', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(end))
    .get();

  q1.forEach(d => { seen.add(d.id); rows.push(d.data()); });

  const q2 = await db.collection('bookings')
    .where('startAt', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('startAt', '<=', admin.firestore.Timestamp.fromDate(end))
    .get();

  q2.forEach(d => { if (!seen.has(d.id)) rows.push(d.data()); });

  const taken = {};
  let dayCount = 0;

  for (const b of rows) {
    if (!blocksCapacity(b.status)) continue;
    const k = keysFromBooking(b);
    if (!k) continue;
    taken[k.timeLabel] = (taken[k.timeLabel] || 0) + 1;
    dayCount++;
  }

  await db.collection('availability').doc(dateKey).set({
    dateKey,
    takenSlotsByTime: taken,
    dayCount,
    _capacity: { slot: SLOT_CAPACITY, day: DAILY_CAPACITY, timeOptions: TIME_OPTIONS },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { dateKey, dayCount, taken };
});

/* ==============================
   REVIEWS — NORMALIZE + APPROVAL
   ============================== */

// Ensure a freshly created review has sane defaults
exports.onReviewCreate = functions.firestore
  .document('reviews/{id}')
  .onCreate(async (snap) => {
    const r = snap.data() || {};
    const patch = {};
    if (!r.createdAt) patch.createdAt = admin.firestore.FieldValue.serverTimestamp();
    if (!r.status) patch.status = 'pending';
    const emailLower =
      r.emailLower || (typeof r.email === 'string' ? r.email.toLowerCase() : null);
    if (emailLower) patch.emailLower = emailLower;

    if (Object.keys(patch).length) {
      await snap.ref.set(patch, { merge: true });
    }
    return null;
  });

// When status flips to approved, stamp publishedAt if missing
exports.onReviewUpdate = functions.firestore
  .document('reviews/{id}')
  .onUpdate(async (change) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (before.status !== 'approved' && after.status === 'approved') {
      const patch = {};
      if (!after.publishedAt) patch.publishedAt = admin.firestore.FieldValue.serverTimestamp();
      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      if (Object.keys(patch).length) await change.after.ref.update(patch);
    }
    return null;
  });

// Callable for approving a review (enforces server-side admin check)
exports.approveReview = functions.https.onCall(async (data, context) => {
  if (!(await isAdminServer(context))) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const id = String(data?.id || '');
  if (!id) {
    throw new functions.https.HttpsError('invalid-argument', 'id is required');
  }
  await db.doc(`reviews/${id}`).update({
    status: 'approved',
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, id };
});

// Callable for declining a review
exports.declineReview = functions.https.onCall(async (data, context) => {
  if (!(await isAdminServer(context))) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const id = String(data?.id || '');
  if (!id) {
    throw new functions.https.HttpsError('invalid-argument', 'id is required');
  }
  await db.doc(`reviews/${id}`).update({
    status: 'declined',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, id };
});

// Optional: when a review is approved, keep a denormalized "live" copy
exports.onReviewApprove = functions.firestore
  .document('reviews/{id}')
  .onUpdate(async (change, ctx) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    // If status changed to approved, copy into a curated collection (if you want)
    if (before.status !== 'approved' && after.status === 'approved') {
      await db.collection('approved_reviews').doc(ctx.params.id).set(
        {
          name: after.name || 'Anonymous',
          rating: Number(after.rating || 5),
          body: after.body || '',
          publishedAt: after.publishedAt || admin.firestore.FieldValue.serverTimestamp(),
          source: after.source || 'client-portal',
        },
        { merge: true }
      );
    }
    return null;
  });

/* ==============================
   STRIPE CHECKOUT SESSION (DEPOSIT + REMAINING BALANCE)
   ============================== */

exports.createStripeCheckoutSession = functions.https.onCall(
  async (data, context) => {
    // Check if Stripe is configured
    if (!stripe) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe payment processing is not configured. Please contact support."
      );
    }

    if (!FRONTEND_URL) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe configuration incomplete. Missing required fields."
      );
    }

    // Require auth
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to create a payment session."
      );
    }

    const {
      bookingId,
      totalPrice,
      depositAmount,
      remainingBalance,
      customerEmail,
      customerName,
      mode: rawMode,
      purpose,
    } = data || {};

    if (!bookingId || !customerEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: bookingId and customerEmail."
      );
    }

    // Backwards-compatible: default to "deposit" unless explicitly told otherwise
    const mode = (rawMode || purpose || "deposit").toString();

    const deposit = Number(depositAmount || 0);
    const total = Number(totalPrice || 0);
    const remaining = Number(remainingBalance || 0);
    const intendedNetAmount = mode === "remaining_balance" ? remaining : deposit;

    // Basic validation for remaining balance mode
    if (mode === "remaining_balance") {
      if (!remaining || remaining <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Remaining balance must be greater than zero."
        );
      }
    } else {
      // deposit mode (old behavior)
      if (!deposit || deposit <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Deposit amount must be greater than zero."
        );
      }
    }

    let customer;
    const chargeBreakdown = calculateGrossFromNet(intendedNetAmount);
    const paymentLabel =
      mode === "remaining_balance" ? "Service balance" : "Booking deposit";
    const metadata = {
      bookingId,
      totalPrice: String(total),
      depositAmount: String(deposit),
      remainingBalance: String(remaining),
      customerEmail,
      mode,
      payment_type: mode,
      intended_net_amount: chargeBreakdown.netAmount.toFixed(2),
      estimated_stripe_fee: chargeBreakdown.estimatedFee.toFixed(2),
      gross_charge_amount: chargeBreakdown.grossAmount.toFixed(2),
    };

    try {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || undefined,
        metadata: {
          bookingId,
        },
      });
    } catch (err) {
      console.error("Stripe customer create failed:", err);
      throw new functions.https.HttpsError(
        "internal",
        "Could not create Stripe customer."
      );
    }

    // Try to store stripeCustomerId on the booking doc for later invoicing
    try {
      await db.collection("bookings").doc(bookingId).update({
        stripeCustomerId: customer.id,
      });
    } catch (err) {
      console.warn("Failed to update booking with stripeCustomerId:", err);
      // not fatal — continue
    }

    try {
      // Decide where to send the user after Stripe based on mode
      const successPath =
        mode === "remaining_balance" ? "/payment-confirmation" : "/confirm";

      let sessionConfig = {
        mode: "payment",
        payment_method_types: ["card"],
        customer: customer.id,
        metadata,
        payment_intent_data: {
          metadata,
        },
        success_url: `${FRONTEND_URL}${successPath}?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}&mode=${mode}&intended_net_amount=${chargeBreakdown.netAmount.toFixed(2)}&estimated_stripe_fee=${chargeBreakdown.estimatedFee.toFixed(2)}&gross_charge_amount=${chargeBreakdown.grossAmount.toFixed(2)}`,
        cancel_url: `${FRONTEND_URL}${successPath}?bookingId=${bookingId}&cancelled=1&mode=${mode}&intended_net_amount=${chargeBreakdown.netAmount.toFixed(2)}&estimated_stripe_fee=${chargeBreakdown.estimatedFee.toFixed(2)}&gross_charge_amount=${chargeBreakdown.grossAmount.toFixed(2)}`,
      };

      sessionConfig.line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sanchez Services ${paymentLabel}`,
            },
            unit_amount: chargeBreakdown.netAmountCents,
          },
          quantity: 1,
        },
      ];

      if (chargeBreakdown.estimatedFeeCents > 0) {
        sessionConfig.line_items.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Card processing fee",
            },
            unit_amount: chargeBreakdown.estimatedFeeCents,
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return { url: session.url };
    } catch (err) {
      console.error("Stripe checkout session create failed:", err);
      throw new functions.https.HttpsError(
        "internal",
        "Could not create Stripe Checkout session."
      );
    }
  }
);

/* ==============================
   STRIPE WEBHOOK
   - Handles both deposit & remaining balance payments
   ============================== */

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (!stripe) {
    console.error('stripeWebhook called but Stripe is not configured');
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  if (!STRIPE_SIGNING_SECRET) {
    console.error('stripeWebhook called but signing secret is missing');
    return res.status(503).json({ error: 'Stripe webhook signing secret not configured' });
  }

  const sig = req.headers["stripe-signature"];

  let event;
  try {
    // IMPORTANT: req.rawBody is needed so Stripe can verify the signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      STRIPE_SIGNING_SECRET
    );
  } catch (err) {
    console.error("stripeWebhook signature verification failed", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const md = paymentIntent.metadata || {};

        const bookingId = md.bookingId;
        const mode = (md.mode || "deposit").toString(); // "deposit" | "remaining_balance"

        // Stripe reports amount in cents; prefer that over metadata
        const amountReceivedCents =
          typeof paymentIntent.amount_received === "number"
            ? paymentIntent.amount_received
            : paymentIntent.amount; // fallback

        const amountReceived =
          typeof amountReceivedCents === "number"
            ? amountReceivedCents / 100
            : 0;

        const depositAmountMeta = Number(md.depositAmount || 0);
        const totalPriceMeta = Number(md.totalPrice || 0);
        const remainingBalanceMeta = Number(md.remainingBalance || 0);
        const intendedNetAmount = Number(
          md.intended_net_amount ||
            (mode === "remaining_balance" ? remainingBalanceMeta : depositAmountMeta) ||
            0
        );
        const estimatedStripeFee = Number(md.estimated_stripe_fee || 0);
        const grossChargeAmount = Number(md.gross_charge_amount || amountReceived || 0);

        console.log("payment_intent.succeeded", {
          bookingId,
          mode,
          amountReceived,
          intendedNetAmount,
          estimatedStripeFee,
          grossChargeAmount,
          depositAmountMeta,
          totalPriceMeta,
          remainingBalanceMeta,
          paymentIntentId: paymentIntent.id,
        });

        if (!bookingId) {
          console.warn(
            "payment_intent.succeeded missing bookingId in metadata, skipping"
          );
          break;
        }

        const bookingRef = db.collection("bookings").doc(bookingId);

        await db.runTransaction(async (tx) => {
          const snap = await tx.get(bookingRef);
          if (!snap.exists) {
            console.warn("Booking not found for payment", bookingId);
            return;
          }

          const data = snap.data() || {};
          const statusRaw = data.status || "";
          const status = String(statusRaw).toLowerCase();

          const currentPaid = Number(data.paid || 0);

          // trust Firestore first, then metadata
          const totalPrice =
            data.totalPrice != null
              ? Number(data.totalPrice)
              : totalPriceMeta || 0;

          let patch = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (mode === "remaining_balance") {
            if (data.balancePaymentIntentId === paymentIntent.id) {
              return;
            }

            // Remaining-balance payment
            const delta = intendedNetAmount || remainingBalanceMeta || 0;
            const newPaid = currentPaid + delta;
            const newRemaining = Math.max(0, totalPrice - newPaid);

            patch.paid = newPaid;
            patch.remainingBalance = newRemaining;
            patch.balancePaymentIntentId = paymentIntent.id;
            patch.balancePaymentMethod = "card_stripe";
            patch.balanceStripeNetAmount = delta;
            patch.balanceStripeFeeAmount = estimatedStripeFee;
            patch.balanceStripeGrossAmount = grossChargeAmount;

            // If balance is now zero, mark as completed (unless already cancelled)
            if (
              newRemaining <= 0 &&
              !["cancelled", "cancelled", "declined"].includes(status)
            ) {
              patch.status = "completed";
            }
          } else {
            if (data.depositPaymentIntentId === paymentIntent.id) {
              return;
            }

            // Deposit flow (original behavior, but more explicit)
            const depositAmount =
              intendedNetAmount || depositAmountMeta || Number(data.depositAmount || 0) || 0;

            const newPaid = currentPaid + depositAmount;
            const newRemaining = Math.max(0, totalPrice - newPaid);

            patch.depositPaid = true;
            patch.depositAmount =
              data.depositAmount != null
                ? Number(data.depositAmount)
                : depositAmount;
            patch.depositPaymentIntentId = paymentIntent.id;
            patch.depositPaymentMethod = "card_stripe";
            patch.paid = newPaid;
            patch.remainingBalance = newRemaining;
            patch.depositStripeNetAmount = depositAmount;
            patch.depositStripeFeeAmount = estimatedStripeFee;
            patch.depositStripeGrossAmount = grossChargeAmount;

            // Auto-confirm if it was pending / awaiting_deposit / blank
            if (!status || status === "pending" || status === "awaiting_deposit") {
              patch.status = "confirmed";
            }
          }

          tx.update(bookingRef, patch);
        });

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("stripeWebhook handler error", err);
    return res.status(500).send(`Webhook handler error: ${err.message}`);
  }
});
