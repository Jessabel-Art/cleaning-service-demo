import React from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { money } from "./utils";

export function DashboardHome() {
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    const qRef = query(collection(db, "bookings"), where("status", "in", ["pending","confirmed","declined"]));
    const unsub = onSnapshot(qRef, (snap) => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const today0 = new Date(); today0.setHours(0,0,0,0);
  const today1 = new Date(); today1.setHours(23,59,59,999);
  const week = new Date(Date.now() + 7*86400000);

  let revToday=0, revWeek=0, pending=0, confirmed=0, declined=0;
  rows.forEach(r => {
    const when = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
    const amt = Number(r.amount ?? r.cost ?? 0);
    if (r.status === "pending") pending++;
    if (r.status === "confirmed") confirmed++;
    if (r.status === "declined") declined++;
    if (when) {
      if (when >= today0 && when <= today1) revToday += amt;
      if (when > today1 && when <= week) revWeek += amt;
    }
  });

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">At a glance</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Today" value={money(revToday)} />
        <Kpi label="Next 7 days" value={money(revWeek)} />
        <Kpi label="Pending" value={pending} />
        <Kpi label="Confirmed" value={confirmed} />
      </div>
      <div className="mt-8 text-sm text-plum/70">
        Tip: switch to the <b>Bookings</b> tab to filter by 7/30/Quarter/Year, export CSV, and manage approvals.
      </div>
    </section>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm opacity-60">{label}</div>
      <div className="text-2xl font-semibold">{String(value)}</div>
    </div>
  );
}
