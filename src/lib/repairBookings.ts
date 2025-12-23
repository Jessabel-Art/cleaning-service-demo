import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  Firestore,
} from "firebase/firestore";

function coerceTimestamp(v: any, field: string): Timestamp {
  if (!v) throw new Error(`missing ${field}`);
  if (v instanceof Timestamp) return v;
  if (typeof v?.toDate === "function") return Timestamp.fromDate(v.toDate());
  if (typeof v === "object" && typeof v.seconds === "number") {
    const nanos = typeof v.nanoseconds === "number" ? v.nanoseconds : 0;
    return new Timestamp(v.seconds, nanos);
  }
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) throw new Error(`invalid ${field} Date`);
    return Timestamp.fromDate(v);
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`invalid ${field} string/number`);
    return Timestamp.fromDate(d);
  }
  throw new Error(`unsupported ${field}`);
}

function coerceDurationMinutes(v: any): number {
  const n = Number(v ?? 120);
  if (Number.isFinite(n) && n > 0) return n;
  return 120;
}

export async function repairMissingBookingDates(db: Firestore, batchSize = 100) {
  const col = collection(db, "bookings");
  const queries = [
    query(col, where("startAt", "==", null), limit(batchSize)),
    query(col, where("scheduledAt", "==", null), limit(batchSize)),
    query(col, where("dateKey", "==", null), limit(batchSize)),
  ];

  const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
  const seen = new Map<string, any>();
  snapshots.forEach((snap) => {
    snap.forEach((docSnap) => {
      if (!seen.has(docSnap.id)) {
        seen.set(docSnap.id, { id: docSnap.id, data: docSnap.data() });
      }
    });
  });

  if (seen.size === 0) {
    return { checked: 0, repaired: 0, repairedIds: [] as string[] };
  }

  const batch = writeBatch(db);
  const repairedIds: string[] = [];

  seen.forEach(({ id, data }) => {
    try {
      const tsLike =
        data.startAt ??
        data.scheduledAt ??
        data.date ??
        data.scheduledFor ??
        data.startDate ??
        null;

      if (!tsLike) return; // nothing to fix safely

      const startTs = coerceTimestamp(tsLike, "startAt");
      const startDate = startTs.toDate();
      const durationMinutes = coerceDurationMinutes(data.durationMinutes);
      const endTs = data.endAt
        ? coerceTimestamp(data.endAt, "endAt")
        : Timestamp.fromDate(new Date(startDate.getTime() + durationMinutes * 60000));

      const dateKey = startDate.toISOString().slice(0, 10);

      batch.set(
        doc(col, id),
        {
          startAt: startTs,
          scheduledAt: startTs,
          endAt: endTs,
          dateKey,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      repairedIds.push(id);
    } catch (err) {
      // skip records we cannot safely coerce
    }
  });

  if (repairedIds.length > 0) {
    await batch.commit();
  }

  return { checked: seen.size, repaired: repairedIds.length, repairedIds };
}
