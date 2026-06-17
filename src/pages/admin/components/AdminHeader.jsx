// src/pages/admin/components/AdminHeader.jsx
import React from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useContext } from "react";
import { AdminUIContext } from "../context/AdminUIContext";
import { useAuth } from "@/context/AuthContext";

// Import your mascot (adjust filename if needed)
import Mascot from "@/assets/mascot/mascot-standalone.png";

const VIEW_TITLES = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  calendar: "Calendar",
  reviews: "Reviews",
  reports: "Reports",
  maintenance: "Maintenance",
};

const AdminHeader = ({ activeView, user }) => {
  const { mobileMenuOpen, setMobileMenuOpen } = useContext(AdminUIContext);
  const { signOut } = useAuth();
  // search removed from header

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="w-full bg-white border-b border-plum/10 px-3 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-4 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 sticky top-0 z-20">

      {/* LEFT SECTION — Mascot + Business name */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden inline-flex items-center justify-center p-1.5 rounded-lg text-plum hover:bg-[#EEF5FB] transition-colors"
          title="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <img
          src={Mascot}
          alt="CleanPro Demo Mascot"
          className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 object-contain drop-shadow-sm"
        />

        <div>
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-plum">
            {VIEW_TITLES[activeView] || "Dashboard"}
          </h1>
          <p className="hidden xs:block sm:block text-xs text-gray-500">
            CleanPro Demo • Admin Panel
          </p>
        </div>
      </div>

      {/* RIGHT SECTION — Search, user, logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* search removed */}

        {/* USER INFO + LOGOUT */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-medium text-plum">
              {user?.email || user?.username}
            </span>
            <span className="text-[11px] text-gray-500">Admin</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-full bg-[#EEF5FB] text-plum p-1.5 sm:p-2 hover:bg-gold/20 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
