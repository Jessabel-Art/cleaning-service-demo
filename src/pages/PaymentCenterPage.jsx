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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

/* -------------------------- date helper -------------------------- */
function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  if (tsLike instanceof Date) return tsLike;
  const d = new Date(tsLike);
  return Number.isNaN(d.getTime()) ? null : d;
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
 * Centralized calculation for amounts, labels, and flags
 * so the row + modal stay in sync.
 */
function derivePaymentInfo(b) {
  const start = toDate(b.startAt || b.scheduledAt);
  const dateStr = start
    ? start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";
  const timeStr = start
    ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

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
    : normalizeStatus(b.status || (start && start < new Date() ? "completed" : "pending"));

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
    dateStr,
    timeStr,
    totalPrice,
    depositAmount,
    depositPaid,
    remainingBalance: explicitRemaining,
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
      toDate(nextUpcoming.startAt || nextUpcoming.scheduledAt) || new Date(8640000000000000); // max date

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

  // list row renderer – now clickable
  const renderBookingRow = (b, { onClick } = {}) => {
    const {
      dateStr,
      timeStr,
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
            {timeStr ? ` • ${timeStr}` : ""}
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

    const invoiceData = [
      ["Invoice ID", booking.id || ""],
      ["Service", booking.serviceName || "Cleaning service"],
      ["Date", info.dateStr],
      ["Time", info.timeStr],
      ["Status", info.statusLabel],
      ["Payment Status", info.paymentStatus],
      ["Payment Method", info.paymentMethodLabel],
      ["Total Price", `$${info.totalPrice?.toFixed?.(2) ?? info.totalPrice}`],
      ["Deposit Amount", `$${info.depositAmount.toFixed(2)}`],
      ["Deposit Paid", info.depositPaid ? "Yes" : "No"],
      ["Remaining Balance", `$${info.remainingBalance.toFixed(2)}`],
      ["Refunded", info.refunded ? "Yes" : "No"],
      [
        "Refunded Amount",
        info.refundedAmount > 0 ? `$${info.refundedAmount.toFixed(2)}` : "$0.00",
      ],
      ["Notes", booking.notes || ""],
    ];

    if (format === "csv") {
      // Excel-friendly CSV
      const csvLines = invoiceData.map(([k, v]) => {
        const safeKey = String(k).replace(/"/g, '""');
        const safeVal = String(v ?? "").replace(/"/g, '""');
        return `"${safeKey}","${safeVal}"`;
      });
      const csvContent = csvLines.join("\n");
      const blob = new Blob([csvContent], {
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
      // Simple print-to-PDF via browser
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return;

      const rowsHtml = invoiceData
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 8px;font-weight:600;border-bottom:1px solid #eee;">${k}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${v}</td></tr>`
        )
        .join("");

      win.document.write(`
        <html>
          <head>
            <title>Invoice - ${booking.id || ""}</title>
          </head>
          <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:24px; color:#2c0735;">
            <h1 style="font-size:20px; margin-bottom:4px;">Sanchez Services Invoice</h1>
            <p style="font-size:13px; margin-top:0; margin-bottom:16px; color:#6b5b76;">
              Appointment invoice for ${info.dateStr}${
        info.timeStr ? ` at ${info.timeStr}` : ""
      }
            </p>
            <table style="border-collapse:collapse; min-width:320px;">
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      // user can choose "Save as PDF" in print dialog
      win.print();
    }
  };

  const selectedInfo = selectedBooking ? derivePaymentInfo(selectedBooking) : null;

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
                        Tap the appointment in the list below to see your full
                        invoice, payment status, and download options.
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
                        <span className="text-right">Amount</span>
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
                        <span className="text-right">Amount</span>
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
            <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && closeInvoiceModal()}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-plum flex items-center justify-between gap-2">
                    <span>
                      {selectedContext === "history"
                        ? "Past appointment invoice"
                        : "Upcoming appointment invoice"}
                    </span>
                    {selectedInfo && (
                      <span className="text-xs font-normal text-plum/60">
                        #{selectedBooking?.id?.slice(0, 8) || "Booking"}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>

                {selectedBooking && selectedInfo && (
                  <div className="space-y-4 text-sm text-plum/85">
                    {/* Top summary */}
                    <div className="space-y-1">
                      <p className="font-semibold text-plum">
                        {selectedBooking.serviceName || "Cleaning service"}
                      </p>
                      <p className="text-xs text-plum/70">
                        {selectedInfo.dateStr}
                        {selectedInfo.timeStr
                          ? ` • ${selectedInfo.timeStr}`
                          : ""}
                      </p>
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-plum/5 p-3 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.08em] text-plum/60 font-semibold">
                          Total
                        </p>
                        <p className="text-sm font-semibold text-plum">
                          ${selectedInfo.totalPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="uppercase tracking-[0.08em] text-plum/60 font-semibold">
                          Remaining balance
                        </p>
                        <p className="text-sm font-semibold text-rose-700">
                          ${selectedInfo.remainingBalance.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.08em] text-plum/60 font-semibold">
                          Deposit
                        </p>
                        <p className="text-sm text-plum">
                          ${selectedInfo.depositAmount.toFixed(2)}{" "}
                          {selectedInfo.depositPaid ? "(paid)" : "(not paid)"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="uppercase tracking-[0.08em] text-plum/60 font-semibold">
                          Payment status
                        </p>
                        <p className="text-sm text-plum font-semibold">
                          {selectedInfo.paymentStatus}
                        </p>
                      </div>
                    </div>

                    {/* Status + method + refund */}
                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="font-semibold">Appointment status: </span>
                        {selectedInfo.statusLabel}
                      </p>
                      <p>
                        <span className="font-semibold">Payment method: </span>
                        {selectedInfo.paymentMethodLabel}
                      </p>
                      {selectedInfo.refunded && (
                        <p className="text-rose-700 font-semibold">
                          Refunded{" "}
                          {selectedInfo.refundedAmount > 0 &&
                            `($${selectedInfo.refundedAmount.toFixed(2)})`}
                        </p>
                      )}
                      {selectedBooking.notes && (
                        <p className="mt-2">
                          <span className="font-semibold">Notes: </span>
                          {selectedBooking.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between mt-4">
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
              </DialogContent>
            </Dialog>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCenterPage;
