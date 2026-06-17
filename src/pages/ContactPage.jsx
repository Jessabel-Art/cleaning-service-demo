// src/pages/ContactPage.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import ContactSection from '@/components/sections/ContactSection';

export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact CleanPro Demo | Get a Cleaning Estimate</title>
        <meta
          name="description"
          content="Contact CleanPro Demo for residential and commercial cleaning services. Request your estimate and book with confidence. Demo site only."
        />
      </Helmet>
      <ContactSection />
    </>
  );
}
