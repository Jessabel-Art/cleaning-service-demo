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