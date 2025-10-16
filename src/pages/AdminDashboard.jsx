import React, { useMemo } from "react";
import { BookingsView } from "./admin/BookingsView";
import { DashboardHome } from "./admin/DashboardHome";
import { CalendarView } from "./admin/CalendarView";
import { ReviewsView } from "./admin/ReviewsView";
import { ReportsView } from "./admin/ReportsView";
import { MaintenanceView } from "./admin/MaintenanceView";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutDashboard, CalendarDays, BookOpen, BarChart3, FolderOpen, Wrench, Settings } from "lucide-react";

const SWEEP_URL = import.meta.env.VITE_SWEEP_URL || null;

export default function AdminDashboard() {
  const [tab, setTab] = React.useState("dashboard");
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const tabs = useMemo(() => ([
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "bookings",  label: "Bookings",  icon: FolderOpen },
    { key: "calendar",  label: "Calendar",  icon: CalendarDays },
    { key: "reviews",   label: "Reviews",   icon: BookOpen },
    { key: "reports",   label: "Reports",   icon: BarChart3 },
    { key: "maintenance", label: "Maintenance", icon: (Wrench || Settings) },
  ]), []);

  const runSweepNow = async () => {
    try {
      setBusy(true);
      if (!SWEEP_URL) {
        setToast('Sweep endpoint not configured. Add VITE_SWEEP_URL to your env or use the Maintenance tab for instructions.');
        return;
      }
      const res = await fetch(SWEEP_URL, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setToast("Sweep complete");
    } catch (e) {
      setToast(`Sweep failed: ${e.message || e}`);
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        {/* Top header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-plum flex-1">Admin Dashboard</h1>
          </div>
        </header>

        {/* Body: sidebar + content */}
        <div className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
          <nav className="md:sticky md:top-20 h-max">
            <ul className="space-y-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    onClick={() => setTab(key)}
                    className={[
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl border",
                      tab === key ? "bg-plum text-white border-plum" : "bg-white border-plum/15 hover:bg-neutral-50 text-plum"
                    ].join(" ")}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main>
            {tab === "dashboard" && <DashboardHome />}
            {tab === "bookings"  && <BookingsView />}
            {tab === "calendar"  && <CalendarView />}
            {tab === "reviews"   && <ReviewsView />}
            {tab === "reports"   && <ReportsView />}
            {tab === "maintenance" && <MaintenanceView />}
          </main>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 rounded-lg bg-plum text-white px-4 py-2 shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
