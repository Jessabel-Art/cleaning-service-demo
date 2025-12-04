import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  collection,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  Star,
  Clock,
  ArrowRight,
  Ban,
  CheckCircle,
} from "lucide-react";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function ClientDetailsModal({ client, onClose }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [ltv, setLtv] = useState(0);
  const [nextBooking, setNextBooking] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!client) return;

    // Preload form
    setForm({
      name: client.name || "",
      phone: client.phone || "",
      city: client.city || "",
      address: client.address || "",
    });

    setNotes(client.notes || "");

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
    await updateDoc(doc(db, "profiles", client.id), {
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      updatedAt: new Date(),
    });
    setEdit(false);
  };

  /* ======================
     SAVE NOTES
  ====================== */
  const saveClientNotes = async () => {
    setSavingNotes(true);
    await updateDoc(doc(db, "profiles", client.id), {
      notes: notes.trim(),
      updatedAt: new Date(),
    });
    setSavingNotes(false);
  };

  /* ======================
     DEACTIVATE / REACTIVATE
  ====================== */
  const toggleActive = async () => {
    await updateDoc(doc(db, "profiles", client.id), {
      isActive: client.isActive === false ? true : false,
      updatedAt: new Date(),
    });
  };

  /* ======================
     BADGE SEGMENTS
  ====================== */
  const segments = [];
  if ((client.ltv || ltv) >= 300)
    segments.push({ label: "High value", color: "bg-green-100 text-green-800" });
  if (client.lastBookingAt)
    segments.push({ label: "Recently active", color: "bg-amber-100 text-amber-700" });

  const createdMs = client.createdAt?.toMillis?.() ?? 0;
  if (Date.now() - createdMs < 1000 * 60 * 60 * 24 * 14)
    segments.push({ label: "New", color: "bg-purple-100 text-purple-700" });

  return (
    <Dialog open={!!client} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white rounded-xl p-6 shadow-xl">
        <DialogHeader>
          <h2 className="text-xl font-semibold text-plum flex items-center gap-2">
            <User size={20} /> Client Profile
          </h2>
          <p className="text-sm text-plum/70">
            Member since: {client.createdAt?.toDate?.().toLocaleDateString() ?? "—"}
          </p>

          {/* Segments */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {segments.map((s) => (
              <span
                key={s.label}
                className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.color}`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </DialogHeader>

        {/* =========================================
            PROFILE SECTION
        ========================================= */}
        <div className="mt-4 space-y-4">
          {!edit ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-plum/60" /> {client.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-plum/60" /> {client.phone || "—"}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-plum/60" />{" "}
                {client.address || "—"}
              </p>

              {/* LTV */}
              <p className="pt-3 border-t text-plum/80">
                <b>Lifetime value:</b> {money(ltv)}
              </p>

              {/* Next booking */}
              {nextBooking && (
                <div className="mt-2 p-3 rounded-lg bg-purple-50 text-sm">
                  <div className="font-medium text-plum mb-1">Next booking</div>
                  <div className="text-plum/80">
                    {nextBooking.scheduledAt?.toDate?.().toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
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

        {/* =========================================
            ADMIN NOTES
        ========================================= */}
        <div className="mt-6">
          <h3 className="font-semibold text-plum text-sm mb-1 flex items-center gap-1">
            <Sparkles size={16} /> Admin Notes
          </h3>

          <Textarea
            className="w-full bg-white border rounded-lg p-2 text-sm"
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
        <h3 className="mt-6 font-semibold text-plum text-sm">Bookings</h3>

        {bookings.length === 0 ? (
          <p className="text-sm text-plum/60">No bookings yet.</p>
        ) : (
          <ul className="space-y-2 mt-2 max-h-56 overflow-auto pr-2">
            {bookings.map((b) => {
              const start = b.scheduledAt?.toDate?.();
              const dStr = start ? start.toLocaleString() : "—";

              const statusColor =
                b.status === "completed"
                  ? "text-green-700"
                  : b.status === "confirmed"
                  ? "text-blue-700"
                  : b.status === "pending"
                  ? "text-amber-700"
                  : "text-plum/60";

              return (
                <li
                  key={b.id}
                  className="p-3 bg-plum/5 border rounded flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">
                      {b.serviceName || b.service || "Service"}
                    </div>

                    <div className="text-xs text-plum/70">{dStr}</div>
                    <div className={`text-xs mt-1 ${statusColor}`}>{b.status}</div>
                  </div>

                  <div className="text-sm font-medium">{money(b.amount || 0)}</div>
                </li>
              );
            })}
          </ul>
        )}

        {/* =========================================
            FOOTER ACTIONS
        ========================================= */}
        <DialogFooter className="mt-6 flex justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                // Close modal immediately, then navigate within the SPA
                try {
                  onClose && onClose();
                } catch (e) {
                  // ignore
                }
                navigate(`/admin-client-bookings?email=${encodeURIComponent(
                  client.email
                )}`);
              }}
            >
              View all bookings
            </Button>
          </div>

          <div className="flex gap-2">
            {/* Deactivate / Restore */}
            <Button
              variant="destructive"
              className="bg-red-600 text-white"
              onClick={toggleActive}
            >
              {client.isActive === false ? "Reactivate client" : "Deactivate"}
            </Button>

            {!edit ? (
              <Button onClick={() => setEdit(true)}>Edit client</Button>
            ) : (
              <Button className="bg-plum text-white" onClick={saveProfile}>
                Save changes
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
