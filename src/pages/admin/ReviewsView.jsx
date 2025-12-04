// src/pages/admin/ReviewsView.jsx
import React from "react";
import { db, auth } from "@/lib/firebase";
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
import { useToast } from "@/components/ui/use-toast";
import { getApp } from "firebase/app";
import EmptyState from "./components/EmptyState";
import { Star } from "lucide-react";

function formatDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function Stars({ rating }) {
  const r = Number(rating || 0);
  if (!r) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < r ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </span>
  );
}

export default function ReviewsView() {
  const { toast } = useToast();

  const [pending, setPending] = React.useState([]);
  const [approved, setApproved] = React.useState([]);

  const [authReady, setAuthReady] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const snapshotErrorWarnedRef = React.useRef(false);
  const adminWarnedRef = React.useRef(false);

  // --- Admin gate (same pattern as other admin views) ---
  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const app = getApp();
        // eslint-disable-next-line no-console
        console.log(
          "FB projectId:",
          app.options.projectId,
          "uid:",
          u.uid,
          "email:",
          u.email
        );
      } catch {
        // ignore
      }

      const allow = ["jessabel.santos@gmail.com", "sanchezservices24@yahoo.com"];
      const emailLower = String(u.email || "").toLowerCase();
      const inAllow = allow.includes(emailLower);

      let inAdmins = false;
      try {
        const ref = doc(db, "admins", u.uid);
        const snap = await getDoc(ref);
        inAdmins = snap.exists();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("admins/{uid} lookup failed", e);
      }

      setIsAdmin(inAllow || inAdmins);
      setAuthReady(true);
      adminWarnedRef.current = false;
    });

    return () => unsub();
  }, []);

  // show one clear message if signed-in user isn't an admin
  React.useEffect(() => {
    if (!authReady) return;
    if (isAdmin) {
      adminWarnedRef.current = false;
      return;
    }
    if (adminWarnedRef.current) return;
    adminWarnedRef.current = true;

    const email = auth.currentUser?.email || "(not signed in)";
    toast({
      title: "Admin access required",
      description: `Signed in as ${email}. This account isn’t in /admins or the allowlist for this Firebase project.`,
      variant: "destructive",
    });
  }, [authReady, isAdmin, toast]);

  // --- Subscribe to reviews only when admin confirmed ---
  React.useEffect(() => {
    if (!authReady || !isAdmin) return;

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

    const u1 = onSnapshot(
      qPending,
      (snap) => {
        setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        snapshotErrorWarnedRef.current = false;
      },
      (err) => {
        if (snapshotErrorWarnedRefRef.current) return;
        snapshotErrorWarnedRef.current = true;
        // eslint-disable-next-line no-console
        console.error("Reviews (pending) subscription error", err);
        toast({
          title: "Could not load pending reviews",
          description: err?.message || String(err),
          variant: "destructive",
        });
      }
    );

    const u2 = onSnapshot(
      qApproved,
      (snap) => {
        setApproved(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        snapshotErrorWarnedRef.current = false;
      },
      (err) => {
        if (snapshotErrorWarnedRef.current) return;
        snapshotErrorWarnedRef.current = true;
        // eslint-disable-next-line no-console
        console.error("Reviews (approved) subscription error", err);
        toast({
          title: "Could not load approved reviews",
          description: err?.message || String(err),
          variant: "destructive",
        });
      }
    );

    return () => {
      u1();
      u2();
    };
  }, [authReady, isAdmin, toast]);

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

      toast({
        title: "Review approved",
        description: `${r.name || "Client"}'s review is now live.`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Approve failed:", err);
      toast({
        title: "Could not approve review",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };

  const decline = async (r) => {
    try {
      const ref = doc(db, "reviews", r.id);
      await updateDoc(ref, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Review declined",
        description: `${r.name || "Client"}'s review was declined.`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Decline failed:", err);
      toast({
        title: "Could not decline review",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };

  const renderPendingList = () => {
    if (pending.length === 0) {
      return (
        <EmptyState
          icon={Star}
          title="No pending reviews"
          description="When clients leave reviews, they’ll appear here for approval."
        />
      );
    }

    return (
      <ul className="space-y-3">
        {pending.map((r) => {
          const service =
            r.serviceName || r.service || r.bookingService || "Cleaning service";
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-plum/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-plum">
                      {r.name || "Anonymous"}
                    </div>
                    {r.rating ? <Stars rating={r.rating} /> : null}
                  </div>
                  <div className="text-xs text-plum/60">
                    {r.email || ""}
                    {service ? ` • ${service}` : ""}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-plum/60">
                    {formatDate(r.createdAt)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="bg-green-600 text-white rounded-full px-3 py-1 text-xs"
                      onClick={() => approve(r)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full px-3 py-1 text-xs"
                      onClick={() => decline(r)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>

              {r.body && (
                <p className="text-sm text-plum/80 mt-3 whitespace-pre-wrap">
                  {r.body}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderApprovedList = () => {
    if (approved.length === 0) {
      return (
        <EmptyState
          icon={Star}
          title="No published reviews yet"
          description="Once you approve reviews, the most recent ones will appear here."
        />
      );
    }

    return (
      <ul className="space-y-3">
        {approved.slice(0, 10).map((r) => {
          const service =
            r.serviceName || r.service || r.bookingService || "Cleaning service";
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-plum/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-plum">
                      {r.name || "Anonymous"}
                    </div>
                    {r.rating ? <Stars rating={r.rating} /> : null}
                    <span className="inline-flex items-center rounded-full bg-[#FDF2FF] px-2 py-0.5 text-[10px] font-medium text-plum border border-plum/10">
                      Published
                    </span>
                  </div>
                  <div className="text-xs text-plum/60">
                    {service}
                    {r.city ? ` • ${r.city}` : ""}
                  </div>
                </div>

                <span className="text-xs text-plum/60">
                  {formatDate(r.publishedAt || r.createdAt)}
                </span>
              </div>

              {r.body && (
                <p className="text-sm text-plum/80 mt-2 whitespace-pre-wrap">
                  {r.body}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-plum mb-3">
          Pending reviews ({pending.length})
        </h3>
        {renderPendingList()}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-plum mb-3">
          Recent approved
        </h3>
        {renderApprovedList()}
      </div>
    </section>
  );
}
