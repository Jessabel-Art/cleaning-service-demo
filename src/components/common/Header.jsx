import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleCallClick = () => {
    window.location.href = 'tel:5551234567';
  };

  // close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `text-plum hover:text-gold transition-colors duration-300 font-medium pb-1 border-b-2 ${
      isActive ? 'border-gold' : 'border-transparent'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block py-3 text-2xl text-plum hover:text-gold transition-colors duration-300 font-medium ${
      isActive ? 'text-gold' : ''
    }`;

  const menuVariants = {
    closed: { opacity: 0, y: '-100%' },
    open: { opacity: 1, y: '0%', transition: { duration: 0.35, ease: 'easeInOut' } },
  };

  return (
    <header className="sticky top-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-lg shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-plum">
            <Sparkles className="text-gold h-7 w-7" />
            <span>Sanchez Services</span>
          </Link>

          {/* Desktop Nav (core pages only) */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={navLinkClass}>Home</NavLink>
            <NavLink to="/services" className={navLinkClass}>Services</NavLink>
            <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
          </nav>

          {/* Desktop Actions: Client Portal (light link) + Book Now (CTA) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/portal"
              className="text-sm font-medium text-plum/70 underline-offset-4 hover:text-plum hover:underline"
            >
              Client Portal
            </Link>
            <Button asChild className="bg-gold hover:bg-gold/90 text-white rounded-full">
              <Link to="/book">Book Now</Link>
            </Button>
          </div>

          {/* Mobile actions (call + menu) */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full border-gold text-gold hover:bg-gold/10"
              onClick={handleCallClick}
              aria-label="Call us"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-plum p-2"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
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
              <NavLink to="/contact" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Contact</NavLink>

              {/* keep Client Portal near Book on mobile */}
              <Link
                to="/portal"
                onClick={() => setIsOpen(false)}
                className="pt-2 text-xl text-plum/80 underline-offset-4 hover:text-plum hover:underline"
              >
                Client Portal
              </Link>

              <div className="pt-2 flex flex-col items-center gap-4 w-full px-8">
                <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white rounded-full text-lg py-3">
                  <Link to="/book" onClick={() => setIsOpen(false)}>Book Now</Link>
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
