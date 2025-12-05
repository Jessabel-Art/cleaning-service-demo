// src/components/portal/PastBookings.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock } from "lucide-react";

function formatDate(tsLike) {
  try {
    if (!tsLike) return "TBD";
    const d = tsLike?.toDate ? tsLike.toDate() : new Date(tsLike);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "TBD";
  }
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function statusToken(label) {
  const map = {
    Pending: "bg-amber-100 text-amber-800 border-amber-200",
    Scheduled: "bg-sky-100 text-sky-800 border-sky-200",
    Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Completed: "bg-neutral-200 text-neutral-800 border-neutral-300",
    Declined: "bg-rose-100 text-rose-800 border-rose-200",
    Canceled: "bg-rose-100 text-rose-800 border-rose-200",
    Refunded: "bg-purple-100 text-purple-800 border-purple-200",
    Expired: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };
  return map[label] || "bg-plum/10 text-plum border-plum/20";
}

/**
 * PastBookings
 *
 * Props:
 * - bookings: array of normalized bookings
 *   expected fields: id, date, endAt, total, friendly, service, rawStatus
 * - loading: boolean
 * - onReview(booking)
 */
export default function PastBookings({ bookings = [], loading = false, onReview }) {
  const now = new Date();

  const renderSkeletonRow = (key) => (
    <tr key={key} className="border-b last:border-0 animate-pulse">
      <td className="py-3 pr-4">
        <div className="h-4 w-24 bg-plum/10 rounded" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-32 bg-plum/10 rounded" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-5 w-20 bg-plum/10 rounded-full" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-16 bg-plum/10 rounded" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-24 bg-plum/10 rounded" />
      </td>
    </tr>
  );

  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-plum/70" />
          <div>
            <CardTitle className="text-plum text-lg md:text-xl">
              Completed Appointments
            </CardTitle>
            <p className="text-xs text-plum/60 mt-0.5">
              View your past cleanings and leave feedback for Sterling.
            </p>
          </div>
        </div>

        {!loading && bookings.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-plum/5 px-3 py-1 text-xs text-plum/75 border border-plum/10">
            {bookings.length} completed&nbsp;
            {bookings.length === 1 ? "appointment" : "appointments"}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-plum/70 border-b bg-plum/5/40">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => renderSkeletonRow(i))
                : bookings.length
                ? bookings.map((b, idx) => {
                    const end = b.endAt?.toDate
                      ? b.endAt.toDate()
                      : b.endAt
                      ? new Date(b.endAt)
                      : null;

                    const canReview =
                      end && end < now && typeof onReview === "function";

                    const orderCode = `CI-${b.id.slice(0, 5).toUpperCase()}`;

                    return (
                      <tr
                        key={b.id}
                        className={`border-b last:border-0 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-plum/5/40"
                        } hover:bg-plum/5`}
                      >
                        {/* Order */}
                        <td className="py-3 pr-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 rounded bg-plum/5 text-plum font-mono text-xs md:text-sm border border-plum/10">
                              {orderCode}
                            </span>
                            {b.service && (
                              <span className="text-[11px] text-plum/70 truncate max-w-[180px]">
                                {b.service}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 pr-4 text-plum/90 align-top">
                          {formatDate(b.date)}
                        </td>

                        {/* Status pill */}
                        <td className="py-3 pr-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${statusToken(
                              b.friendly
                            )}`}
                          >
                            {b.friendly}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3 pr-4 text-plum align-top">
                          {formatMoney(b.total)}
                        </td>

                        {/* Feedback */}
                        <td className="py-3 pr-4 align-top">
                          {canReview ? (
                            <button
                              type="button"
                              className="text-gold inline-flex items-center gap-1 text-xs md:text-sm hover:underline"
                              onClick={() => onReview(b)}
                            >
                              <Star className="w-4 h-4" />
                              Leave review
                            </button>
                          ) : (
                            <span className="text-plum/50 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-plum/70"
                    >
                      No completed appointments yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-plum/10 bg-plum/5 p-3 animate-pulse space-y-2"
              >
                <div className="h-4 w-32 bg-plum/10 rounded" />
                <div className="h-4 w-40 bg-plum/10 rounded" />
                <div className="h-4 w-20 bg-plum/10 rounded" />
              </div>
            ))
          ) : bookings.length ? (
            bookings.map((b) => {
              const end = b.endAt?.toDate
                ? b.endAt.toDate()
                : b.endAt
                ? new Date(b.endAt)
                : null;

              const canReview =
                end && end < now && typeof onReview === "function";

              const orderCode = `CI-${b.id.slice(0, 5).toUpperCase()}`;

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-plum/10 bg-white p-3 shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-plum/60 uppercase tracking-wide">
                        {orderCode}
                      </p>
                      <p className="text-sm font-semibold text-plum">
                        {b.service || "Cleaning service"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${statusToken(
                        b.friendly
                      )}`}
                    >
                      {b.friendly}
                    </span>
                  </div>

                  <p className="text-xs text-plum/70">
                    {formatDate(b.date)} ·{" "}
                    <span className="font-medium">
                      {formatMoney(b.total)}
                    </span>
                  </p>

                  <div className="flex items-center justify-between mt-1">
                    {canReview ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-gold/60 text-gold hover:bg-gold/5 h-7 px-2 text-xs"
                        onClick={() => onReview(b)}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    ) : (
                      <span className="text-[11px] text-plum/50">
                        Feedback not available
                      </span>
                    )}
                    <span className="text-[11px] text-plum/50">
                      Completed cleaning
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 p-4 text-center text-sm text-plum/70">
              Once you&apos;ve had your first cleaning, your history will
              appear here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
