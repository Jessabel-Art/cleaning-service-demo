import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, MapPin } from 'lucide-react';

const Hero = () => {
  const handleScrollToServices = (e) => {
    e.preventDefault();
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-20 pt-20">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img  
          className="w-full h-full object-cover" 
          alt="Clean, airy living space with soft pink accents"
          src="https://images.unsplash.com/photo-1610123172705-a57f116cd4d9" 
        />
        {/* Darker overlay for legibility */}
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 gradient-overlay"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1 
          className="hero-title text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Where Clean Meets Care
        </motion.h1>
        
        <motion.p 
          className="hero-subtitle text-xl md:text-2xl text-white/95 mb-6 font-semibold drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Your home, our priority — every time.
        </motion.p>
        
        <motion.div
          className="flex items-center justify-center gap-4 md:gap-6 text-white/95 text-sm mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span>Licensed & Insured</span>
          </div>
          <span className="opacity-50">|</span>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" />
            <span>100+ Happy Clients</span>
          </div>
          <span className="opacity-50 hidden sm:block">|</span>
          <div className="flex items-center gap-2 hidden sm:flex">
            <MapPin className="h-4 w-4 text-gold" />
            <span>Serving Greater Metro Area</span>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Button 
            asChild
            size="lg"
            className="bg-gold hover:bg-gold/90 hover:shadow-gold text-white px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
          >
            <Link to="/book">Book Now</Link>
          </Button>
          <Button 
            asChild
            size="lg"
            variant="outline"
            className="bg-white/20 hover:bg-white/40 border-white text-white backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
          >
            <a href="#services" onClick={handleScrollToServices}>View Services</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
