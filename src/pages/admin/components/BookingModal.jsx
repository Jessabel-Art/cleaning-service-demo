import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Timestamp } from "firebase/firestore";
import { money } from "../utils";

export function BookingModal({ open, initial, onClose, onSave }) {
  const [saving, setSaving] = React.useState(false);

  const init = React.useMemo(() => {
    const d = initial?.scheduledAt?.toDate?.() ?? initial?.startAt?.toDate?.() ?? null;
    const date = d ? d.toISOString().slice(0, 10) : "";
    const time = d ? d.toTimeString().slice(0,5) : "";
    return {
      status: initial?.status ?? "confirmed",
      serviceName: initial?.serviceName ?? initial?.service ?? "",
      durationMinutes: initial?.durationMinutes ?? 120,
      amount: String(initial?.amount ?? initial?.cost ?? ""),
      name: initial?.contact?.name ?? initial?.name ?? "",
      email: initial?.contact?.email ?? "",
      phone: initial?.contact?.phone ?? "",
      address: initial?.address?.line1 ?? "",
      notes: initial?.notes ?? "",
      date, time,
    };
  }, [initial]);

  const [form, setForm] = React.useState(init);
  React.useEffect(() => setForm(init), [init]);

  const handleSave = async () => {
    if (!form.serviceName) return;
    if (!form.name) return;
    if (!form.date || !form.time) return;

    const [hh, mm] = form.time.split(":").map((n) => parseInt(n || "0", 10));
    const start = new Date(form.date);
    start.setHours(hh || 0, mm || 0, 0, 0);
    const durMin = Math.max(30, parseInt(String(form.durationMinutes || 120), 10));
    const end = new Date(start.getTime() + durMin * 60000);

    const payload = {
      status: form.status || "confirmed",
      serviceName: form.serviceName,
      durationMinutes: durMin,
      amount: Number(form.amount || 0),
      // keep both fields for compatibility
      scheduledAt: Timestamp.fromDate(start),
      startAt: Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      dateKey: start.toISOString().slice(0, 10),
      createdVia: "owner_manual",
      notes: form.notes || "",
      contact: {
        name: form.name || "",
        email: form.email || "",
        emailLower: (form.email || "").toLowerCase(),
        phone: form.phone || "",
      },
      address: { line1: form.address || "" },
    };

    try {
      setSaving(true);
      await onSave(payload, initial?.id || null);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl border border-plum/15 bg-white shadow-2xl">
          <button className="absolute right-3 top-3 text-plum/70 hover:text-plum" onClick={onClose} aria-label="Close">×</button>
          <div className="p-5 md:p-6">
            <h3 className="text-xl font-semibold text-plum mb-1">
              {initial ? "Edit / Reschedule Booking" : "New Booking"}
            </h3>
            <p className="text-sm text-plum/70 mb-4">
              Fill in the details below, then save.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
              {/* Left: form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-plum font-medium">Client name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Phone</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Email</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full border border-plum/20 rounded-xl px-3 py-2 bg-white">
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="declined">Declined</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-plum font-medium">Service</label>
                    <Input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} className="bg-white mt-1" placeholder="Residential Cleaning" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Amount</label>
                    <Input type="number" min={0} step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-white mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-plum font-medium">Address</label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-white mt-1" placeholder="123 Main St" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Duration (minutes)</label>
                    <Input type="number" min={30} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="bg-white mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-plum font-medium">Date</label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-white mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Time</label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="bg-white mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">Preview</label>
                    <div className="mt-1 h-10 flex items-center text-sm text-plum/80">
                      {form.amount ? money(form.amount) : "$0"} • {form.durationMinutes} min
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-plum font-medium">Notes</label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white mt-1" />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={handleSave} disabled={saving} className="rounded-full bg-plum text-white">
                    {saving ? "Saving…" : (initial ? "Save changes" : "Create booking")}
                  </Button>
                  <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
                </div>
              </div>

              {/* Right: quick glance */}
              <div className="rounded-2xl border border-plum/15 bg-white p-4">
                <div className="text-sm text-plum/60 mb-2">Summary</div>
                <ul className="text-sm space-y-1 text-plum/80">
                  <li><b>Status:</b> {form.status}</li>
                  <li><b>Service:</b> {form.serviceName || "—"}</li>
                  <li><b>Amount:</b> {form.amount ? money(form.amount) : "—"}</li>
                  <li><b>Duration:</b> {form.durationMinutes} min</li>
                  <li><b>Date/Time:</b> {form.date || "—"} {form.time || ""}</li>
                  <li><b>Name:</b> {form.name || "—"}</li>
                  <li><b>Email:</b> {form.email || "—"}</li>
                  <li><b>Phone:</b> {form.phone || "—"}</li>
                  <li><b>Address:</b> {form.address || "—"}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
