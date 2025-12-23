// src/pages/admin/MaintenanceView.jsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { auth, db } from "@/lib/firebase";
import { getApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { repairMissingBookingDates } from "@/lib/repairBookings";

const ENV_SWEEP_URL = import.meta.env.VITE_SWEEP_URL || null;
const REQUIRE_AUTH =
  (import.meta.env.VITE_SWEEP_REQUIRE_AUTH ?? "true") !== "false";
const PENDING_AGE_DAYS = 7;
const REVIEW_AGE_DAYS = 30;
const BATCH_LIMIT = 150;

function tsDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return Timestamp.fromDate(d);
}

function toDate(tsLike) {
  if (!tsLike) return null;
  if (tsLike instanceof Date) return tsLike;
  if (typeof tsLike === "number" || typeof tsLike === "string") {
    const d = new Date(tsLike);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof tsLike === "object" && typeof tsLike.toDate === "function") {
    try {
      return tsLike.toDate();
    } catch {
      return null;
    }
  }
  if (tsLike && typeof tsLike.seconds === "number") {
    return new Date(tsLike.seconds * 1000 + Math.floor((tsLike.nanoseconds || 0) / 1e6));
  }
  return null;
}

function collapseSpaces(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\s+/g, " ").trim();
}

// Mirror phone resolution used in client views/settings so we do not flag
// profiles that store phone under alternate fields.
function getProfilePhone(profile) {
  return (
    profile?.phone ||
    profile?.phoneNormalized ||
    profile?.phoneRaw ||
    profile?.primaryPhone ||
    profile?.phoneNumber ||
    profile?.contact?.phone ||
    profile?.contact?.phoneRaw ||
    profile?.contact?.phoneNumber ||
    profile?.contact?.primaryPhone ||
    ""
  );
}

function computeDepositMismatchReasons(booking) {
  const reasons = [];
  const depositAmount = Number(booking.depositAmount ?? booking.depositDue ?? 0);
  const requiresDeposit = booking.requiresDeposit || depositAmount > 0;
  const depositStatus = String(booking.depositStatus || "").toLowerCase();
  const depositPaid =
    !!booking.depositPaid ||
    !!booking.depositPaymentIntentId ||
    !!booking.depositPaymentId;

  if (!requiresDeposit) return [];

  if (!depositStatus) {
    reasons.push("Missing depositStatus while deposit required");
  }
  if (depositPaid && depositStatus !== "paid") {
    reasons.push("Deposit paid but status is not 'paid'");
  }
  if (!depositPaid && depositStatus === "paid") {
    reasons.push("depositStatus says paid but no depositPaid flag");
  }
  if (depositPaid && !booking.depositPaymentMethod) {
    reasons.push("Deposit paid but payment method is missing");
  }
  const remaining = Number(booking.remainingBalance ?? 0);
  if (remaining < 0) {
    reasons.push("Remaining balance is negative");
  }
  return reasons;
}

/**
 * Extract per-booking logs from the Cloud Function response.
 * For the new sweepCompleteBookings shape, we expect:
 *
 * {
 *   logs: {
 *     autoCompleted: [...],
 *     deletedTestBookings: [...],
 *     deletedCancelledBookings: [...]
 *   }
 * }
 *
 * We flatten these into a single array and tag each entry with _category.
 */
function extractLogsFromResponse(json) {
  if (!json || typeof json !== "object") return [];

  const logs = json.logs;
  if (logs && typeof logs === "object" && !Array.isArray(logs)) {
    const out = [];
    Object.entries(logs).forEach(([category, list]) => {
      if (Array.isArray(list)) {
        list.forEach((entry) => {
          out.push({ ...entry, _category: category });
        });
      }
    });
    return out;
  }

  // Fallback to older shapes (just in case)
  const candidates = [
    json.modifiedBookings,
    json.updatedBookings,
    json.bookings,
    json.records,
    json.logs,
    json.log,
    json.details,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export default function MaintenanceView() {
  const { toast } = useToast();
  const { isAdmin, authReady } = useAdminAuth();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const [removeTestBookings, setRemoveTestBookings] = React.useState(true);
  const [removeCancelledDeclined, setRemoveCancelledDeclined] =
    React.useState(false);
  const [dryRun, setDryRun] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // simple in-memory log of what the sweep reports
  const [logEntries, setLogEntries] = React.useState([]);

  // data-health issue tracking
  const [loadingIssues, setLoadingIssues] = React.useState(false);
  const [pendingBookings, setPendingBookings] = React.useState([]);
  const [blockedRanges, setBlockedRanges] = React.useState([]);
  const [profilesMissingPhone, setProfilesMissingPhone] = React.useState([]);
  const [reviewsPending, setReviewsPending] = React.useState([]);
  const [paymentMismatches, setPaymentMismatches] = React.useState([]);

  // UI state for list + confirmation modals
  const [activeList, setActiveList] = React.useState(null);
  const [actionToConfirm, setActionToConfirm] = React.useState(null);
  const [actionBusy, setActionBusy] = React.useState({
    expirePending: false,
    archiveBlackouts: false,
    normalizeContacts: false,
    repairDates: false,
  });

  // Build a reliable fallback endpoint when ENV not provided
  const endpoint = React.useMemo(() => {
    if (ENV_SWEEP_URL) return ENV_SWEEP_URL;
    try {
      const app = getApp();
      const projectId = app?.options?.projectId;
      if (projectId) {
        return `https://us-central1-${projectId}.cloudfunctions.net/sweepCompleteBookings`;
      }
    } catch {
      // ignore – will fall back to null
    }
    return null;
  }, []);

  const loadIssues = React.useCallback(async () => {
    // Only load when auth is ready and user is confirmed admin
    if (!authReady || !isAdmin) {
      return;
    }

    setLoadingIssues(true);
    try {
      const nowTs = Timestamp.now();
      const pendingCutoff = tsDaysAgo(PENDING_AGE_DAYS);
      const reviewCutoff = tsDaysAgo(REVIEW_AGE_DAYS);

      const pendingPromise = getDocs(
        query(
          collection(db, "bookings"),
          where("status", "==", "pending"),
          where("startAt", "<", pendingCutoff),
          orderBy("startAt", "asc"),
          limit(BATCH_LIMIT)
        )
      );

      const blackoutsPromise = getDocs(
        query(
          collection(db, "blackouts"),
          where("endAt", "<", nowTs),
          orderBy("endAt", "asc"),
          limit(BATCH_LIMIT)
        )
      );

      const phoneNullPromise = getDocs(
        query(collection(db, "profiles"), where("phone", "==", null), limit(BATCH_LIMIT))
      );
      const phoneEmptyPromise = getDocs(
        query(collection(db, "profiles"), where("phone", "==", ""), limit(BATCH_LIMIT))
      );

      const reviewsPromise = getDocs(
        query(
          collection(db, "reviews"),
          where("status", "==", "pending"),
          where("createdAt", "<", reviewCutoff),
          orderBy("createdAt", "asc"),
          limit(BATCH_LIMIT)
        )
      );

      const [pendingSnap, blackoutsSnap, phoneNullSnap, phoneEmptySnap, reviewsSnap] =
        await Promise.all([
          pendingPromise,
          blackoutsPromise,
          phoneNullPromise,
          phoneEmptyPromise,
          reviewsPromise,
        ]);

      setPendingBookings(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const blocked = blackoutsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b) => !b.archived);
      setBlockedRanges(blocked);

      const phoneMap = new Map();
      [...phoneNullSnap.docs, ...phoneEmptySnap.docs].forEach((docSnap) => {
        if (!phoneMap.has(docSnap.id)) {
          phoneMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        }
      });

      // Filter out profiles that actually have a phone value stored under
      // alternate keys (phoneRaw, phoneNumber, contact.phone, etc.).
      const missingPhones = Array.from(phoneMap.values()).filter((p) => {
        const derived = getProfilePhone(p);
        return !derived || !String(derived).trim();
      });

      setProfilesMissingPhone(missingPhones);

      setReviewsPending(reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // deposit / payment mismatches (flag only)
      const depositQueries = [
        query(collection(db, "bookings"), where("depositAmount", ">", 0), limit(BATCH_LIMIT)),
        query(collection(db, "bookings"), where("depositDue", ">", 0), limit(BATCH_LIMIT)),
        query(collection(db, "bookings"), where("requiresDeposit", "==", true), limit(BATCH_LIMIT)),
      ];

      const depSeen = new Set();
      const mismatches = [];
      for (const dq of depositQueries) {
        try {
          const snap = await getDocs(dq);
          snap.forEach((d) => {
            if (depSeen.has(d.id)) return;
            const data = { id: d.id, ...d.data() };
            const reasons = computeDepositMismatchReasons(data);
            if (reasons.length) {
              mismatches.push({ ...data, reasons });
            }
            depSeen.add(d.id);
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Deposit mismatch query failed", err);
        }
      }
      setPaymentMismatches(mismatches);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Maintenance data load failed", e);
      toast({
        title: "Could not load maintenance data",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoadingIssues(false);
    }
  }, [toast, authReady, isAdmin]);

  React.useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const runSweep = async () => {
    if (!endpoint) {
      toast({
        title: "Sweep unavailable",
        description:
          "Could not determine the sweep endpoint. Provide VITE_SWEEP_URL or ensure Firebase config has a projectId.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBusy(true);

      let idToken;
      if (REQUIRE_AUTH) {
        const u = auth.currentUser;
        if (!u) {
          toast({
            title: "Sign in required",
            description: "Please sign in as an admin to run the sweep.",
            variant: "destructive",
          });
          setBusy(false);
          return;
        }
        idToken = await u.getIdToken();
      }

      const body = { removeTestBookings, dryRun, removeCancelledDeclined };

      // DEBUG: Log endpoint being called to console
      console.log("[SWEEP DEBUG] Calling endpoint:", endpoint);
      console.log("[SWEEP DEBUG] REQUIRE_AUTH:", REQUIRE_AUTH);
      console.log("[SWEEP DEBUG] Has idToken:", !!idToken);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // plain text response; leave json as {}
      }

      if (!res.ok) {
        const msg =
          json?.error || json?.message || text || `HTTP ${res.status}`;
        setResult({ ok: false, status: res.status, error: msg });
        toast({
          title: "Sweep failed",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const updated = json?.updated ?? json?.autoCompletedCount ?? 0;

      setResult({
        ok: true,
        updated,
        raw: json,
      });

      // Try to capture per-booking changes into log history
      const logs = extractLogsFromResponse(json);
      const timestamp = new Date().toISOString();

      if (logs.length) {
        setLogEntries((prev) => [
          ...logs.map((entry) => ({ timestamp, entry })),
          ...prev,
        ]);
      } else {
        // Fallback: still create a summary log entry for this run
        const summaryEntry = {
          summary: `Sweep run completed: ${updated} record(s auto-completed).`,
          updated,
          removeTestBookings,
          removeCancelledDeclined,
          dryRun,
        };
        setLogEntries((prev) => [{ timestamp, entry: summaryEntry }, ...prev]);
      }

      const autoCompletedCount = json.autoCompletedCount ?? updated;
      const deletedTestCount = json.deletedTestBookingsCount ?? 0;
      const deletedCancelledCount = json.deletedCancelledBookingsCount ?? 0;

      const pieces = [];
      pieces.push(`${autoCompletedCount} auto-completed`);
      if (deletedTestCount) pieces.push(`${deletedTestCount} test deleted`);
      if (deletedCancelledCount)
        pieces.push(`${deletedCancelledCount} cancelled/declined deleted`);

      toast({
        title: "Sweep completed",
        description:
          pieces.length > 0
            ? pieces.join(" • ")
            : `${updated} records updated.`,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      setResult({ ok: false, error: msg });
      toast({
        title: "Sweep failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const markActionBusy = (key, value) =>
    setActionBusy((prev) => ({ ...prev, [key]: value }));

  const expireOldPending = async () => {
    const now = Date.now();
    const cutoffMs = now - PENDING_AGE_DAYS * 24 * 60 * 60 * 1000;
    const eligible = pendingBookings
      .filter((b) => {
        const scheduled = toDate(b.startAt || b.date || b.scheduledAt);
        if (!scheduled) return false;
        if (scheduled.getTime() >= cutoffMs) return false;
        const paymentSignals =
          !!b.depositPaid ||
          !!b.depositPaymentIntentId ||
          !!b.balancePaymentIntentId ||
          !!b.paymentIntentId ||
          !!b.stripePaymentIntentId ||
          !!b.stripeSessionId ||
          Number(b.amountPaid || b.paid || 0) > 0 ||
          String(b.paymentStatus || "").toLowerCase().includes("paid");
        return !paymentSignals;
      })
      .slice(0, BATCH_LIMIT);

    if (eligible.length === 0) {
      toast({
        title: "No pending bookings to expire",
        description: "Nothing matched the criteria (age + unpaid).",
      });
      return;
    }

    markActionBusy("expirePending", true);
    try {
      const batch = writeBatch(db);
      eligible.forEach((b) => {
        const ref = doc(db, "bookings", b.id);
        batch.update(ref, {
          status: "expired",
          expiredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast({
        title: "Pending bookings expired",
        description: `${eligible.length} booking(s) marked as expired.`,
      });
      loadIssues();
    } catch (e) {
      toast({
        title: "Could not expire bookings",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      markActionBusy("expirePending", false);
    }
  };

  const archiveOldBlackouts = async () => {
    const toArchive = blockedRanges.filter((b) => !b.archived).slice(0, BATCH_LIMIT);

    if (toArchive.length === 0) {
      toast({
        title: "No blocked ranges to archive",
        description: "Everything looks up to date already.",
      });
      return;
    }

    markActionBusy("archiveBlackouts", true);
    try {
      const batch = writeBatch(db);
      toArchive.forEach((b) => {
        const ref = doc(db, "blackouts", b.id);
        batch.set(
          ref,
          {
            archived: true,
            status: b.status || "archived",
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
      toast({
        title: "Blocked time archived",
        description: `${toArchive.length} range(s) flagged as archived.`,
      });
      loadIssues();
    } catch (e) {
      toast({
        title: "Could not archive blocked ranges",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      markActionBusy("archiveBlackouts", false);
    }
  };

  const normalizeContacts = async () => {
    const updates = profilesMissingPhone
      .map((p) => {
        const name = collapseSpaces(p.name || p.fullName || "");
        const emailRaw = collapseSpaces(p.email || "");
        const emailLower = emailRaw ? emailRaw.toLowerCase() : "";
        const derivedPhone = getProfilePhone(p);
        const phone = typeof derivedPhone === "string" ? derivedPhone.trim() : "";
        const phoneRaw = typeof p.phoneRaw === "string" ? p.phoneRaw.trim() : undefined;

        const payload = {};
        if (name && name !== p.name) payload.name = name;
        if (emailRaw && emailRaw !== p.email) payload.email = emailRaw;
        if (emailLower && emailLower !== p.emailLower) payload.emailLower = emailLower;
        if (phone !== undefined && phone !== p.phone) payload.phone = phone;
        if (phoneRaw !== undefined && phoneRaw !== p.phoneRaw) payload.phoneRaw = phoneRaw;

        if (Object.keys(payload).length === 0) return null;
        payload.updatedAt = serverTimestamp();
        return { id: p.id, payload };
      })
      .filter(Boolean)
      .slice(0, BATCH_LIMIT);

    if (updates.length === 0) {
      toast({
        title: "Nothing to normalize",
        description: "No contact fields needed trimming or lowercasing.",
      });
      return;
    }

    markActionBusy("normalizeContacts", true);
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, payload }) => {
        batch.set(doc(db, "profiles", id), payload, { merge: true });
      });
      await batch.commit();
      toast({
        title: "Contacts normalized",
        description: `${updates.length} profile(s) updated with trimmed contact info.`,
      });
      loadIssues();
    } catch (e) {
      toast({
        title: "Could not normalize contacts",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      markActionBusy("normalizeContacts", false);
    }
  };

  const repairDates = async () => {
    markActionBusy("repairDates", true);
    try {
      const result = await repairMissingBookingDates(db, BATCH_LIMIT);
      toast({
        title: "Repaired booking dates",
        description: `${result.repaired} fixed (checked ${result.checked}).`,
      });
      loadIssues();
    } catch (e) {
      toast({
        title: "Could not repair booking dates",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      markActionBusy("repairDates", false);
    }
  };

  const handleConfirmAction = async () => {
    const key = actionToConfirm;
    setActionToConfirm(null);
    if (key === "expirePending") return expireOldPending();
    if (key === "archiveBlackouts") return archiveOldBlackouts();
    if (key === "normalizeContacts") return normalizeContacts();
    if (key === "repairDates") return repairDates();
    return null;
  };

  const renderListBody = () => {
    if (!activeList) return null;

    const baseCls = "text-xs text-[#431039]";
    if (activeList === "pending") {
      if (pendingBookings.length === 0) {
        return <p className={baseCls}>No pending bookings beyond the grace window.</p>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-plum/70">
                <th className="py-1 pr-2">Booking</th>
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Client</th>
                <th className="py-1 pr-2 text-right">Amount</th>
                <th className="py-1 pr-2 text-right">Deposit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D8E8]">
              {pendingBookings.map((b) => {
                const scheduled = toDate(b.startAt || b.date || b.scheduledAt);
                const amount = Number(b.cost ?? b.total ?? b.amount ?? 0);
                const deposit = Number(b.depositAmount ?? b.depositDue ?? 0);
                const name = b.clientName || b.contact?.name || b.name || "—";
                return (
                  <tr key={b.id} className="align-top">
                    <td className="py-2 pr-2 font-medium text-plum">{b.id}</td>
                    <td className="py-2 pr-2">{scheduled ? scheduled.toLocaleString() : "—"}</td>
                    <td className="py-2 pr-2">{name}</td>
                    <td className="py-2 pr-2 text-right">${amount.toFixed(2)}</td>
                    <td className="py-2 pr-2 text-right">{deposit ? `$${deposit.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeList === "blackouts") {
      if (blockedRanges.length === 0) {
        return <p className={baseCls}>No past blocked ranges detected.</p>;
      }
      return (
        <ul className="divide-y divide-[#F1D8E8] text-xs text-[#431039]">
          {blockedRanges.map((b) => {
            const start = toDate(b.startAt);
            const end = toDate(b.endAt) || start;
            return (
              <li key={b.id} className="py-2">
                <div className="font-semibold text-sm">{b.reason || "Blocked time"}</div>
                <div className="text-[11px] text-plum/70">
                  {start ? start.toLocaleString() : "?"} — {end ? end.toLocaleString() : "?"}
                </div>
              </li>
            );
          })}
        </ul>
      );
    }

    if (activeList === "profiles") {
      if (profilesMissingPhone.length === 0) {
        return <p className={baseCls}>All profiles have phone data.</p>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-plum/70">
                <th className="py-1 pr-2">Profile</th>
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 pr-2">Email</th>
                <th className="py-1 pr-2">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D8E8]">
              {profilesMissingPhone.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="py-2 pr-2 font-medium text-plum">{p.id}</td>
                  <td className="py-2 pr-2">{p.name || p.fullName || "—"}</td>
                  <td className="py-2 pr-2">{p.email || "—"}</td>
                  <td className="py-2 pr-2">{p.phone || "(missing)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeList === "reviews") {
      if (reviewsPending.length === 0) {
        return <p className={baseCls}>No pending reviews older than 30 days.</p>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-plum/70">
                <th className="py-1 pr-2">Reviewer</th>
                <th className="py-1 pr-2">Rating</th>
                <th className="py-1 pr-2">Created</th>
                <th className="py-1 pr-2">Body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D8E8]">
              {reviewsPending.map((r) => {
                const created = toDate(r.createdAt);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-2 font-medium text-plum">{r.displayName || r.name || "Anonymous"}</td>
                    <td className="py-2 pr-2">{r.rating || "—"}</td>
                    <td className="py-2 pr-2">{created ? created.toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-2 max-w-xs whitespace-pre-wrap">{r.body || r.text || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeList === "payments") {
      if (paymentMismatches.length === 0) {
        return <p className={baseCls}>No payment/deposit mismatches detected in the sampled set.</p>;
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-plum/70">
                <th className="py-1 pr-2">Booking</th>
                <th className="py-1 pr-2">Deposit</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Reasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D8E8]">
              {paymentMismatches.map((b) => {
                const dep = Number(b.depositAmount ?? b.depositDue ?? 0);
                const status = b.depositStatus || "—";
                const reasons = b.reasons || computeDepositMismatchReasons(b);
                return (
                  <tr key={b.id} className="align-top">
                    <td className="py-2 pr-2 font-medium text-plum">{b.id}</td>
                    <td className="py-2 pr-2">{dep ? `$${dep.toFixed(2)}` : "—"}</td>
                    <td className="py-2 pr-2">{status}</td>
                    <td className="py-2 pr-2">
                      <ul className="list-disc list-inside space-y-0.5">
                        {reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#431039]">
            Data health dashboard
          </h2>
          <p className="text-sm text-plum/70">
            Review problem spots, open details, and run manual clean-up actions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadIssues}
          disabled={loadingIssues}
          className="border-[#F1D8E8]"
        >
          {loadingIssues ? "Refreshing…" : "Refresh data"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#431039]">Bookings stuck in pending</CardTitle>
            <p className="text-sm text-plum/70">
              Pending for {PENDING_AGE_DAYS}+ days with no payment signals.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">
                {loadingIssues ? "—" : pendingBookings.length}
              </div>
              <div className="text-xs text-plum/70">Older than {PENDING_AGE_DAYS} days</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setActiveList("pending")}
              >
                View list
              </Button>
              <Button
                className="bg-plum text-white"
                onClick={() => setActionToConfirm("expirePending")}
                disabled={actionBusy.expirePending || loadingIssues}
              >
                {actionBusy.expirePending ? "Updating…" : "Run clean-up"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#431039]">Old blocked time ranges</CardTitle>
            <p className="text-sm text-plum/70">
              Blackouts whose end date is in the past.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">
                {loadingIssues ? "—" : blockedRanges.length}
              </div>
              <div className="text-xs text-plum/70">Ready to archive</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setActiveList("blackouts")}
              >
                View list
              </Button>
              <Button
                className="bg-plum text-white"
                onClick={() => setActionToConfirm("archiveBlackouts")}
                disabled={actionBusy.archiveBlackouts || loadingIssues}
              >
                {actionBusy.archiveBlackouts ? "Updating…" : "Run clean-up"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#431039]">Profiles missing phone numbers</CardTitle>
            <p className="text-sm text-plum/70">
              Contacts missing phone or needing basic trimming.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">
                {loadingIssues ? "—" : profilesMissingPhone.length}
              </div>
              <div className="text-xs text-plum/70">Needs contact normalization</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setActiveList("profiles")}
              >
                View list
              </Button>
              <Button
                className="bg-plum text-white"
                onClick={() => setActionToConfirm("normalizeContacts")}
                disabled={actionBusy.normalizeContacts || loadingIssues}
              >
                {actionBusy.normalizeContacts ? "Normalizing…" : "Normalize"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#431039]">Bookings missing dates</CardTitle>
            <p className="text-sm text-plum/70">
              Repairs startAt / scheduledAt / dateKey when absent.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">—</div>
              <div className="text-xs text-plum/70">Runs a one-time repair batch</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                className="bg-plum text-white"
                onClick={() => setActionToConfirm("repairDates")}
                disabled={actionBusy.repairDates || loadingIssues}
              >
                {actionBusy.repairDates ? "Repairing…" : "Repair dates"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#431039]">Reviews pending approval &gt; 30 days</CardTitle>
            <p className="text-sm text-plum/70">
              Pending reviews created more than {REVIEW_AGE_DAYS} days ago.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">
                {loadingIssues ? "—" : reviewsPending.length}
              </div>
              <div className="text-xs text-plum/70">Read-only list</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setActiveList("reviews")}>
                View list
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#431039]">Payment / deposit mismatches</CardTitle>
            <p className="text-sm text-plum/70">
              Bookings with deposit fields that look inconsistent. Flag only; no automatic fixes.
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-[#431039]">
                {loadingIssues ? "—" : paymentMismatches.length}
              </div>
              <div className="text-xs text-plum/70">Review manually in booking details</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setActiveList("payments")}>
                View list
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#F1D8E8] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[#431039]">
            Run sweep (auto-complete & cleanup)
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Irreversible-action warning banner */}
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm flex gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                Careful — some changes can’t be undone.
              </p>
              <p className="mt-1 text-[13px]">
                When <span className="font-semibold">Dry run</span> is turned
                off, bookings may be permanently marked completed or removed
                (for test or cancelled/declined records, depending on your
                settings). Make sure your options are correct before running the
                sweep.
              </p>
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            Mark past-end confirmed bookings as completed, optionally remove
            test bookings (notes contain "test"), and optionally
            remove cancelled or declined bookings.
          </p>

          {endpoint && (
            <p className="text-sm text-muted-foreground mb-3">
              Endpoint: <code className="text-xs">{endpoint}</code>
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={removeTestBookings}
                  onCheckedChange={(v) => setRemoveTestBookings(!!v)}
                />
                <span>Remove test bookings (notes contain "test")</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={removeCancelledDeclined}
                  onCheckedChange={(v) => setRemoveCancelledDeclined(!!v)}
                />
                <span>Remove cancelled/declined bookings</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={dryRun}
                  onCheckedChange={(v) => setDryRun(!!v)}
                />
                <span>Dry run (no destructive changes)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={busy}
                    className="bg-plum text-white"
                  >
                    {busy ? "Running…" : "Run sweep now"}
                  </Button>
                </DialogTrigger>

                <DialogContent
                  className="
                    sm:max-w-lg
                    w-[95%]
                    bg-white
                    border border-plum/15
                    shadow-2xl
                    rounded-2xl
                    p-6
                  "
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-[#431039]">
                      Confirm sweep
                    </DialogTitle>
                  </DialogHeader>

                  <div className="mt-2 text-sm text-[#431039]">
                    <p>This action will:</p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>
                        Mark past-end confirmed bookings as completed (based on
                        end time and grace window).
                      </li>
                      <li>
                        {removeTestBookings
                          ? "Remove bookings where the notes contain \"test\"."
                          : "Keep test bookings (notes containing \"test\") intact."}
                      </li>
                      <li>
                        {removeCancelledDeclined
                          ? "Remove cancelled or declined bookings."
                          : "Keep cancelled and declined bookings intact."}
                      </li>
                      <li>
                        {dryRun
                          ? "Simulate the run (no destructive changes will be saved)."
                          : "Apply all of the above changes to live data."}
                      </li>
                    </ul>
                    {!dryRun && (
                      <p className="mt-3 text-amber-700 text-xs">
                        Once applied, these changes cannot be automatically
                        rolled back.
                      </p>
                    )}
                  </div>

                  <DialogFooter className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setConfirmOpen(false);
                        await runSweep();
                      }}
                      className="bg-plum text-white"
                    >
                      Confirm and run
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {!endpoint && (
                <div className="text-sm text-muted-foreground">
                  Using project-based default. You can also set {" "}
                  <code>VITE_SWEEP_URL</code>.
                </div>
              )}

              {/* DEBUG UI: Show resolved endpoint and auth configuration */}
              {endpoint && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-900">
                  <div className="font-semibold mb-1">Debug Info:</div>
                  <div className="font-mono break-all">
                    Endpoint: {endpoint}
                  </div>
                  <div className="font-mono">
                    REQUIRE_AUTH: {String(REQUIRE_AUTH)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result summary */}
          {result && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {result.ok ? (
                <div>
                  Sweep completed — {result.updated ?? "0"} records
                  auto-completed. Check log history for details.
                </div>
              ) : (
                <div>
                  Failed: {result.status ? `HTTP ${result.status}` : ""} {result.error || ""}
                </div>
              )}
            </div>
          )}

          {/* Log history */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#431039] mb-2">
              Log history
            </h3>
            <div className="rounded-xl border border-[#F1D8E8] bg-[#FFFCFE] max-h-64 overflow-y-auto text-xs text-[#431039]">
              {logEntries.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-gray-500">
                  No sweep runs have reported individual booking changes yet.
                  When the sweep returns a list of modified bookings, they’ll
                  appear here.
                </div>
              ) : (
                <ul className="divide-y divide-[#F1D8E8]">
                  {logEntries.map(({ timestamp, entry }, idx) => {
                    const id =
                      entry?.id ||
                      entry?.bookingId ||
                      entry?.ref ||
                      entry?.summary ||
                      `Entry ${logEntries.length - idx}`;

                    const beforeStatus =
                      entry?.beforeStatus || entry?.fromStatus;
                    const afterStatus =
                      entry?.afterStatus || entry?.toStatus || entry?.status;

                    const category = entry?._category;

                    return (
                      <li key={idx} className="px-3 py-2">
                        <div className="flex justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {category && (
                              <span className="inline-flex items-center rounded-full bg-[#F1D8E8] px-2 py-0.5 text-[10px] font-medium">
                                {category}
                              </span>
                            )}
                            <span className="font-medium">{id}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {new Date(timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] leading-snug">
                          {entry?.summary ? (
                            <span>{entry.summary}</span>
                          ) : beforeStatus || afterStatus ? (
                            <span>
                              Status {beforeStatus ? `${beforeStatus} → ${afterStatus || "?"}` : afterStatus}
                              {entry?.reason ? ` (${entry.reason})` : ""}
                            </span>
                          ) : (
                            <code className="block whitespace-pre-wrap">
                              {JSON.stringify(entry, null, 2)}
                            </code>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List dialog */}
      <Dialog open={!!activeList} onOpenChange={(open) => setActiveList(open ? activeList : null)}>
        <DialogContent className="sm:max-w-3xl w-[95%] bg-white border border-plum/15 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#431039]">
              {activeList === "pending" && `Pending bookings (older than ${PENDING_AGE_DAYS} days)`}
              {activeList === "blackouts" && "Old blocked time ranges"}
              {activeList === "profiles" && "Profiles missing phone numbers"}
              {activeList === "reviews" && `Pending reviews > ${REVIEW_AGE_DAYS} days`}
              {activeList === "payments" && "Payment / deposit mismatches"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3">{renderListBody()}</div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for bulk actions */}
      <Dialog open={!!actionToConfirm} onOpenChange={(open) => setActionToConfirm(open ? actionToConfirm : null)}>
        <DialogContent className="sm:max-w-lg w-[95%] bg-white border border-plum/15 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#431039]">
              Confirm clean-up
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-sm text-[#431039] space-y-2">
            {actionToConfirm === "expirePending" && (
              <>
                <p>
                  Mark pending bookings older than {PENDING_AGE_DAYS} days as
                  <strong> expired</strong>. Bookings with any payment or Stripe
                  signals are skipped automatically.
                </p>
              </>
            )}
            {actionToConfirm === "archiveBlackouts" && (
              <>
                <p>
                  Flag past blackouts as <strong>archived</strong> so they no
                  longer clutter the calendar data.
                </p>
              </>
            )}
            {actionToConfirm === "normalizeContacts" && (
              <>
                <p>
                  Trim names, lowercase emails, and tidy phone fields for the
                  affected profiles. No records are deleted.
                </p>
              </>
            )}
            <p className="text-[12px] text-amber-700">
              Changes are limited to simple status/flag fields. Nothing will be
              removed or merged.
            </p>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionToConfirm(null)}>
              Cancel
            </Button>
            <Button className="bg-plum text-white" onClick={handleConfirmAction}>
              Confirm and run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
