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

export function BookingsView() {
  const [rows, setRows] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [range, setRange] = React.useState("7d"); // 7d | 30d | qtr | year
  const [modal, setModal] = React.useState({ open: false, initial: null });

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
    try {
      // ensure ownerKeys exist so clients can discover this booking
      const ownerKeys = [];
      const emailLower = b?.contact?.emailLower || b?.contact?.email?.toLowerCase?.();
      const targetUid = b?.userId || null;
      if (emailLower) ownerKeys.push(`email:${emailLower}`);
      if (targetUid) ownerKeys.push(`uid:${targetUid}`);
      const patch = { status: "confirmed", updatedAt: serverTimestamp() };
      if (ownerKeys.length) patch.ownerKeys = ownerKeys;
      await updateDoc(doc(db, "bookings", b.id), patch);
          toast({ title: "Booking confirmed", description: `Marked booking ${b.id} as confirmed.`, duration: 4000 });
      // enqueue confirmation email
      if (b?.contact?.email) {
        try {
          const d = b.scheduledAt?.toDate?.();
          const dateStr = d ? d.toLocaleDateString() : "TBD";
          const timeStr = d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
          const subj = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ""} is confirmed`;
          const html = `<p>Hi ${b.contact.name || ""},</p><p>Your <strong>${b.serviceName || "cleaning"}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>.</p>`;
          const text = `Hi ${b.contact.name || ""}, Your ${b.serviceName || "cleaning"} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}.`;
          // server-side Cloud Function will enqueue the email
          toast({ title: "Notification scheduled", description: `Confirmation email will be sent to ${b.contact.email}.`, duration: 4000 });
        } catch (err) {
          console.error('Failed to enqueue confirmation email', err);
          toast({ title: "Email failed", description: `Could not enqueue confirmation email for ${b.contact.email}`, duration: 6000 });
        }
      }
    } catch (err) {
      console.error('Approve failed', err);
      toast({ title: "Error", description: `Failed to confirm booking.`, duration: 6000 });
    }
  };
  const decline = async (b) => {
    try {
      // ensure ownerKeys exist so clients can discover this booking
      const ownerKeys = [];
      const emailLower = b?.contact?.emailLower || b?.contact?.email?.toLowerCase?.();
      const targetUid = b?.userId || null;
      if (emailLower) ownerKeys.push(`email:${emailLower}`);
      if (targetUid) ownerKeys.push(`uid:${targetUid}`);
      const patch = { status: "declined", updatedAt: serverTimestamp() };
      if (ownerKeys.length) patch.ownerKeys = ownerKeys;
      await updateDoc(doc(db, "bookings", b.id), patch);
        toast({ title: "Email failed", description: `Couldn't queue confirmation email for ${b.contact.email}.`, duration: 6000 });
      toast({ title: "Booking declined", description: `Booking ${b.id} marked declined.`, duration: 4000 });
      toast({ title: "Booking declined", description: `Marked booking ${b.id} as declined.`, duration: 4000 });
      // enqueue decline email
      if (b?.contact?.email) {
        try {
          const d = b.scheduledAt?.toDate?.();
          const dateStr = d ? d.toLocaleDateString() : "TBD";
          const timeStr = d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
          const subj = `Sanchez Services: Update on your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}`;
          const html = `<p>Hi ${b.contact.name || ""},</p><p>We are sorry but your booking for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong> has been declined. Please reply or contact us to reschedule.</p>`;
          const text = `Hi ${b.contact.name || ""}, We are sorry but your booking for ${dateStr}${timeStr ? ` at ${timeStr}` : ""} has been declined. Please contact us to reschedule.`;
          // server-side Cloud Function will enqueue the email
          toast({ title: "Notification scheduled", description: `Decline email will be sent to ${b.contact.email}.`, duration: 4000 });
        } catch (err) {
          console.error('Failed to enqueue decline email', err);
          toast({ title: "Email failed", description: `Could not enqueue decline email for ${b.contact.email}`, duration: 6000 });
          toast({ title: "Email failed", description: `Couldn't queue decline email for ${b.contact.email}.`, duration: 6000 });
          toast({ title: "Error", description: `Failed to confirm booking. Try again or check logs.`, duration: 6000 });
        }
      }
    } catch (err) {
      console.error('Decline failed', err);
      toast({ title: "Error", description: `Failed to decline booking.`, duration: 6000 });
          toast({ title: "Error", description: `Failed to decline booking. Try again or check logs.`, duration: 6000 });
    }
  };
  const reschedule = (b) => setModal({ open: true, initial: b });
  const createNew = () => setModal({ open: true, initial: null });

  const onSave = async (payload, editingId) => {
    if (!auth.currentUser) throw new Error("Sign-in required");
    // Auto-lookup userId from profiles by email (if available) so bookings
    // created by admin are discoverable by client listeners. Then build
    // ownerKeys (email:<emailLower>, uid:<userId>) for discovery.
    let targetUid = payload?.userId || null;
    const emailRaw = payload?.contact?.email || "";
    const emailLower = payload?.contact?.emailLower || (emailRaw ? emailRaw.toLowerCase() : null);
    if (!targetUid && emailLower) {
      try {
        // Try to find a profile with matching email (try lowercased then raw)
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

    // Build ownerKeys so client-side listeners can discover bookings.
    const ownerKeys = [];
    if (emailLower) ownerKeys.push(`email:${emailLower}`);
    if (targetUid) ownerKeys.push(`uid:${targetUid}`);
    if (editingId) {
      const patch = { ...payload, updatedAt: serverTimestamp() };
      if (ownerKeys.length) patch.ownerKeys = ownerKeys;
      if (targetUid) patch.userId = targetUid;
      await updateDoc(doc(db, "bookings", editingId), patch);
      toast({ title: "Saved", description: `Booking updated.`, duration: 3000 });
      // enqueue confirmation email when editing/saving and email exists
      try {
        if (payload?.contact?.email) {
          const d = payload.scheduledAt?.toDate?.();
          const dateStr = d ? d.toLocaleDateString() : "TBD";
          const timeStr = d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
          const subj = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ""} is ${payload.status === "pending" ? "received" : "confirmed"}`;
          const html = `<p>Hi ${payload.contact.name || ""},</p><p>Your <strong>${payload.serviceName || "cleaning"}</strong> is ${payload.status === "pending" ? "received" : "confirmed"} for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>.</p>`;
          const text = `Hi ${payload.contact.name || ""}, Your ${payload.serviceName || "cleaning"} is ${payload.status === "pending" ? "received" : "confirmed"} for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}.`;
          // server-side Cloud Function will enqueue the email
          toast({ title: "Notification scheduled", description: `Confirmation email will be sent to ${payload.contact.email}.`, duration: 3000 });
        }
      } catch (err) {
        console.error('Failed to enqueue email', err);
        toast({ title: "Email failed", description: `Could not enqueue confirmation email for ${payload.contact?.email}`, duration: 6000 });
      }
    } else {
      const docData = { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      if (ownerKeys.length) docData.ownerKeys = ownerKeys;
      if (targetUid) docData.userId = targetUid;
      const docRef = await addDoc(collection(db, "bookings"), docData);
      toast({ title: "Saved", description: `Booking created.`, duration: 3000 });
      // enqueue confirmation email when creating and email exists
      try {
        if (payload?.contact?.email) {
          const d = payload.scheduledAt?.toDate?.();
          const dateStr = d ? d.toLocaleDateString() : "TBD";
          const timeStr = d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
          const subj = `Sanchez Services: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ""} is ${payload.status === "pending" ? "received" : "confirmed"}`;
          const html = `<p>Hi ${payload.contact.name || ""},</p><p>Your <strong>${payload.serviceName || "cleaning"}</strong> is ${payload.status === "pending" ? "received" : "confirmed"} for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ""}</strong>.</p>`;
          const text = `Hi ${payload.contact.name || ""}, Your ${payload.serviceName || "cleaning"} is ${payload.status === "pending" ? "received" : "confirmed"} for ${dateStr}${timeStr ? ` at ${timeStr}` : ""}.`;
          // server-side Cloud Function will enqueue the email
          toast({ title: "Notification scheduled", description: `Confirmation email will be sent to ${payload.contact.email}.`, duration: 3000 });
        }
      } catch (err) {
        console.error('Failed to enqueue email', err);
        toast({ title: "Email failed", description: `Could not enqueue confirmation email for ${payload.contact?.email}`, duration: 6000 });
      }
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
                      <Button size="sm" className="bg-green-600 text-white rounded-full" onClick={() => approve(b)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
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
