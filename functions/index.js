// Cloud Functions (CommonJS) — keep existing behavior and add availability maintenance.

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

/* ==============================
   EXISTING FUNCTIONS (+ fixes)
   ============================== */

// default graceMs = 2 hours
exports.sweepCompleteBookings = functions.https.onRequest(async (req, res) => {
  try {
    const graceMs = parseInt(req.query.graceMs || '7200000', 10); // 2 hours
    const now = Date.now();
    const snap = await db.collection('bookings').where('status', '==', 'confirmed').get();
    let updated = 0;
    const batch = db.batch();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const endAt =
        toJsDate(data.endAt)?.getTime() ??
        null;
      if (endAt && now - endAt >= graceMs) {
        batch.update(docSnap.ref, { status: 'completed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        updated += 1;
      }
    });
    if (updated > 0) await batch.commit();
    res.json({ ok: true, updated });
  } catch (e) {
    console.error('sweep error', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

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

// Admin helper: backfill ownerKeys/userId for recent bookings that are missing them.
exports.backfillOwnerKeys = functions.https.onCall(async (data, context) => {
  const OWNER_UID = 'Y1Ku2G5K7EnMBOT5tHCleuL0tDPz1';
  if (context.auth?.uid !== OWNER_UID) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const limit = Number(data?.limit || 200);
  const q = await db.collection('bookings').limit(limit).get();
  let updated = 0;
  for (const d of q.docs) {
    const doc = d.data();
    if (Array.isArray(doc.ownerKeys) && doc.ownerKeys.length) continue;
    const emailLower = doc?.contact?.emailLower || (doc?.contact?.email || '').toLowerCase();
    if (!emailLower) continue;
    let targetUid = null;
    try {
      const p = await db.collection('profiles').where('email', '==', emailLower).limit(1).get();
      if (!p.empty) targetUid = p.docs[0].id;
    } catch (err) {
      console.warn('profile lookup failed for', emailLower, err);
    }
    const ownerKeys = [];
    if (emailLower) ownerKeys.push(`email:${emailLower}`);
    if (targetUid) ownerKeys.push(`uid:${targetUid}`);
    const patch = { ownerKeys, adminKeys: ownerKeys };
    if (targetUid) patch.userId = targetUid;
    try {
      await d.ref.update(patch);
      updated += 1;
    } catch (uErr) {
      console.warn('Failed to update booking', d.id, uErr);
    }
  }
  return { updated };
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
