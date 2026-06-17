import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, DollarSign, Home, Info, Sparkles } from "lucide-react";
import CalendarExportButtons from "@/components/calendar/CalendarExportButtons";
import { getDemoAppointmentById } from "@/data/demoAppointments";
import { getDemoInvoiceByAppointmentId } from "@/data/demoInvoices";
import { getPendingDemoBooking } from "@/data/demoRuntime";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "TBD", time: "" };
  return {
    date: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

export default function ConfirmationPage() {
  const [search] = useSearchParams();
  const bookingId = search.get("bookingId");

  const { appointment, invoice } = useMemo(() => {
    const pending = getPendingDemoBooking();
    if (pending?.appointment?.id === bookingId) {
      return {
        appointment: pending.appointment,
        invoice: pending.invoice,
      };
    }

    const demoAppointment = getDemoAppointmentById(bookingId);
    return {
      appointment: demoAppointment,
      invoice: demoAppointment
        ? getDemoInvoiceByAppointmentId(demoAppointment.id)
        : null,
    };
  }, [bookingId]);

  const start = formatDateTime(appointment?.startAt);
  const end = formatDateTime(appointment?.endAt);
  const address =
    appointment?.address?.full ||
    appointment?.addressLine ||
    [appointment?.address?.line1, appointment?.address?.city, appointment?.address?.state, appointment?.address?.zip]
      .filter(Boolean)
      .join(", ");

  if (!appointment) {
    return (
      <div className="min-h-[70vh] bg-[#F7F7F7] flex items-center justify-center px-4">
        <Card className="max-w-lg w-full bg-white border-plum/10">
          <CardHeader>
            <CardTitle className="text-plum">Demo booking not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-plum/80">
            <p>This confirmation link does not match the local demo data.</p>
            <Button asChild className="bg-gold hover:bg-gold/90 text-white rounded-full">
              <Link to="/book">Create a demo booking</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] bg-[#F7F7F7] px-3 sm:px-4 py-12 md:py-16">
      <motion.div
        className="max-w-4xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-bold text-plum">
            Demo Booking Confirmed
          </h1>
          <p className="text-plum/75 mt-2">
            This is a local frontend demo. No real booking, account, or payment was created.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-plum/10 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-plum flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" />
                Appointment details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-plum/85">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Detail label="Service" value={appointment.serviceName || appointment.service} />
                <Detail label="Status" value={appointment.friendly || appointment.status} />
                <Detail label="Date" value={start.date} />
                <Detail label="Time" value={`${start.time}${end.time ? ` - ${end.time}` : ""}`} />
                <Detail label="Client" value={appointment.clientName || appointment.contact?.name} />
                <Detail label="Booking ID" value={appointment.id} />
              </div>

              <div className="rounded-xl border border-plum/10 bg-plum/5 p-3 flex gap-2">
                <Home className="w-4 h-4 text-plum mt-0.5" />
                <div>
                  <p className="font-semibold text-plum">Service address</p>
                  <p>{address || "Address on file"}</p>
                </div>
              </div>

              {appointment.notes && (
                <div className="rounded-xl border border-plum/10 bg-white p-3">
                  <p className="font-semibold text-plum">Notes</p>
                  <p>{appointment.notes}</p>
                </div>
              )}

              <CalendarExportButtons
                booking={{
                  id: appointment.id,
                  service: appointment.serviceName,
                  startAt: appointment.startAt,
                  endAt: appointment.endAt,
                  address,
                  notes: appointment.notes,
                }}
              />
            </CardContent>
          </Card>

          <Card className="bg-white border-plum/10">
            <CardHeader>
              <CardTitle className="text-plum flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Demo invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Detail label="Invoice" value={invoice?.invoiceNumber || "Pending"} />
              <Detail label="Subtotal" value={money(invoice?.subtotal ?? appointment.total)} />
              {invoice?.discount ? <Detail label="Discount" value={`-${money(invoice.discount)}`} /> : null}
              <Detail label="Total" value={money(invoice?.total ?? appointment.total)} />
              <Detail label="Paid" value={money(invoice?.paidAmount ?? appointment.paidAmount)} />
              <Detail label="Amount due" value={money(invoice?.amountDue ?? appointment.total)} />

              <div className="rounded-xl bg-[#EEF5FB] border border-[#3A9FDF]/20 p-3 text-xs text-[#0B283D] flex gap-2">
                <Info className="w-4 h-4 mt-0.5" />
                <p>No payment is processed in this demo environment.</p>
              </div>

              <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                <Link to="/portal">Open Client Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-plum text-plum rounded-full">
                <Link to="/book">Book another demo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-plum/55">{label}</p>
      <p className="font-medium text-plum">{value || "TBD"}</p>
    </div>
  );
}
