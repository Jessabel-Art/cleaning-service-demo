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
import ClientPortalPage from '@/pages/ClientPortalPage';
import ContactPage from '@/pages/ContactPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import BrandStylePage from '@/pages/BrandStylePage';
import OwnerDashboard from '@/pages/OwnerDashboard';
import AuthPage from '@/pages/AuthPage';

// Auth wrappers
import OwnerRoute from '@/components/auth/OwnerRoute';
import ClientRoute from '@/components/auth/ClientRoute';

function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-light-pink flex flex-col">
      <Helmet>
        <title>Sanchez Services — Professional Cleaning Services | Where Clean Meets Care</title>
        <meta
          name="description"
          content="Professional residential and commercial cleaning services. Licensed & insured. Get your free quote today - your home, our priority, every time."
        />
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

          <Route
            path="/portal"
            element={
              <ClientRoute>
                <ClientPortalPage />
              </ClientRoute>
            }
          />

          <Route
            path="/owner"
            element={
              <OwnerRoute>
                <OwnerDashboard />
              </OwnerRoute>
            }
          />

          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/brand-style" element={<BrandStylePage />} />
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
