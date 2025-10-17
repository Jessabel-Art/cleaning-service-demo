// Cloud Functions (CommonJS) — keep existing behavior and add availability maintenance.

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
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

function toDateKey(tsOrDate) {
  const d = tsOrDate?.toDate ? tsOrDate.toDate() : new Date(tsOrDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function to12h(tsOrDate) {
  const d = tsOrDate?.toDate ? tsOrDate.toDate() : new Date(tsOrDate);
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

  const d = startAt?.toDate ? startAt.toDate() : new Date(startAt);
  const currMin = d.getHours() * 60 + d.getMinutes();

  const parse = (s) => {
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
    // returns minutes since 00:00
  };

  let best = TIME_OPTIONS[0], bestDiff = Infinity;
  for (const opt of TIME_OPTIONS) {
    const diff = Math.abs(parse(opt) - currMin);
    if (diff < bestDiff) { best = opt; bestDiff = diff; }
  }
  return best;
}

function keysFromBooking(b) {
  if (!b?.startAt) return null;
  const dateKey = b.dateKey || toDateKey(b.startAt);
  const timeLabel = nearestSlotLabel(b.startAt, b.timeLabel || to12h(b.startAt));
  return { dateKey, timeLabel };
}

async function applyDelta({ dateKey, timeLabel }, delta) {
  const ref = db.collection('availability').doc(dateKey);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const taken = data.takenSlotsByTime || {};
    const prev = Number(taken[timeLabel] || 0);
    const next = Math.max(0, prev + delta);

    tx.set(
      ref,
      {
        dateKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // per-slot counts
        takenSlotsByTime: { [timeLabel]: next },
        // simple daily counter
        dayCount: admin.firestore.FieldValue.increment(delta),
        // mirror capacity for clients (read-only)
        _capacity: { slot: SLOT_CAPACITY, day: DAILY_CAPACITY, timeOptions: TIME_OPTIONS }
      },
      { merge: true }
    );
  });
}

/* ==============================
   EXISTING FUNCTIONS (unchanged)
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
      const endAt = data.endAt && data.endAt.toDate ? data.endAt.toDate().getTime() : (data.endAt ? new Date(data.endAt).getTime() : null);
      if (endAt && now - endAt >= graceMs) {
        batch.update(db.collection('bookings').doc(docSnap.id), { status: 'completed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
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
exports.enqueueBookingEmail = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const bookingId = context.params.bookingId;
    try {
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;
      const booking = after || before;
      if (!booking) return null;

      const contactEmail = booking?.contact?.email;
      if (!contactEmail) return null;

      const status = booking.status;
      // Only send on create or when status changed
      const shouldSend = !before || (before?.status !== after?.status);
      if (!shouldSend) return null;

      // Dedupe: check if booking already has emailQueuedAt recently
      const queuedAt = booking.emailQueuedAt ? (booking.emailQueuedAt.toDate ? booking.emailQueuedAt.toDate() : new Date(booking.emailQueuedAt)) : null;
      if (queuedAt) {
        // if queued within last 10 minutes, skip
        const ageMs = Date.now() - queuedAt.getTime();
        if (ageMs < 10 * 60 * 1000) {
          console.log(`Skipping email for ${bookingId} — recently queued ${ageMs}ms ago`);
          return null;
        }
      }

      const d = booking.scheduledAt && booking.scheduledAt.toDate ? booking.scheduledAt.toDate() : (booking.startAt && booking.startAt.toDate ? booking.startAt.toDate() : null);
      const dateStr = d ? d.toLocaleDateString() : 'TBD';
      const timeStr = d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      let subject = `Sanchez Services: Update for your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
      let html = `<p>Hi ${booking.contact?.name || ''},</p><p>Your booking is updated to status: <strong>${status}</strong> for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>`;
      let text = `Hi ${booking.contact?.name || ''}, Your booking is now ${status} for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`;

      if (status === 'confirmed') {
        subject = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} is confirmed`;
        html = `<p>Hi ${booking.contact?.name || ''},</p><p>Your <strong>${booking.serviceName || 'cleaning'}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>`;
        text = `Hi ${booking.contact?.name || ''}, Your ${booking.serviceName || 'cleaning'} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.`;
      } else if (status === 'declined') {
        subject = `Sanchez Services: Update on your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`;
        html = `<p>Hi ${booking.contact?.name || ''},</p><p>We are sorry but your booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong> has been declined. Please reply or contact us to reschedule.</p>`;
        text = `Hi ${booking.contact?.name || ''}, We are sorry but your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ''} has been declined. Please contact us to reschedule.`;
      }

      // Prepare mail doc with booking metadata for traceability
      const mailDoc = {
        to: [contactEmail],
        message: { subject, html, text },
        meta: { bookingId, status, queuedBy: 'function_enqueueBookingEmail', createdAt: admin.firestore.FieldValue.serverTimestamp() }
      };

      await db.collection('mail').add(mailDoc);

      // mark booking with emailQueuedAt timestamp to avoid duplicate sends
      await db.collection('bookings').doc(bookingId).update({ emailQueuedAt: admin.firestore.FieldValue.serverTimestamp() });

      console.log(`Enqueued email for booking ${bookingId} -> ${contactEmail}`);
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

  const snap = await db.collection('bookings')
    .where('startAt', '>=', start)
    .where('startAt', '<=', end)
    .get();

  const taken = {};
  let dayCount = 0;

  snap.forEach((docSnap) => {
    const b = docSnap.data();
    if (!blocksCapacity(b.status)) return;
    const k = keysFromBooking(b);
    if (!k) return;
    taken[k.timeLabel] = (taken[k.timeLabel] || 0) + 1;
    dayCount++;
  });

  await db.collection('availability').doc(dateKey).set({
    dateKey,
    takenSlotsByTime: taken,
    dayCount,
    _capacity: { slot: SLOT_CAPACITY, day: DAILY_CAPACITY, timeOptions: TIME_OPTIONS },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { dateKey, dayCount, taken };
});
