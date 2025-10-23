import React from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, onSnapshot, orderBy, query, where,
  updateDoc, doc, serverTimestamp, addDoc, Timestamp, getDocs
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Download, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { csvDownload, money, rangePreset } from "./utils";
import { BookingModal } from "./components/BookingModal";
import { approveBooking, sendBookingConfirmationEmail, declineBooking } from '@/lib/adminBookings';

/* ------------------------------ helpers ------------------------------ */

// Attempt to coerce various date-like inputs into a Firestore Timestamp
function normalizeTimestamp(val) {
  if (!val) return null;
  // Already a Timestamp
  if (val instanceof Timestamp) return val;
  // Has toDate() (some libs wrap)
  if (typeof val?.toDate === "function") return val;
  // JS Date
  if (val instanceof Date) return Timestamp.fromDate(val);
  // Milliseconds
  if (typeof val === "number") return Timestamp.fromDate(new Date(val));
  // ISO string or something Date can parse
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return Timestamp.fromDate(new Date(parsed));
  }
  return null;
}

// NOTE: mail enqueueing is handled server-side by Cloud Functions now.
// Keep the helper removed to avoid client-side writes to /mail which can be
// rejected by security rules and cause confusing UX.

function buildKeys(emailLower, uid) {
  const ownerKeys = [];
  const adminKeys = [];
  if (emailLower) {
    ownerKeys.push(`email:${emailLower}`);
    adminKeys.push(`email:${emailLower}`);
  }
  if (uid) {
    ownerKeys.push(`uid:${uid}`);
    adminKeys.push(`uid:${uid}`);
  }
  return { ownerKeys, adminKeys };
}

function buildEmailContent({ kind, booking }) {
  // kind: "confirm" | "decline" | "received" | "updated"
  const name = booking?.contact?.name || "";
  const service = booking?.serviceName || booking?.service || "cleaning";
  const d = booking?.scheduledAt?.toDate?.();
  const dateStr = d ? d.toLocaleDateString() : "TBD";
  const timeStr = d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  let subject, text, html;

  if (kind === "confirm") {
    subject = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ""} is confirmed`;
    text = `Hi ${name}, Your ${service} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}.`;
    html = `<p>Hi ${name},</p><p>Your <strong>${service}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>.</p>`;
  } else if (kind === "decline") {
    subject = `Sanchez Services: Update on your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}`;
    text = `Hi ${name}, We’re sorry but your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""} has been declined. Please contact us to reschedule.`;
    html = `<p>Hi ${name},</p><p>We’re sorry but your booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong> has been declined. Please reply or contact us to reschedule.</p>`;
  } else if (kind === "received") {
    subject = `Sanchez Services: We received your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}`;
    text = `Hi ${name}, We received your ${service} booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}. We’ll confirm shortly.`;
    html = `<p>Hi ${name},</p><p>We received your <strong>${service}</strong> booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>. We’ll confirm shortly.</p>`;
  } else { // "updated" fallback
    subject = `Sanchez Services: Your booking was updated (${dateStr}${timeStr ? ` @ ${timeStr}` : ""})`;
    text = `Hi ${name}, Your ${service} booking has been updated to ${dateStr}${timeStr ? ` at ${timeStr}` : ""}.`;
    html = `<p>Hi ${name},</p><p>Your <strong>${service}</strong> booking has been updated to <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>.</p>`;
  }

  return { subject, text, html };

}

export function BookingsView() {
  const [rows, setRows] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [range, setRange] = React.useState("7d"); // 7d | 30d | qtr | year
  const [modal, setModal] = React.useState({ open: false, initial: null });
  const [busyIds, setBusyIds] = React.useState(new Set());

  const setBusy = (id, val) => setBusyIds((prev) => {
    const s = new Set(Array.from(prev));
    if (val) s.add(id); else s.delete(id);
    return s;
  });

  React.useEffect(() => {
    const qRef = query(
      collection(db, "bookings"),
      where("status", "in", ["pending","confirmed","declined","completed"]),
      orderBy("scheduledAt", "asc")
    );
    const unsub = onSnapshot(qRef, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const view = React.useMemo(() => {
    const { from, to } = rangePreset(range);
    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      if (status && r.status !== status) return false;

      const d = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
      if (!d || d < from || d > to) return false;

      if (!q) return true;
      const blob = [
        r.name, r.contact?.name, r.contact?.email, r.contact?.phone,
        r.address?.line1, r.serviceName ?? r.service, r.notes, r.id
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, status, range]);

  const approve = async (b) => {
    setBusy(b.id, true);
    console.info('approve:clicked', { id: b.id });
    try {
      // perform server update
      await approveBooking(b.id);

      // send confirmation email (enqueues into /mail or use callable inside)
      try {
        await sendBookingConfirmationEmail(b.id);
      } catch (emailErr) {
        // log and rethrow so UI shows failure
        console.error('approve:email failed', emailErr);
        throw emailErr;
      }

      // optimistic UI: update local rows to mark confirmed (or remove from pending)
      setRows((prev) => prev.map((r) => r.id === b.id ? { ...r, status: 'confirmed' } : r));

      toast({ title: "Booking approved", description: `Confirmation sent to ${b.contact?.email || 'client'}.`, duration: 4000 });
    } catch (err) {
      console.error('Approve failed', err);
      toast({ title: "Approve failed", description: err?.message || String(err), variant: 'destructive', duration: 6000 });
    } finally {
      setBusy(b.id, false);
    }
  };

  const decline = async (b) => {
    try {
      const emailLower = b?.contact?.emailLower || b?.contact?.email?.toLowerCase?.();
      const uid = b?.userId || null;
      const { ownerKeys, adminKeys } = buildKeys(emailLower, uid);

      const patch = {
        status: "declined",
        updatedAt: serverTimestamp(),
      };
      if (ownerKeys.length) patch.ownerKeys = ownerKeys;
      if (adminKeys.length) patch.adminKeys = adminKeys;

      await updateDoc(doc(db, "bookings", b.id), patch);

      toast({ title: "Booking declined", description: `Marked booking ${b.id} as declined.`, duration: 4000 });

      // Email notifications are queued server-side via Cloud Function trigger
      // when the booking document is created/updated. No client-side enqueue.
    } catch (err) {
      console.error('Decline failed', err);
      toast({ title: "Error", description: `Failed to decline booking.`, duration: 6000 });
    }
  };

  const reschedule = (b) => setModal({ open: true, initial: b });
  const createNew = () => setModal({ open: true, initial: null });

  const onSave = async (payload, editingId) => {
    if (!auth.currentUser) {
      toast({ title: "Sign-in required", description: "Please sign in again.", duration: 4000 });
      throw new Error("Sign-in required");
    }

    // Try to resolve userId by email if not provided
    let targetUid = payload?.userId || null;
    const emailRaw = payload?.contact?.email || "";
    const emailLower = payload?.contact?.emailLower || (emailRaw ? emailRaw.toLowerCase() : null);

    if (!targetUid && emailLower) {
      try {
        let snap = await getDocs(query(collection(db, 'profiles'), where('email', '==', emailLower)));
        if (snap.empty && emailRaw && emailRaw !== emailLower) {
          snap = await getDocs(query(collection(db, 'profiles'), where('email', '==', emailRaw)));
        }
        if (!snap.empty) {
          targetUid = snap.docs[0].id;
        }
      } catch (e) {
        console.warn('Profile lookup failed', e);
      }
    }

    // Keys for discovery
    const { ownerKeys, adminKeys } = buildKeys(emailLower, targetUid);

    // Normalize scheduledAt
    const normalizedScheduledAt =
      normalizeTimestamp(payload?.scheduledAt) ??
      normalizeTimestamp(payload?.startAt) ??
      null;

    if (editingId) {
      const patch = {
        ...payload,
        updatedAt: serverTimestamp(),
      };
      if (normalizedScheduledAt) patch.scheduledAt = normalizedScheduledAt;
      if (ownerKeys.length) patch.ownerKeys = ownerKeys;
      if (adminKeys.length) patch.adminKeys = adminKeys;
      if (targetUid) patch.userId = targetUid;

      await updateDoc(doc(db, "bookings", editingId), patch);

      toast({ title: "Saved", description: `Booking updated.`, duration: 3000 });

      // cloud function will enqueue emails on document change; nothing to do here
    } else {
      const docData = {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (normalizedScheduledAt) docData.scheduledAt = normalizedScheduledAt;
      if (ownerKeys.length) docData.ownerKeys = ownerKeys;
      if (adminKeys.length) docData.adminKeys = adminKeys;
      if (targetUid) docData.userId = targetUid;

      const docRef = await addDoc(collection(db, "bookings"), docData);

      toast({ title: "Saved", description: `Booking created.`, duration: 3000 });

      // Cloud Function trigger will handle notification emails for created docs.
    }

    setModal({ open: false, initial: null });
  };

  const exportCsv = () => {
    const header = ["date","status","service","amount","name","email","phone","address","notes","id"];
    const mapped = view.map((r) => {
      const d = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
      return {
        date: d ? d.toISOString() : "",
        status: r.status ?? "",
        service: r.serviceName ?? r.service ?? "",
        amount: String(r.amount ?? r.cost ?? 0),
        name: r.contact?.name ?? r.name ?? "",
        email: r.contact?.email ?? "",
        phone: r.contact?.phone ?? "",
        address: r.address?.line1 ?? "",
        notes: r.notes ?? "",
        id: r.id
      };
    });
    csvDownload(`bookings_${range}.csv`, mapped, header);
  };

  // quick sums
  const total = view.reduce((s, r) => s + Number(r.amount ?? r.cost ?? 0), 0);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-72" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border bg-white">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="completed">Completed</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-2 rounded-lg border bg-white">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="qtr">This quarter</option>
          <option value="year">This year</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <Button className="rounded-full bg-gold text-white" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" className="rounded-full" onClick={createNew}>
            <Plus className="w-4 h-4 mr-1" /> New booking
          </Button>
        </div>
      </div>

      {/* totals */}
      <div className="mb-2 text-sm text-plum/70">
        Showing <b>{view.length}</b> bookings • Total: <b>{money(total)}</b>
      </div>

      {/* table */}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="[&>th]:py-3 [&>th]:px-3 text-left">
              <th>Date</th><th>Status</th><th>Client</th><th>Service</th><th>Amount</th><th>Address</th><th>Notes</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={8} className="py-14 text-center text-neutral-500">No bookings match your filters.</td></tr>
            )}
            {view.map((b) => {
              const d = b.scheduledAt?.toDate?.() ?? b.startAt?.toDate?.();
              const date = d ? d.toLocaleString(undefined, { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" }) : "TBD";
              const amt = money(b.amount ?? b.cost ?? 0);
              return (
                <tr key={b.id} className="border-t hover:bg-neutral-50">
                  <td className="px-3 py-2">{date}</td>
                  <td className="px-3 py-2 capitalize">{b.status}</td>
                  <td className="px-3 py-2">{b.contact?.name ?? b.name ?? "-"}</td>
                  <td className="px-3 py-2">{b.serviceName ?? b.service ?? "-"}</td>
                  <td className="px-3 py-2">{amt}</td>
                  <td className="px-3 py-2">{b.address?.line1 ?? "-"}</td>
                  <td className="px-3 py-2 max-w-[20rem] truncate" title={b.notes ?? ""}>{b.notes ?? ""}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-green-600 text-white rounded-full" onClick={() => approve(b)} disabled={busyIds.has(b.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> {busyIds.has(b.id) ? 'Approving…' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-full" onClick={() => decline(b)}>
                        <XCircle className="w-4 h-4 mr-1" /> Decline
                      </Button>
                      <Button size="sm" className="rounded-full bg-plum text-white" onClick={() => reschedule(b)}>
                        <Clock className="w-4 h-4 mr-1" /> Reschedule
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <BookingModal
        open={modal.open}
        initial={modal.initial}
        onClose={() => setModal({ open: false, initial: null })}
        onSave={onSave}
      />
    </section>
  );
}
