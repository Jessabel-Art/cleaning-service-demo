import React from 'react';
import { motion } from 'framer-motion';
import Services from '@/components/sections/Services';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ServicesPage = () => {
  return (
    <div className="bg-white py-12 md:py-20">
      <motion.div
        className="text-center mb-16 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Our Cleaning Services</h1>
        <p className="text-lg text-plum/80 max-w-3xl mx-auto">
          We offer a range of professional cleaning solutions to fit your needs, from routine maintenance to deep cleaning projects. Each service is performed with the utmost care and attention to detail.
        </p>
      </motion.div>
      
      <Services showTitle={false} />

      <div className="text-center mt-12">
        <Button asChild size="lg" className="bg-gold hover:bg-gold/90 text-white rounded-full">
            <Link to="/book">Get Your Instant Quote</Link>
        </Button>
      </div>
    </div>
  );
};

export default ServicesPage;