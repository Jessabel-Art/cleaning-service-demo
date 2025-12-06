// src/pages/PaymentCenterPage.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Wallet,
  Info,
  CalendarDays,
  FileText,
  CheckCircle2,
} from "lucide-react";

/* ---------- Local helpers ---------- */

function money(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(tsLike) {
  if (!tsLike) return "TBD";
  const d = tsLike?.toDate ? tsLike.toDate() : new Date(tsLike);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Base skeleton for the Payment & Deposit Center.
 *
 * Props (all optional for now – parent can wire real data later):
 * - paidBookings:      array of bookings that have been paid
 * - upcomingPayments:  array of bookings with deposit or remaining balance due
 * - depositAmount:     number (default 50)
 * - isRepeatClient:    boolean to toggle “no deposit for returning clients”
 * - onDownloadReceipt: (booking) => void – called when user clicks “Download PDF”
 */
export default function PaymentCenterPage({
  paidBookings = [],
  upcomingPayments = [],
  depositAmount = 50,
  isRepeatClient = false,
  onDownloadReceipt,
}) {
  const hasPaid = paidBookings.length > 0;
  const hasUpcoming = upcomingPayments.length > 0;

  return (
    <div className="py-12 md:py-20 px-4 bg-[#FFF7FB]">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-plum/60">
            Client billing
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-plum">
            Payment &amp; Deposit Center
          </h1>
          <p className="text-sm md:text-base text-plum/75 max-w-2xl mx-auto">
            Review deposit rules, see upcoming payments, and access your billing
            history and receipts. Stripe card management will live here once
            it&apos;s connected.
          </p>
        </header>

        {/* Grid: rules + saved methods */}
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr,0.9fr] gap-4">
          {/* Deposit rules */}
          <Card className="border-plum/10 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-2">
              <div className="mt-1">
                <Info className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-plum text-lg">
                  Deposit rules
                </CardTitle>
                <p className="text-xs text-plum/70 mt-1">
                  Clear deposit expectations so there are no surprises on
                  cleaning day.
                </p>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-plum/85 space-y-3">
              <ul className="list-disc list-inside space-y-1">
                {!isRepeatClient && (
                  <li>
                    <span className="font-semibold">
                      New clients: {money(depositAmount)} non-refundable deposit
                    </span>{" "}
                    is required to secure your first appointment.
                  </li>
                )}
                {isRepeatClient && (
                  <li>
                    <span className="font-semibold">
                      Returning clients do not need to pay a deposit.
                    </span>{" "}
                    Your cleanings are reserved without an upfront fee.
                  </li>
                )}
                <li>
                  Deposits are applied toward your total on cleaning day.
                </li>
                <li>
                  Cancellations made inside the agreed cancellation window may
                  result in deposit forfeiture.
                </li>
                <li>
                  Reschedules made within the allowed window automatically move
                  your deposit to the new date.
                </li>
              </ul>

              <div className="mt-2 rounded-lg bg-plum/5 border border-plum/10 px-3 py-2 text-xs text-plum/75">
                Once Stripe is connected, you&apos;ll be able to pay deposits
                and remaining balances directly from this page.
              </div>
            </CardContent>
          </Card>

          {/* Saved payment methods (Stripe later) */}
          <Card className="border-plum/10 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-2">
              <div className="mt-1">
                <CreditCard className="w-5 h-5 text-plum" />
              </div>
              <div>
                <CardTitle className="text-plum text-lg">
                  Saved payment methods
                </CardTitle>
                <p className="text-xs text-plum/70 mt-1">
                  Cards you&apos;ve added for faster checkout.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 px-4 py-5 text-sm text-plum/75 text-center">
                <p className="mb-1 font-medium">No saved cards yet</p>
                <p className="text-xs text-plum/70">
                  Once Stripe is enabled, you&apos;ll be able to add a card
                  here and manage it through the secure customer portal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming payments */}
        <Card className="border-plum/10 shadow-sm">
          <CardHeader className="flex flex-row items-start gap-2">
            <div className="mt-1">
              <Wallet className="w-5 h-5 text-plum" />
            </div>
            <div>
              <CardTitle className="text-plum text-lg">
                Upcoming payments
              </CardTitle>
              <p className="text-xs text-plum/70 mt-1">
                Appointments that require a deposit or have a remaining balance
                due.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {hasUpcoming ? (
              <div className="space-y-2">
                {upcomingPayments.map((b) => {
                  const depositDue = Number(b.depositDue || 0);
                  const remaining =
                    Number(b.total || 0) - Number(b.paid || 0);

                  return (
                    <div
                      key={b.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl border border-plum/10 bg-white px-3 py-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-plum/70" />
                          <span className="font-medium text-plum">
                            {b.service || "Residential Cleaning"}
                          </span>
                        </div>
                        <p className="text-xs text-plum/70 ml-6">
                          {formatDate(b.date)} · Total{" "}
                          <span className="font-semibold">
                            {money(b.total)}
                          </span>
                        </p>
                        <p className="text-xs text-plum/75 ml-6">
                          {depositDue > 0 && remaining > 0 && (
                            <>
                              Deposit due:{" "}
                              <span className="font-semibold">
                                {money(depositDue)}
                              </span>{" "}
                              · Remaining balance:{" "}
                              <span className="font-semibold">
                                {money(remaining)}
                              </span>
                            </>
                          )}
                          {depositDue > 0 && remaining <= 0 && (
                            <>
                              Deposit due:{" "}
                              <span className="font-semibold">
                                {money(depositDue)}
                              </span>
                            </>
                          )}
                          {depositDue <= 0 && remaining > 0 && (
                            <>
                              Remaining balance:{" "}
                              <span className="font-semibold">
                                {money(remaining)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex gap-2 md:justify-end">
                        <Button
                          size="sm"
                          className="bg-gold text-white hover:bg-gold/90 rounded-full"
                          disabled
                        >
                          Pay online (soon)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 px-4 py-5 text-center text-sm text-plum/75">
                No deposits or balances are currently due. You&apos;ll see
                upcoming payments here once a booking requires one.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing history + receipts */}
        <Card className="border-plum/10 shadow-sm">
          <CardHeader className="flex flex-row items-start gap-2">
            <div className="mt-1">
              <FileText className="w-5 h-5 text-plum" />
            </div>
            <div>
              <CardTitle className="text-plum text-lg">
                Billing history &amp; receipts
              </CardTitle>
              <p className="text-xs text-plum/70 mt-1">
                A record of completed, paid appointments. Receipts can be
                downloaded for your records or taxes.
              </p>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {hasPaid ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="text-plum/60 border-b border-plum/10">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Service</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Paid</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidBookings.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b last:border-0 border-plum/10"
                      >
                        <td className="py-2 pr-3 text-plum/85">
                          {formatDate(b.date)}
                        </td>
                        <td className="py-2 pr-3 text-plum/85">
                          {b.service || "Residential Cleaning"}
                        </td>
                        <td className="py-2 pr-3 text-plum/85">
                          {money(b.total)}
                        </td>
                        <td className="py-2 pr-3 text-plum/85">
                          {money(b.paid)}
                        </td>
                        <td className="py-2 pr-3 text-plum/80">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        </td>
                        <td className="py-2 pr-0 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            className="border-plum/40 text-plum hover:bg-plum/5"
                            onClick={() =>
                              onDownloadReceipt && onDownloadReceipt(b)
                            }
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Download PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 px-4 py-5 text-center text-sm text-plum/75">
                Once you&apos;ve completed and paid for a cleaning, your billing
                history and receipts will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
