const admin = require('firebase-admin');
const { setTimeout } = require('timers/promises');

// Configure admin to use emulator if FIRESTORE_EMULATOR_HOST is set
if (process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.GOOGLE_CLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-project';
  admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
} else {
  console.error('FIRESTORE_EMULATOR_HOST not set. Start the Firestore emulator first.');
  process.exit(2);
}

const db = admin.firestore();

async function run() {
  const booking = {
    serviceName: 'Test Cleaning',
    status: 'pending',
    durationMinutes: 60,
    contact: { name: 'Integration Test', email: 'int-test@example.com' },
    scheduledAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24*60*60*1000)),
    createdVia: 'integration_test'
  };

  const docRef = await db.collection('bookings').add(booking);
  console.log('Wrote booking', docRef.id);

  // Wait and poll for a mail doc referencing this booking id
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const snaps = await db.collection('mail').where('meta.bookingId', '==', docRef.id).get();
    if (!snaps.empty) {
      console.log('Found mail doc(s):', snaps.docs.map(d => ({ id: d.id, data: d.data() })));
      process.exit(0);
    }
    await setTimeout(500);
  }

  console.error('Timed out waiting for mail doc');
  process.exit(3);
}

run().catch((e) => {
  console.error('Integration test error', e);
  process.exit(1);
});
