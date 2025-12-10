// src/lib/profileModel.js
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import {
  normalizePhone,
  deriveProfileAddressFields,
  normalizeAddress,
} from "./contactModel";

/**
 * Profile shape (canonical):
 * {
 *   uid?: string,
 *   name?: string,
 *   email?: string,
 *   emailLower?: string,
 *   phone?: string,
 *   phoneRaw?: string,
 *   phoneNormalized?: string,
 *   addressSummary?: string,
 *   address?: {
 *     line1?: string,
 *     line2?: string,
 *     city?: string,
 *     state?: string,
 *     zip?: string,
 *   },
 *   ltv?: number,
 *   lastBookingAt?: Timestamp | null,
 *   lastLoginAt?: Timestamp | null,
 *   isActive?: boolean,
 *   createdAt?: Timestamp,
 *   updatedAt?: Timestamp,
 * }
 */

export function getProfileRef(uid) {
  return doc(db, "profiles", String(uid));
}

export async function readProfile(uid) {
  if (!uid) return null;
  const ref = getProfileRef(uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: ref.id, ...snap.data() } : null;
}

/**
 * Upsert profile with merge semantics. Adds updatedAt and createdAt when creating.
 */
export async function upsertProfile(uid, partial = {}) {
  if (!uid) throw new Error("Missing uid");
  const ref = getProfileRef(uid);
  const snap = await getDoc(ref);

  const base = {
    ...partial,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    base.createdAt = serverTimestamp();
  }

  await setDoc(ref, base, { merge: true });
  return ref;
}

/**
 * Update core contact info in a centralized way.
 */
export async function updateProfileContact(uid, { name, email, phone } = {}) {
  const payload = {};

  if (name !== undefined) payload.name = name;

  if (email !== undefined) {
    payload.email = email;
    if (email) {
      payload.emailLower = String(email).toLowerCase();
    } else {
      payload.emailLower = null;
    }
  }

  if (phone !== undefined) {
    const normalized = normalizePhone(phone);
    payload.phone = normalized; // canonical stored phone is digits-only
    payload.phoneRaw = phone || "";
    payload.phoneNormalized = normalized;
  }

  return upsertProfile(uid, payload);
}

/**
 * Update address from a plain address object.
 * address: { line1, line2, city, state, zip }
 */
export async function updateProfileAddress(uid, address = {}) {
  const norm = normalizeAddress(address || {});
  const { address: profAddress, addressSummary } = deriveProfileAddressFields([
    norm,
  ]);

  const payload = {
    addressSummary: addressSummary || undefined,
    address: profAddress || undefined,
  };

  return upsertProfile(uid, payload);
}

/**
 * Update profile address from a single service address-like object
 * (e.g. what you get from bookings / addresses collection).
 */
export async function updateProfileAddressFromServiceAddress(
  uid,
  serviceAddress
) {
  const norm = normalizeAddress(serviceAddress || {});
  const { address, addressSummary } = deriveProfileAddressFields([norm]);
  return upsertProfile(uid, { address, addressSummary });
}

/**
 * Sync profile address from an array of service addresses.
 * Typically called when the user has multiple saved addresses.
 */
export async function syncProfileAddressFromAddressList(uid, addresses) {
  const { address, addressSummary } = deriveProfileAddressFields(
    addresses || []
  );
  return upsertProfile(uid, { address, addressSummary });
}

/**
 * Update / upsert the user's last login info in profiles.
 * Call this right after a successful sign-in (email/password, Google, etc.).
 *
 * `user` should be a Firebase Auth user object.
 */
export async function updateProfileLastLogin(user) {
  if (!user?.uid) return;

  const email = user.email || null;
  const payload = {
    uid: user.uid,
    lastLoginAt: serverTimestamp(),
    isActive: true, // treat any login as "active" client
  };

  if (email) {
    payload.email = email;
    payload.emailLower = email.toLowerCase();
  }

  return upsertProfile(user.uid, payload);
}

export default {
  getProfileRef,
  readProfile,
  upsertProfile,
  updateProfileContact,
  updateProfileAddress,
  updateProfileAddressFromServiceAddress,
  syncProfileAddressFromAddressList,
  updateProfileLastLogin,
};
