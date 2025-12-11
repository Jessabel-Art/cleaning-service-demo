// src/pages/admin/components/ClientDetailsModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDocs,
  query,
  where,
  collection,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { upsertProfile, updateProfileLastLogin, updateProfileAddressFromServiceAddress } from "@/lib/profileModel";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  formatPhoneForDisplay,
  buildAddressSummary,
} from "@/lib/contactModel";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function getInitials(name, email) {
  const source = name || email || "";
  if (!source) return "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  );
}

export default function ClientDetailsModal({ client, onClose }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [ltv, setLtv] = useState(0);
  const [nextBooking, setNextBooking] = useState(null);

  // Local active state so button label/behavior updates immediately
  const [isActive, setIsActive] = useState(
    client?.isActive === false ? false : true
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (!client) return;

    // Preload form fields
    setForm({
      name: client.name || "",
      phone: client.phone || "",
      city: client.address?.city || "",
      address:
        client.addressSummary ||
        buildAddressSummary(client.address) ||
        String(client.address || "") ||
        "",
    });

    setNotes(client.notes || "");
    setIsActive(client.isActive === false ? false : true);

    const loadBookings = async () => {
      const emailLower = (client.email || "").toLowerCase();
      if (!emailLower) return;

      const qRef = query(
        collection(db, "bookings"),
        where("contact.emailLower", "==", emailLower),
        orderBy("scheduledAt", "desc")
      );

      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setBookings(rows);

      const sum = rows
        .filter((b) => ["confirmed", "completed"].includes(b.status))
        .reduce((acc, b) => acc + Number(b.amount || 0), 0);

      setLtv(sum);

      const next = rows.find((b) => b.status === "confirmed");
      setNextBooking(next || null);
    };

    loadBookings();
  }, [client]);

  if (!client) return null;

  /* ======================
     SAVE PROFILE CHANGES
  ====================== */
  const saveProfile = async () => {
    const trimmedName = (form.name || "").trim();
    const trimmedPhone = (form.phone || "").trim();
    const trimmedAddress = (form.address || "").trim();
    const trimmedCity = (form.city || "").trim();

    await updateProfileContact(client.id, {
      name: trimmedName,
      phone: trimmedPhone,
    });

    await updateProfileAddressFromServiceAddress(client.id, {
      line1: trimmedAddress,
      city: trimmedCity,
    });

    setEdit(false);
  };

  /* ======================
     SAVE NOTES
  ====================== */
  const saveClientNotes = async () => {
    setSavingNotes(true);
    await upsertProfile(client.id, { notes: (notes || "").trim() });
    setSavingNotes(false);
  };

  /* ======================
     DEACTIVATE / REACTIVATE
  ====================== */
  const toggleActive = async () => {
    const next = !isActive;

    const confirmMsg = next
      ? "Reactivate this client so they can continue booking?"
      : "Deactivate this client? They will be marked inactive in the admin panel.";

    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    await upsertProfile(client.id, { isActive: next });
    setIsActive(next);
  };

  /* ======================
     BADGE SEGMENTS
  ====================== */
  const segments = [];
  if ((client.ltv || ltv) >= 300)
    segments.push({
      label: "High value",
      color: "bg-green-100 text-green-800",
    });
  if (client.lastBookingAt)
    segments.push({
      label: "Recently active",
      color: "bg-amber-100 text-amber-700",
    });

  const createdMs = client.createdAt?.toMillis?.() ?? 0;
  if (Date.now() - createdMs < 1000 * 60 * 60 * 24 * 14)
    segments.push({
      label: "New",
      color: "bg-purple-100 text-purple-700",
    });

  const createdDate =
    client.createdAt?.toDate?.().toLocaleDateString() ?? "—";
  const initials = getInitials(client.name, client.email);

  // Last booking: prefer profile field, fall back to bookings list
  const lastBookingFromProfile =
    client.lastBookingAt?.toDate?.().toLocaleString?.() ?? null;
  const lastBookingFromBookings =
    bookings[0]?.scheduledAt?.toDate?.().toLocaleString?.() ?? null;
  const lastBookingDisplay =
    lastBookingFromProfile || lastBookingFromBookings || "—";

  // Last login (from profile)
  const lastLoginDisplay =
    client.lastLoginAt?.toDate?.().toLocaleString?.() ?? "—";

  return (
    <Dialog open={!!client} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 shadow-xl overflow-hidden">
        {/* HEADER BAND */}
        <div className="bg-plum/5 border-b border-plum/10 px-6 py-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-plum/20 text-plum font-semibold text-lg">
            {initials}
          </div>

          <DialogHeader className="flex-1 p-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-plum flex items-center gap-2">
                  <User size={18} /> Client Profile
                </h2>
                <p className="text-xs text-plum/70 mt-1">
                  <span className="uppercase tracking-wide text-[10px] text-plum/60">
                    Member since:
                  </span>{" "}
                  {createdDate}
                </p>
              </div>

              {/* Segments */}
              {segments.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {segments.map((s) => (
                    <span
                      key={s.label}
                      className={`px-2 py-0.5 text-[11px] rounded-full font-medium ${s.color}`}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-6">
          {/* =========================================
              PROFILE + METRICS GRID
          ========================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact block */}
            <div className="space-y-2 text-sm">
              {!edit ? (
                <>
                  <p className="flex items-center gap-2">
                    <Mail size={16} className="text-plum/60 shrink-0" />
                    <span>{client.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone size={16} className="text-plum/60 shrink-0" />
                    <span>
                      {formatPhoneForDisplay(
                        client.phoneRaw || client.phone || client.phoneNormalized
                      ) || "—"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={16} className="text-plum/60 shrink-0" />
                    <span>
                      {client.addressSummary ||
                        buildAddressSummary(client.address) ||
                        String(client.address || "") ||
                        "—"}
                    </span>
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            {/* Metrics block */}
            <div className="space-y-3 text-sm">
              {/* LTV */}
              <div className="bg-plum/5 border border-plum/10 rounded-lg px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-plum/60">
                  Lifetime value
                </p>
                <p className="text-base font-semibold text-plum mt-1">
                  {money(ltv)}
                </p>
              </div>

              {/* Last booking + Last login */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-plum/5 border border-plum/10 rounded-lg px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-plum/60">
                    Last booking
                  </p>
                  <p className="text-xs text-plum mt-1">
                    {lastBookingDisplay}
                  </p>
                </div>
                <div className="bg-plum/5 border border-plum/10 rounded-lg px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-plum/60">
                    Last login
                  </p>
                  <p className="text-xs text-plum mt-1">
                    {lastLoginDisplay}
                  </p>
                </div>
              </div>

              {/* Next booking */}
              <div className="bg-purple-50/80 border border-purple-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <Calendar
                  size={18}
                  className="text-purple-500 mt-[2px] shrink-0"
                />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-700/80">
                    Next booking
                  </p>
                  {nextBooking ? (
                    <p className="text-sm text-purple-900 mt-1">
                      {nextBooking.scheduledAt
                        ?.toDate?.()
                        ?.toLocaleString() ?? "—"}
                    </p>
                  ) : (
                    <p className="text-xs text-purple-700 mt-1">
                      No upcoming bookings.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              ADMIN NOTES
          ========================================= */}
          <div className="pt-4 border-t border-plum/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-plum text-sm flex items-center gap-1">
                <Sparkles size={16} /> Admin Notes
              </h3>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-plum/5 text-plum/70">
                Internal only
              </span>
            </div>

            <Textarea
              className="w-full bg-plum/5 border border-plum/15 rounded-lg p-2 text-sm focus-visible:ring-plum/50"
              placeholder="Add internal notes here (clients do not see this)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button
              className="mt-2 bg-plum text-white"
              size="sm"
              disabled={savingNotes}
              onClick={saveClientNotes}
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </Button>
          </div>

          {/* =========================================
              BOOKINGS LIST
          ========================================= */}
          <div className="pt-4 border-t border-plum/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-plum text-sm">Bookings</h3>
              {bookings.length > 0 && (
                <span className="text-xs text-plum/60">
                  {bookings.length} total
                </span>
              )}
            </div>

            {bookings.length === 0 ? (
              <p className="text-sm text-plum/60">No bookings yet.</p>
            ) : (
              <ul className="space-y-2 mt-1 max-h-56 overflow-auto pr-1">
                {bookings.map((b) => {
                  const start = b.scheduledAt?.toDate?.();
                  const dStr = start ? start.toLocaleString() : "—";

                  let statusClasses =
                    "bg-plum/10 text-plum border border-plum/15";
                  if (b.status === "completed")
                    statusClasses =
                      "bg-green-50 text-green-700 border border-green-200";
                  else if (b.status === "confirmed")
                    statusClasses =
                      "bg-blue-50 text-blue-700 border border-blue-200";
                  else if (b.status === "pending")
                    statusClasses =
                      "bg-amber-50 text-amber-700 border border-amber-200";
                  else if (
                    b.status === "declined" ||
                    b.status === "cancelled" ||
                    b.status === "canceled"
                  )
                    statusClasses =
                      "bg-red-50 text-red-700 border border-red-200";

                  return (
                    <li
                      key={b.id}
                      className="p-3 bg-plum/3 border border-plum/10 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm text-plum truncate">
                            {b.serviceName || b.service || "Service"}
                          </div>
                          <div className="text-sm font-semibold text-plum whitespace-nowrap">
                            {money(b.amount || 0)}
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-plum/70 truncate">
                            {dStr}
                          </span>
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap ${statusClasses}`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* =========================================
            FOOTER ACTIONS
        ========================================= */}
        <DialogFooter className="px-6 pb-4 pt-3 border-t border-plum/10 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-1 border-plum/30 text-plum hover:bg-plum/5"
              onClick={() => {
                try {
                  onClose && onClose();
                } catch (_) {
                  // ignore
                }
                const safeEmail = encodeURIComponent(client.email || "");
                const safeName = encodeURIComponent(
                  client.name || (client.email || "").split("@")[0] || ""
                );
                navigate(`/admin/client-bookings?email=${safeEmail}&name=${safeName}`);
              }}
            >
              View all bookings
              <ArrowRight size={14} />
            </Button>
          </div>

          <div className="flex gap-2">
            {/* Edit / Save */}
            {!edit ? (
              <Button
                variant="outline"
                className="border-plum/40 text-plum hover:bg-plum/5"
                onClick={() => setEdit(true)}
              >
                Edit client
              </Button>
            ) : (
              <Button
                className="bg-plum text-white hover:bg-plum/90"
                onClick={saveProfile}
              >
                Save changes
              </Button>
            )}

            {/* Deactivate / Reactivate */}
            <Button
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={toggleActive}
            >
              {isActive ? "Deactivate" : "Reactivate client"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
