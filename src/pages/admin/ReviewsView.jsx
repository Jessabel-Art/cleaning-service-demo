import React from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

export function ReviewsView() {
  const [pending, setPending] = React.useState([]);
  const [approved, setApproved] = React.useState([]);

  React.useEffect(() => {
    const qPending = query(
      collection(db, "reviews"),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );
    const qApproved = query(
      collection(db, "reviews"),
      where("status", "==", "approved"),
      orderBy("publishedAt", "desc")
    );

    const u1 = onSnapshot(qPending, (snap) =>
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(qApproved, (snap) =>
      setApproved(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const approve = async (r) => {
    try {
      const ref = doc(db, "reviews", r.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Review not found");

      const data = snap.data();
      const createdAt = data.createdAt || serverTimestamp();

      await updateDoc(ref, {
        status: "approved",
        publishedAt: serverTimestamp(),
        createdAt, // ensure field exists for orderBy
        updatedAt: serverTimestamp(),
      });

      console.info("✅ Review approved:", r.id);
    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  const decline = async (r) => {
    try {
      const ref = doc(db, "reviews", r.id);
      await updateDoc(ref, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });
      console.info("⚠️ Review declined:", r.id);
    } catch (err) {
      console.error("Decline failed:", err);
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-plum mb-3">
          Pending reviews ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-plum/60">
            No pending reviews.
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-plum">
                      {r.name || "Anonymous"} {r.rating ? `• ${r.rating}★` : ""}
                    </div>
                    <div className="text-sm text-plum/70">{r.email || ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 text-white rounded-full"
                      onClick={() => approve(r)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => decline(r)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
                {r.body && (
                  <p className="text-sm text-plum/80 mt-3 whitespace-pre-wrap">
                    {r.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-plum mb-3">
          Recent approved
        </h3>
        {approved.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-plum/60">
            No approved reviews yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {approved.slice(0, 10).map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-plum">
                    {r.name || "Anonymous"} {r.rating ? `• ${r.rating}★` : ""}
                  </div>
                  <div className="text-xs text-plum/60">
                    {r.publishedAt?.toDate?.()?.toLocaleDateString?.() || ""}
                  </div>
                </div>
                {r.body && (
                  <p className="text-sm text-plum/80 mt-2 whitespace-pre-wrap">
                    {r.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
