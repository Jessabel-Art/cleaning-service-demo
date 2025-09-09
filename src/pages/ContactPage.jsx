// src/pages/ContactPage.jsx
import React from "react";
import ContactSection from "@/components/sections/ContactSection.jsx"; // 👈 correct path

export default function ContactPage() {
  return (
    <main className="py-10">
      <ContactSection />
    </main>
  );
}
