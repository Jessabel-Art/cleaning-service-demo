// src/pages/PaymentConfirmationPage.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { derivePaymentInfo, getNormalizedStripePaymentSummary } from "@/lib/payments";

function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  if (tsLike instanceof Date) return tsLike;
  const d = new Date(tsLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

const PaymentConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get("bookingId");
  const cancelled = searchParams.get("cancelled") === "1";
  const mode = searchParams.get("mode") || "remaining_due";
  const redirectNetAmount = Number(searchParams.get("intended_net_amount") || 0);
  const redirectFeeAmount = Number(searchParams.get("estimated_stripe_fee") || 0);
  const redirectGrossAmount = Number(searchParams.get("gross_charge_amount") || 0);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) return;

    const load = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "bookings", bookingId));
        if (!snap.exists()) {
          setError("We couldn't find this appointment in your account.");
          setBooking(null);
        } else {
          setBooking({ id: snap.id, ...snap.data() });
          setError(null);
        }
      } catch (err) {
        console.error("PaymentConfirmation load error", err);
        setError("There was an issue loading your appointment details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const title = cancelled
    ? "Payment cancelled"
    : mode === "remaining_due"
    ? "Remaining balance paid"
    : "Payment completed";

  const description = cancelled
    ? "Your Stripe payment was cancelled. Your appointment is still on file, but the remaining balance has not been charged."
    : "Your payment was processed securely through Stripe. Your remaining balance for this appointment should now be updated.";

  let dateTimeText = "";
  let serviceName = booking?.serviceName || "Cleaning service";
  let remainingBalance = null;

  if (booking) {
    const start = toDate(booking.startAt || booking.scheduledAt);
    if (start) {
      const d = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const t = start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      dateTimeText = `${d} • ${t}`;
    }
    remainingBalance = derivePaymentInfo(booking).remainingDue;
  }

  const storedChargeSummary =
    booking && !cancelled ? getNormalizedStripePaymentSummary(booking, mode) : null;
  const chargeSummary =
    redirectGrossAmount > 0 && redirectNetAmount > 0
      ? {
          netAmount: redirectNetAmount,
          feeAmount: redirectFeeAmount,
          grossAmount: redirectGrossAmount,
          feeCollected: redirectFeeAmount > 0,
          source: "redirect_params",
          paymentType: mode,
        }
      : storedChargeSummary && storedChargeSummary.grossAmount > 0
      ? storedChargeSummary
      : null;

  return (
    <div className="min-h-[80vh] bg-[#FFF7FB] py-12 sm:py-16 md:py-20 px-3 sm:px-4">
      <motion.div
        className="max-w-xl mx-auto space-y-6 sm:space-y-7 md:space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back to portal */}
        <div>
          <Button
            variant="outline"
            className="bg-white border-plum text-plum hover:bg-plum/5 rounded-full flex items-center gap-2 text-sm"
            onClick={() => navigate("/portal")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-plum/60">
            Payment confirmation
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-plum">{title}</h1>
          <p className="text-xs sm:text-sm md:text-base text-plum/75 max-w-xl mx-auto">
            {description}
          </p>
        </header>

        <Card className="bg-white border-plum/10 shadow-sm">
          <CardHeader className="flex flex-col items-center text-center gap-2 px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-plum/5 mb-1">
              {cancelled ? (
                <XCircle className="w-7 h-7 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              )}
            </div>
            <CardTitle className="text-plum text-sm sm:text-base md:text-lg">
              {cancelled
                ? "Stripe payment cancelled"
                : "Stripe payment completed"}
            </CardTitle>
            {!cancelled && (
              <p className="text-xs text-plum/70">
                A receipt from Stripe or your card provider may appear
                separately from Sanchez Services email notifications.
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-plum/80 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
            {loading && (
              <p className="text-xs text-plum/60 text-center">
                Loading appointment details…
              </p>
            )}

            {error && (
              <p className="text-xs text-rose-700 text-center">{error}</p>
            )}

            {booking && !loading && !error && (
              <>
                <div className="border border-plum/10 rounded-lg p-3 sm:p-4 bg-plum/3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gold flex-shrink-0" />
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-plum/70">
                      Appointment paid
                    </p>
                  </div>
                  <div className="text-xs sm:text-sm text-plum">
                    <span className="font-semibold">
                      {serviceName}
                    </span>
                    {dateTimeText && (
                      <span className="text-plum/70"> • {dateTimeText}</span>
                    )}
                  </div>
                  {remainingBalance != null && (
                    <p className="text-[11px] sm:text-xs text-plum/70">
                      Updated remaining balance on file:{" "}
                      <span className="font-semibold">
                        ${remainingBalance.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>

                {!cancelled && chargeSummary && (
                  <div className="border border-gold/20 rounded-lg p-3 sm:p-4 bg-gold/5 space-y-2">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-plum/70">
                      Card charge breakdown
                    </p>
                    <div className="flex justify-between gap-4 text-xs sm:text-sm">
                      <span>{mode === "remaining_due" ? "Service balance" : "Service deposit"}</span>
                      <span className="font-medium text-plum">
                        ${Number(chargeSummary.netAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs sm:text-sm">
                      <span>Processing fee</span>
                      <span className="font-medium text-plum">
                        {chargeSummary.feeStatus === "unknown"
                          ? "Unknown"
                          : `$${Number(chargeSummary.feeAmount || 0).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs sm:text-sm font-semibold text-plum border-t border-gold/20 pt-2">
                      <span>Total charged</span>
                      <span>
                        {chargeSummary.feeStatus === "unknown"
                          ? "Unknown"
                          : `$${Number(chargeSummary.grossAmount || 0).toFixed(2)}`}
                      </span>
                    </div>
                    {chargeSummary.feeStatus === "not_collected" && chargeSummary.source === "legacy_no_fee_inferred" && (
                      <p className="text-[11px] text-plum/70">
                        No processing fee was collected for this legacy card payment.
                      </p>
                    )}
                    {chargeSummary.feeStatus === "unknown" && (
                      <p className="text-[11px] text-plum/70">
                        Fee details are unavailable for this payment record.
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[11px] sm:text-xs text-plum/70 space-y-1">
                  <p>
                    You can review this appointment and download an invoice any
                    time from the{" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => navigate("/payment-center")}
                    >
                      Payment Center
                    </button>{" "}
                    in your client portal.
                  </p>
                </div>
              </>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/payment-center")}
              >
                View Payment Center
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-plum text-white hover:bg-plum/90"
                onClick={() => navigate("/portal")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentConfirmationPage;
