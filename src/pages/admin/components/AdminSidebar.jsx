import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  MessageCircle,
  BarChart3,
  Wrench,
} from "lucide-react"; // if you already use lucide; if not, swap icons

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: ClipboardList },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "reviews", label: "Reviews", icon: MessageCircle },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
];

const AdminSidebar = ({ activeView, onChangeView }) => {
  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-[#F1D8E8]">
      <div className="px-6 py-5 border-b border-[#F1D8E8]">
        <div className="text-xs font-semibold text-[#B34A87] tracking-[0.15em] uppercase">
          Admin Dashboard
        </div>
        <div className="mt-1 text-sm text-[#431039]">
          Sanchez Services
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={[
                "w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-left transition-colors",
                active
                  ? "bg-[#F3E0F0] text-[#431039] border-l-4 border-[#E2A82B]"
                  : "text-[#6C3A63] hover:bg-[#F9EDF5]",
              ].join(" ")}
            >
              <Icon
                className={active ? "w-4 h-4 text-[#E2A82B]" : "w-4 h-4"}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
