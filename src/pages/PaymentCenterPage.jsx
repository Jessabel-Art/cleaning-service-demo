// src/pages/PaymentCenterPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Mail, Info, ArrowLeft } from "lucide-react";

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

const PaymentCenterPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

      const depositAmount = Number(b.depositAmount || 0);
      const depositPaid = !!b.depositPaid;
      const remainingBalance = Number(
        b.remainingBalance != null ? b.remainingBalance : 0
      );

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

      const anyPayment = depositPaid || paid > 0;
      const doneStatus =
        status === "completed" ||
        status === "cancelled" ||
        status === "canceled";

      return anyPayment || doneStatus;
    });
  }, [bookings, now]);

  // --- Summary: next appointment + amount due now ---
  const summary = useMemo(() => {
    if (!upcomingPayments.length) {
      return {
        nextUpcoming: null,
        totalDueNow: 0,
      };
    }

    let nextUpcoming = null;
    let totalDueNow = 0;

    upcomingPayments.forEach((b) => {
      const start = toDate(b.startAt || b.scheduledAt);
      if (!start) return;

      // find earliest upcoming
      if (!nextUpcoming) {
        nextUpcoming = b;
      } else {
        const currentNextDate = toDate(
          nextUpcoming.startAt || nextUpcoming.scheduledAt
        );
        if (currentNextDate && start < currentNextDate) {
          nextUpcoming = b;
        }
      }

      const totalPrice = Number(
        b.totalPrice != null ? b.totalPrice : b.cost != null ? b.cost : 0
      );
      const depositAmount = Number(b.depositAmount || 0);
      const depositPaid = !!b.depositPaid;

      const explicitRemaining =
        b.remainingBalance != null
          ? Number(b.remainingBalance)
          : Math.max(0, totalPrice - (depositPaid ? depositAmount : 0));

      const depositDueNow = depositAmount > 0 && !depositPaid;

      if (depositDueNow) {
        totalDueNow += depositAmount + explicitRemaining;
      } else {
        totalDueNow += explicitRemaining;
      }
    });

    return { nextUpcoming, totalDueNow };
  }, [upcomingPayments]);

  // list row renderer – more "list view" style
  const renderBookingRow = (b) => {
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

    const status = String(b.status || "pending").toLowerCase();
    const totalPrice = Number(
      b.totalPrice != null ? b.totalPrice : b.cost != null ? b.cost : 0
    );
    const depositAmount = Number(b.depositAmount || 0);
    const depositPaid = !!b.depositPaid;
    const remainingBalance = Number(
      b.remainingBalance != null
        ? b.remainingBalance
        : Math.max(0, totalPrice - (depositPaid ? depositAmount : 0))
    );

    let depositLabel = "No deposit required";
    if (depositAmount > 0 && depositPaid) {
      depositLabel = `Deposit paid ($${depositAmount.toFixed(2)})`;
    } else if (depositAmount > 0 && !depositPaid) {
      depositLabel = `Deposit due: $${depositAmount.toFixed(2)}`;
    }

    let statusLabel = "Pending";
    if (status === "confirmed") statusLabel = "Confirmed";
    if (status === "completed") statusLabel = "Completed";
    if (status === "cancelled" || status === "canceled") statusLabel = "Cancelled";

    return (
      <div
        key={b.id}
        className="
          py-3 border-b border-plum/10 last:border-b-0
          flex flex-col gap-2
          sm:grid sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_auto] sm:items-center
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
        </div>

        {/* Status pill */}
        <div className="flex sm:justify-end">
          <span
            className={`
              inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium
              ${
                status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : status === "confirmed"
                  ? "bg-gold/10 text-gold-900"
                  : status === "cancelled" || status === "canceled"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-plum/5 text-plum/80"
              }
            `}
          >
            {statusLabel}
          </span>
        </div>
      </div>
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
                      based on your booked appointments
                    </span>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="rounded-full bg-gold text-white hover:bg-gold/90"
                      onClick={handleScrollToUpcoming}
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
                        Remaining balance and deposit details are shown in the
                        list below.
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
                        {upcomingPayments.map(renderBookingRow)}
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
                        {billingHistory.map(renderBookingRow)}
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
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCenterPage;
