import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CreditCard, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import ClientDashboardHome from "@/components/portal/ClientDashboardHome";
import AppointmentsView from "@/components/portal/AppointmentsView";
import ProfileSettingsPanel from "@/components/portal/ProfileSettingsPanel";
import PaymentCenterPage from "@/pages/PaymentCenterPage";
import { getAllDemoAppointments } from "@/data/demoRuntime";
import { getDemoInvoiceByAppointmentId } from "@/data/demoInvoices";
import { demoClients } from "@/data/demoClients";

const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: "$cleanprodemo",
  zelle: "(000) 000-0000 (recipient: CleanPro Demo)",
  notes: "Please include your full name in the payment note. (Demo only.)",
};

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function friendlyStatus(raw) {
  const status = String(raw || "pending").toLowerCase();
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ClientPortalPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [section, setSection] = useState("dashboard");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const demoClient = demoClients[0];

  const appointments = useMemo(
    () =>
      getAllDemoAppointments()
        .filter((appointment) =>
          user?.demoRole === "client"
            ? appointment.clientId === demoClient.id || appointment.clientId === "client-demo-new"
            : true
        )
        .map((appointment) => ({
          ...appointment,
          date: appointment.startAt,
          friendly: friendlyStatus(appointment.status),
          rawStatus: appointment.status,
        })),
    [user?.demoRole, demoClient.id]
  );

  const now = new Date();
  const upcomingBookings = appointments.filter((appointment) => {
    const date = toDate(appointment.startAt);
    return date && date >= now && !["completed", "cancelled", "declined"].includes(appointment.status);
  });
  const completedBookings = appointments.filter((appointment) => {
    const date = toDate(appointment.startAt);
    return appointment.status === "completed" || appointment.status === "cancelled" || (date && date < now);
  });

  const contactProfile = {
    name: user?.displayName || demoClient.name,
    phone: demoClient.phone,
  };
  const addresses = [
    {
      id: "demo-address",
      type: "home",
      street: demoClient.addressLine1,
      city: demoClient.city,
      state: demoClient.state,
      zip: demoClient.zip,
      isDefault: true,
    },
  ];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: CalendarDays },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "payments", label: "Payments", icon: CreditCard },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-plum">
              Client Dashboard
            </h1>
            <p className="text-sm text-plum/70">
              Welcome {contactProfile.name}. This portal uses local demo data only.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-plum text-plum"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="bg-white border border-plum/10 rounded-2xl p-3 h-fit">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-plum text-white"
                        : "text-plum hover:bg-plum/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main>
            {section === "dashboard" && (
              <ClientDashboardHome
                upcomingBookings={upcomingBookings}
                completedBookings={completedBookings}
                allBookings={appointments}
                onGoToAppointments={() => setSection("appointments")}
                onGoToBook={() => navigate("/book")}
                primaryAddress={addresses[0]}
              />
            )}

            {section === "appointments" && (
              <AppointmentsView
                upcomingBookings={upcomingBookings}
                completedBookings={completedBookings}
                loadingUpcoming={false}
                loadingCompleted={false}
                isRepeatClient={completedBookings.length > 0}
                onUpcomingAction={({ type, booking }) => {
                  if (type === "book-new") navigate("/book");
                  if (type === "reschedule") navigate(`/book?bookingId=${booking.id}`);
                }}
                onViewPayments={(booking) => {
                  const invoice = booking?.id
                    ? getDemoInvoiceByAppointmentId(booking.id)
                    : null;
                  setSelectedInvoiceId(invoice?.id || "");
                  setSection("payments");
                }}
                depositAmount={PAYMENT_INFO.depositAmount}
              />
            )}

            {section === "profile" && (
              <ProfileSettingsPanel
                profile={contactProfile}
                addresses={addresses}
                savingContact={false}
                preferences={{
                  fragrancePreference: "fragrance_free",
                  focusPreference: "balanced",
                  petPreference: "dogs",
                }}
                preferredContactMethod={demoClient.preferredContactMethod}
                email={demoClient.email}
                onSaveContact={() => {}}
                onOpenAddAddress={() => {}}
                onOpenEditAddress={() => {}}
                onDeleteAddress={() => {}}
                onSetDefaultAddress={() => {}}
                onSendReset={() => {}}
                paymentInfo={PAYMENT_INFO}
                onOpenPaymentCenter={() => setSection("payments")}
              />
            )}

            {section === "payments" && <PaymentCenterPage initialInvoiceId={selectedInvoiceId} />}
          </main>
        </div>
      </div>
    </div>
  );
}
