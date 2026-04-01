// src/pages/ContactPage.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import ContactSection from '@/components/sections/ContactSection';

export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact Sanchez Services | Get a Cleaning Estimate</title>
        <meta
          name="description"
          content="Contact Sanchez Services for residential and commercial cleaning in Rhode Island and Massachusetts. Request your estimate and book with confidence."
        />
      </Helmet>
      <ContactSection />
    </>
  );
}
