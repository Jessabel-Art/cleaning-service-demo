// src/lib/db.js
import { db } from '@/lib/firebase';
import {
    runTransaction,
    Timestamp,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  addDoc, collection, serverTimestamp, getDocs,
  query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { normalizeAddress, stripUndefinedDeep } from './contactModel';

/** ---------- Helpers ---------- */
export const now = () => serverTimestamp();

/**
 * Robust date converter that accepts various Firestore/JS date formats
 * @param {*} v - Value that might be a Date, Timestamp, POJO {seconds, nanoseconds}, or string
 * @returns {Date|null} - JS Date object or null if invalid
 */
function toJsDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "object" && typeof v.seconds === "number") {
    // timestamp-like POJO (from Firestore serialization)
    return new Date(v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6));
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Normalize any date-like input into a Firestore Timestamp.
 * Throws with detailed context if the value is invalid.
 */
function normalizeTimestamp(v, fieldName = "date") {
  // Firestore Timestamp instance
  if (v instanceof Timestamp) return v;

  // Firestore Timestamp-like (has toDate)
  if (typeof v?.toDate === "function") {
    const d = v.toDate();
    if (!d || Number.isNaN(d.getTime())) {
      throw new Error(`invalid date: ${fieldName} toDate() is invalid`);
    }
    return Timestamp.fromDate(d);
  }

  // Plain object { seconds, nanoseconds }
  if (typeof v === "object" && typeof v?.seconds === "number") {
    const nanos = typeof v.nanoseconds === "number" ? v.nanoseconds : 0;
    return new Timestamp(v.seconds, nanos);
  }

  // JS Date
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) {
      throw new Error(`invalid date: ${fieldName} is an invalid Date`);
    }
    return Timestamp.fromDate(v);
  }

  // String or number fallback (ISO / epoch)
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`invalid date: ${fieldName} is not parseable`);
    }
    return Timestamp.fromDate(d);
  }

  throw new Error(`invalid date: ${fieldName} unsupported type`);
}

/** ---------- Profiles ---------- */
export async function ensureProfile(uid, data = {}) {
  // delegate to profileModel to ensure canonical shape
  try {
    const { upsertProfile } = await import('./profileModel');
    await upsertProfile(uid, {
      name: data.fullName || data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      createdAt: data.createdAt || now(),
    });
    return doc(db, 'profiles', uid);
  } catch (e) {
    // fallback to legacy behavior if profileModel import fails
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Best-effort normalization of phone for legacy fallback (digits-only)
      const rawPhone = data.phone || '';
      const normalizedPhone = String(rawPhone).replace(/\D+/g, '');
      await setDoc(ref, {
        name: data.fullName || data.name || '',
        phone: normalizedPhone,
        phoneRaw: rawPhone || '',
        email: data.email || '',
        createdAt: now(),
      });
    }
    return ref;
  }
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
  const normalized = normalizeAddress(addr || {});
  await setDoc(
    ref,
    {
      userId: uid,
      line1: normalized.line1 || '',
      line2: normalized.line2 || '',
      city: normalized.city || '',
      state: normalized.state || '',
      zip: normalized.zip || '',
      nickname: normalized.nickname || '',
      accessInstructions: normalized.accessInstructions || '',
      isDefault: !!normalized.isDefault,
      updatedAt: now(),
      createdAt: addr && addr.createdAt ? addr.createdAt : now(),
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

/**
 * Check for overlapping bookings in a transaction-safe way.
 * Ignores bookings with status "cancelled", "declined", or "completed".
 * 
 * @param {Date} startDate - Proposed booking start time
 * @param {Date} endDate - Proposed booking end time
 * @param {string|null} ignoreId - Booking ID to ignore (for updates)
 * @returns {Promise<{conflict: boolean, with?: string}>}
 */
export function hasOverlap(candidateStart, candidateEnd, existingStart, existingEnd) {
  const cs = Number(candidateStart instanceof Date ? candidateStart.getTime() : candidateStart);
  const ce = Number(candidateEnd instanceof Date ? candidateEnd.getTime() : candidateEnd);
  const es = Number(existingStart instanceof Date ? existingStart.getTime() : existingStart);
  const ee = Number(existingEnd instanceof Date ? existingEnd.getTime() : existingEnd);

  if ([cs, ce, es, ee].some((v) => Number.isNaN(v))) {
    throw new Error('Invalid date(s) passed to hasOverlap');
  }

  // Overlap only when ranges intersect with positive length; back-to-back is allowed
  return cs < ee && ce > es;
}

async function checkConflictsTransactional(startDate, endDate, ignoreId = null) {
  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startDate);
  dayEnd.setHours(23, 59, 59, 999);

  const qRef = query(
    collection(db, 'bookings'),
    where('startAt', '>=', Timestamp.fromDate(dayStart)),
    where('startAt', '<=', Timestamp.fromDate(dayEnd))
  );

  const snap = await getDocs(qRef);
  
  for (const d of snap.docs) {
    if (ignoreId && d.id === ignoreId) continue;
    
    const r = d.data();
    const status = String(r.status || '').toLowerCase();
    
    // Ignore non-blocking statuses
    if (status === 'cancelled' || status === 'declined' || status === 'completed') {
      continue;
    }

    const rs = r.startAt?.toDate?.() ?? r.scheduledAt?.toDate?.();
    let re = r.endAt?.toDate?.();
    
    if (rs && !re) {
      const mins = Number(r.durationMinutes ?? (r.durationHours ? r.durationHours * 60 : 120));
      re = new Date(rs.getTime() + mins * 60000);
    }
    
    if (!rs || !re) continue;

    // Check for overlap using shared helper
    const overlap = hasOverlap(startDate, endDate, rs, re);

    if (process.env.NODE_ENV !== 'production') {
      console.info('[conflict-check]', {
        candidateStart: startDate?.toISOString?.() || startDate,
        candidateEnd: endDate?.toISOString?.() || endDate,
        existingStart: rs?.toISOString?.() || rs,
        existingEnd: re?.toISOString?.() || re,
        overlap,
        ignoreId,
        existingId: d.id,
      });
    }

    if (overlap) {
      return {
        conflict: true,
        with: `${r.serviceName || r.service || 'Booking'} — ${rs.toLocaleString()} to ${re.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };
    }
  }
  
  return { conflict: false };
}

/**
 * Create a booking with server-side conflict protection.
 * Uses Firestore transaction to ensure no overlapping bookings exist.
 * 
 * @throws Error with "conflict" or "overlap" in message if time slot is taken
 */
export async function createBookingWithConflictCheck(uid, data) {
  // Dev logging to diagnose date issues
  if (process.env.NODE_ENV !== 'production') {
    console.log('[createBookingWithConflictCheck] Received data.startAt:', {
      value: data.startAt,
      type: typeof data.startAt,
      constructor: data.startAt?.constructor?.name,
      hasToDate: typeof data.startAt?.toDate === 'function',
      isDate: data.startAt instanceof Date,
      hasSeconds: typeof data.startAt?.seconds === 'number',
    });
  }

  // Normalize timestamps (accept Timestamp, Date, {seconds,nanos}, ISO/number)
  let startAtTimestamp;
  try {
    startAtTimestamp = normalizeTimestamp(data.startAt, 'startAt');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[createBookingWithConflictCheck] Invalid startAt:', {
        raw: data.startAt,
        type: typeof data.startAt,
        constructor: data.startAt?.constructor?.name,
        hasToDate: typeof data.startAt?.toDate === 'function',
        hasSeconds: typeof data.startAt?.seconds === 'number',
        error: err?.message,
      });
    }
    throw err;
  }

  const startDate = startAtTimestamp.toDate();
  const durationMinutes = data.durationMinutes || 120;

  let endAtTimestamp;
  if (data.endAt) {
    try {
      endAtTimestamp = normalizeTimestamp(data.endAt, 'endAt');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[createBookingWithConflictCheck] Invalid endAt, falling back to startAt+duration:', {
          raw: data.endAt,
          error: err?.message,
        });
      }
      endAtTimestamp = Timestamp.fromDate(new Date(startDate.getTime() + durationMinutes * 60000));
    }
  } else {
    endAtTimestamp = Timestamp.fromDate(new Date(startDate.getTime() + durationMinutes * 60000));
  }

  const endDate = endAtTimestamp.toDate();

  const normalizedPhone = (() => {
    const raw = data.contactPhoneNormalized ?? data.contact?.phone ?? data.contact?.phoneRaw ?? "";
    const digits = String(raw).replace(/\D+/g, "");
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return digits || null;
  })();

  const normalizedEmailLower = (() => {
    const raw = data.contactEmailLower ?? data.contact?.emailLower ?? data.contact?.email;
    return raw ? String(raw).trim().toLowerCase() : null;
  })();

  // Check for conflicts BEFORE starting transaction
  const conflictCheck = await checkConflictsTransactional(startDate, endDate, null);
  
  if (conflictCheck.conflict) {
    throw new Error(`Time slot conflict: ${conflictCheck.with}. Please choose another time.`);
  }

  // Merge incoming data with normalized fields and defaults
  // Preserve ALL fields from data (client/admin payloads) while ensuring normalized lookups
  
  // Parse scheduledAt if provided, otherwise default to startAt
  let scheduledAtTimestamp;
  if (data.scheduledAt) {
    try {
      scheduledAtTimestamp = normalizeTimestamp(data.scheduledAt, 'scheduledAt');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[createBookingWithConflictCheck] Invalid scheduledAt, defaulting to startAt:', {
          raw: data.scheduledAt,
          error: err?.message,
        });
      }
      scheduledAtTimestamp = startAtTimestamp;
    }
  } else {
    scheduledAtTimestamp = startAtTimestamp;
  }
  
  const cleanData = stripUndefinedDeep({
    ...data, // Preserve all incoming fields (serviceName, totalPrice, etc.)
    userId: uid,
    startAt: startAtTimestamp, // Always write Firestore Timestamp
    endAt: endAtTimestamp, // Always write Firestore Timestamp
    scheduledAt: scheduledAtTimestamp, // Always write Firestore Timestamp
    durationMinutes,
    status: data.status || 'pending',
    createdAt: now(),
    updatedAt: now(),
    // Top-level normalized lookup fields (ensure these exist)
    contactEmailLower: normalizedEmailLower,
    contactPhoneNormalized: normalizedPhone,
    // Preserve or create nested contact fields for backward compatibility
    contact: {
      ...(data.contact || {}),
      emailLower: normalizedEmailLower,
      phoneNormalized: normalizedPhone,
    },
  });

  // Dev logging to confirm Timestamp fields before write
  if (process.env.NODE_ENV !== 'production') {
    console.log('[createBookingWithConflictCheck] About to write to Firestore:', {
      startAt: {
        type: cleanData.startAt?.constructor?.name,
        hasToDate: typeof cleanData.startAt?.toDate === 'function',
        value: cleanData.startAt,
      },
      endAt: {
        type: cleanData.endAt?.constructor?.name,
        hasToDate: typeof cleanData.endAt?.toDate === 'function',
        value: cleanData.endAt,
      },
      scheduledAt: {
        type: cleanData.scheduledAt?.constructor?.name,
        hasToDate: typeof cleanData.scheduledAt?.toDate === 'function',
        value: cleanData.scheduledAt,
      },
    });
  }

  // Use transaction to ensure atomicity with a final conflict check
  const ref = await runTransaction(db, async (transaction) => {
    // Double-check conflicts inside transaction (race condition protection)
    const finalCheck = await checkConflictsTransactional(startDate, endDate, null);
    if (finalCheck.conflict) {
      throw new Error(`Time slot conflict: ${finalCheck.with}. Please choose another time.`);
    }

    const newRef = doc(collection(db, 'bookings'));
    transaction.set(newRef, cleanData);
    return newRef;
  });

  return ref;
}

/**
 * Legacy createBooking function (no conflict checking).
 * Consider migrating to createBookingWithConflictCheck for safety.
 */
export async function createBooking(uid, data) {
  const normalizedPhone = (() => {
    const raw = data.contactPhoneNormalized ?? data.contact?.phone ?? data.contact?.phoneRaw ?? "";
    const digits = String(raw).replace(/\D+/g, "");
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return digits || null;
  })();

  const normalizedEmailLower = (() => {
    const raw = data.contactEmailLower ?? data.contact?.emailLower ?? data.contact?.email;
    return raw ? String(raw).trim().toLowerCase() : null;
  })();

  const cleanData = stripUndefinedDeep({
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
    // Top-level normalized lookup fields
    contactEmailLower: normalizedEmailLower,
    contactPhoneNormalized: normalizedPhone,
    // Preserve or create nested contact fields for backward compatibility
    contact: {
      ...(data.contact || {}),
      emailLower: normalizedEmailLower,
      phoneNormalized: normalizedPhone,
    },
  });
  
  const ref = await addDoc(collection(db, 'bookings'), cleanData);
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
