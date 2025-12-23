import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function normalizeEmailLower(raw) {
  if (!raw) return null;
  return String(raw).trim().toLowerCase();
}

function normalizePhoneDigits(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits || null;
}

async function run() {
  const days = Number(process.env.DAYS || 90);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dryRun = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

  console.log(`Scanning bookings newer than ${cutoff.toISOString()} (days=${days})`);

  const snap = await db
    .collection('bookings')
    .where('startAt', '>', cutoff)
    .get();

  console.log(`Fetched ${snap.size} bookings to inspect`);

  let updateCount = 0;
  let touched = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const contact = data.contact || {};

    // Top-level normalized fields (preferred, newer format)
    let contactEmailLower = data.contactEmailLower;
    let contactPhoneNormalized = data.contactPhoneNormalized;

    // Derive missing top-level from nested contact fields (backward compatibility)
    if (!contactEmailLower) {
      contactEmailLower = normalizeEmailLower(contact.emailLower || contact.email);
    }
    if (!contactPhoneNormalized) {
      contactPhoneNormalized =
        normalizePhoneDigits(contact.phoneNormalized) ||
        normalizePhoneDigits(contact.phone) ||
        normalizePhoneDigits(contact.phoneRaw);
    }

    // Also ensure nested fields exist for dual-write consistency
    const nestedEmailLower = contact.emailLower || normalizeEmailLower(contact.email);
    const nestedPhoneNormalized =
      contact.phoneNormalized || normalizePhoneDigits(contact.phone || contact.phoneRaw);

    const patch = {};

    // Update top-level if missing
    if (!data.contactEmailLower && contactEmailLower) {
      patch.contactEmailLower = contactEmailLower;
    }
    if (!data.contactPhoneNormalized && contactPhoneNormalized) {
      patch.contactPhoneNormalized = contactPhoneNormalized;
    }

    // Update nested contact fields for consistency
    const contactPatch = {};
    if (!contact.emailLower && nestedEmailLower) {
      contactPatch.emailLower = nestedEmailLower;
    }
    if (!contact.phoneNormalized && nestedPhoneNormalized) {
      contactPatch.phoneNormalized = nestedPhoneNormalized;
    }

    if (Object.keys(contactPatch).length > 0) {
      patch['contact'] = { ...contact, ...contactPatch };
    }

    if (Object.keys(patch).length === 0) continue;

    touched += 1;
    updateCount += Object.keys(patch).length;

    batch.update(doc.ref, patch);
    batchOps += 1;

    if (batchOps >= 400) {
      if (!dryRun) await batch.commit();
      console.log(`Committed batch of ${batchOps}`);
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    if (!dryRun) await batch.commit();
    console.log(`Committed final batch of ${batchOps}`);
  }

  console.log(`Bookings updated: ${touched}; fields updated: ${updateCount}; dryRun=${dryRun}`);
}

run().catch((err) => {
  console.error('Backfill failed', err);
  process.exitCode = 1;
});
