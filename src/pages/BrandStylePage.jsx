import React from "react";
import logo from "@/assets/sanchez-services-logo.png"; // path to the logo image

const BrandStylePage = () => {
  const colors = [
    { name: "Primary Pink", hex: "#E27A9E" },
    { name: "Gold Accent", hex: "#F4C542" },
    { name: "Deep Brown", hex: "#5A3A2E" },
    { name: "Soft Cream", hex: "#FFF8F0" },
  ];

  const fonts = [
    { role: "Logo / Headings", font: "Script-style (similar to Pacifico or Lobster)" },
    { role: "Subheadings", font: "Serif (e.g., Playfair Display)" },
    { role: "Body Text", font: "Sans-serif (e.g., Inter, Open Sans)" },
  ];

  return (
    <div className="bg-white min-h-screen py-12 px-6">
      <h1 className="text-4xl font-bold text-plum mb-8 text-center">Brand Style Guide</h1>

      {/* Logo Section */}
      <section className="mb-12 text-center">
        <img src={logo} alt="Sanchez Services Logo" className="mx-auto h-40 mb-6" />
        <p className="text-lg text-plum/80">Primary Logo / Mascot</p>
      </section>

      {/* Colors */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-plum mb-4">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {colors.map((c) => (
            <div key={c.name} className="text-center">
              <div
                className="w-20 h-20 mx-auto rounded-full shadow-md"
                style={{ backgroundColor: c.hex }}
              ></div>
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-600">{c.hex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-plum mb-4">Typography</h2>
        <ul className="space-y-3">
          {fonts.map((f) => (
            <li key={f.role} className="text-lg">
              <span className="font-bold">{f.role}:</span> {f.font}
            </li>
          ))}
        </ul>
      </section>

      {/* Buttons / Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-plum mb-4">UI Elements</h2>
        <div className="flex gap-4 flex-wrap">
          <button className="bg-[#F4C542] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#E0AC2F] transition">
            Primary Button
          </button>
          <button className="bg-[#E27A9E] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#D5678C] transition">
            Secondary Button
          </button>
        </div>
      </section>
    </div>
  );
};

export default BrandStylePage;
