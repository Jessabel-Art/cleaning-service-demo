// src/lib/db.js
import { db } from '@/lib/firebase';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, collection, serverTimestamp,
  query, where, orderBy, onSnapshot
} from 'firebase/firestore';

/** ---------- Helpers ---------- */
export const now = () => serverTimestamp();

/** ---------- Profiles ---------- */
export async function ensureProfile(uid, data = {}) {
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      fullName: data.fullName || '',
      phone: data.phone || '',
      email: data.email || '',
      createdAt: now(),
    });
  }
  return ref;
}

export async function getProfile(uid) {
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: ref.id, ...snap.data() } : null;
}

/** ---------- Addresses ---------- */
export async function saveAddress(uid, addr) {
  // one address doc per user for now
  const ref = doc(db, 'addresses', uid);
  await setDoc(
    ref,
    {
      userId: uid,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      updatedAt: now(),
      createdAt: addr.createdAt || now(),
    },
    { merge: true }
  );
  return ref;
}

export async function getAddress(uid) {
  const ref = doc(db, 'addresses', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: ref.id, ...snap.data() } : null;
}

export async function deleteAddress(uid) {
  const ref = doc(db, 'addresses', uid);
  await deleteDoc(ref);
}

/** ---------- Bookings ---------- */
export async function createBooking(uid, data) {
  const ref = await addDoc(collection(db, 'bookings'), {
    userId: uid,
    serviceSlug: data.serviceSlug,
    addressId: data.addressId || uid, // using uid == address doc id for now
    startAt: data.startAt,            // Firestore Timestamp
    durationMinutes: data.durationMinutes || 120,
    notes: data.notes || '',
  // Bookings submitted from the public form start as 'pending' for admin review.
  status: data.status || 'pending',
    depositDue: 50,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref;
}

// ✅ Single, canonical subscription function
export function onUserBookings(uid, cb) {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  });
}

export async function updateBooking(bookingId, patch) {
  const ref = doc(db, 'bookings', bookingId);
  await updateDoc(ref, { ...patch, updatedAt: now() });
  return ref;
}

/**
 * Sweep function: mark confirmed bookings as completed if endAt is more than
 * `graceMs` in the past. Default grace is 2 hours.
 */
export async function sweepCompleteBookings(graceMs = 1000 * 60 * 60 * 2) {
  try {
    const nowMs = Date.now();
    // Listen for confirmed bookings and mark those with endAt older than grace
    const q = query(collection(db, 'bookings'), where('status', '==', 'confirmed'));
    const snap = await (await import('firebase/firestore')).getDocs(q);
    const toUpdate = [];
    snap.forEach((d) => {
      const data = d.data();
      const endAt = data.endAt && data.endAt.toDate ? data.endAt.toDate().getTime() : (data.endAt ? new Date(data.endAt).getTime() : null);
      if (endAt && nowMs - endAt >= graceMs) {
        toUpdate.push(d.id);
      }
    });
    // Batch update
    for (const id of toUpdate) {
      const ref = doc(db, 'bookings', id);
      await updateDoc(ref, { status: 'completed', updatedAt: now() });
    }
    return toUpdate.length;
  } catch (e) {
    console.error('sweepCompleteBookings failed', e);
    return 0;
  }
}

/** ---------- Services (public list) ---------- */
export async function upsertService(slug, data) {
  const ref = doc(db, 'services', slug);
  await setDoc(ref, { ...data, updatedAt: now() }, { merge: true });
  return ref;
}
