// src/pages/TermOfServicePage.jsx
import React from "react";

const styles = {
  wrap: { maxWidth: 960, margin: "0 auto", padding: "40px 20px" },
  h1: { fontSize: 40, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b6b6b", marginBottom: 28 },
  h2: { fontSize: 22, fontWeight: 800, marginTop: 28, marginBottom: 10 },
  h3: { fontSize: 18, fontWeight: 700, marginTop: 18, marginBottom: 6 },
  p: { lineHeight: 1.7, margin: "10px 0" },
  ul: { paddingLeft: 22, margin: "10px 0" },
  tag: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#f3e4b2",
    color: "#2b0c28",
    fontWeight: 600,
    marginRight: 8,
    marginBottom: 8,
  },
  toc: {
    border: "1px solid #ece6ef",
    borderRadius: 12,
    padding: 16,
    background: "#fff8fb",
    margin: "16px 0 24px",
  },
  backTop: {
    marginTop: 28,
    display: "inline-block",
    textDecoration: "none",
    background: "#d4a517",
    color: "#2b0c28",
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 700,
  },
};

export default function TermOfServicePage() {
  const year = new Date().getFullYear();
  return (
    <main style={styles.wrap}>
      <a id="top" />
      <h1 style={styles.h1}>Terms of Service</h1>
      <p style={styles.sub}>Effective: August 24, {year}</p>

      <div style={styles.toc}>
        <strong>Quick Links</strong>
        <ul style={styles.ul}>
          <li><a href="#agreement">1. Agreement</a></li>
          <li><a href="#services">2. Services & Booking</a></li>
          <li><a href="#accounts">3. Client Accounts</a></li>
          <li><a href="#payments">4. Pricing & Payments</a></li>
          <li><a href="#cancellations">5. Rescheduling & Cancellations</a></li>
          <li><a href="#access">6. Home Access & Safety</a></li>
          <li><a href="#supplies">7. Supplies, Damage & Limits</a></li>
          <li><a href="#photos">8. Photos, Reviews & Testimonials</a></li>
          <li><a href="#privacy">9. Privacy & Data</a></li>
          <li><a href="#other">10. Other Terms</a></li>
          <li><a href="#contact">11. Contact</a></li>
        </ul>
      </div>

      <section id="agreement">
        <h2 style={styles.h2}>1. Agreement</h2>
        <p style={styles.p}>
          These Terms of Service (“Terms”) govern services provided by{" "}
          <strong>Sanchez Services</strong> (“we,” “us,” or “our”). By booking or
          receiving services, you agree to these Terms. If you do not agree, please
          do not use our services.
        </p>
        <p style={styles.p}>
          <span style={styles.tag}>Licensed & Insured</span>
          <span style={styles.tag}>Residential & Commercial</span>
          <span style={styles.tag}>Rhode Island & Massachusetts</span>
        </p>
      </section>

      <section id="services">
        <h2 style={styles.h2}>2. Services & Booking</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            We provide residential cleaning, deep cleans, move-in/move-out cleaning,
            and light commercial/office cleaning. Specific scope is confirmed during
            booking.
          </li>
          <li style={styles.p}>
            Arrival windows are estimates. Delays may occur due to traffic, weather,
            or prior jobs; we’ll notify you of material changes.
          </li>
          <li style={styles.p}>
            We reserve the right to decline or stop a job if conditions are unsafe,
            unsanitary (including biohazards), or outside agreed scope.
          </li>
        </ul>
      </section>

      <section id="accounts">
        <h2 style={styles.h2}>3. Client Accounts</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Our client portal allows you to manage bookings, update notes, and view
            invoices.
          </li>
          <li style={styles.p}>
            You are responsible for safeguarding your login credentials and account
            activity.
          </li>
          <li style={styles.p}>
            Accounts may be suspended if misused or fraudulent.
          </li>
        </ul>
      </section>

      <section id="payments">
        <h2 style={styles.h2}>4. Pricing & Payments</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Online quotes are estimates. Final pricing may be adjusted after a
            walk-through prior to service.
          </li>
          <li style={styles.p}>
            A non-refundable deposit may be required to confirm your appointment.
            Remaining balance is due upon service completion unless otherwise
            agreed.
          </li>
          <li style={styles.p}>
            We accept major cards, cash, and other methods listed at booking.
          </li>
        </ul>
      </section>

      <section id="cancellations">
        <h2 style={styles.h2}>5. Rescheduling & Cancellations</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Please provide at least <strong>24 hours’ notice</strong> to reschedule
            or cancel.
          </li>
          <li style={styles.p}>
            Late cancellations or lock-outs (less than 24 hours) may result in a{" "}
            <strong>cancellation fee of up to $50</strong> or loss of deposit.
          </li>
          <li style={styles.p}>
            Missed appointments due to no entry may be charged as a full visit.
          </li>
        </ul>
      </section>

      <section id="access">
        <h2 style={styles.h2}>6. Home Access & Safety</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Ensure safe entry by providing keys, codes, or parking details in
            advance. Please secure valuables.
          </li>
          <li style={styles.p}>
            For staff safety, we do not move heavy appliances, climb above a
            2-step stool, or handle hazardous/biohazardous materials.
          </li>
          <li style={styles.p}>
            Pets should be secured if anxious around visitors. Let us know of
            special instructions.
          </li>
        </ul>
      </section>

      <section id="supplies">
        <h2 style={styles.h2}>7. Supplies, Damage & Limits</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            We bring standard, pet-safe supplies. If you prefer specific products,
            please provide them.
          </li>
          <li style={styles.p}>
            We are not responsible for normal wear, pre-existing damage, or unstable
            items. Report concerns within <strong>24 hours</strong>.
          </li>
          <li style={styles.p}>
            If contacted within 24 hours, we will re-clean affected areas at no
            charge. Refunds are rare and discretionary.
          </li>
        </ul>
      </section>

      <section id="photos">
        <h2 style={styles.h2}>8. Photos, Reviews & Testimonials</h2>
        <p style={styles.p}>
          With your permission, we may take before/after photos for quality
          assurance or marketing. We do not share identifying details without
          consent. Permission can be withdrawn anytime.
        </p>
      </section>

      <section id="privacy">
        <h2 style={styles.h2}>9. Privacy & Data</h2>
        <p style={styles.p}>
          We collect and use your information only to provide services, manage
          accounts, and communicate about bookings. See our{" "}
          <a href="/privacy-policy">Privacy Policy</a> for details.
        </p>
      </section>

      <section id="other">
        <h2 style={styles.h2}>10. Other Terms</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            We may update these Terms by posting a new version on our website.
            Updates apply to future bookings.
          </li>
          <li style={styles.p}>
            These Terms are governed by Rhode Island and Massachusetts law.
            Disputes will be handled in local courts of competent jurisdiction.
          </li>
          <li style={styles.p}>
            If any provision is unenforceable, the remainder remains valid.
          </li>
        </ul>
      </section>

      <section id="contact">
        <h2 style={styles.h2}>11. Contact</h2>
        <p style={styles.p}>
          Questions about these Terms? Reach out anytime.
          <br />
          <strong>Sanchez Services</strong>
          <br />
          Phone: (401) 658-6708
          <br />
          Email:{" "}
          <a href="mailto:sanchezservices24@yahoo.com">
            sanchezservices24@yahoo.com
          </a>
          <br />
          Serving all of Rhode Island & Massachusetts
        </p>
      </section>

      <a href="#top" style={styles.backTop}>
        Back to top
      </a>

      <p style={{ ...styles.p, marginTop: 16, color: "#777" }}>
        <em>
          Note: This page is for informational purposes only and does not
          constitute legal advice. Please consult a local attorney if you want
          legal review of these Terms.
        </em>
      </p>
    </main>
  );
}
