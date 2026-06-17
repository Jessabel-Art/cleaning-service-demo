import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAllDemoAppointments } from "@/data/demoRuntime";

const colors = ["#3A9FDF", "#22c55e", "#eab308", "#06b6d4", "#f97316", "#0B283D"];

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function ReportsView() {
  const appointments = useMemo(() => getAllDemoAppointments(), []);

  const report = useMemo(() => {
    const byService = new Map();
    const byStatus = new Map();
    let revenue = 0;

    appointments.forEach((appointment) => {
      const service = appointment.serviceName || "Other";
      byService.set(service, (byService.get(service) || 0) + Number(appointment.total || 0));
      byStatus.set(appointment.status, (byStatus.get(appointment.status) || 0) + 1);
      if (["confirmed", "completed"].includes(appointment.status)) {
        revenue += Number(appointment.total || 0);
      }
    });

    return {
      revenue,
      average: appointments.length ? revenue / appointments.length : 0,
      byService: Array.from(byService.entries()).map(([name, value]) => ({ name, value })),
      byStatus: Array.from(byStatus.entries()).map(([name, value]) => ({ name, value })),
    };
  }, [appointments]);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Reports</h2>
        <p className="text-sm text-plum/70">
          Local demo reporting calculated from hardcoded appointments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Demo revenue" value={money(report.revenue)} />
        <Metric label="Appointments" value={appointments.length} />
        <Metric label="Average ticket" value={money(report.average)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl bg-white border border-plum/10 p-4">
          <h3 className="font-semibold text-plum mb-4">Revenue by service</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.byService}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <RechartsTooltip formatter={(value) => money(value)} />
                <Bar dataKey="value" fill="#3A9FDF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-plum/10 p-4">
          <h3 className="font-semibold text-plum mb-4">Status mix</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report.byStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {report.byStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
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
