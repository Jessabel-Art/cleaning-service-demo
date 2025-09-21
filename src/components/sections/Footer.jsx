// src/components/sections/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const Footer = () => {
  const SERVICE_AREAS = [
    'Providence, RI',
    'Cranston, RI',
    'Pawtucket, RI',
    'East Providence, RI',
    'Warwick, RI',
    'Johnston, RI',
    'Attleboro, MA',
    'Seekonk, MA',
  ];

  return (
    <footer className="bg-plum text-white pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          {/* Brand + blurb */}
          <div className="md:col-span-1">
            <Link
              to="/"
              aria-label="Sanchez Services home"
              className="flex items-center justify-center md:justify-start mb-4"
            >
              {/* Increased logo size */}
              <BrandMark variant="white" className="h-16 w-auto" />
            </Link>
            <p className="text-white/80 mb-4 text-sm">
              Professional cleaning services you can trust. Where clean meets care.
            </p>

            {/* Socials (Instagram only) */}
            <div className="flex space-x-3 justify-center md:justify-start">
              <a
                href="https://instagram.com/sanchezservices_"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 bg-gold/80 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Quick Links</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link to="/services" className="hover:text-gold transition-colors">Services</Link></li>
              <li><Link to="/book" className="hover:text-gold transition-colors">Book Now</Link></li>
              <li><Link to="/portal" className="hover:text-gold transition-colors">Client Portal</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Service areas (updated) */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Service Areas</h4>
            <ul className="space-y-2 text-white/80">
              {SERVICE_AREAS.map((area) => (
                <li key={area} className="hover:text-gold transition-colors">
                  {area}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Contact Info</h4>
            <div className="space-y-2 text-white/80">
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Phone className="w-4 h-4 text-gold" />
                <a href="tel:14016586708" className="hover:text-gold transition-colors">
                  (401) 658-6708
                </a>
              </div>
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 text-gold" />
                <a
                  href="mailto:sanchezservices24@yahoo.com"
                  className="hover:text-gold transition-colors"
                >
                  sanchezservices24@yahoo.com
                </a>
              </div>
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <MapPin className="w-4 h-4 text-gold" />
                <span>Rhode Island & nearby Massachusetts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center">
          {/* Trust badges removed */}
          <div className="text-white/60 text-sm flex justify-center gap-4">
            <Link to="/privacy-policy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms-of-service" className="hover:text-gold transition-colors">Terms of Service</Link>
          </div>
          <p className="text-white/60 mt-4 text-xs">
            © {new Date().getFullYear()} Sanchez Services. All rights reserved. Registered Business • Fully Insured.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
