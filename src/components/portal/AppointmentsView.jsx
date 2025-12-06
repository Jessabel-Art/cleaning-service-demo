// src/components/portal/AppointmentsView.jsx
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import UpcomingBookings from "@/components/portal/UpcomingBookings";
import PastBookings from "@/components/portal/PastBookings";

function CancellationPolicyCard({ cancellationWindowHours = 48 }) {
  return (
    <div className="rounded-2xl border border-plum/10 bg-white px-4 py-3 shadow-sm mb-4">
      <p className="text-xs font-semibold text-plum flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-800 text-[11px]">
          i
        </span>
        Cancellation policy
      </p>
      <p className="mt-1 text-xs text-plum/75">
        You can cancel or reschedule your appointment up to{" "}
        <span className="font-semibold">
          {cancellationWindowHours} hours
        </span>{" "}
        before the scheduled start time. After this window, your deposit
        will be forfeited for new-client bookings.
      </p>
    </div>
  );
}

/**
 * AppointmentsView
 *
 * Props:
 * - upcomingBookings: array
 * - completedBookings: array
 * - loadingUpcoming: boolean
 * - loadingCompleted?: boolean (not currently used, but here if you need it)
 * - isRepeatClient: boolean
 * - onUpcomingAction: ({ type, booking }) => void
 * - onViewPayments?: (booking) => void
 * - depositAmount?: number (default 50)
 * - cancellationWindowHours?: number (default 48)
 */
export default function AppointmentsView({
  upcomingBookings = [],
  completedBookings = [],
  loadingUpcoming = false,
  loadingCompleted = false, // reserved if you add a skeleton for past
  isRepeatClient = false,
  onUpcomingAction,
  onViewPayments,
  depositAmount = 50,
  cancellationWindowHours = 48,
}) {
  return (
    <section className="space-y-4">
      <CancellationPolicyCard
        cancellationWindowHours={cancellationWindowHours}
      />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-plum/5 border border-plum/10 rounded-full p-1 mb-4">
          <TabsTrigger
            value="upcoming"
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-plum data-[state=active]:shadow-sm text-xs sm:text-sm px-4 py-1.5"
          >
            Upcoming Appointments
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-plum data-[state=active]:shadow-sm text-xs sm:text-sm px-4 py-1.5"
          >
            Completed Appointments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          <UpcomingBookings
            bookings={upcomingBookings}
            loading={loadingUpcoming}
            onAction={onUpcomingAction}
            onViewPayments={onViewPayments}
            depositAmount={depositAmount}
            isRepeatClient={isRepeatClient}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <PastBookings
            bookings={completedBookings}
            loading={loadingCompleted}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
