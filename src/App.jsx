// src/App.jsx
import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';

// Layout
import Header from '@/components/common/Header';
import Footer from '@/components/sections/Footer';
import ScrollToTop from '@/components/common/ScrollToTop';

// Pages
import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import BookingPage from '@/pages/BookingPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import ContactPage from '@/pages/ContactPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import DevSeedPage from '@/pages/DevSeedPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import BrandStylePage from '@/pages/BrandStylePage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ClientBookingsView from '@/pages/admin/ClientBookingsView';
import AuthPage from '@/pages/AuthPage';
import ClientPortalPage from '@/pages/ClientPortalPage.jsx';
import PaymentCenterPage from "@/pages/PaymentCenterPage";
import PaymentConfirmationPage from "@/pages/PaymentConfirmationPage";


// Auth wrappers
import AdminRoute from '@/components/auth/AdminRoute';
import ClientRoute from '@/components/auth/ClientRoute';

function AppShell() {
  const location = useLocation();
  const siteUrl = "https://sanchezproservices.com";
  const noIndexPaths = [
    "/auth",
    "/portal",
    "/admin",
    "/payment-center",
    "/payment-confirmation",
    "/brand-style",
    "/seed",
  ];
  const shouldNoIndex = noIndexPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const canonicalUrl = `${siteUrl}${location.pathname || "/"}`;

  return (
    <div className="min-h-screen bg-light-pink flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-plum focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-gold"
      >
        Skip to main content
      </a>
      <Helmet>
        <title>
          Sanchez Services — Professional Cleaning Services | Where Clean Meets Care
        </title>
        <meta
          name="description"
          content="Professional residential and commercial cleaning services across Rhode Island and Massachusetts. Licensed and insured. Get your free estimate today."
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content={shouldNoIndex ? 'noindex,nofollow' : 'index,follow'} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>

      <ScrollToTop />
      <Header />

      <main id="main-content" className="flex-grow">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/confirm" element={<ConfirmationPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Client portal now uses ClientPortalPage */}
          <Route
            path="/portal"
            element={
              <ClientRoute>
                <ClientPortalPage />
              </ClientRoute>
            }
          />

          {/* Payment center (new) */}
          <Route path="/payment-center" element={<PaymentCenterPage />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/bookings"
            element={<Navigate to="/admin" state={{ initialView: "bookings" }} replace />}
          />

          <Route
            path="/admin/payments"
            element={<Navigate to="/admin" state={{ initialView: "payments" }} replace />}
          />

          <Route path="/payment-confirmation" element={<PaymentConfirmationPage />} />

          <Route
            path="/admin/client-bookings"
            element={
              <AdminRoute>
                <ClientBookingsView />
              </AdminRoute>
            }
          />

          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/brand-style" element={<BrandStylePage />} />
          {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
            <Route path="/seed" element={<DevSeedPage />} />
          )}

          {/* Old alias – keep redirecting to portal */}
          <Route path="/account" element={<Navigate to="/portal" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <Toaster />
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
