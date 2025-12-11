// src/pages/admin/components/AdminSidebar.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  MessageCircle,
  BarChart3,
  Wrench,
  CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: ClipboardList },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "clients", label: "Clients", icon: Users }, // <-- NEW
  { id: "payments", label: "Payments & Deposits", icon: CreditCard },
  { id: "reviews", label: "Reviews", icon: MessageCircle },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
];

export default function AdminSidebar({ activeView, onChangeView }) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-full sm:w-64 lg:w-60 bg-[#FCEFF6] border-r border-[#F3D6EA]">
      <div className="px-4 py-4 sm:px-5 sm:py-5 lg:py-6 border-b border-[#F3D6EA]">
        <div className="text-xs font-semibold tracking-[0.18em] text-[#C76AA7] uppercase">
          Admin Dashboard
        </div>
        <div className="text-sm text-[#431039] mt-1">Sanchez Services</div>
      </div>

      <nav className="flex-1 px-2 py-3 sm:px-3 sm:py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`w-full justify-start gap-2 rounded-xl text-xs sm:text-sm py-2 sm:py-2 ${
                isActive
                  ? "bg-[#F7C7E8] text-[#431039] hover:bg-[#F4B8E0]"
                  : "text-[#6B2563] hover:bg-[#FDF0F8]"
              }`}
              onClick={() => onChangeView(item.id)}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
