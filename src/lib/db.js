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
    status: 'requested',
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

/** ---------- Services (public list) ---------- */
export async function upsertService(slug, data) {
  const ref = doc(db, 'services', slug);
  await setDoc(ref, { ...data, updatedAt: now() }, { merge: true });
  return ref;
}
