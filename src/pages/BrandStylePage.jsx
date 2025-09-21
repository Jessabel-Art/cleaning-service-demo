// src/pages/BrandStylePage.jsx
import React, { useState } from "react";
// ✅ Expected path for your logo (place your PNG here):
//    src/assets/mascot/sanchez-services-logo.png
// If the file is missing, the UI will gracefully fall back.
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
    {
      role: "Logo / Headings",
      font: "Script-style (e.g., Pacifico, Lobster)",
      sample: "Sanchez Services",
    },
    {
      role: "Subheadings",
      font: "Serif (e.g., Playfair Display)",
      sample: "Spotless Homes, Spotless Lives",
    },
    {
      role: "Body Text",
      font: "Sans-serif (e.g., Inter, Open Sans)",
      sample:
        "Professional cleaning services you can trust. Where clean meets care.",
    },
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
      <header className="bg-light-pink/40 border-b border-plum/10">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-plum">
            Brand Style Guide
          </h1>
          <p className="text-plum/70 mt-3">
            Sanchez Services • Visual identity, colors, and UI tokens
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {/* Logo / Mascot */}
        <section className="rounded-2xl bg-white shadow-sm border border-plum/10 p-6">
          <h2 className="text-2xl font-semibold text-plum mb-6">Logo & Mascot</h2>

          <div className="grid gap-6 md:grid-cols-[1fr,1fr]">
            <div className="rounded-xl bg-soft-cream/60 border border-plum/10 p-6 flex items-center justify-center">
              {/* Fallback handling if the image path is wrong */}
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
              <div
                id="logo-fallback"
                className="hidden text-center text-plum/70"
              >
                <div className="text-sm">Logo not found at:</div>
                <code className="text-xs break-all block mt-1">
                  src/assets/sanchez-services-logo.png
                </code>
                <div className="text-sm mt-3">
                  Add the file and this preview will appear automatically.
                </div>
              </div>
            </div>

            <div className="grid grid-rows-[auto,1fr] gap-4">
              <div className="rounded-xl border border-plum/10 p-4">
                <h3 className="font-semibold text-plum mb-2">Usage</h3>
                <ul className="text-plum/80 text-sm space-y-1">
                  <li>• Use full logo on light backgrounds.</li>
                  <li>• Maintain clear space around the mascot & wordmark.</li>
                  <li>• Avoid stretching or applying color overlays.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-plum/10 p-4 bg-white">
                  <div className="text-xs font-medium text-plum/60 mb-2">
                    Light Background
                  </div>
                  <div className="h-16 rounded-lg bg-white border border-plum/10"></div>
                </div>
                <div className="rounded-xl border border-plum/10 p-4 bg-[#2B0C28]">
                  <div className="text-xs font-medium text-white/70 mb-2">
                    Dark Background
                  </div>
                  <div className="h-16 rounded-lg bg-[#2B0C28] border border-white/20"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="rounded-2xl bg-white shadow-sm border border-plum/10 p-6">
          <h2 className="text-2xl font-semibold text-plum mb-6">Color Palette</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleCopy(c.hex)}
                className="group text-left rounded-xl border border-plum/10 bg-white hover:bg-light-pink/20 transition shadow-sm p-4"
                title="Click to copy HEX"
              >
                <div
                  className="w-20 h-20 rounded-full shadow-md mx-auto border border-black/5"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="mt-3 text-center">
                  <div className="font-semibold text-plum">{c.name}</div>
                  <div className="text-xs text-plum/70">{c.note}</div>
                  <div className="mt-1 text-sm font-mono">
                    {copiedHex === c.hex ? (
                      <span className="text-gold">Copied!</span>
                    ) : (
                      <span>{c.hex}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="rounded-2xl bg-white shadow-sm border border-plum/10 p-6">
          <h2 className="text-2xl font-semibold text-plum mb-6">Typography</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {fonts.map((f) => (
              <div
                key={f.role}
                className="rounded-xl border border-plum/10 p-5 bg-light-pink/20"
              >
                <div className="text-xs font-medium text-plum/60 mb-1">
                  {f.role}
                </div>
                <div className="text-plum font-semibold">{f.font}</div>

                <div className="mt-3 p-3 rounded-lg bg-white border border-plum/10">
                  {f.role.includes("Logo") ? (
                    <div className="text-2xl md:text-3xl">{f.sample}</div>
                  ) : f.role.includes("Subhead") ? (
                    <div className="text-xl md:text-2xl">{f.sample}</div>
                  ) : (
                    <div className="text-base leading-relaxed">{f.sample}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* UI Tokens */}
        <section className="rounded-2xl bg-white shadow-sm border border-plum/10 p-6">
          <h2 className="text-2xl font-semibold text-plum mb-6">UI Elements</h2>

          <div className="flex flex-wrap gap-4">
            <button className="bg-[#F4C542] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#E0AC2F] transition shadow-sm">
              Primary Button
            </button>
            <button className="bg-[#E27A9E] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#D5678C] transition shadow-sm">
              Secondary Button
            </button>
            <button className="border border-plum/30 text-plum font-semibold px-6 py-3 rounded-full hover:bg-plum/5 transition">
              Outline Button
            </button>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-plum/10 p-4">
              <div className="text-xs font-medium text-plum/60 mb-2">
                Cards / Surfaces
              </div>
              <div className="rounded-lg bg-white border border-plum/10 h-20 shadow-sm" />
            </div>
            <div className="rounded-xl border border-plum/10 p-4">
              <div className="text-xs font-medium text-plum/60 mb-2">
                Inputs
              </div>
              <input
                placeholder="you@example.com"
                className="w-full rounded-lg border border-plum/20 px-3 py-2 placeholder:text-plum/40 focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-sm text-plum/60">
        Click any color chip to copy its HEX code • Brand guide preview
      </footer>
    </div>
  );
};

export default BrandStylePage;
