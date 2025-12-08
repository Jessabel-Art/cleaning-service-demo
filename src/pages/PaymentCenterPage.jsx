// src/pages/PaymentCenterPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  Mail,
  Info,
  ArrowLeft,
  FileDown,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import logoPrimary from "@/assets/logo/logo-primary.png";

/* -------------------------- date helper -------------------------- */
function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  if (tsLike instanceof Date) return tsLike;
  const d = new Date(tsLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------ address formatter ---------------------- */

function formatAddressFromBooking(b) {
  // Adjust field names if your booking doc uses different ones
  const parts = [
    b.addressLine1 || b.serviceAddress || null,
    b.addressLine2 || null,
    [b.city, b.state].filter(Boolean).join(", ") || null,
    b.zip || null,
  ].filter(Boolean);

  if (!parts.length) return "On file";
  return parts.join(" · ");
}

/* -------------------- payment / invoice helpers ------------------- */

function normalizeStatus(statusRaw) {
  const status = String(statusRaw || "").toLowerCase();
  if (status === "confirmed") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  if (status === "pending") return "Pending";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
}

function prettifyMethodLabel(methodRaw) {
  if (!methodRaw) return "Not recorded";
  const s = String(methodRaw).toLowerCase();
  if (s.includes("stripe") || s.includes("card")) return "Card (Stripe)";
  if (s.includes("cashapp") || s.includes("cash_app")) return "Cash App";
  if (s.includes("zelle")) return "Zelle";
  if (s.includes("cash")) return "Cash";
  return methodRaw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * derivePaymentInfo
 * Centralized calculation for amounts, labels, and flags.
 */
function derivePaymentInfo(b) {
  const start = toDate(b.startAt || b.scheduledAt);
  const end = toDate(b.endAt || b.endAtTime || b.endTime);

  const dateStr = start
    ? start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

  const startTimeStr = start
    ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const endTimeStr = end
    ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const dateTimeRange = start
    ? `${dateStr} · ${startTimeStr}${
        endTimeStr ? ` – ${endTimeStr}` : ""
      }`
    : "TBD";

  const totalPrice = Number(
    b.totalPrice != null ? b.totalPrice : b.cost != null ? b.cost : 0
  );
  const depositAmount = Number(b.depositAmount || 0);
  const depositPaid = !!b.depositPaid;

  const explicitRemaining =
    b.remainingBalance != null
      ? Number(b.remainingBalance)
      : Math.max(0, totalPrice - (depositPaid ? depositAmount : 0));

  const paidField = Number(b.paid ?? b.amountPaid ?? 0);
  const refundedAmount = Number(b.refundedAmount || 0);
  const refunded = !!b.refunded || refundedAmount > 0;

  const anyPayment = depositPaid || paidField > 0;

  let paymentStatus = "Unpaid";
  if (refunded) {
    paymentStatus = "Refunded";
  } else if (explicitRemaining <= 0 && anyPayment) {
    paymentStatus = "Paid in full";
  } else if (anyPayment) {
    paymentStatus = "Partially paid";
  }

  const statusLabel = refunded
    ? "Refunded"
    : normalizeStatus(
        b.status || (start && start < new Date() ? "completed" : "pending")
      );

  const depositLabel =
    depositAmount > 0 && depositPaid
      ? `Deposit paid ($${depositAmount.toFixed(2)})`
      : depositAmount > 0 && !depositPaid
      ? `Deposit due: $${depositAmount.toFixed(2)}`
      : "No deposit required";

  const paymentMethodRaw =
    b.balancePaymentMethod ||
    b.paymentMethod ||
    b.depositPaymentMethod ||
    (b.stripePaymentIntentId || b.stripeSessionId ? "Card (Stripe)" : null);

  const paymentMethodLabel = prettifyMethodLabel(paymentMethodRaw);

  return {
    start,
    end,
    dateStr,
    startTimeStr,
    endTimeStr,
    dateTimeRange,
    totalPrice,
    depositAmount,
    depositPaid,
    remainingBalance: explicitRemaining,
    amountPaid: paidField,
    refunded,
    refundedAmount,
    paymentStatus,
    statusLabel,
    depositLabel,
    paymentMethodLabel,
  };
}

const PaymentCenterPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null); // "upcoming" | "history" | null

  // subscribe to this user's bookings
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setBookings([]);
      return;
    }

    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where("userId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // sort newest first by startAt/scheduledAt
        rows.sort((a, b) => {
          const aDate = toDate(a.startAt || a.scheduledAt) || new Date(0);
          const bDate = toDate(b.startAt || b.scheduledAt) || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        setBookings(rows);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        console.error("PaymentCenter bookings error", err);
        setLoadError(err?.message || String(err));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const now = new Date();

  const upcomingPayments = useMemo(() => {
    return bookings.filter((b) => {
      const start = toDate(b.startAt || b.scheduledAt);
      if (!start || start < now) return false;

      const info = derivePaymentInfo(b);
      const depositAmount = info.depositAmount;
      const depositPaid = info.depositPaid;
      const remainingBalance = info.remainingBalance;

      const depositDue = depositAmount > 0 && !depositPaid;
      const balanceDue = remainingBalance > 0;

      return depositDue || balanceDue;
    });
  }, [bookings, now]);

  const billingHistory = useMemo(() => {
    return bookings.filter((b) => {
      const start = toDate(b.startAt || b.scheduledAt);
      if (!start || start >= now) return false;

      const status = String(b.status || "").toLowerCase();
      const depositPaid = !!b.depositPaid;
      const paid = Number(b.paid || 0);
      const refunded = !!b.refunded || Number(b.refundedAmount || 0) > 0;

      const anyPayment = depositPaid || paid > 0 || refunded;
      const doneStatus =
        status === "completed" ||
        status === "cancelled" ||
        status === "canceled";

      return anyPayment || doneStatus;
    });
  }, [bookings, now]);

  // --- Summary: next appointment + amount due now (ONLY next booking) ---
  const summary = useMemo(() => {
    if (!upcomingPayments.length) {
      return { nextUpcoming: null, totalDueNow: 0 };
    }

    // find earliest upcoming booking
    let nextUpcoming = upcomingPayments[0];
    let earliestDate =
      toDate(nextUpcoming.startAt || nextUpcoming.scheduledAt) ||
      new Date(8640000000000000);

    upcomingPayments.forEach((b) => {
      const start = toDate(b.startAt || b.scheduledAt);
      if (start && start < earliestDate) {
        earliestDate = start;
        nextUpcoming = b;
      }
    });

    const info = derivePaymentInfo(nextUpcoming);

    // "Amount due now" = total outstanding for THIS next booking only
    const totalDueNow = Math.max(0, info.remainingBalance);

    return { nextUpcoming, totalDueNow };
  }, [upcomingPayments]);

  // list row renderer – clickable
  const renderBookingRow = (b, { onClick } = {}) => {
    const {
      dateStr,
      startTimeStr,
      totalPrice,
      depositLabel,
      remainingBalance,
      statusLabel,
      refunded,
    } = derivePaymentInfo(b);

    const status = statusLabel.toLowerCase();

    return (
      <button
        type="button"
        key={b.id}
        onClick={onClick}
        className="
          w-full text-left
          py-3 border-b border-plum/10 last:border-b-0
          flex flex-col gap-2
          sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_auto] sm:items-center
          hover:bg-plum/5 transition-colors
        "
      >
        {/* Appointment info */}
        <div>
          <div className="text-sm font-semibold text-plum">
            {b.serviceName || "Cleaning service"}
          </div>
          <div className="text-xs text-plum/70">
            {dateStr}
            {startTimeStr ? ` · ${startTimeStr}` : ""}
          </div>
          <div className="mt-1 text-xs text-plum/70">{depositLabel}</div>
        </div>

        {/* Amounts */}
        <div className="sm:text-right">
          <div className="text-sm font-semibold text-plum">
            ${totalPrice.toFixed(2)}
          </div>
          {remainingBalance > 0 && (
            <div className="text-xs text-rose-700">
              Remaining: ${remainingBalance.toFixed(2)}
            </div>
          )}
          {refunded && (
            <div className="text-xs text-rose-600 mt-0.5 font-medium">
              Refunded
            </div>
          )}
        </div>

        {/* Status pill */}
        <div className="flex sm:justify-end">
          <span
            className={`
              inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium
              ${
                refunded
                  ? "bg-rose-50 text-rose-700"
                  : status.includes("completed")
                  ? "bg-emerald-50 text-emerald-700"
                  : status.includes("confirmed")
                  ? "bg-gold/10 text-gold-900"
                  : status.includes("cancelled") || status.includes("canceled")
                  ? "bg-rose-50 text-rose-700"
                  : "bg-plum/5 text-plum/80"
              }
            `}
          >
            {statusLabel}
          </span>
        </div>
      </button>
    );
  };

  const user = auth.currentUser;

  const handleScrollToUpcoming = () => {
    const el = document.getElementById("upcoming-payments-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const { nextUpcoming, totalDueNow } = summary;

  const nextStart = nextUpcoming
    ? toDate(nextUpcoming.startAt || nextUpcoming.scheduledAt)
    : null;
  const nextDateStr = nextStart
    ? nextStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const nextTimeStr = nextStart
    ? nextStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const openInvoiceModal = (booking, context) => {
    setSelectedBooking(booking);
    setSelectedContext(context);
  };

  const closeInvoiceModal = () => {
    setSelectedBooking(null);
    setSelectedContext(null);
  };

  const handleDownloadInvoice = (format, booking) => {
    if (!booking) return;
    const info = derivePaymentInfo(booking);
    const address = formatAddressFromBooking(booking);

    const homeDetails = {
      propertyType: booking.propertyType || "Not specified",
      condition: booking.conditionLevel || booking.condition || "Standard",
      bedrooms:
        booking.bedrooms != null && booking.bedrooms !== ""
          ? booking.bedrooms
          : "—",
      bathrooms:
        booking.bathrooms != null && booking.bathrooms !== ""
          ? booking.bathrooms
          : "—",
      pets: booking.petsOnSite != null ? (booking.petsOnSite ? "Yes" : "No") : "No",
      fragrance: booking.fragrancePreference || "No preference",
      addOns:
        (Array.isArray(booking.addOns) && booking.addOns.length > 0
          ? booking.addOns.join(", ")
          : booking.addOnsText) || "None added",
    };

    if (format === "csv") {
      // Excel-friendly CSV
      const rows = [
        ["Invoice ID", booking.id || ""],
        ["Service", booking.serviceName || "Cleaning service"],
        ["Status", info.statusLabel],
        ["Payment Status", info.paymentStatus],
        ["Payment Method", info.paymentMethodLabel],
        ["Date / Time", info.dateTimeRange],
        ["Frequency", booking.frequency || "one-time"],
        ["Total", `$${info.totalPrice.toFixed(2)}`],
        ["Deposit", `$${info.depositAmount.toFixed(2)}`],
        ["Deposit Paid", info.depositPaid ? "Yes" : "No"],
        ["Amount Paid", `$${info.amountPaid.toFixed(2)}`],
        ["Remaining Balance", `$${info.remainingBalance.toFixed(2)}`],
        ["Refunded", info.refunded ? "Yes" : "No"],
        [
          "Refunded Amount",
          info.refundedAmount > 0 ? `$${info.refundedAmount.toFixed(2)}` : "$0.00",
        ],
        ["Service Address", address],
        ["Property Type", homeDetails.propertyType],
        ["Condition Level", homeDetails.condition],
        ["Bedrooms", homeDetails.bedrooms],
        ["Bathrooms", homeDetails.bathrooms],
        ["Pets on Site", homeDetails.pets],
        ["Fragrance Preference", homeDetails.fragrance],
        ["Add-ons", homeDetails.addOns],
        ["Notes", booking.notes || ""],
      ];

      const csvLines = rows.map(([k, v]) => {
        const safeKey = String(k).replace(/"/g, '""');
        const safeVal = String(v ?? "").replace(/"/g, '""');
        return `"${safeKey}","${safeVal}"`;
      });

      const blob = new Blob([csvLines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoice-${booking.id || "booking"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      // Print-style invoice with solid white background
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return;

      const orderCode = booking.orderCode || booking.id?.slice(0, 8) || "";

      const html = `
        <html>
          <head>
            <title>Invoice - ${orderCode}</title>
          </head>
          <body style="margin:0; padding:24px; background:#f3ecf8; font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#2c0735;">
            <div style="max-width:800px; margin:0 auto; background:#ffffff; border-radius:8px; padding:24px 28px; box-sizing:border-box;">
              <!-- Header -->
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:32px; height:32px; border-radius:999px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #f3d4ff;">
                    <img src="${logoPrimary}" alt="Sanchez Services" style="max-width:100%; max-height:100%; object-fit:contain;" />
                  </div>
                  <div>
                    <div style="font-size:13px; letter-spacing:0.18em; text-transform:uppercase; color:#8b6a8f;">Sanchez Services</div>
                    <div style="font-size:14px; color:#2c0735;">Appointment summary</div>
                  </div>
                </div>
                <div style="text-align:right; font-size:11px; color:#8b6a8f;">
                  <div>Order: <span style="font-weight:600; letter-spacing:0.12em;">${orderCode}</span></div>
                  <div style="margin-top:4px;">${info.dateTimeRange}</div>
                </div>
              </div>

              <hr style="border:none; border-top:1px solid #f0e1ff; margin:12px 0 20px;" />

              <h2 style="font-size:20px; margin:0 0 12px;">Appointment details</h2>

              <!-- Appointment details grid -->
              <div style="display:flex; flex-wrap:wrap; gap:32px; font-size:13px; margin-bottom:20px;">
                <div style="flex:1 1 220px;">
                  <div><strong>Service</strong><br/>${booking.serviceName || "Cleaning service"}</div>
                  <div style="margin-top:10px;"><strong>Date / Time</strong><br/>${info.dateTimeRange}</div>
                  <div style="margin-top:10px;"><strong>Total</strong><br/>$${info.totalPrice.toFixed(2)}</div>
                  <div style="margin-top:10px;"><strong>Service address</strong><br/>${address}</div>
                </div>
                <div style="flex:1 1 220px;">
                  <div><strong>Status</strong><br/>${info.statusLabel}</div>
                  <div style="margin-top:10px;"><strong>Frequency</strong><br/>${booking.frequency || "one-time"}</div>
                  <div style="margin-top:10px;"><strong>Deposit</strong><br/>$${info.depositAmount.toFixed(2)} ${
        info.depositPaid ? "(paid)" : "(due)"
      }</div>
                </div>
              </div>

              <!-- Payment summary -->
              <h3 style="font-size:16px; margin:0 0 8px;">Payment summary</h3>
              <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:13px; margin-bottom:24px;">
                <div style="flex:1 1 140px;">
                  <div><strong>Payment status</strong><br/>${info.paymentStatus}</div>
                </div>
                <div style="flex:1 1 140px;">
                  <div><strong>Amount paid</strong><br/>$${info.amountPaid.toFixed(
                    2
                  )}</div>
                </div>
                <div style="flex:1 1 140px;">
                  <div><strong>Remaining balance</strong><br/>$${info.remainingBalance.toFixed(
                    2
                  )}</div>
                </div>
                <div style="flex:1 1 140px;">
                  <div><strong>Payment method</strong><br/>${
                    info.paymentMethodLabel
                  }</div>
                </div>
                ${
                  info.refunded
                    ? `<div style="flex:1 1 140px; color:#b4234b;"><strong>Refunded</strong><br/>$${info.refundedAmount.toFixed(
                        2
                      )}</div>`
                    : ""
                }
              </div>

              <!-- Home & cleaning details -->
              <h3 style="font-size:16px; margin:0 0 8px;">Home & cleaning details</h3>
              <div style="display:flex; flex-wrap:wrap; gap:32px; font-size:13px; margin-bottom:24px;">
                <div style="flex:1 1 220px;">
                  <div><strong>Property type</strong><br/>${
                    homeDetails.propertyType
                  }</div>
                  <div style="margin-top:10px;"><strong>Condition level</strong><br/>${
                    homeDetails.condition
                  }</div>
                  <div style="margin-top:10px;"><strong>Fragrance preference</strong><br/>${
                    homeDetails.fragrance
                  }</div>
                </div>
                <div style="flex:1 1 220px;">
                  <div><strong>Bedrooms / Bathrooms</strong><br/>${
                    homeDetails.bedrooms
                  } bed · ${homeDetails.bathrooms} bath</div>
                  <div style="margin-top:10px;"><strong>Pets on site</strong><br/>${
                    homeDetails.pets
                  }</div>
                  <div style="margin-top:10px;"><strong>Add-ons</strong><br/>${
                    homeDetails.addOns
                  }</div>
                </div>
              </div>

              <!-- Notes -->
              <h3 style="font-size:13px; margin:0 0 6px;">Notes for your cleaner</h3>
              <div style="border:1px solid #e6c5ff; border-radius:4px; padding:10px; min-height:70px; font-size:13px;">
                ${booking.notes || "<span style='color:#b39bbc;'>No notes added.</span>"}
              </div>
            </div>
          </body>
        </html>
      `;

      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  const selectedInfo = selectedBooking ? derivePaymentInfo(selectedBooking) : null;

  // derive home/cleaning details for on-screen modal
  const selectedHomeDetails =
    selectedBooking && selectedInfo
      ? {
          propertyType:
            selectedBooking.propertyType || "Not specified",
          condition:
            selectedBooking.conditionLevel ||
            selectedBooking.condition ||
            "Standard",
          bedrooms:
            selectedBooking.bedrooms != null &&
            selectedBooking.bedrooms !== ""
              ? selectedBooking.bedrooms
              : "—",
          bathrooms:
            selectedBooking.bathrooms != null &&
            selectedBooking.bathrooms !== ""
              ? selectedBooking.bathrooms
              : "—",
          pets:
            selectedBooking.petsOnSite != null
              ? selectedBooking.petsOnSite
                ? "Yes"
                : "No"
              : "No",
          fragrance:
            selectedBooking.fragrancePreference || "No preference",
          addOns:
            (Array.isArray(selectedBooking.addOns) &&
            selectedBooking.addOns.length > 0
              ? selectedBooking.addOns.join(", ")
              : selectedBooking.addOnsText) || "None added",
          address: formatAddressFromBooking(selectedBooking),
        }
      : null;

  return (
    <div className="py-12 md:py-20 px-4 bg-[#FFF7FB] min-h-[80vh]">
      <motion.div
        className="max-w-5xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Top-left nav: back button + breadcrumb */}
        <div className="mb-6">
          <div className="sticky top-3 z-20 md:static md:top-auto flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white border-plum text-plum hover:bg-plum/5 rounded-full flex items-center gap-2"
              onClick={() => navigate("/portal")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            <div className="hidden sm:flex items-center gap-1 text-xs text-plum/60">
              <button
                type="button"
                onClick={() => navigate("/portal")}
                className="hover:underline"
              >
                Client Portal
              </button>
              <span>/</span>
              <span className="font-medium text-plum/80">Payment Center</span>
            </div>
          </div>

          <div className="sm:hidden mt-2 text-xs text-plum/60">
            <button
              type="button"
              onClick={() => navigate("/portal")}
              className="hover:underline"
            >
              Client Portal
            </button>{" "}
            /{" "}
            <span className="font-medium text-plum/80">Payment Center</span>
          </div>
        </div>

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-plum/60">
            Payment &amp; deposits
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-plum">
            Payment Center
          </h1>
          <p className="text-sm md:text-base text-plum/75 max-w-2xl mx-auto">
            See upcoming payments, download invoices, and review how deposits
            and payment methods work for your appointments.
          </p>
        </header>

        {/* Summary: next appointment + amount due now */}
        {user && (
          <Card className="bg-white border-plum/10 shadow-sm">
            <CardContent className="py-4 md:py-5">
              <div className="grid gap-6 md:grid-cols-2 items-center">
                {/* left: amount due now */}
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-plum/60 font-semibold">
                    Amount due now
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-bold text-plum">
                      ${totalDueNow.toFixed(2)}
                    </span>
                    <span className="text-xs text-plum/60">
                      for your next scheduled appointment
                    </span>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="rounded-full bg-gold text-white hover:bg-gold/90"
                      onClick={handleScrollToUpcoming}
                      disabled={totalDueNow <= 0}
                    >
                      Pay balance now
                    </Button>
                  </div>
                </div>

                {/* right: next appointment */}
                <div className="md:border-l md:border-plum/10 md:pl-6">
                  <p className="text-xs uppercase tracking-[0.12em] text-plum/60 font-semibold">
                    Next appointment
                  </p>
                  {nextUpcoming && nextStart ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-plum">
                        {nextUpcoming.serviceName || "Cleaning service"}
                      </p>
                      <p className="text-xs text-plum/70">
                        {nextDateStr}
                        {nextTimeStr ? ` • ${nextTimeStr}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-plum/70">
                        Tap the appointment in the list below to view your full
                        invoice and details.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-plum/70">
                      You don&apos;t have any upcoming payments right now. New
                      bookings will appear here once scheduled.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* If not signed in, show gate and stop */}
        {!user && (
          <Card className="bg-white border-plum/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-plum">
                <CreditCard className="w-5 h-5 text-gold" />
                Sign in to view payments
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-plum/80 space-y-3">
              <p>
                To see your deposits and billing history, log in to your
                Sanchez Services account.
              </p>
              <Button
                className="bg-gold text-white hover:bg-gold/90 rounded-full"
                onClick={() => navigate("/portal")}
              >
                Go to My Account
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <>
            {/* Top row: upcoming + billing side by side */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Upcoming payments */}
              <Card
                id="upcoming-payments-card"
                className="bg-white border-plum/10 shadow-sm"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <DollarSign className="w-5 h-5 text-gold" />
                    Upcoming payments
                  </CardTitle>
                  {loading && (
                    <span className="text-xs text-plum/60">Loading…</span>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-plum/80">
                  {loadError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      We couldn&apos;t load your payment info. Try refreshing the
                      page. If this keeps happening, Sterling or your developer
                      may need to adjust Firestore indexes.
                    </div>
                  )}

                  {!loadError && !loading && upcomingPayments.length === 0 && (
                    <div className="rounded-xl border border-plum/15 bg-plum/5 p-4 text-xs text-plum/70 text-center">
                      You don&apos;t have any deposits or balances due right now.
                    </div>
                  )}

                  {!loadError && upcomingPayments.length > 0 && (
                    <>
                      {/* list-view header (desktop only) */}
                      <div className="hidden sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_auto] px-1 pb-2 text-[11px] uppercase tracking-[0.08em] text-plum/55">
                        <span>Appointment</span>
                        <span className="text-right">Amount|</span>
                        <span className="text-right">Status</span>
                      </div>
                      <div className="divide-y divide-plum/10">
                        {upcomingPayments.map((b) =>
                          renderBookingRow(b, {
                            onClick: () => openInvoiceModal(b, "upcoming"),
                          })
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Billing history */}
              <Card className="bg-white border-plum/10 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <DollarSign className="w-5 h-5 text-gold" />
                    Billing history
                  </CardTitle>
                  {!loading && billingHistory.length > 0 && (
                    <span className="text-xs text-plum/60">
                      Showing your most recent appointments
                    </span>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-plum/80">
                  {!loading && billingHistory.length === 0 && (
                    <div className="rounded-xl border border-plum/15 bg-plum/5 p-4 text-xs text-plum/70 text-center">
                      Once you complete appointments and pay deposits, your
                      history will appear here.
                    </div>
                  )}

                  {billingHistory.length > 0 && (
                    <>
                      <div className="hidden sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_auto] px-1 pb-2 text-[11px] uppercase tracking-[0.08em] text-plum/55">
                        <span>Appointment</span>
                        <span className="text-right">Amount|</span>
                        <span className="text-right">Status</span>
                      </div>
                      <div className="divide-y divide-plum/10">
                        {billingHistory.map((b) =>
                          renderBookingRow(b, {
                            onClick: () => openInvoiceModal(b, "history"),
                          })
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Deposit policy – now lower on the page */}
            <Card className="bg-white border-plum/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-plum">
                  <Info className="w-5 h-5 text-gold" />
                  Deposit policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-plum/80">
                <p>
                  • New clients: a{" "}
                  <span className="font-semibold">$50 non-refundable deposit</span>{" "}
                  is required to secure the first appointment. It is applied to
                  your final balance.
                </p>
                <p>
                  • Returning clients:{" "}
                  <span className="font-semibold">no deposit</span> is required.
                  Payment is due at time of service unless otherwise arranged.
                </p>
                <p>
                  • Cancellations within{" "}
                  <span className="font-semibold">48 hours</span> of your
                  appointment or no-shows may result in forfeiting the deposit.
                </p>
              </CardContent>
            </Card>

            {/* Combined: How payments work + methods */}
            <Card className="bg-white border-plum/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-plum">
                  <CreditCard className="w-5 h-5 text-gold" />
                  How payments work &amp; methods
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-plum/80 space-y-5">
                {/* How payments work */}
                <div className="space-y-1">
                  <p className="font-medium text-plum">
                    How payments work for your cleanings
                  </p>
                  <p className="text-sm text-plum/75">
                    • We send your{" "}
                    <span className="font-semibold">final invoice</span> on the
                    day of your appointment once the walkthrough is complete.
                  </p>
                  <p className="text-sm text-plum/75">
                    • The{" "}
                    <span className="font-semibold">full remaining balance</span>{" "}
                    must be paid at the time of your appointment.
                  </p>
                  <p className="text-sm text-plum/75">
                    • Remaining balances can be paid by{" "}
                    <span className="font-semibold">
                      card (processed via Stripe), Cash App, or Zelle
                    </span>{" "}
                    and cash may be accepted if coordinated directly with
                    Sterling.
                  </p>
                </div>

                {/* Stripe / card */}
                <div className="rounded-xl border border-gold/20 bg-white p-4 flex gap-3">
                  <CreditCard className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-plum">Card (Stripe)</p>
                    <p className="text-sm text-plum/75 mt-0.5">
                      Deposits are paid through a secure{" "}
                      <span className="font-semibold">Stripe checkout</span>{" "}
                      when you book. Remaining balances can also be processed by
                      card using Stripe at the time of your appointment or via a
                      secure payment link sent by Sterling.
                    </p>
                  </div>
                </div>

                {/* Cash App */}
                <div className="rounded-xl border border-gold/20 bg-white p-4 flex gap-3">
                  <DollarSign className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-plum">Cash App</p>
                    <p className="text-sm text-plum/75 mt-0.5">
                      Send deposits or remaining balances to{" "}
                      <span className="font-semibold">$Sterlingsterls</span>.
                      Always include your{" "}
                      <span className="font-semibold">full name</span> in the
                      note so it can be matched to your appointment.
                    </p>
                  </div>
                </div>

                {/* Zelle */}
                <div className="rounded-xl border border-gold/20 bg-white p-4 flex gap-3">
                  <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-plum">Zelle</p>
                    <p className="text-sm text-plum/75 mt-0.5">
                      Send payments via Zelle to{" "}
                      <span className="font-semibold">
                        401-658-6708 (recipient: Sterling Sanchez)
                      </span>
                      . Include your{" "}
                      <span className="font-semibold">full name</span> in the
                      memo line.
                    </p>
                  </div>
                </div>

                {/* Policy note */}
                <div className="rounded-lg bg-rose-50 border border-gold/20 p-3 text-sm text-plum/80 flex items-start gap-2">
                  <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p>
                      Deposits are non-refundable but can usually be{" "}
                      <span className="font-semibold">
                        transferred once to a new date
                      </span>{" "}
                      if you reschedule with proper notice, according to the
                      cancellation policy you agreed to when booking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice / booking details modal */}
            <Dialog
              open={!!selectedBooking}
              onOpenChange={(open) => !open && closeInvoiceModal()}
            >
              <DialogContent className="max-w-3xl bg-transparent border-none shadow-none p-0">
                <DialogHeader className="hidden">
                  <DialogTitle>Appointment invoice</DialogTitle>
                </DialogHeader>

                {selectedBooking && selectedInfo && selectedHomeDetails && (
                  <div className="bg-white rounded-xl shadow-lg border border-plum/10 overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-plum/10 flex items-center justify-center overflow-hidden">
                          <img
                            src={logoPrimary}
                            alt="Sanchez Services"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-plum/60">
                            Sanchez Services
                          </p>
                          <p className="text-sm text-plum">
                            Appointment summary
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-plum/60">
                        <p>
                          Order:{" "}
                          <span className="font-semibold tracking-[0.14em]">
                            {selectedBooking.orderCode ||
                              selectedBooking.id?.slice(0, 8) ||
                              "—"}
                          </span>
                        </p>
                        <p className="mt-1">{selectedInfo.dateTimeRange}</p>
                      </div>
                    </div>

                    <div className="border-t border-plum/10" />

                    {/* Appointment details */}
                    <div className="px-5 pt-4 pb-3">
                      <h2 className="text-lg font-semibold text-plum mb-3">
                        Appointment details
                      </h2>
                      <div className="grid md:grid-cols-2 gap-6 text-xs text-plum/80">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Service
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedBooking.serviceName ||
                                "Cleaning service"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Date / Time
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedInfo.dateTimeRange}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Total
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              ${selectedInfo.totalPrice.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Service address
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.address}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Status
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedInfo.statusLabel}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Frequency
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedBooking.frequency || "one-time"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Deposit
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              ${selectedInfo.depositAmount.toFixed(2)}{" "}
                              {selectedInfo.depositPaid ? "(paid)" : "(due)"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-plum/10" />

                    {/* Payment summary */}
                    <div className="px-5 py-4">
                      <h3 className="text-sm font-semibold text-plum mb-3">
                        Payment summary
                      </h3>
                      <div className="grid md:grid-cols-4 gap-4 text-[11px] text-plum/80">
                        <div>
                          <p className="font-semibold text-plum/80 uppercase tracking-[0.08em]">
                            Payment status
                          </p>
                          <p className="mt-1 text-[13px]">
                            {selectedInfo.paymentStatus}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-plum/80 uppercase tracking-[0.08em]">
                            Amount paid
                          </p>
                          <p className="mt-1 text-[13px]">
                            ${selectedInfo.amountPaid.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-plum/80 uppercase tracking-[0.08em]">
                            Remaining balance
                          </p>
                          <p className="mt-1 text-[13px] text-rose-700">
                            ${selectedInfo.remainingBalance.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-plum/80 uppercase tracking-[0.08em]">
                            Payment method
                          </p>
                          <p className="mt-1 text-[13px]">
                            {selectedInfo.paymentMethodLabel}
                          </p>
                        </div>
                      </div>
                      {selectedInfo.refunded && (
                        <p className="mt-3 text-[12px] text-rose-700 font-semibold">
                          Refunded{" "}
                          {selectedInfo.refundedAmount > 0 &&
                            `($${selectedInfo.refundedAmount.toFixed(2)})`}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-plum/10" />

                    {/* Home & cleaning details */}
                    <div className="px-5 py-4">
                      <h3 className="text-sm font-semibold text-plum mb-3">
                        Home &amp; cleaning details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-6 text-[11px] text-plum/80">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Property type
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.propertyType}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Condition level
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.condition}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Fragrance preference
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.fragrance}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Bedrooms / Bathrooms
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.bedrooms} bed ·{" "}
                              {selectedHomeDetails.bathrooms} bath
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Pets on site
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.pets}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-plum text-xs">
                              Add-ons
                            </p>
                            <p className="mt-0.5 text-[13px]">
                              {selectedHomeDetails.addOns}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-plum/10" />

                    {/* Notes */}
                    <div className="px-5 pt-4 pb-5 text-xs text-plum/80">
                      <p className="font-semibold text-plum text-xs mb-2">
                        Notes for your cleaner
                      </p>
                      <div className="border border-plum/20 rounded-md min-h-[70px] px-3 py-2 bg-white text-[13px]">
                        {selectedBooking.notes ? (
                          <p className="whitespace-pre-wrap">
                            {selectedBooking.notes}
                          </p>
                        ) : (
                          <p className="text-plum/50">No notes added.</p>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-plum/50">
                        This summary reflects the details on file for this
                        appointment.
                      </p>
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-plum/10 bg-plum/3 px-5 py-3">
                      <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() =>
                            handleDownloadInvoice("pdf", selectedBooking)
                          }
                        >
                          <FileDown className="w-4 h-4" />
                          Download PDF
                        </Button>
                        <div className="flex gap-2 sm:justify-end w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() =>
                              handleDownloadInvoice("csv", selectedBooking)
                            }
                          >
                            <FileDown className="w-4 h-4" />
                            Download Excel/CSV
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-plum text-white hover:bg-plum/90"
                            onClick={closeInvoiceModal}
                          >
                            Close
                          </Button>
                        </div>
                      </DialogFooter>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCenterPage;
