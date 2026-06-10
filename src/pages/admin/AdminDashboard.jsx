import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import DashboardHome from "./DashboardHome";
import BookingsView from "./BookingsView";
import CalendarView from "./CalendarView";
import ReviewsView from "./ReviewsView";
import ReportsView from "./ReportsView";
import MaintenanceView from "./MaintenanceView";
import ClientsView from "./ClientsView";
import AdminPaymentsPage from "./AdminPaymentsPage";
import { AdminUIProvider } from "./context/AdminUIContext";

const AdminDashboard = ({ initialView = "dashboard" }) => {
  const { user } = useAuth();
  const location = useLocation();
  const forcedView =
    location.state?.activeView || location.state?.initialView || null;
  const [activeView, setActiveView] = useState(
    forcedView || initialView || "dashboard"
  );

  useEffect(() => {
    if (forcedView && forcedView !== activeView) setActiveView(forcedView);
  }, [forcedView, activeView]);

  const renderView = () => {
    switch (activeView) {
      case "bookings":
        return <BookingsView />;
      case "calendar":
        return <CalendarView />;
      case "clients":
        return <ClientsView />;
      case "reviews":
        return <ReviewsView />;
      case "reports":
        return <ReportsView />;
      case "maintenance":
        return <MaintenanceView />;
      case "payments":
        return <AdminPaymentsPage embedded onChangeView={setActiveView} />;
      default:
        return <DashboardHome onChangeView={setActiveView} />;
    }
  };

  return (
    <AdminUIProvider>
      <div className="min-h-screen flex bg-[#FFF7FB]">
        <AdminSidebar activeView={activeView} onChangeView={setActiveView} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader activeView={activeView} user={user} />
          <main className="flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 lg:px-10 lg:py-6 bg-[#FFF7FB]">
            {renderView()}
          </main>
        </div>
      </div>
    </AdminUIProvider>
  );
};

export default AdminDashboard;
