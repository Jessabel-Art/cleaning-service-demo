// src/pages/admin/components/BookingModal.jsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import { normalizePhone, normalizeAddress } from '@/lib/contactModel';
import {
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { money } from "../utils";

/* ---------------- helpers ---------------- */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// overlap test: a overlaps b
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function buildInitialForm(initial) {
  const d =
    initial?.scheduledAt?.toDate?.() ?? initial?.startAt?.toDate?.() ?? null;
  const date = d ? d.toISOString().slice(0, 10) : "";
  const time = d ? d.toTimeString().slice(0, 5) : "";
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
    date,
    time,
  };
}

/* --------------- component ---------------- */

export function BookingModal({ open, initial, onClose, onSave }) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  // form state
  const [form, setForm] = React.useState(() => buildInitialForm(initial));

  // manual "send confirmation email" toggle
  const [sendEmail, setSendEmail] = React.useState(false);

  // whenever modal opens or initial changes, reset form + email toggle
  React.useEffect(() => {
    if (!open) return;
    const next = buildInitialForm(initial);
    setForm(next);
    setSendEmail(
      (next.status || "").toLowerCase() === "confirmed" && !!next.email
    );
  }, [open, initial]);

  const canSendEmail =
    (form.status || "").toLowerCase() === "confirmed" &&
    !!(form.email || "").trim();

  // ----- conflict check against existing bookings on the same day -----
  const checkConflicts = async (start, end) => {
    // query only the day range around `start`
    const dayStart = startOfDay(start);
    const dayEnd = endOfDay(start);

    const qRef = query(
      collection(db, "bookings"),
      where("startAt", ">=", Timestamp.fromDate(dayStart)),
      where("startAt", "<=", Timestamp.fromDate(dayEnd))
    );

    const snap = await getDocs(qRef);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    for (const r of rows) {
      // ignore the record being edited
      if (initial?.id && r.id === initial.id) continue;

      const st = String(r.status || "").toLowerCase();
      // treat declined/completed as non-blocking
      if (st === "declined" || st === "completed") continue;

      const rs = r.startAt?.toDate?.() ?? r.scheduledAt?.toDate?.();
      let re = r.endAt?.toDate?.();
      if (rs && !re) {
        const mins = Number(
          r.durationMinutes ?? (r.durationHours ? r.durationHours * 60 : 120)
        );
        re = new Date(rs.getTime() + mins * 60000);
      }
      if (!rs || !re) continue;

      if (overlaps(start, end, rs, re)) {
        return {
          conflict: true,
          with: {
            id: r.id,
            title: r.serviceName || r.service || "Booking",
            when: `${rs.toLocaleString()} – ${re.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
          },
        };
      }
    }
    return { conflict: false };
  };

  const handleSave = async () => {
    const trimmedName = (form.name || "").trim();
    const trimmedService = (form.serviceName || "").trim();

    // simple UX validation with explicit feedback
    if (!trimmedName) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    if (!trimmedService) {
      toast({ title: "Service required", variant: "destructive" });
      return;
    }
    if (!form.date || !form.time) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }

    // compose start/end timestamps
    const [hh, mm] = String(form.time)
      .split(":")
      .map((n) => parseInt(n || "0", 10));
    const start = new Date(form.date);
    start.setHours(hh || 0, mm || 0, 0, 0);

    const durMin = Math.max(
      30,
      parseInt(String(form.durationMinutes || 120), 10)
    );
    const end = new Date(start.getTime() + durMin * 60000);

    // conflict guard
    try {
      setSaving(true);
      const { conflict, with: info } = await checkConflicts(start, end);
      if (conflict) {
        setSaving(false);
        toast({
          title: "Time conflict",
          description: `Overlaps with "${info.title}" (${info.when}). Pick another time.`,
          variant: "destructive",
        });
        return;
      }
    } catch (err) {
      setSaving(false);
      toast({
        title: "Could not check for conflicts",
        description: String(err?.message || err),
        variant: "destructive",
      });
      return;
    }

    const payload = {
      status: form.status || "confirmed",
      serviceName: trimmedService,
      durationMinutes: durMin,
      amount: Number(form.amount || 0),

      // keep both fields for compatibility across your codebase
      scheduledAt: Timestamp.fromDate(start),
      startAt: Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      dateKey: start.toISOString().slice(0, 10),

      createdVia: initial ? "owner_update" : "owner_manual",
      notes: form.notes || "",

      contact: {
        name: trimmedName,
        email: (form.email || "").trim(),
        emailLower: (form.email || "").trim().toLowerCase(),
        phone: normalizePhone(form.phone || ""),
        phoneRaw: form.phone || "",
      },
      address: normalizeAddress({ line1: (form.address || "").trim() }),
    };

    try {
      // Save via parent callback (this ensures ownerKeys/user linkage etc.)
      await onSave?.(payload, initial?.id || null);

      let description = "Booking saved.";

      // Optional: send confirmation email via Formspree
      if (sendEmail && canSendEmail) {
        try {
          await fetch("https://formspree.io/f/xqawalzo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              _subject: "Your Sanchez Services booking is confirmed",
              clientEmail: payload.contact.email,
              clientName: payload.contact.name,
              serviceName: payload.serviceName,
              amount: payload.amount,
              date: form.date,
              time: form.time,
              durationMinutes: payload.durationMinutes,
              address: payload.address.line1,
              notes: payload.notes,
              status: payload.status,
              source: "Admin booking modal",
            }),
          });

          description = "Booking saved and confirmation email sent.";
        } catch (err) {
          // don't fail the booking if email fails
          // eslint-disable-next-line no-console
          console.error("Formspree email error", err);
          description =
            "Booking saved, but the confirmation email could not be sent.";
        }
      }

      toast({
        title: initial ? "Booking updated" : "Booking created",
        description,
      });

      onClose?.();
    } catch (e) {
      const msg = String(e?.message || e);
      toast({
        title: "Could not save booking",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // NOTE: pointer-events + z-index fix so the action row stays clickable
  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto select-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
        <div className="relative z-[10] w-full max-w-3xl rounded-2xl border border-plum/15 bg-white shadow-2xl">
          <button
            type="button"
            className="absolute right-3 top-3 text-plum/70 hover:text-plum"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>

          <div className="p-5 md:p-6">
            <h3 className="text-xl font-semibold text-plum mb-1">
              {initial ? "Edit / Reschedule Booking" : "New Booking"}
            </h3>
            <p className="text-sm text-plum/70 mb-4">
              Fill in the details below, then save.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
              {/* Left column: form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Client name
                    </label>
                    <Input
                      autoFocus
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Phone
                    </label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      className="mt-1 w-full border border-plum/20 rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="declined">Declined</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Service (dropdown) */}
                  <div className="sm:col-span-2">
                    <label className="text-sm text-plum font-medium">
                      Service
                    </label>
                    <select
                      name="service"
                      value={form.serviceName}
                      onChange={(e) =>
                        setForm({ ...form, serviceName: e.target.value })
                      }
                      className="mt-1 w-full border border-plum/20 rounded-xl px-3 py-2 bg-white"
                    >
                      {/* Preserve nonstandard existing values so edits don't wipe them */}
                      {form.serviceName &&
                        ![
                          "Residential Cleaning",
                          "Deep Clean",
                          "Move-In/Move-Out",
                          "Office Cleaning",
                        ].includes(form.serviceName) && (
                          <option value={form.serviceName}>
                            {form.serviceName}
                          </option>
                        )}

                      <option value="">Select a service…</option>
                      <option value="Residential Cleaning">
                        Residential Cleaning
                      </option>
                      <option value="Deep Clean">Deep Clean</option>
                      <option value="Move-In/Move-Out">Move-In/Move-Out</option>
                      <option value="Office Cleaning">Office Cleaning</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-plum font-medium">
                      Amount
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-plum font-medium">
                      Address
                    </label>
                    <Input
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className="bg-white mt-1"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      min={30}
                      step={15}
                      value={form.durationMinutes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          durationMinutes: e.target.value,
                        })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Time
                    </label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) =>
                        setForm({ ...form, time: e.target.value })
                      }
                      className="bg-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-plum font-medium">
                      Preview
                    </label>
                    <div className="mt-1 h-10 flex items-center text-sm text-plum/80">
                      {form.amount ? money(form.amount) : "$0"} •{" "}
                      {form.durationMinutes} min
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-plum font-medium">
                    Notes
                  </label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    className="bg-white mt-1"
                  />
                </div>

                {/* ACTIONS + email toggle */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-full bg-plum text-white"
                    >
                      {saving
                        ? "Saving…"
                        : initial
                        ? "Save changes"
                        : "Create booking"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-plum/80">
                    <input
                      type="checkbox"
                      checked={sendEmail && canSendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      disabled={!canSendEmail}
                    />
                    <span>Send confirmation email to client</span>
                    {!canSendEmail && (
                      <span className="text-[11px] text-plum/50">
                        (requires client email and status set to Confirmed)
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Right column: summary */}
              <div className="rounded-2xl border border-plum/15 bg-white p-4">
                <div className="text-sm text-plum/60 mb-2">Summary</div>
                <ul className="text-sm space-y-1 text-plum/80">
                  <li>
                    <b>Status:</b> {form.status}
                  </li>
                  <li>
                    <b>Service:</b> {form.serviceName || "—"}
                  </li>
                  <li>
                    <b>Amount:</b> {form.amount ? money(form.amount) : "—"}
                  </li>
                  <li>
                    <b>Duration:</b> {form.durationMinutes} min
                  </li>
                  <li>
                    <b>Date/Time:</b> {form.date || "—"} {form.time || ""}
                  </li>
                  <li>
                    <b>Name:</b> {form.name || "—"}
                  </li>
                  <li>
                    <b>Email:</b> {form.email || "—"}
                  </li>
                  <li>
                    <b>Phone:</b> {form.phone || "—"}
                  </li>
                  <li>
                    <b>Address:</b> {form.address || "—"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
