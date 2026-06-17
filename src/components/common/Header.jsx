// src/components/common/Header.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import headerLogo from "@/assets/logo/logo-primary.png";
import { useAdminAuth } from "@/pages/admin/hooks/useAdminAuth";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const wasOpenRef = useRef(false);

  const { isAdmin } = useAdminAuth();
  const showAdminLink = !!isAdmin;

  const handleCallClick = () => {
    window.location.href = "tel:00000000000";
  };

  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        menuButtonRef.current?.focus();
      }
      wasOpenRef.current = false;
      return undefined;
    }

    wasOpenRef.current = true;
    lastFocusedRef.current = document.activeElement;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirstItem = () => {
      const focusable = menuRef.current?.querySelectorAll(focusableSelector);
      focusable?.[0]?.focus();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = Array.from(
        menuRef.current?.querySelectorAll(focusableSelector) || []
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const frame = window.requestAnimationFrame(focusFirstItem);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const navLinkClass = ({ isActive }) =>
    `text-plum hover:text-gold transition-colors duration-300 font-medium pb-1 border-b-2 ${
      isActive ? "border-gold" : "border-transparent"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block py-3 text-2xl text-plum hover:text-gold transition-colors duration-300 font-medium ${
      isActive ? "text-gold" : ""
    }`;

  const menuVariants = {
    closed: { opacity: 0, y: "-8%" },
    open: {
      opacity: 1,
      y: "0%",
      transition: { duration: 0.28, ease: "easeInOut" },
    },
  };

  return (
    <header className="sticky top-0 z-50 transition-all duration-300 bg-[#EEF5FB]/90 backdrop-blur-lg shadow-md rounded-b-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left: Brand */}
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label="CleanPro Demo home"
          >
            <img
              src={headerLogo}
              alt="CleanPro Demo"
              className="h-14 sm:h-16 md:h-[4.5rem] lg:h-[5.5rem] xl:h-24 w-auto shrink-0"
              width={256}
              height={64}
              loading="eager"
            />
          </Link>

          {/* Right: Navigation + CTA */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/services" className={navLinkClass}>
              Services
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>

            {/* Admin-only link (visible only for allowed emails) */}
            {showAdminLink && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}

            {/* CTA → Client Portal */}
            <Button
              asChild
              className="bg-gold hover:bg-gold/90 text-white rounded-full px-5 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold/60"
            >
              <Link to="/portal">My Account</Link>
            </Button>
          </div>

          {/* Mobile actions (call + menu) */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full border-gold text-gold hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-gold/60"
              onClick={handleCallClick}
              aria-label="Call CleanPro Demo at (000) 000-0000"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="text-plum p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-haspopup="dialog"
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
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="md:hidden absolute top-full left-0 w-full bg-[#EEF5FB]/95 backdrop-blur-lg shadow-xl rounded-b-2xl"
          >
            <div className="flex flex-col items-center space-y-4 py-8">
              <h2 id="mobile-menu-title" className="sr-only">
                Main navigation
              </h2>
              <img
                src={headerLogo}
                alt="CleanPro Demo"
                className="h-16 sm:h-18 w-auto mb-2"
                width={224}
                height={56}
                loading="eager"
              />

              <NavLink
                to="/"
                className={mobileNavLinkClass}
                onClick={closeMenu}
              >
                Home
              </NavLink>
              <NavLink
                to="/services"
                className={mobileNavLinkClass}
                onClick={closeMenu}
              >
                Services
              </NavLink>
              <NavLink
                to="/contact"
                className={mobileNavLinkClass}
                onClick={closeMenu}
              >
                Contact
              </NavLink>

              {/* Admin-only mobile link */}
              {showAdminLink && (
                <NavLink
                  to="/admin"
                  className={mobileNavLinkClass}
                  onClick={closeMenu}
                >
                  Admin Dashboard
                </NavLink>
              )}

              <div className="pt-2 flex flex-col items-center gap-4 w-full px-8">
                <Button
                  asChild
                  className="w-full bg-gold hover:bg-gold/90 text-white rounded-full text-lg py-3 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold/60"
                >
                  <Link to="/portal" onClick={closeMenu}>
                    My Account
                  </Link>
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
