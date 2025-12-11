// src/pages/BrandStylePage.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/mascot/sanchez-services-logo.png";

const BrandStylePage = () => {
  const [copiedHex, setCopiedHex] = useState("");

  const colors = [
    { name: "Primary Pink", hex: "#E27A9E", note: "Buttons / Accents" },
    { name: "Gold Accent", hex: "#F4C542", note: "CTAs / Highlights" },
    { name: "Deep Brown", hex: "#5A3A2E", note: "Headings / Text" },
    { name: "Soft Cream", hex: "#FFF8F0", note: "Backgrounds" },
  ];

  const fonts = [
    { role: "Logo / Headings", font: "Script-style (e.g., Pacifico, Lobster)", sample: "Sanchez Services" },
    { role: "Subheadings", font: "Serif (e.g., Playfair Display)", sample: "Spotless Homes, Spotless Lives" },
    { role: "Body Text", font: "Sans-serif (e.g., Inter, Open Sans)", sample: "Professional cleaning services you can trust. Where clean meets care." },
  ];

  const handleCopy = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(""), 1200);
    } catch {}
  };

  return (
    <div className="bg-white min-h-screen">
      <Helmet>
        <title>Brand Style Guide | Sanchez Services</title>
        <meta name="description" content="Colors, typography, and UI tokens for the Sanchez Services brand." />
      </Helmet>

      <header className="bg-light-pink/40 border-b border-plum/10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16 md:py-20 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-plum">Brand Style Guide</h1>
          <p className="text-xs sm:text-sm md:text-base text-plum/70 mt-3">Sanchez Services • Visual identity, colors, and UI tokens</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-12 md:py-14 space-y-10 sm:space-y-12">
        {/* Logo / Mascot */}
        <section className="rounded-2xl bg-white shadow-sm border border-plum/10 p-6">
          <h2 className="text-2xl font-semibold text-plum mb-6">Logo & Mascot</h2>

          <div className="grid gap-6 md:grid-cols-[1fr,1fr]">
            <div className="rounded-xl bg-soft-cream/60 border border-plum/10 p-6 flex items-center justify-center">
              <img
                src={logo}
                alt="Sanchez Services Logo"
                className="max-h-44 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = document.getElementById("logo-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
              <div id="logo-fallback" className="hidden text-center text-plum/70">
                <div className="text-sm">Logo not found at:</div>
                <code className="text-xs break-all block mt-1">
                  src/assets/mascot/sanchez-services-logo.png
                </code>
                <div className="text-sm mt-3">
                  Add the file and this preview will appear automatically.
                </div>
              </div>
            </div>

            {/* …rest of the page unchanged… */}
          </div>
        </section>

        {/* Color Palette, Typography, UI Elements… (unchanged) */}
      </main>

      <footer className="py-8 sm:py-10 md:py-12 px-3 sm:px-4 text-center text-xs sm:text-sm text-plum/60">
        Click any color chip to copy its HEX code • Brand guide preview
      </footer>
    </div>
  );
};

export default BrandStylePage;
