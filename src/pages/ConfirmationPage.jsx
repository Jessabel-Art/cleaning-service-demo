// src/pages/ConfirmationPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Calendar,
  Sparkles,
  Home,
  DollarSign,
  Info,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import CalendarExportButtons from "@/components/calendar/CalendarExportButtons";

// Minimal payment info (keep in sync with ClientPortalPage)
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: "$Sterlingsterls",
  zelle: "401-658-6708, use my name Sterling Sanchez in Zelle",
  notes: "Please include your full name in the payment note.",
};

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const bookingId = search.get("bookingId");
  const stripeSessionId = search.get("session_id");
  const cancelledStripe =
    search.get("cancelled") === "1" || search.get("canceled") === "1";

  // If we have a Stripe session id and NOT a cancelled flag,
  // treat this as "deposit paid via Stripe" for UX purposes.
  const paidViaStripe = !!stripeSessionId && !cancelledStripe;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isRepeatClient, setIsRepeatClient] = useState(false);

  // Derive presentable fields from Firestore doc
  const present = useMemo(() => {
    if (!booking) return null;

    const startAt = booking.startAt?.toDate ? booking.startAt.toDate() : null;
    const durationHrs =
      Number(booking.estimate?.durationHours) ||
      Number(booking.estimate?.duration) ||
      2;
    const endAt = startAt
      ? new Date(startAt.getTime() + durationHrs * 60 * 60 * 1000)
      : null;

    const dateStr = startAt ? startAt.toLocaleDateString() : "TBD";
    const timeStr = startAt
      ? startAt.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    const status = booking.status || "pending";
    const serviceName =
      booking.serviceName || booking.serviceSlug || "Residential Cleaning";
    const total = Number(booking.cost || 0);
    const paid = Number(booking.paid || 0);
    const notes = booking.notes || "";
    const address =
      booking.address?.line1 ||
      booking.address?.full ||
      booking.address ||
      "";

    return {
      dateStr,
      timeStr,
      status,
      serviceName,
      total,
      paid,
      startAt,
      endAt,
      duration: durationHrs,
      notes,
      address,
    };
  }, [booking]);

  // Load booking
  useEffect(() => {
    try {
      localStorage.removeItem("bookingDetails");
    } catch (_) {}

    if (!bookingId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    (async () => {
      try {
        const ref = doc(db, "bookings", bookingId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setBooking({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error("Failed to load booking:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  // Determine if this is a repeat client
  useEffect(() => {
    if (!booking) return;

    const emailLower =
      booking.contact?.emailLower ||
      (booking.contact?.email || "").toLowerCase();
    const userId = booking.userId || null;

    if (!emailLower && !userId) return;

    (async () => {
      try {
        const colRef = collection(db, "bookings");

        let qRef;
        if (userId) {
          qRef = query(
            colRef,
            where("userId", "==", userId),
            where("status", "in", ["completed", "confirmed"])
          );
        } else {
          qRef = query(
            colRef,
            where("contact.emailLower", "==", emailLower),
            where("status", "in", ["completed", "confirmed"])
          );
        }

        const snap = await getDocs(qRef);
        const now = new Date();
        let priorCount = 0;

        snap.forEach((docSnap) => {
          if (docSnap.id === booking.id) return;
          const data = docSnap.data() || {};
          const endAt = data.endAt?.toDate
            ? data.endAt.toDate()
            : data.endAt
            ? new Date(data.endAt)
            : null;

          if (endAt && endAt <= now) {
            priorCount += 1;
          }
        });

        setIsRepeatClient(priorCount > 0);
      } catch (e) {
        console.error("Failed to determine repeat-client status:", e);
      }
    })();
  }, [booking]);

  if (loading) {
    return (
      <div className="py-20 px-4 bg-white flex items-center justify-center min-h-[60vh]">
        <p className="text-plum/70">Loading your confirmation…</p>
      </div>
    );
  }

  if (notFound || !present) {
    return (
      <div className="py-20 px-4 bg-white flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full text-center p-8">
          <CardTitle className="text-2xl text-plum mb-2">
            We couldn’t find that booking
          </CardTitle>
          <p className="text-plum/70 mb-6">
            The link may be invalid or expired. If you already submitted a
            request, you’ll see it in your client portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-gold text-white hover:bg-gold/90 rounded-full" asChild>
              <Link to="/portal">Go to Client Portal</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-gold text-gold hover:bg-gold/10 rounded-full"
            >
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Homepage
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Remaining balance after a $50 deposit (never go below 0 just in case)
  const remainingAfterStripe = Math.max(
    0,
    present.total - PAYMENT_INFO.depositAmount
  );

  return (
    <div className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-white flex items-center justify-center min-h-[70vh]">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="text-center shadow-lg">
          <CardHeader className="pt-6 sm:pt-8">
            <CheckCircle className="mx-auto h-16 sm:h-20 w-16 sm:w-20 text-green-500" />
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-plum mt-3 sm:mt-4">
              Booking Received!
            </CardTitle>
            <p className="text-xs sm:text-sm md:text-lg text-plum/80 mt-2">
              Thanks—your request was submitted and is currently{" "}
              <strong>{present.status}</strong>.
            </p>

            {/* Stripe payment banners */}
            {paidViaStripe && (
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
                <Info className="inline-block h-4 w-4 mr-1 align-text-top text-emerald-600" />
                Your{" "}
                <strong>${PAYMENT_INFO.depositAmount.toFixed(2)} deposit</strong>{" "}
                was paid securely by card. You’ll receive an email receipt from Stripe.
                The remaining balance of{" "}
                <strong>${remainingAfterStripe.toFixed(2)}</strong> is due at time
                of service.
              </div>
            )}

            {cancelledStripe && !paidViaStripe && (
              <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                <Info className="inline-block h-4 w-4 mr-1 align-text-top text-rose-600" />
                Card payment was cancelled. Your booking request is still saved as{" "}
                <strong>{present.status}</strong>, but the deposit has not been paid.
                You can send it using the options below or from your client portal later.
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6 text-left p-8">
            <h3 className="text-xl font-semibold text-plum border-b border-gold/50 pb-2 mb-4">
              Your Booking Details
            </h3>

            <div className="space-y-3 text-plum/90">
              <Row icon={Sparkles} label="Service" value={present.serviceName} />
              <Row
                icon={Calendar}
                label="Date"
                value={`${present.dateStr}${
                  present.timeStr ? ` at ${present.timeStr}` : ""
                }`}
              />
              <Row
                icon={DollarSign}
                label="Total"
                value={`$${present.total.toFixed(2)}`}
              />
              {present.paid > 0 && (
                <Row
                  icon={DollarSign}
                  label="Amount Recorded"
                  value={`$${present.paid.toFixed(2)}`}
                />
              )}
              <div className="text-sm text-plum/70 mt-2">
                Booking ID: <span className="font-medium">{booking.id}</span>
              </div>
            </div>

            {/* Add-to-calendar section */}
            <div className="pt-4">
              <CalendarExportButtons
                title={`${present.serviceName} — Sanchez Services`}
                start={present.startAt}
                end={present.endAt}
                details={`Booking ID: ${booking.id}\nNotes: ${present.notes}`}
                location={present.address}
                uid={booking.id}
                fileName={`sanchez-${booking.id}.ics`}
              />
            </div>

            {/* Payment & deposit section */}
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-plum">Payment &amp; deposit</h4>

              {/* Returning client: no deposit requirement */}
              {isRepeatClient ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900">
                  <Info className="inline-block w-4 h-4 mr-1 text-emerald-600" />
                  <span className="font-semibold">Great news!</span> Because
                  you&apos;re a returning client, you don&apos;t need to send a
                  deposit for this booking. You can pay your total of{" "}
                  <span className="font-semibold">
                    ${present.total.toFixed(2)}
                  </span>{" "}
                  at time of service, or send payment in advance using the
                  options below.
                </div>
              ) : paidViaStripe ? (
                // First-time client, deposit already paid via Stripe
                <div className="rounded-lg bg-plum/5 p-4 text-sm text-plum/80">
                  <Info className="inline-block w-4 h-4 mr-1 text-gold" />
                  Your{" "}
                  <strong>
                    ${PAYMENT_INFO.depositAmount.toFixed(2)} non-refundable
                    deposit
                  </strong>{" "}
                  has been received. The remaining balance of{" "}
                  <strong>${remainingAfterStripe.toFixed(2)}</strong> is due at
                  time of service. You can also send additional payments in
                  advance using Cash App or Zelle if you prefer.
                </div>
              ) : (
                // First-time client, deposit NOT yet paid
                <>
                  <div className="rounded-lg bg-plum/5 p-4 text-sm text-plum/80">
                    <Info className="inline-block w-4 h-4 mr-1 text-gold" />
                    A{" "}
                    <strong>
                      ${PAYMENT_INFO.depositAmount.toFixed(2)} non-refundable
                      deposit
                    </strong>{" "}
                    is required to hold your slot. You can pay using the card
                    checkout link (if one was provided) or send it via one of
                    the methods below. Please include your{" "}
                    <strong>full name and booking ID</strong> in the payment
                    note.
                  </div>

                  <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded-md mt-2">
                    Your booking request remains <strong>pending</strong> until
                    the deposit is received. If the deposit is not received
                    within 48 hours, the time slot may be released.
                  </div>
                </>
              )}

              {PAYMENT_INFO.cash && (
                <PayRow
                  icon={DollarSign}
                  title="Cash"
                  text="Cash is accepted at time of service. Deposits (when required) can also be sent via Cash App or Zelle."
                />
              )}
              <PayRow
                icon={DollarSign}
                title="Cash App"
                text={
                  <>
                    Send to{" "}
                    <span className="font-semibold">
                      {PAYMENT_INFO.cashApp}
                    </span>{" "}
                    and include your name &amp; booking ID.
                  </>
                }
              />
              <PayRow
                icon={DollarSign}
                title="Zelle"
                text={
                  <>
                    Send to{" "}
                    <span className="font-semibold">
                      {PAYMENT_INFO.zelle}
                    </span>{" "}
                    and include your name &amp; booking ID.
                  </>
                }
              />
            </div>

            <p className="text-center text-sm text-plum/70 pt-2">
              You’ll receive an email once the business confirms or declines
              your request. You can also check status anytime in your client
              portal.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
              >
                <Link to="/portal">Go to Client Portal</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full"
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex justify-between items-center">
    <span className="font-medium flex items-center">
      <Icon className="h-5 w-5 mr-2 text-gold" />
      {label}:
    </span>
    <span className="font-semibold">{value}</span>
  </div>
);

const PayRow = ({ icon: Icon, title, text }) => (
  <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
    <Icon className="w-5 h-5 text-gold mt-0.5" />
    <div>
      <p className="text-plum font-medium">{title}</p>
      <p className="text-sm text-plum/70">{text}</p>
    </div>
  </div>
);

export default ConfirmationPage;
