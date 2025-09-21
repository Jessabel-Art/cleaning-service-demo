import React from 'react';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import ServicesHighlight from '@/components/sections/ServicesHighlight';
import Gallery from '@/components/sections/Gallery';
import Testimonials from '@/components/sections/Testimonials';
import Contact from '@/components/sections/ContactSection';

const HomePage = () => {
  return (
    <>
      <Hero />
      {/* Move About above the services highlight */}
      <About />
      {/* Lightweight highlights that link to the full Services page */}
      <ServicesHighlight />
      <Gallery />
      <Testimonials />
      <Contact />
    </>
  );
};

export default HomePage;
