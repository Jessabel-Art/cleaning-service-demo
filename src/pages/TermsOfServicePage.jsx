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
    marginBottom: 8
  },
  toc: {
    border: "1px solid #ece6ef",
    borderRadius: 12,
    padding: 16,
    background: "#fff8fb",
    margin: "16px 0 24px"
  },
  backTop: {
    marginTop: 28,
    display: "inline-block",
    textDecoration: "none",
    background: "#d4a517",
    color: "#2b0c28",
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 700
  }
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
          These Terms of Service (“Terms”) govern your use of services provided by
          <strong> Sanchez Services</strong> (“we,” “us,” or “our”). By booking,
          creating an account, or receiving services, you agree to these Terms.
          If you do not agree, please do not use our services.
        </p>
        <p style={styles.p}>
          <span style={styles.tag}>Licensed & Insured</span>
          <span style={styles.tag}>Residential & Commercial</span>
          <span style={styles.tag}>Greater Metro Area</span>
        </p>
      </section>

      <section id="services">
        <h2 style={styles.h2}>2. Services & Booking</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Available offerings include residential cleaning, deep cleans,
            move-in/move-out cleaning, and commercial/office cleaning. Service
            scope is described during booking and on our website.
          </li>
          <li style={styles.p}>
            Arrival windows are estimates. Factors such as traffic, weather,
            or prior jobs may affect arrival; we’ll notify you of material delays.
          </li>
          <li style={styles.p}>
            We reserve the right to decline or stop a job if conditions are unsafe,
            unsanitary (biohazards), or outside the agreed scope.
          </li>
        </ul>
      </section>

      <section id="accounts">
        <h2 style={styles.h2}>3. Client Accounts</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            You may create a client portal account to manage bookings, update
            addresses and notes, and view invoices.
          </li>
          <li style={styles.p}>
            You are responsible for safeguarding your login credentials and for
            activity under your account.
          </li>
          <li style={styles.p}>
            We may suspend or terminate accounts that violate these Terms or are
            used fraudulently.
          </li>
        </ul>
      </section>

      <section id="payments">
        <h2 style={styles.h2}>4. Pricing & Payments</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Online prices are <em>estimates</em> based on information provided and
            standard conditions. Final pricing may be confirmed during the on-site
            walk-through before service begins.
          </li>
          <li style={styles.p}>
            We accept major cards and other methods listed at checkout. Payment is
            due at booking or upon service completion as specified in your order.
          </li>
          <li style={styles.p}>
            Recurring services are billed per visit unless otherwise stated. Taxes
            and fees may apply.
          </li>
        </ul>
      </section>

      <section id="cancellations">
        <h2 style={styles.h2}>5. Rescheduling & Cancellations</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            You can reschedule or cancel in the client portal or by contacting us.
            Please provide at least <strong>24 hours’ notice</strong>.
          </li>
          <li style={styles.p}>
            Cancellations or lock-outs with less than 24 hours’ notice may incur a
            <strong> late-cancellation fee</strong> (typically up to the lesser of
            $50 or the booked service minimum). Missed appointments due to no entry
            may be charged a lock-out fee.
          </li>
        </ul>
      </section>

      <section id="access">
        <h2 style={styles.h2}>6. Home Access & Safety</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            Please ensure safe entry (keys, codes, gate/parking details) in your
            booking notes. Secure or put away valuables and sensitive documents.
          </li>
          <li style={styles.p}>
            For the safety of our team, we do not move heavy appliances or furniture,
            climb above a 2-step stool, or handle hazardous materials.
          </li>
          <li style={styles.p}>
            Pets should be secured if they are anxious around visitors; let us know
            about any special instructions.
          </li>
        </ul>
      </section>

      <section id="supplies">
        <h2 style={styles.h2}>7. Supplies, Damage & Limits</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            We bring standard, pet-safe supplies. If you prefer specific products,
            please provide them and note instructions.
          </li>
          <li style={styles.p}>
            Normal wear, pre-existing damage, improper surfaces, or items that are
            unstable/loose are outside our responsibility. Notify us within
            <strong> 24 hours</strong> of service if something appears unsatisfactory.
          </li>
          <li style={styles.p}>
            Our satisfaction policy: If you contact us within 24 hours, we will
            arrange a reasonable re-clean of the affected areas at no additional
            charge. Refunds are rare and at our discretion.
          </li>
        </ul>
      </section>

      <section id="photos">
        <h2 style={styles.h2}>8. Photos, Reviews & Testimonials</h2>
        <p style={styles.p}>
          With your permission, we may take before/after photos of areas serviced to
          verify quality or for marketing. We never share personal or identifying
          details without consent. You may withdraw permission at any time.
        </p>
      </section>

      <section id="privacy">
        <h2 style={styles.h2}>9. Privacy & Data</h2>
        <p style={styles.p}>
          We collect and process your information to provide services, manage
          accounts, and communicate about bookings. See our{" "}
          <a href="/privacy">Privacy Policy</a> for details about data practices,
          cookies, and your choices.
        </p>
      </section>

      <section id="other">
        <h2 style={styles.h2}>10. Other Terms</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            We may update these Terms at any time by posting the revised version on
            our website. Changes apply to bookings made after the effective date.
          </li>
          <li style={styles.p}>
            These Terms are governed by the laws of the state where service is
            performed. Any disputes will be handled in local courts of competent
            jurisdiction.
          </li>
          <li style={styles.p}>
            If any provision is found unenforceable, the remaining provisions remain
            in full force and effect.
          </li>
        </ul>
      </section>

      <section id="contact">
        <h2 style={styles.h2}>11. Contact</h2>
        <p style={styles.p}>
          Questions about these Terms? We’re here to help.
          <br />
          <strong>Sanchez Services</strong>
          <br />
          Phone: (555) 123-4567
          <br />
          Email: <a href="mailto:info@sanchezservices.com">info@sanchezservices.com</a>
          <br />
          Serving Greater Metro Area
        </p>
      </section>

      <a href="#top" style={styles.backTop}>Back to top</a>

      <p style={{ ...styles.p, marginTop: 16, color: "#777" }}>
        <em>
          Note: This page is for general informational purposes only and does not
          constitute legal advice. Consider having your counsel review the final
          policy language for compliance with local laws.
        </em>
      </p>
    </main>
  );
}
