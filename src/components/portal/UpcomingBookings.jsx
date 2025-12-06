// src/components/portal/UpcomingBookings.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Info } from "lucide-react";

/** Local date helpers */
function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  return new Date(tsLike);
}

function formatDate(tsLike) {
  const d = toDate(tsLike);
  if (!d || Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(tsLike) {
  const d = toDate(tsLike);
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const CANCELLATION_WINDOW_HOURS = 48;

export default function UpcomingBookings({
  bookings = [],
  loading = false,
  onAction,
  onViewPayments,
  depositAmount = 50,
  isRepeatClient = false, // NEW: used for deposit + cancellation messaging
}) {
  const hasBookings = bookings && bookings.length > 0;
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const handleAction = (type, booking) => {
    if (typeof onAction === "function") {
      onAction({ type, booking });
    }
  };

  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-plum/70" />
          <div>
            <CardTitle className="text-plum text-lg md:text-xl">
              Upcoming Appointments
            </CardTitle>
            <p className="text-xs text-plum/60 mt-0.5">
              See what&apos;s scheduled next and manage your upcoming visits.
            </p>
          </div>
        </div>

        {hasBookings && (
          <span className="inline-flex items-center rounded-full bg-plum/5 px-3 py-1 text-xs text-plum/75 border border-plum/10">
            {bookings.length} upcoming&nbsp;
            {bookings.length === 1 ? "appointment" : "appointments"}
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deposit / repeat-client info banner */}
        {hasBookings && (
          isRepeatClient ? (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-900">
              <Info className="w-4 h-4 mt-0.5" />
              <p>
                <span className="font-semibold">Great news!</span>{" "}
                Because you&apos;re a returning client, deposits are no longer
                required for your appointments.
              </p>
            </div>
          ) : depositAmount > 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
              <Info className="w-4 h-4 mt-0.5" />
              <p>
                An{" "}
                <span className="font-semibold">
                  ${Number(depositAmount).toFixed(0)} non-refundable deposit
                </span>{" "}
                is required to secure your first cleaning. Check your Payment
                &amp; Deposit Info section for details.
              </p>
            </div>
          ) : null
        )}

        {loading ? (
          // Skeleton list
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-plum/10 bg-plum/5 p-3 animate-pulse space-y-2"
              >
                <div className="h-4 w-40 bg-plum/10 rounded" />
                <div className="h-4 w-32 bg-plum/10 rounded" />
                <div className="h-4 w-24 bg-plum/10 rounded" />
              </div>
            ))}
          </div>
        ) : hasBookings ? (
          <div className="space-y-3">
            {bookings.map((b) => {
              const depositDue = Number(
                b.depositDue != null ? b.depositDue : depositAmount
              );

              const startDate = toDate(b.startAt || b.date);
              let cancelMessage = null;

              if (
                startDate &&
                depositAmount > 0 &&
                !isRepeatClient // only meaningful when deposits exist
              ) {
                const freeCancelUntil = new Date(
                  startDate.getTime() -
                    CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000
                );
                const now = new Date();

                if (now <= freeCancelUntil) {
                  cancelMessage = `Free to cancel until ${freeCancelUntil.toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`;
                } else {
                  cancelMessage =
                    "Deposit will be forfeited if this appointment is cancelled.";
                }
              }

              const showDepositRequired = depositDue > 0 && !isRepeatClient;

              const isConfirming = confirmCancelId === b.id;

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-plum/10 bg-white hover:bg-plum/5 transition-colors"
                >
                  <div className="p-3 md:p-4 space-y-2 text-sm">
                    {/* Top row: service + status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-plum">
                        {b.service || "Cleaning appointment"}
                      </div>
                      {b.friendly && (
                        <span className="px-2 py-1 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {b.friendly}
                        </span>
                      )}
                    </div>

                    {/* Date / time */}
                    <div className="text-plum/80">
                      {formatDate(b.date)}{" "}
                      {formatTime(b.date) && <>· {formatTime(b.date)}</>}
                    </div>

                    {/* Total */}
                    <div className="text-plum/80">
                      Total:{" "}
                      <span className="font-medium">
                        {money(b.total)}
                      </span>
                    </div>

                    {/* Cancellation window badge (new clients only) */}
                    {cancelMessage && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-900/90 bg-amber-50/70 border border-amber-100 rounded-md px-2 py-1">
                        <Info className="w-3 h-3" />
                        <span>{cancelMessage}</span>
                      </p>
                    )}

                    {/* Per-appointment deposit info */}
                    {showDepositRequired && (
                      <div className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        A deposit of{" "}
                        <span className="font-semibold">
                          {money(depositDue)}
                        </span>{" "}
                        is required to secure this appointment.
                      </div>
                    )}

                    {isRepeatClient && depositDue > 0 && (
                      <div className="mt-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        As a returning client, you don&apos;t need to send a
                        deposit for this appointment.
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 flex flex-wrap gap-2 items-center">
                      {!isConfirming && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-plum text-plum hover:bg-plum/5"
                            onClick={() => handleAction("view", b)}
                          >
                            View details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-plum/40 text-plum hover:bg-plum/5"
                            onClick={() => handleAction("reschedule", b)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmCancelId(b.id)}
                          >
                            Cancel
                          </Button>
                          {onViewPayments && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-plum/70 hover:text-plum hover:bg-transparent underline-offset-2 hover:underline"
                              onClick={() => onViewPayments(b)}
                            >
                              View payments
                            </Button>
                          )}
                        </>
                      )}

                      {/* Inline confirmation "modal" */}
                      {isConfirming && (
                        <div className="w-full mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span>
                            Are you sure you want to cancel this appointment?
                            This cannot be undone.
                          </span>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-100"
                              onClick={() => {
                                handleAction("cancel", b);
                                setConfirmCancelId(null);
                              }}
                            >
                              Yes, cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-plum/80 hover:text-plum hover:bg-plum/10"
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep appointment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 p-4 text-center text-sm text-plum/70">
            You don&apos;t have any upcoming appointments yet.
            <div className="mt-3">
              <Button
                className="bg-gold text-white hover:bg-gold/90 rounded-full"
                size="sm"
                onClick={() => {
                  if (onAction) {
                    onAction({ type: "book-new" });
                  }
                }}
              >
                Book your next cleaning
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
