// src/pages/HomePage.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import ServicesHighlight from '@/components/sections/ServicesHighlight';
import Gallery from '@/components/sections/Gallery';
import Testimonials from '@/components/sections/Testimonials';
import Contact from '@/components/sections/ContactSection';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>CleanPro Demo — Professional Home Cleaning Services</title>
        <meta
          name="description"
          content="Residential, deep clean, move-in/out, and office cleaning. Transparent estimates, reliable pros, and easy online booking. Demo site only."
        />
      </Helmet>

      <Hero />
      <About />
      <ServicesHighlight />
      <Gallery />
      <Testimonials />
      <Contact />
    </>
  );
};

export default HomePage;
