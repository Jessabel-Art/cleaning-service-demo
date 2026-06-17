// src/components/sections/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

// Bundled logo + image
import footerLogo from "@/assets/logo/logo-primary-white.png";

const Footer = () => {
  return (
    <footer className="bg-plum text-white pt-8 sm:pt-12 md:pt-16 pb-6 sm:pb-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 md:gap-10 text-center md:text-left items-start">
          {/* Brand + blurb */}
          <div className="md:col-span-1">
            <Link
              to="/"
              aria-label="CleanPro Demo home"
              className="flex items-center justify-center md:justify-start mb-3 sm:mb-4"
            >
              <img
                src={footerLogo}
                alt="CleanPro Demo"
                className="h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44 w-auto"
                width={280}
                height={72}
                loading="eager"
              />
            </Link>
            <p className="text-white/80 mb-4 sm:mb-5 text-xs sm:text-sm md:text-[15px] leading-relaxed max-w-md mx-auto md:mx-0">
              Professional cleaning services you can trust. Where clean meets care.
            </p>

            <div className="flex justify-center md:justify-start">
              <p className="text-xs text-white/50 italic">Demo site — no real services are offered.</p>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gold">Quick Links</h4>
            <ul className="space-y-2 text-white/80 text-sm sm:text-base">
              <li>
                <Link to="/services" className="hover:text-gold transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-gold transition-colors">
                  Book Now
                </Link>
              </li>
              <li>
                <Link to="/portal" className="hover:text-gold transition-colors">
                  Client Portal
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-gold transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Area */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gold">Service Area</h4>
            <div className="relative overflow-hidden rounded-lg sm:rounded-2xl border border-white/10 bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-white/5" />
              <div className="relative p-4 sm:p-5 md:p-6">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs sm:text-sm text-white/90">Nationwide Coverage (Demo)</p>
                </div>

                <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-white/85">
                  We serve <span className="font-semibold">residential and commercial</span> clients
                  nationwide. Travel fees may apply for distant locations.
                  <span className="block mt-1 text-white/50 text-[11px]">Demo — no real service area.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gold">Contact Info</h4>
            <div className="space-y-2 sm:space-y-3 text-white/80 text-sm sm:text-base">
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Phone className="w-4 h-4 text-gold" />
                <a href="tel:0000000000" className="hover:text-gold transition-colors">
                  (000) 000-0000
                </a>
              </div>

              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 text-gold" />
                <a
                  href="mailto:demo@example.com"
                  className="hover:text-gold transition-colors"
                >
                  demo@example.com
                </a>
              </div>

              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <MapPin className="w-4 h-4 text-gold" />
                <span>Demo City, ST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/20 mt-8 sm:mt-10 pt-4 sm:pt-6 text-center">
          <div className="text-white/60 text-xs sm:text-sm flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 md:gap-4">
            <Link to="/privacy-policy" className="hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline">|</span>

            <Link to="/terms-of-service" className="hover:text-gold transition-colors">
              Terms of Service
            </Link>

            {/* ⭐ NEW — Admin Login Link (always visible) */}
            <span className="hidden sm:inline">|</span>
            <Link to="/auth" className="hover:text-gold transition-colors">
              Admin Login
            </Link>
          </div>

          <p className="text-white/60 mt-3 sm:mt-4 text-xs">
            &copy; {new Date().getFullYear()} CleanPro Demo. All rights reserved. This is a demo website only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
