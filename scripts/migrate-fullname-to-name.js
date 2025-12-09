#!/usr/bin/env node
// scripts/migrate-fullname-to-name.js
// One-off local migration: copy profiles.fullName -> profiles.name for docs missing `name`.
// Usage (PowerShell):
//   # Dry run (default)
//   node .\scripts\migrate-fullname-to-name.js
//   # Apply changes (actually write)
//   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"; node .\scripts\migrate-fullname-to-name.js --apply

const admin = require('firebase-admin');
const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apply' || a === '-a') out.apply = true;
    if (a === '--limit' || a === '-l') out.limit = Number(args[i + 1]) || undefined;
  }
  return out;
}

const args = parseArgs();
const doApply = Boolean(args.apply);
const limit = args.limit || null;

function initAdmin() {
  // Prefer explicit service account path via GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_KEY_PATH
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    console.log('Initializing admin SDK using service account at', keyPath);
    const key = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    console.log('Initializing admin SDK using application default credentials (gcloud).');
    admin.initializeApp();
  }
}

async function run() {
  try {
    initAdmin();
    const db = admin.firestore();

    console.log('Scanning profiles collection...');
    const snap = await db.collection('profiles').get();
    const total = snap.size;
    const toUpdate = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const hasName = data.name && String(data.name).trim();
      const hasFullName = data.fullName && String(data.fullName).trim();
      if (!hasName && hasFullName) {
        toUpdate.push({ id: docSnap.id, fullName: String(data.fullName).trim() });
      }
    });

    console.log(`Found ${total} profiles; ${toUpdate.length} docs missing 'name' but have 'fullName'.`);
    if (toUpdate.length === 0) {
      console.log('Nothing to do. Exiting.');
      process.exit(0);
    }

    const sample = toUpdate.slice(0, 20).map((x) => x.id);
    console.log('Sample IDs to update:', sample);

    if (!doApply) {
      console.log('\nDRY RUN: no changes will be written. To apply, re-run with --apply');
      process.exit(0);
    }

    console.log('\nApplying changes in batches (500)...');
    let applied = 0;
    const items = limit ? toUpdate.slice(0, limit) : toUpdate;
    for (let i = 0; i < items.length; i += 500) {
      const batch = db.batch();
      const chunk = items.slice(i, i + 500);
      for (const item of chunk) {
        const ref = db.collection('profiles').doc(item.id);
        batch.update(ref, { name: item.fullName, migrated_fullNameToNameAt: admin.firestore.FieldValue.serverTimestamp() });
      }
      await batch.commit();
      applied += chunk.length;
      console.log(`Committed batch: ${applied}/${items.length}`);
    }

    console.log(`Migration complete. Updated ${applied} documents.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(2);
  }
}

run();
