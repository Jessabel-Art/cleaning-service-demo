import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusPill from "./components/StatusPill";
import { demoClients } from "@/data/demoClients";
import { getDemoAppointmentsByClientId } from "@/data/demoAppointments";
import { getDemoInvoicesByClientId } from "@/data/demoInvoices";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClientBookingsView() {
  const [search] = useSearchParams();
  const clientId = search.get("clientId");
  const client = useMemo(
    () =>
      demoClients.find((item) => item.id === clientId) ||
      demoClients.find((item) => item.email === search.get("email")) ||
      demoClients[0],
    [clientId, search]
  );

  const appointments = useMemo(
    () => getDemoAppointmentsByClientId(client.id),
    [client.id]
  );
  const invoices = useMemo(() => getDemoInvoicesByClientId(client.id), [client.id]);

  return (
    <section className="min-h-screen bg-[#F7F7F7] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <Button asChild variant="outline" className="border-plum text-plum">
          <Link to="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to admin
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold text-plum">{client.name}</h1>
          <p className="text-sm text-plum/70">{client.addressSummary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Appointments" value={appointments.length} />
          <Metric label="Invoices" value={invoices.length} />
          <Metric
            label="Total billed"
            value={money(invoices.reduce((sum, invoice) => sum + invoice.total, 0))}
          />
        </div>

        <Card className="bg-white border-plum/10">
          <CardHeader>
            <CardTitle className="text-plum">Appointment history</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-plum/60 border-b border-plum/10">
                <tr>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Service</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4 text-right">Total</th>
                  <th className="py-3 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plum/10">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDate(appointment.startAt)}</td>
                    <td className="py-3 pr-4 text-plum">{appointment.serviceName}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={appointment.status} />
                    </td>
                    <td className="py-3 pr-4 text-right text-plum">{money(appointment.total)}</td>
                    <td className="py-3 pr-4 text-plum/70">{appointment.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white border border-plum/10 p-4">
      <p className="text-xs uppercase tracking-wide text-plum/50">{label}</p>
      <p className="text-xl font-semibold text-plum">{value}</p>
    </div>
  );
}
