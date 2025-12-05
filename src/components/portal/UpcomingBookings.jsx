// src/components/portal/UpcomingBookings.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Info } from "lucide-react";

export default function UpcomingBookings({
  bookings = [],
  loading = false,
  onAction,
  onViewPayments,
  depositAmount = 50,
}) {
  const hasBookings = bookings && bookings.length > 0;

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
        {/* Deposit info banner (if using deposits) */}
        {depositAmount > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
            <Info className="w-4 h-4 mt-0.5" />
            <p>
              A{" "}
              <span className="font-semibold">
                ${Number(depositAmount).toFixed(0)} non-refundable deposit
              </span>{" "}
              may be required for some appointments. Check your Payment &amp;
              Deposit Info section for details.
            </p>
          </div>
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
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-plum/10 bg-white hover:bg-plum/5 transition-colors"
              >
              </div>
            ))}
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
