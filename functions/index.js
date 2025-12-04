// Cloud Functions (CommonJS) — existing behavior + availability maintenance + review helpers.

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

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

// Admin allowlist (must be lowercase)
const ADMIN_EMAILS = new Set([
  'jessabel.santos@gmail.com',
  'sanchezservices24@yahoo.com',
]);

// default: require auth for sweep unless explicitly disabled
const REQUIRE_AUTH = process.env.SWEEP_REQUIRE_AUTH !== 'false';

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
  return !['declined', 'canceled', 'cancelled', 'completed', 'expired', 'refunded'].includes(s);
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

// Server-side admin check aligned with Firestore rules
async function isAdminServer(context) {
  const uid = context?.auth?.uid || null;
  const emailLower = (context?.auth?.token?.email || '').toLowerCase();
  if (!uid) return false;
  if (emailLower && ADMIN_EMAILS.has(emailLower)) return true;
  try {
    const [adminDoc, profileDoc] = await Promise.all([
      db.doc(`admins/${uid}`).get(),
      db.doc(`profiles/${uid}`).get(),
    ]);
    if (adminDoc.exists) return true;
    if (profileDoc.exists) {
      const role = (profileDoc.data().role || '').toLowerCase();
      if (role === 'admin' || role === 'owner') return true;
    }
  } catch (_) {}
  return false;
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

      // Only allow known admins
      if (!ADMIN_EMAILS.has(emailLower)) {
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
        status === 'canceled' ||
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
    console.log(`enqueueBookingEmail triggered for booking ${bookingId}`);
    try {
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;
      const booking = after || before;
      if (!booking) {
        console.log(`No booking data for ${bookingId}, skipping`);
        return null;
      }

      const contactEmail = booking?.contact?.email;
      if (!contactEmail) {
        console.log(`Booking ${bookingId} has no contact.email, skipping`);
        return null;
      }

      // dedupe: if we recently queued the same kind, skip
      const queuedAt = booking.emailQueuedAt ? toJsDate(booking.emailQueuedAt) : null;
      const lastKind = booking.mailLastKind || null;

      // determine event kind
      let kind = null;

      if (!before && after) {
        // onCreate
        kind = 'received';
      } else if (before && after) {
        // status changes
        if (before.status !== after.status) {
          if (after.status === 'confirmed') kind = 'confirm';
          else if (after.status === 'declined') kind = 'decline';
          else kind = 'updated'; // other status changes (optional)
        } else {
          // reschedule detection: scheduledAt changed
          const prevMs = toJsDate(canonicalTs(before))?.getTime() || 0;
          const nextMs = toJsDate(canonicalTs(after))?.getTime() || 0;
          if (prevMs !== nextMs) {
            kind = 'updated';
          }
        }
      }

      if (!kind) return null;

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
      const mailDoc = {
        to: [contactEmail],
        message: { subject, html, text },
        meta: { bookingId, kind, status: booking.status, queuedBy: 'function_enqueueBookingEmail' },
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
      return null;
    } catch (e) {
      console.error('enqueueBookingEmail error', e);
      return null;
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
  const OWNER_UID = 'Y1Ku2G5K7EnMBOT5tHCleuL0tDPz1';
  if (context.auth?.uid !== OWNER_UID) {
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
