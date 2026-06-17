import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, MapPin, Phone, Sparkles, User } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/contactModel";
import { getDemoAppointmentsByClientId } from "@/data/demoAppointments";
import { getDemoInvoicesByClientId } from "@/data/demoInvoices";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientDetailsModal({ client, onClose }) {
  const navigate = useNavigate();

  const appointments = useMemo(
    () => (client ? getDemoAppointmentsByClientId(client.id) : []),
    [client]
  );
  const invoices = useMemo(
    () => (client ? getDemoInvoicesByClientId(client.id) : []),
    [client]
  );

  if (!client) return null;

  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const nextAppointment = appointments
    .filter((appointment) => new Date(appointment.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];

  return (
    <Dialog open={!!client} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-plum/10 bg-[#F7F7F7]">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-plum text-white flex items-center justify-center text-lg font-semibold">
              {initials(client.name)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-plum">{client.name}</h2>
              <p className="text-sm text-plum/70">Demo client profile</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 grid gap-5 md:grid-cols-[1fr_1.2fr]">
          <section className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={client.email} />
            <InfoRow icon={Phone} label="Phone" value={formatPhoneForDisplay(client.phone)} />
            <InfoRow icon={MapPin} label="Address" value={client.addressSummary} />
            <InfoRow icon={Sparkles} label="Preference" value={client.servicePreference} />
            <div className="rounded-xl border border-plum/10 bg-plum/5 p-3">
              <p className="text-xs uppercase tracking-wide text-plum/50 mb-1">Notes</p>
              <p className="text-sm text-plum/80">{client.notes}</p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Appointments" value={appointments.length} />
              <Metric label="Invoices" value={invoices.length} />
              <Metric label="Revenue" value={money(totalRevenue)} />
            </div>

            <div className="rounded-xl border border-plum/10 overflow-hidden">
              <div className="px-3 py-2 bg-[#EEF5FB] text-sm font-semibold text-[#0B283D]">
                Recent appointments
              </div>
              <div className="divide-y divide-plum/10">
                {appointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="px-3 py-2 text-sm flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-plum">{appointment.serviceName}</p>
                      <p className="text-xs text-plum/60">{formatDate(appointment.startAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-plum">{money(appointment.total)}</p>
                      <p className="text-xs capitalize text-plum/60">{appointment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {nextAppointment && (
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-plum">
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="w-4 h-4" />
                  Next appointment
                </div>
                <p className="mt-1">
                  {nextAppointment.serviceName} on {formatDate(nextAppointment.startAt)}
                </p>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-plum/10 bg-[#F7F7F7]">
          <Button variant="outline" onClick={onClose} className="border-plum text-plum">
            Close
          </Button>
          <Button
            className="bg-gold hover:bg-gold/90 text-white"
            onClick={() =>
              navigate(
                `/admin/client-bookings?clientId=${encodeURIComponent(client.id)}`
              )
            }
          >
            View bookings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-plum/60" />
      <div>
        <p className="text-xs uppercase tracking-wide text-plum/50">{label}</p>
        <p className="text-plum">{value || "--"}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-plum/5 border border-plum/10 p-3">
      <p className="text-xs text-plum/60">{label}</p>
      <p className="font-semibold text-plum">{value}</p>
    </div>
  );
}
