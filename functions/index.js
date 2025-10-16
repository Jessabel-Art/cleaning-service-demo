// Cloud Function to sweep confirmed bookings to completed
// Deploy with Firebase Functions (HTTP trigger)

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// default graceMs = 2 hours
exports.sweepCompleteBookings = functions.https.onRequest(async (req, res) => {
  try {
    const graceMs = parseInt(req.query.graceMs || '7200000', 10); // 2 hours
    const now = Date.now();
    const snap = await db.collection('bookings').where('status', '==', 'confirmed').get();
    let updated = 0;
    const batch = db.batch();
    snap.forEach((doc) => {
      const data = doc.data();
      const endAt = data.endAt && data.endAt.toDate ? data.endAt.toDate().getTime() : (data.endAt ? new Date(data.endAt).getTime() : null);
      if (endAt && now - endAt >= graceMs) {
        batch.update(db.collection('bookings').doc(doc.id), { status: 'completed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
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