import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, arrayUnion, Timestamp } from 'firebase/firestore';

export async function approveBooking(bookingId) {
  console.info('approveBooking:start', { bookingId });
  const ref = doc(db, 'bookings', bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Booking not found');
  const booking = snap.data();
  console.info('approveBooking:doc fetched', { bookingId, status: booking.status });
  if (String(booking.status || '').toLowerCase() === 'confirmed') {
    console.info('approveBooking:no-op already confirmed', { bookingId });
    return;
  }

  // Use arrayUnion for statusHistory so we don't clobber concurrent writes
  // IMPORTANT: don't put serverTimestamp() inside arrayUnion() — use client Timestamp.now() for the history entry
  const histEntry = { at: Timestamp.now(), by: 'admin', to: 'confirmed', prev: booking.status ?? 'pending' };
  const updates = {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    statusHistory: arrayUnion(histEntry),
  };

  await updateDoc(ref, updates);
  console.info('approveBooking:write ok', { bookingId });
}

export async function sendBookingConfirmationEmail(bookingId) {
  console.info('email:attempt', { bookingId });
  const ref = doc(db, 'bookings', bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Booking not found for email');
  const booking = snap.data();
  const contactEmail = booking?.contact?.email;
  if (!contactEmail) throw new Error('Booking has no contact email');

  const d = booking?.scheduledAt?.toDate?.() ?? booking?.startAt?.toDate?.() ?? null;
  const when = d ? d.toLocaleString() : 'TBD';
  const subject = `Sanchez Services: Your booking on ${when} is confirmed`;
  const text = `Hi ${booking.contact?.name || ''},\n\nYour appointment is confirmed for ${when}.\n\nThanks,\nSanchez Services`;
  const html = `<p>Hi ${booking.contact?.name || ''},</p><p>Your appointment is confirmed for <strong>${when}</strong>.</p><p>Thanks,<br/>Sanchez Services</p>`;

  // Write to /mail for the configured mail sender (extensions or custom function)
  const mailDoc = {
    to: [contactEmail],
    message: { subject, text, html },
    meta: { bookingId, action: 'confirm', queuedBy: 'client_approveBooking' },
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, 'mail'), mailDoc);
  console.info('email:enqueued ok', { bookingId, to: contactEmail });
}

export async function declineBooking(bookingId, reason = '') {
  console.info('declineBooking:start', { bookingId, reason });
  const ref = doc(db, 'bookings', bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Booking not found');
  const booking = snap.data();

  if (String(booking.status || '').toLowerCase() === 'declined') {
    console.info('declineBooking:no-op already declined', { bookingId });
    return;
  }

  const histEntry = { at: Timestamp.now(), by: 'admin', to: 'declined', prev: booking.status ?? 'pending', reason: reason || null };
  const updates = {
    status: 'declined',
    declinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    declineReason: reason || booking.declineReason || null,
    statusHistory: arrayUnion(histEntry),
  };

  await updateDoc(ref, updates);
  console.info('declineBooking:write ok', { bookingId });
}

export default { approveBooking, sendBookingConfirmationEmail };
