// src/components/sections/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const Footer = () => {
  return (
    <footer className="bg-plum text-white pt-12 md:pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-center md:text-left items-start">
          {/* Brand + blurb */}
          <div className="md:col-span-1">
            <Link
              to="/"
              aria-label="Sanchez Services home"
              className="flex items-center justify-center md:justify-start mb-4"
            >
              {/* Responsive logo sizes */}
              <BrandMark variant="white" className="h-12 sm:h-14 md:h-16 lg:h-20 xl:h-24 w-auto" />
            </Link>
            <p className="text-white/80 mb-5 text-sm md:text-[15px] leading-relaxed max-w-md mx-auto md:mx-0">
              Professional cleaning services you can trust. Where clean meets care.
            </p>

            {/* Socials (Instagram only) */}
            <div className="flex justify-center md:justify-start">
              <a
                href="https://instagram.com/sanchezservices_"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 sm:w-11 sm:h-11 bg-gold/80 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
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

          {/* Service Areas (visual “map” card) */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Service Area</h4>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-white/5" />
              {/* Subtle dot grid */}
              <svg aria-hidden="true" className="absolute inset-0 opacity-20">
                <defs>
                  <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>

              {/* Simple “map-ish” illustration */}
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-sm text-white/90">Statewide Coverage</p>
                </div>

                <div className="aspect-[16/10] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg
                    viewBox="0 0 320 200"
                    className="w-full h-full text-white/70"
                    role="img"
                    aria-label="Stylized coverage map for Rhode Island and Massachusetts"
                  >
                    {/* “MA” blob */}
                    <path
                      d="M40,70 C80,40 170,45 240,60 C260,90 240,120 210,130 C160,145 90,130 60,110 C45,100 35,85 40,70 Z"
                      fill="currentColor"
                      opacity="0.20"
                    />
                    {/* “RI” blob */}
                    <path
                      d="M190,120 C210,110 235,115 245,135 C240,150 225,160 205,158 C185,155 180,135 190,120 Z"
                      fill="currentColor"
                      opacity="0.25"
                    />
                    {/* Pin markers */}
                    <g fill="currentColor" opacity="0.9">
                      {/* Providence-ish */}
                      <circle cx="210" cy="140" r="3" />
                      {/* Boston-ish */}
                      <circle cx="160" cy="80" r="3" />
                    </g>
                    {/* Labels */}
                    <text x="150" y="60" fontSize="14" textAnchor="middle" fill="white">Massachusetts</text>
                    <text x="220" y="165" fontSize="12" textAnchor="middle" fill="white">Rhode Island</text>
                  </svg>
                </div>

                <p className="mt-4 text-sm text-white/85">
                  We proudly serve <span className="font-semibold">all of Rhode Island</span> and
                  <span className="font-semibold"> all of Massachusetts</span>. Travel fees may apply for distant locations.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Contact Info</h4>
            <div className="space-y-3 text-white/80">
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
                <span>All of Rhode Island & Massachusetts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/20 mt-10 pt-6 text-center">
          <div className="text-white/60 text-sm flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link to="/privacy-policy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <span className="hidden sm:inline">|</span>
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
