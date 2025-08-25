// src/pages/ContactPage.jsx
import React from "react";

export default function ContactPage() {
  return (
    <main style={{ padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Request a Custom Estimate</h1>
      <p style={{ marginBottom: 24 }}>
        Have a unique cleaning need? Contact us — we’ll respond within 24 hours.
      </p>

      <form style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Full Name</label>
          <input required placeholder="Jane Doe" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Email</label>
          <input type="email" required placeholder="you@example.com" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Phone</label>
          <input type="tel" required placeholder="(555) 123-4567" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>ZIP Code</label>
          <input required placeholder="12345" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Full Address</label>
          <input placeholder="123 Main St, Unit 2" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Access Notes (gate codes, parking, etc.)</label>
          <textarea rows={4} placeholder="Gate code 1234, park in rear…" />
        </div>
        <button type="submit" style={{ padding: "12px 16px", borderRadius: 999, background: "#d4a517", color: "#2b0c28", fontWeight: 600 }}>
          Request Estimate
        </button>
      </form>
    </main>
  );
}
