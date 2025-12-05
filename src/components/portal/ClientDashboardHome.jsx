// src/components/portal/ClientDashboardHome.jsx
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Star,
  DollarSign,
  Clock,
  ArrowRight,
  UserRound,
  MapPin,
} from "lucide-react";

/** Local date helpers so we don't couple tightly to Firestore everywhere */
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

/**
 * Props:
 * - upcomingBookings: array of booking objects (from upcomingBookings memo)
 * - completedBookings: array of booking objects (from completedBookings memo)
 * - allBookings: array of all bookingsWithFriendly
 * - onGoToAppointments: () => void
 * - onGoToBook: () => void
 * - onGoToContactDetails?: () => void
 * - onGoToAccountDetails?: () => void
 */
export default function ClientDashboardHome({
  upcomingBookings = [],
  completedBookings = [],
  allBookings = [],
  onGoToAppointments,
  onGoToBook,
  onGoToContactDetails,
  onGoToAccountDetails,
}) {
  const {
    nextBooking,
    lastCompleted,
    totalBookings,
    yearBookings,
    totalSpend,
    upcomingPreview,
    highestDepositDue,
  } = useMemo(() => {
    const now = new Date();

    const nextBooking =
      upcomingBookings && upcomingBookings.length > 0
        ? upcomingBookings[0]
        : null;

    const completedSorted = [...(completedBookings || [])].sort((a, b) => {
      const aD = toDate(a.endAt || a.date) || new Date(0);
      const bD = toDate(b.endAt || b.date) || new Date(0);
      return bD - aD;
    });
    const lastCompleted = completedSorted[0] || null;

    const totalBookings = allBookings?.length || 0;

    const thisYear = now.getFullYear();
    const yearBookings =
      allBookings?.filter((b) => {
        const d = toDate(b.date || b.endAt || b.createdAt);
        return d && d.getFullYear() === thisYear;
      }).length || 0;

    const totalSpend = (allBookings || []).reduce(
      (sum, b) => sum + Number(b.total || 0),
      0
    );

    const upcomingPreview = (upcomingBookings || []).slice(0, 3);

    const highestDepositDue = (upcomingBookings || []).reduce(
      (max, b) => Math.max(max, Number(b.depositDue || 0)),
      0
    );

    return {
      nextBooking,
      lastCompleted,
      totalBookings,
      yearBookings,
      totalSpend,
      upcomingPreview,
      highestDepositDue,
    };
  }, [upcomingBookings, completedBookings, allBookings]);

  const handleBook = () => {
    if (typeof onGoToBook === "function") onGoToBook();
  };
  const handleAppointments = () => {
    if (typeof onGoToAppointments === "function") onGoToAppointments();
  };
  const handleContactDetails = () => {
    if (typeof onGoToContactDetails === "function") onGoToContactDetails();
  };
  const handleAccountDetails = () => {
    if (typeof onGoToAccountDetails === "function") onGoToAccountDetails();
  };

  return (
    <section className="space-y-8">
      {/* Dashboard header */}
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-plum/60">
          Client dashboard
        </p>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-plum">
              Your cleaning dashboard
            </h2>
            <p className="text-sm text-plum/75 mt-1">
              See what&apos;s coming up next, your cleaning history, and quick
              actions all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-gold text-white hover:bg-gold/90 rounded-full transition-all duration-200"
              onClick={handleBook}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              Book a cleaning
            </Button>
            <Button
              variant="outline"
              className="border-plum text-plum hover:bg-plum/5 rounded-full transition-all duration-200"
              onClick={handleAppointments}
            >
              View all appointments
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="This year"
          icon={Clock}
          value={yearBookings}
          helper={`cleaning${yearBookings === 1 ? "" : "s"} completed in ${
            new Date().getFullYear()
          }`}
        />

        <MetricCard
          label="Lifetime value"
          icon={DollarSign}
          value={money(totalSpend)}
          helper={`across ${totalBookings} booking${
            totalBookings === 1 ? "" : "s"
          }`}
        />

        <MetricCard
          label="Feedback"
          icon={Star}
          iconClass="text-gold"
          value="5.0"
          helper="Reviews help Sterling grow. You'll see your rating here."
        />
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon={CalendarDays}
          title="Upcoming visits"
          body="View, reschedule, or cancel upcoming appointments."
          cta="Manage appointments"
          onClick={handleAppointments}
        />
        <QuickActionCard
          icon={MapPin}
          title="Service address"
          body="Keep your home address up to date for smooth arrivals."
          cta="Update contact details"
          onClick={handleContactDetails}
        />
        <QuickActionCard
          icon={UserRound}
          title="Account & security"
          body="Change email, reset password, and manage your account."
          cta="Manage account"
          onClick={handleAccountDetails}
        />
      </div>

      {/* Bottom row: Next & Last cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] gap-4">
        {/* Next booking / upcoming snapshot */}
        <div className="bg-white border border-plum/10 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-plum">
                  Next appointment
                </h3>
                <p className="text-xs text-plum/70">
                  Your upcoming confirmed cleaning.
                </p>
              </div>
            </div>
          </div>

          {nextBooking ? (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-plum">
                    {nextBooking.service}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {nextBooking.friendly}
                  </span>
                </div>
                <div className="text-plum/80">
                  {formatDate(nextBooking.date)}{" "}
                  {formatTime(nextBooking.date) && (
                    <>· {formatTime(nextBooking.date)}</>
                  )}
                </div>
                <div className="text-plum/80">
                  Total:{" "}
                  <span className="font-medium">
                    {money(nextBooking.total)}
                  </span>
                </div>
                {nextBooking.depositDue > 0 && (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                    A deposit of{" "}
                    <span className="font-semibold">
                      {money(nextBooking.depositDue)}
                    </span>{" "}
                    is required to secure this appointment.
                  </div>
                )}
              </div>

              {/* Mini upcoming list */}
              {upcomingPreview?.length > 1 && (
                <div className="mt-4 border-t border-plum/10 pt-3">
                  <p className="text-xs font-medium text-plum/70 mb-2">
                    Also coming up
                  </p>
                  <div className="space-y-2">
                    {upcomingPreview.slice(1).map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-xs rounded-lg border border-plum/10 bg-plum/5 px-3 py-2"
                      >
                        <div className="truncate">
                          <p className="font-medium text-plum truncate">
                            {b.service}
                          </p>
                          <p className="text-plum/70">
                            {formatDate(b.date)}{" "}
                            {formatTime(b.date) && (
                              <>· {formatTime(b.date)}</>
                            )}
                          </p>
                        </div>
                        <span className="text-plum/60 ml-3 whitespace-nowrap">
                          {money(b.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-plum text-plum hover:bg-plum/5 transition-all duration-200"
                  onClick={handleAppointments}
                >
                  Manage appointments
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-plum/70">
              You don&apos;t have any upcoming appointments yet.
              <div className="mt-3">
                <Button
                  size="sm"
                  className="bg-gold text-white hover:bg-gold/90 rounded-full transition-all duration-200"
                  onClick={handleBook}
                >
                  Book your next cleaning
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Last completed + deposit summary */}
        <div className="space-y-4">
          <div className="bg-white border border-plum/10 rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-plum" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-plum">
                    Most recent cleaning
                  </h3>
                  <p className="text-xs text-plum/70">
                    Quick access to your last service.
                  </p>
                </div>
              </div>
            </div>

            {lastCompleted ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-plum">
                    {lastCompleted.service}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100">
                    {lastCompleted.friendly}
                  </span>
                </div>
                <div className="text-plum/80">
                  {formatDate(lastCompleted.date)}
                </div>
                <div className="text-plum/80">
                  Total:{" "}
                  <span className="font-medium">
                    {money(lastCompleted.total)}
                  </span>
                </div>
                <p className="text-xs text-plum/70 mt-1">
                  Loved the service? Re-book the same type or leave a review
                  from the appointments tab.
                </p>

                <div className="pt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-plum text-plum hover:bg-plum/5 transition-all duration-200"
                    onClick={handleAppointments}
                  >
                    View in history
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-white hover:bg-gold/90 transition-all duration-200"
                    onClick={handleBook}
                  >
                    Book again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-plum/70">
                Once you&apos;ve had your first cleaning, you&apos;ll see a
                quick summary here.
              </div>
            )}
          </div>

          {/* Deposit snapshot */}
          {highestDepositDue > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm text-xs text-amber-900">
              <p className="font-semibold mb-1">
                Upcoming deposit reminder
              </p>
              <p className="mb-1">
                At least one upcoming appointment has a deposit due of up to{" "}
                <span className="font-bold">
                  {money(highestDepositDue)}
                </span>
                .
              </p>
              <p className="text-amber-900/80">
                Check your payment instructions below or in the Payment &
                Deposit Info section.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------ Small presentational pieces ------------ */

function MetricCard({ label, icon: Icon, value, helper, iconClass }) {
  return (
    <div className="group bg-white border border-plum/10 rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-plum/60">
          {label}
        </span>
        <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center">
          <Icon
            className={`w-4 h-4 text-plum/70 ${iconClass ? iconClass : ""}`}
          />
        </div>
      </div>
      <div className="text-2xl font-semibold text-plum">{value}</div>
      <p className="text-xs text-plum/70 mt-1">{helper}</p>
    </div>
  );
}

function QuickActionCard({ icon: Icon, title, body, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-white border border-plum/10 rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
          <Icon className="w-4 h-4 text-plum/80 group-hover:text-gold transition-colors" />
        </div>
        <p className="text-sm font-semibold text-plum">{title}</p>
      </div>
      <p className="text-xs text-plum/75 mb-3">{body}</p>
      <div className="inline-flex items-center text-xs font-medium text-gold group-hover:underline">
        {cta}
        <ArrowRight className="w-3 h-3 ml-1" />
      </div>
    </button>
  );
}
