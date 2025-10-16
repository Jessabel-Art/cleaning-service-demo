import React from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { csvDownload, money, rangePreset } from "./utils";

export function ReportsView() {
  const [rows, setRows] = React.useState([]);
  const [range, setRange] = React.useState("30d"); // 7d | 30d | qtr | year

  React.useEffect(() => {
    const qRef = query(
      collection(db, "bookings"),
      where("status", "in", ["pending","confirmed","declined","completed"]),
      orderBy("scheduledAt", "asc")
    );
    const unsub = onSnapshot(qRef, (snap) => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const view = React.useMemo(() => {
    const { from, to } = rangePreset(range);
    return rows.filter((r) => {
      const d = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
      return d && d >= from && d <= to;
    });
  }, [rows, range]);

  // aggregates
  const totals = React.useMemo(() => {
    let revenue = 0, bookings = 0;
    const byService = new Map();
    const byStatus = new Map();

    for (const r of view) {
      const amt = Number(r.amount ?? r.cost ?? 0);
      revenue += amt;
      bookings++;
      const svc = (r.serviceName ?? r.service ?? "Unknown").toLowerCase();
      byService.set(svc, (byService.get(svc) || 0) + 1);
      const st = (r.status ?? "unknown").toLowerCase();
      byStatus.set(st, (byStatus.get(st) || 0) + 1);
    }

    const topServices = Array.from(byService.entries()).sort((a,b) => b[1]-a[1]).slice(0,5);
    return { revenue, bookings, byStatus: Array.from(byStatus.entries()), topServices };
  }, [view]);

  const exportCsv = () => {
    const header = ["date","status","service","amount","name","email","phone","address","id"];
    const mapped = view.map((r) => {
      const d = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
      return {
        date: d ? d.toISOString() : "",
        status: r.status ?? "",
        service: r.serviceName ?? r.service ?? "",
        amount: String(r.amount ?? r.cost ?? 0),
        name: r.contact?.name ?? r.name ?? "",
        email: r.contact?.email ?? "",
        phone: r.contact?.phone ?? "",
        address: r.address?.line1 ?? "",
        id: r.id
      };
    });
    csvDownload(`report_${range}.csv`, mapped, header);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-plum font-medium">Range</label>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-2 rounded-lg border bg-white">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="qtr">This quarter</option>
          <option value="year">This year</option>
        </select>

        <button onClick={exportCsv} className="ml-auto rounded-full bg-gold text-white px-3 py-2">
          Download CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Kpi label="Revenue" value={money(totals.revenue)} />
        <Kpi label="Bookings" value={String(totals.bookings)} />
        <Kpi label="Confirmed" value={String((totals.byStatus.find(([k]) => k === "confirmed")?.[1]) || 0)} />
        <Kpi label="Pending" value={String((totals.byStatus.find(([k]) => k === "pending")?.[1]) || 0)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h4 className="font-semibold text-plum mb-3">Status breakdown</h4>
          <ul className="space-y-2 text-sm">
            {totals.byStatus.length === 0 && <li className="text-plum/60">No data.</li>}
            {totals.byStatus.map(([st, n]) => (
              <li key={st} className="flex items-center justify-between">
                <span className="capitalize">{st}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h4 className="font-semibold text-plum mb-3">Top services</h4>
          <ul className="space-y-2 text-sm">
            {totals.topServices.length === 0 && <li className="text-plum/60">No data.</li>}
            {totals.topServices.map(([svc, n]) => (
              <li key={svc} className="flex items-center justify-between">
                <span className="capitalize">{svc}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm opacity-60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
