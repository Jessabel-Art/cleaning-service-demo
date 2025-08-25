import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCallClick = () => {
    window.location.href = 'tel:5551234567';
  };

  const navLinkClass = ({ isActive }) =>
    `text-plum hover:text-gold transition-colors duration-300 font-medium pb-1 border-b-2 ${
      isActive ? 'border-gold' : 'border-transparent'
    }`;
  
  const mobileNavLinkClass = ({ isActive }) =>
    `block py-3 text-2xl text-plum hover:text-gold transition-colors duration-300 font-medium ${
      isActive ? 'text-gold' : ''
    }`;

  const menuVariants = {
    closed: { opacity: 0, y: "-100%" },
    open: { opacity: 1, y: "0%", transition: { duration: 0.4, ease: "easeInOut" } },
  };

  return (
    <header className="sticky top-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-lg shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-plum">
            <Sparkles className="text-gold h-7 w-7" />
            <span>Sanchez Services</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={navLinkClass}>Home</NavLink>
            <NavLink to="/services" className={navLinkClass}>Services</NavLink>
            <NavLink to="/portal" className={navLinkClass}>Client Portal</NavLink>
            <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild className="bg-gold hover:bg-gold/90 text-white rounded-full">
              <Link to="/book">Book Now</Link>
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Button size="icon" variant="outline" className="rounded-full border-gold text-gold hover:bg-gold/10" onClick={handleCallClick}>
              <Phone className="h-5 w-5" />
            </Button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-plum p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-lg shadow-xl"
          >
            <div className="flex flex-col items-center space-y-4 py-8">
              <NavLink to="/" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Home</NavLink>
              <NavLink to="/services" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Services</NavLink>
              <NavLink to="/portal" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Client Portal</NavLink>
              <NavLink to="/contact" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Contact</NavLink>
              <div className="pt-4 flex flex-col items-center gap-4 w-full px-8">
                <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white rounded-full text-lg py-3" onClick={() => setIsOpen(false)}>
                  <Link to="/book">Book Now</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;