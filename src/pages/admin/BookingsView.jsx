// src/pages/admin/BookingsView.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

import StatusPill from "./components/StatusPill";
import EmptyState from "./components/EmptyState";
import FabNewBooking from "./components/FabNewBooking";
import { AdminUIContext } from "./context/AdminUIContext";
import { BookingModal } from "./components/BookingModal";

import {
  Download,
  Filter,
  UserCircle2,
  MapPin,
  CalendarDays,
} from "lucide-react";

/* ----------------- helpers ----------------- */

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xqawalzo";

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate(); // Firestore Timestamp
  return new Date(val); // ISO or ms
}

function formatDate(val) {
  const d = toDate(val);
  if (!d || Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTime(val) {
  const d = toDate(val);
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(num) {
  if (num == null || Number.isNaN(Number(num))) return "$0";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(num));
}

/**
 * Date-range options:
 *  - pastX = look back X days from today
 *  - futureX = upcoming X days from today
 *  - all = no date filter
 */
const RANGE_OPTIONS = [
  { id: "past7", label: "Last 7 days", type: "past", days: 7 },
  { id: "past30", label: "Last 30 days", type: "past", days: 30 },
  { id: "past90", label: "Last 90 days", type: "past", days: 90 },
  { id: "future30", label: "Next 30 days", type: "future", days: 30 },
  { id: "future90", label: "Next 90 days", type: "future", days: 90 },
  { id: "all", label: "All time", type: "all" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All statuses" },
  { id: "requested", label: "Requested" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "declined", label: "Declined" },
  { id: "cancelled", label: "Cancelled" },
];

const ADMIN_STATUS_OPTIONS = STATUS_FILTERS.filter((s) => s.id !== "all");

/**
 * Fire-and-forget email via Formspree.
 * This will run after a booking is created/updated from the modal.
 */
async function sendBookingEmail(booking) {
  try {
    if (!FORMSPREE_ENDPOINT) return;

    const whenSource = booking.startAt || booking.scheduledAt || null;
    const whenDate = formatDate(whenSource);
    const whenTime = formatTime(whenSource);

    const name =
      booking.contact?.name ??
      booking.clientName ??
      booking.client ??
      "Unknown client";

    const email =
      booking.contact?.email ??
      booking.email ??
      booking.contactEmail ??
      "";

    const phone =
      booking.contact?.phone ??
      booking.phone ??
      booking.contactPhone ??
      "";

    const service =
      booking.serviceName ?? booking.service ?? booking.serviceType ?? "";

    const payload = {
      _subject: "New / updated booking",
      source: "Admin dashboard",
      bookingId: booking.id ?? "",
      status: booking.status ?? "",
      name,
      email,
      phone,
      service,
      date: whenDate,
      time: whenTime,
      notes: booking.notes ?? booking.note ?? "",
      addressLine1:
        booking.address?.line1 ??
        booking.addressLine1 ??
        booking.address ??
        "",
    };

    await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Formspree booking email failed", err);
  }
}

/* ----------------- component ----------------- */

export default function BookingsView() {
  const { toast } = useToast();
  const adminUi = useContext(AdminUIContext);
  const searchTerm = adminUi?.searchTerm ?? "";
  const setSearchTerm = adminUi?.setSearchTerm;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("all");
  // default to "all" so you see everything including future bookings
  const [rangeFilter, setRangeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // ---- Firestore subscription ----
  useEffect(() => {
    const colRef = collection(db, "bookings");

    // Use startAt for ordering so older bookings that only have startAt
    // are still included. Firestore drops docs that lack the ordered field.
    const q = query(colRef, orderBy("startAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => {
          const data = docSnap.data();

          // Normalize scheduledAt for display / filters
          const scheduledAt =
            data.startAt || data.scheduledAt || data.date || null;

          // Normalize address into a string so React doesn't choke on objects
          let addressText = "";
          if (typeof data.address === "string") {
            addressText = data.address;
          } else if (data.address && typeof data.address === "object") {
            const { line1, line2, city, state, zip } = data.address;
            const lineParts = [line1, line2].filter(Boolean);
            const cityStateZip =
              city || state || zip
                ? [city, state, zip].filter(Boolean).join(" ")
                : "";
            addressText = [lineParts.join(", "), cityStateZip]
              .filter(Boolean)
              .join(", ");
          } else if (typeof data.location === "string") {
            addressText = data.location;
          } else if (typeof data.contact?.address === "string") {
            addressText = data.contact.address;
          }

          return {
            id: docSnap.id,
            scheduledAt,
            status: data.status || "pending",
            clientName:
              data.clientName ||
              data.client ||
              data.contact?.name ||
              "Unknown client",
            serviceName: data.serviceName || data.service || "—",
            amount: data.amount ?? data.price ?? data.cost ?? 0,
            address: addressText,
            notes: data.notes || data.note || "",
            raw: data,
          };
        });

        setBookings(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast({
          title: "Could not load bookings",
          description: err.message || "Check your Firestore permissions.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsub();
  }, [toast]);

  // ---- Filtering logic (status + range + search) ----
  const filteredBookings = useMemo(() => {
    let rows = [...bookings];

    const now = new Date();

    // Date range filter
    if (rangeFilter !== "all") {
      const opt = RANGE_OPTIONS.find((o) => o.id === rangeFilter);
      if (opt && opt.type !== "all") {
        if (opt.type === "past") {
          const earliest = new Date(now);
          earliest.setDate(now.getDate() - (opt.days || 7));

          rows = rows.filter((b) => {
            const d = toDate(b.scheduledAt);
            if (!d) return false;
            return d >= earliest && d <= now;
          });
        } else if (opt.type === "future") {
          const latest = new Date(now);
          latest.setDate(now.getDate() + (opt.days || 30));

          rows = rows.filter((b) => {
            const d = toDate(b.scheduledAt);
            if (!d) return false;
            return d >= now && d <= latest;
          });
        }
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      rows = rows.filter(
        (b) =>
          String(b.status).toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Search term filter (client, service, address, notes)
    const s = searchTerm?.trim().toLowerCase();
    if (s) {
      rows = rows.filter((b) => {
        const haystack = `${b.clientName || ""} ${b.serviceName || ""} ${
          b.address || ""
        } ${b.notes || ""}`.toLowerCase();
        return haystack.includes(s);
      });
    }

    return rows;
  }, [bookings, statusFilter, rangeFilter, searchTerm]);

  const totalAmount = useMemo(
    () => filteredBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [filteredBookings]
  );

  // ---- CSV Export ----
  const handleExportCsv = () => {
    if (!filteredBookings.length) {
      toast({
        title: "No data to export",
        description: "Change your filters or add bookings first.",
      });
      return;
    }

    const header = [
      "Date",
      "Time",
      "Status",
      "Client",
      "Service",
      "Amount",
      "Address",
      "Notes",
      "ID",
    ];

    const rows = filteredBookings.map((b) => [
      formatDate(b.scheduledAt),
      formatTime(b.scheduledAt),
      b.status,
      b.clientName,
      b.serviceName,
      b.amount,
      (b.address || "").replace(/\n/g, " "),
      (b.notes || "").replace(/\n/g, " "),
      b.id,
    ]);

    const csvLines = [header, ...rows]
      .map((cols) =>
        cols
          .map((val) => {
            const s = val == null ? "" : String(val);
            if (s.includes('"') || s.includes(",") || s.includes("\n")) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sanchez-bookings-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---- New / Edit booking ----
  const handleNewBooking = () => {
    setEditingBooking(null);
    setShowModal(true);
  };

  const handleRowClick = (booking) => {
    setEditingBooking(booking);
    setShowModal(true);
  };

  // ---- Status change handler (inline admin control) ----
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const ref = doc(db, "bookings", bookingId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
      });
      toast({
        title: "Status updated",
        description: `Booking marked as ${newStatus}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not update status",
        description: err.message || String(err),
        variant: "destructive",
      });
    }
  };

  // ---- Firestore write handler (create / update from modal) ----
  const handleSaveBooking = async (payload, existingId = null) => {
    if (existingId) {
      const ref = doc(db, "bookings", existingId);
      await updateDoc(ref, payload);

      await sendBookingEmail({
        id: existingId,
        ...payload,
      });
    } else {
      const colRef = collection(db, "bookings");
      const docRef = await addDoc(colRef, {
        ...payload,
        createdAt: serverTimestamp?.() || new Date(),
      });

      await sendBookingEmail({
        id: docRef.id,
        ...payload,
      });
    }
  };

  const hasData = filteredBookings.length > 0;

  return (
    <>
      <Card className="border-[#F1D8E8] rounded-2xl">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base text-[#431039]">
              Bookings
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              View, filter, and export all booking requests.
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto md:justify-end">
            {/* Local search bar */}
            <div className="w-full md:w-64">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                placeholder="Search bookings, clients, addresses"
                className="h-9 bg-white text-xs text-[#431039] placeholder:text-[#B989AF] border border-[#F1D8E8] rounded-full px-3"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center text-[11px] text-gray-500">
                <Filter className="w-3 h-3 mr-1" />
                Filters
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#F1D8E8] shadow-lg">
                  {STATUS_FILTERS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range filter (past / upcoming / all) */}
              <Select value={rangeFilter} onValueChange={setRangeFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#F1D8E8] shadow-lg">
                  {RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 bg-white"
                onClick={handleExportCsv}
              >
                <Download className="w-3 h-3" />
                Export CSV
              </Button>

              <Button
                size="sm"
                className="bg-[#E2A82B] text-[#431039] hover:bg-[#F0BA3E] text-xs"
                onClick={handleNewBooking}
              >
                + New booking
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-t border-[#F1D8E8]" />

          {loading ? (
            <div className="py-10 text-center text-xs text-gray-500">
              Loading bookings…
            </div>
          ) : !hasData ? (
            <div className="py-12">
              <EmptyState
                icon={CalendarDays}
                title="No bookings match your filters"
                description="Try changing the status or date range, or create a new booking manually."
                actionLabel="Create first booking"
                onAction={handleNewBooking}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-[#FFF7FB] text-[11px] text-[#6C3A63] uppercase tracking-wide">
                    <th className="px-4 py-2 text-left font-semibold">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Client
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Service
                    </th>
                    <th className="px-4 py-2 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Address
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b, idx) => (
                    <tr
                      key={b.id}
                      className={`border-t border-[#F7E5F0] cursor-pointer hover:bg-[#FFF1FA] ${
                        idx % 2 === 1 ? "bg-white" : "bg-[#FFFCFE]"
                      }`}
                      onClick={() => handleRowClick(b)}
                    >
                      <td className="px-4 py-2 align-top whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#431039]">
                            {formatDate(b.scheduledAt)}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatTime(b.scheduledAt)}
                          </span>
                        </div>
                      </td>

                      {/* Status cell with inline editable Select */}
                      <td
                        className="px-4 py-2 align-top whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <StatusPill status={b.status} />
                          <Select
                            value={String(b.status || "").toLowerCase()}
                            onValueChange={(value) =>
                              handleStatusChange(b.id, value)
                            }
                          >
                            <SelectTrigger className="h-7 w-[26px] rounded-full border-none bg-transparent text-[11px] text-[#6C3A63] px-0">
                              <span className="sr-only">Change status</span>
                              <span className="mx-auto">▼</span>
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-[#F1D8E8] shadow-lg">
                              {ADMIN_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      <td className="px-4 py-2 align-top min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <UserCircle2 className="w-4 h-4 text-[#B34A87]" />
                          <span className="text-[#431039]">
                            {b.clientName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2 align-top min-w-[130px]">
                        <span className="text-[#6C3A63]">
                          {b.serviceName}
                        </span>
                      </td>

                      <td className="px-4 py-2 align-top text-right whitespace-nowrap min-w-[80px]">
                        <span className="font-semibold text-[#431039]">
                          {formatCurrency(b.amount)}
                        </span>
                      </td>

                      <td className="px-4 py-2 align-top min-w-[180px]">
                        <div className="flex gap-1 items-start">
                          <MapPin className="w-3 h-3 mt-[2px] text-[#B989AF]" />
                          <span className="text-[11px] text-gray-600">
                            {b.address || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2 align-top max-w-xs">
                        <span className="text-[11px] text-gray-600 line-clamp-2">
                          {b.notes || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer summary */}
              <div className="border-t border-[#F1D8E8] px-4 py-3 flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  Showing{" "}
                  <strong className="text-[#431039]">
                    {filteredBookings.length}
                  </strong>{" "}
                  bookings · Total amount:{" "}
                  <strong className="text-[#431039]">
                    {formatCurrency(totalAmount)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating +New button */}
      <FabNewBooking onClick={handleNewBooking} />

      {/* Booking create/edit modal */}
      <BookingModal
        open={showModal}
        initial={
          editingBooking
            ? {
                id: editingBooking.id,
                ...editingBooking.raw,
              }
            : null
        }
        onClose={() => {
          setShowModal(false);
          setEditingBooking(null);
        }}
        onSave={handleSaveBooking}
      />
    </>
  );
}
