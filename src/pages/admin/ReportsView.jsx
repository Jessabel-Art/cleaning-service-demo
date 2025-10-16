import React from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { csvDownload, money, rangePreset } from "./utils";

export function ReportsView() {
  const [rows, setRows] = React.useState([]);
  const [range, setRange] = React.useState("30d");
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    // Avoid composite index by splitting the "in" query into 4 listeners
    const base = collection(db, "bookings");

    const mk = (status) =>
      onSnapshot(
        query(base, where("status", "==", status), orderBy("scheduledAt", "asc")),
        (snap) => {
          setRows((prev) => {
            const others = prev.filter((r) => r.status !== status);
            const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            return sortByWhen([...others, ...next]);
          });
        },
        (e) => setErr(formatFirestoreError(e))
      );

    const unsubs = [
      mk("pending"),
      mk("confirmed"),
      mk("declined"),
      mk("completed"),
    ];

    return () => unsubs.forEach((u) => u && u());
  }, []);

  const view = React.useMemo(() => {
    const { from, to } = rangePreset(range);
    return rows.filter((r) => {
      const d = getWhenDate(r);
      return d && d >= from && d <= to;
    });
  }, [rows, range]);

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
      const d = getWhenDate(r);
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
      {err && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
          {err.message}
          {err.indexHint && (
            <div className="mt-2">
              <a className="underline" href={err.indexHint} target="_blank" rel="noreferrer">
                Create the required Firestore index
              </a>
            </div>
          )}
        </div>
      )}

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

/* ---------- helpers ---------- */
function getWhenDate(r) {
  return r?.scheduledAt?.toDate?.() ?? r?.startAt?.toDate?.() ?? null;
}
function sortByWhen(arr) {
  return arr.slice().sort((a, b) => {
    const ad = getWhenDate(a)?.getTime?.() ?? 0;
    const bd = getWhenDate(b)?.getTime?.() ?? 0;
    return ad - bd;
  });
}
function formatFirestoreError(e) {
  const msg = String(e?.message || e);
  // Firestore index errors include a URL to create the index
  const match = msg.match(/https:\/\/console\.firebase\.google\.com\/project\/[^ ]+\/firestore\/indexes\?create_composite=.+/);
  return { message: msg, indexHint: match ? match[0] : null };
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm opacity-60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
