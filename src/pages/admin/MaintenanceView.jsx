import React from "react";
import { CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoClients } from "@/data/demoClients";
import { demoAppointments } from "@/data/demoAppointments";
import { demoInvoices } from "@/data/demoInvoices";
import { demoCalendarEvents } from "@/data/demoCalendarEvents";

export default function MaintenanceView() {
  const checks = [
    ["Clients loaded locally", demoClients.length],
    ["Appointments loaded locally", demoAppointments.length],
    ["Invoices loaded locally", demoInvoices.length],
    ["Calendar events loaded locally", demoCalendarEvents.length],
  ];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Demo Maintenance</h2>
        <p className="text-sm text-plum/70">
          This environment is self-contained. There are no backend repair jobs,
          seeders, sweepers, or database mutations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white border-plum/10">
          <CardHeader>
            <CardTitle className="text-plum flex items-center gap-2">
              <Database className="w-5 h-5 text-gold" />
              Local data health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-plum/5 p-3">
                <span className="flex items-center gap-2 text-plum">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {label}
                </span>
                <span className="font-semibold text-plum">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border-plum/10">
          <CardHeader>
            <CardTitle className="text-plum flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold" />
              Backend status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-plum/80">
            <p>backend services: disabled for demo.</p>
            <p>local data reads/writes: disabled for demo routes.</p>
            <p>Payments: simulated with local invoice data.</p>
            <p>Email delivery: simulated with on-screen messaging.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
