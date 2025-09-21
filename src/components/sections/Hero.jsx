// src/components/sections/Hero.jsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, MapPin } from 'lucide-react';

const Hero = () => {
  const prefersReducedMotion = useReducedMotion();

  const handleScrollToServices = (e) => {
    e.preventDefault();
    const el = document.getElementById('services');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="
        relative
        min-h-[70vh] sm:min-h-[80vh] lg:min-h-[92vh]
        flex items-center justify-center
        overflow-hidden
        pt-24 sm:pt-28 md:pt-32
      "
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          className="w-full h-full object-cover object-center"
          alt="Clean, airy living space with soft pink accents"
          loading="eager"
          src="https://images.unsplash.com/photo-1610123172705-a57f116cd4d9"
          srcSet="
            https://images.unsplash.com/photo-1610123172705-a57f116cd4d9?w=600 600w,
            https://images.unsplash.com/photo-1610123172705-a57f116cd4d9?w=1200 1200w,
            https://images.unsplash.com/photo-1610123172705-a57f116cd4d9?w=2000 2000w
          "
        />
        {/* Overlay for legibility */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Soft gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-3 sm:mb-4 drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Where Clean Meets Care
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 mb-6 sm:mb-8 font-medium drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          Your home, our priority — every time.
        </motion.p>

        {/* Stats / trust row */}
        <motion.div
          className="
            grid gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10
            grid-cols-1 xs:grid-cols-2 md:grid-cols-3
            place-items-center text-white/95 text-sm sm:text-base
          "
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span>Fully Insured</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
            <Users className="h-4 w-4 text-gold" />
            <span>100+ Happy Clients</span>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur">
            <MapPin className="h-4 w-4 text-gold" />
            <span>All of Rhode Island & Massachusetts</span>
          </div>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-5"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          <Button
            asChild
            size="lg"
            className="
              bg-gold hover:bg-gold/90 text-white rounded-full
              px-6 sm:px-8 lg:px-10 py-4 text-base sm:text-lg font-semibold
              transition-transform duration-300 hover:-translate-y-0.5
              w-full sm:w-auto
            "
          >
            <Link to="/book">Book Now</Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="
              bg-white/20 hover:bg-white/30 border-white text-white rounded-full
              backdrop-blur-sm px-6 sm:px-8 lg:px-10 py-4 text-base sm:text-lg font-semibold
              transition-transform duration-300 hover:-translate-y-0.5
              w-full sm:w-auto
            "
          >
            <a href="#services" onClick={handleScrollToServices}>View Services</a>
          </Button>
        </motion.div>

        {/* Mobile-only service area line (since the pill is hidden on small screens) */}
        <div className="mt-5 md:hidden text-white/85 text-sm flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-gold" />
          <span>All of Rhode Island & Massachusetts</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
