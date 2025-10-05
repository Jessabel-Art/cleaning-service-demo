// src/components/sections/Hero.jsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, MapPin } from 'lucide-react';
import heroImg from '@/assets/images/hero.jpeg';

const Hero = () => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollToServices = (e) => {
    const el = document.getElementById('services');
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (location.pathname !== '/') {
      e.preventDefault();
      navigate('/#services');
    }
  };

  return (
    <section
      className="
        relative isolate
        min-h-[clamp(420px,50vw,760px)]
        flex items-center justify-center
        overflow-hidden
        pt-24 sm:pt-28 md:pt-32
      "
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover object-center block"
          alt="Clean, airy living space with soft pink accents"
          loading="eager"
          decoding="async"
          {...{ fetchpriority: 'high' }}   // ✅ lowercase attribute to avoid React warning
          src={heroImg}
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50" aria-hidden="true" />
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
            grid-cols-1 sm:grid-cols-2 md:grid-cols-3
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
            <Link to="/services">View Services</Link>
          </Button>
        </motion.div>

        {/* Mobile-only service area line */}
        <div className="mt-5 md:hidden text-white/85 text-sm flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-gold" />
          <span>All of Rhode Island & Massachusetts</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
