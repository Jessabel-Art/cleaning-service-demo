import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/common/Header';
import Footer from '@/components/sections/Footer';
import HomePage from '@/pages/HomePage';
import BookingPage from '@/pages/BookingPage';
import CheckoutPage from '@/pages/CheckoutPage';
import ConfirmationPage from '@/pages/ConfirmationPage';
import ClientPortalPage from '@/pages/ClientPortalPage';
import ScrollToTop from '@/components/common/ScrollToTop';
import ServicesPage from '@/pages/ServicesPage';
import ContactPage from '@/pages/ContactPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import BrandStylePage from "@/pages/BrandStylePage";

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-light-pink flex flex-col">
      <Helmet>
        <title>Sanchez Services - Professional Cleaning Services | Where Clean Meets Care</title>
        <meta name="description" content="Professional residential and commercial cleaning services. Licensed & insured. Get your free quote today - your home, our priority, every time." />
      </Helmet>
      
      <ScrollToTop />
      <Header />
      
      <main className="flex-grow">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/portal" element={<ClientPortalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/brand-style" element={<BrandStylePage />} />
        </Routes>
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;