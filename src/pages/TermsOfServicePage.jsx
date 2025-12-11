// src/pages/TermOfServicePage.jsx
import React from "react";

const styles = {
  wrap: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  h1: { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b6b6b", marginBottom: 20, fontSize: 14 },
  h2: { fontSize: 18, fontWeight: 800, marginTop: 24, marginBottom: 10 },
  h3: { fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  p: { lineHeight: 1.7, margin: "10px 0", fontSize: 14 },
  ul: { paddingLeft: 18, margin: "10px 0" },
  tag: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#f3e4b2",
    color: "#2b0c28",
    fontWeight: 600,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 12,
  },
  toc: {
    border: "1px solid #ece6ef",
    borderRadius: 12,
    padding: 12,
    background: "#fff8fb",
    margin: "12px 0 20px",
    fontSize: 14,
  },
  backTop: {
    marginTop: 24,
    display: "inline-block",
    textDecoration: "none",
    background: "#d4a517",
    color: "#2b0c28",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
  },
};

// Responsive overrides for larger screens
const mediaQueryStyles = `
  @media (min-width: 640px) {
    .tos-wrap { padding: 32px 18px !important; }
    .tos-h1 { font-size: 34px !important; }
    .tos-sub { font-size: 15px !important; margin-bottom: 24px !important; }
    .tos-h2 { font-size: 20px !important; margin-top: 26px !important; }
    .tos-h3 { font-size: 17px !important; margin-top: 17px !important; }
    .tos-p, .tos-toc { font-size: 15px !important; }
    .tos-ul { padding-left: 20px !important; }
    .tos-tag { padding: 5.5px 11px !important; margin-right: 7px !important; margin-bottom: 7px !important; font-size: 13px !important; }
    .tos-toc { padding: 14px !important; margin: 14px 0 22px !important; }
    .tos-backTop { padding: 9px 15px !important; margin-top: 26px !important; font-size: 15px !important; }
  }
  @media (min-width: 768px) {
    .tos-wrap { padding: 40px 20px !important; }
    .tos-h1 { font-size: 40px !important; }
    .tos-sub { font-size: 16px !important; margin-bottom: 28px !important; }
    .tos-h2 { font-size: 22px !important; margin-top: 28px !important; }
    .tos-h3 { font-size: 18px !important; margin-top: 18px !important; }
    .tos-p, .tos-toc { font-size: 16px !important; }
    .tos-ul { padding-left: 22px !important; }
    .tos-tag { padding: 6px 12px !important; margin-right: 8px !important; margin-bottom: 8px !important; font-size: 14px !important; }
    .tos-toc { padding: 16px !important; margin: 16px 0 24px !important; }
    .tos-backTop { padding: 10px 16px !important; margin-top: 28px !important; font-size: 16px !important; }
  }
`;

export default function TermOfServicePage() {
  const year = new Date().getFullYear();
  return (
    <>
      <style>{mediaQueryStyles}</style>
      <main style={styles.wrap} className="tos-wrap">
        <a id="top" />
        <h1 style={styles.h1} className="tos-h1">Terms of Service</h1>
        <p style={styles.sub} className="tos-sub">Effective: August 24, {year}</p>

        <div style={styles.toc} className="tos-toc">
          <strong>Quick Links</strong>
          <ul style={styles.ul} className="tos-ul">
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
          <h2 style={styles.h2} className="tos-h2">1. Agreement</h2>
          <p style={styles.p} className="tos-p">
          These Terms of Service (“Terms”) govern services provided by{" "}
          <strong>Sanchez Services</strong> (“we,” “us,” or “our”). By booking or
          receiving services, you agree to these Terms. If you do not agree, please
          do not use our services.
        </p>
          <p style={styles.p} className="tos-p">
            <span style={styles.tag} className="tos-tag">Licensed & Insured</span>
            <span style={styles.tag} className="tos-tag">Residential & Commercial</span>
            <span style={styles.tag} className="tos-tag">Rhode Island & Massachusetts</span>
          </p>
        </section>

        <section id="services">
          <h2 style={styles.h2} className="tos-h2">2. Services & Booking</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              We provide residential cleaning, deep cleans, move-in/move-out cleaning,
              and light commercial/office cleaning. Specific scope is confirmed during
              booking.
            </li>
            <li style={styles.p} className="tos-p">
              Arrival windows are estimates. Delays may occur due to traffic, weather,
              or prior jobs; we'll notify you of material changes.
            </li>
            <li style={styles.p} className="tos-p">
              We reserve the right to decline or stop a job if conditions are unsafe,
              unsanitary (including biohazards), or outside agreed scope.
            </li>
          </ul>
        </section>

        <section id="accounts">
          <h2 style={styles.h2} className="tos-h2">3. Client Accounts</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              Our client portal allows you to manage bookings, update notes, and view
              invoices.
            </li>
            <li style={styles.p} className="tos-p">
              You are responsible for safeguarding your login credentials and account
              activity.
            </li>
            <li style={styles.p} className="tos-p">
              Accounts may be suspended if misused or fraudulent.
            </li>
          </ul>
        </section>

        <section id="payments">
          <h2 style={styles.h2} className="tos-h2">4. Pricing & Payments</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              Online quotes are estimates. Final pricing may be adjusted after a
              walk-through prior to service.
            </li>
            <li style={styles.p} className="tos-p">
              A non-refundable deposit may be required to confirm your appointment.
              Remaining balance is due upon service completion unless otherwise
              agreed.
            </li>
            <li style={styles.p} className="tos-p">
              We accept major cards, cash, and other methods listed at booking.
            </li>
          </ul>
        </section>

        <section id="cancellations">
          <h2 style={styles.h2} className="tos-h2">5. Rescheduling & Cancellations</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              Please provide at least <strong>24 hours' notice</strong> to reschedule
              or cancel.
            </li>
            <li style={styles.p} className="tos-p">
              Late cancellations or lock-outs (less than 24 hours) may result in a{" "}
              <strong>cancellation fee of up to $50</strong> or loss of deposit.
            </li>
            <li style={styles.p} className="tos-p">
              Missed appointments due to no entry may be charged as a full visit.
            </li>
          </ul>
        </section>

        <section id="access">
          <h2 style={styles.h2} className="tos-h2">6. Home Access & Safety</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              Ensure safe entry by providing keys, codes, or parking details in
              advance. Please secure valuables.
            </li>
            <li style={styles.p} className="tos-p">
              For staff safety, we do not move heavy appliances, climb above a
              2-step stool, or handle hazardous/biohazardous materials.
            </li>
            <li style={styles.p} className="tos-p">
              Pets should be secured if anxious around visitors. Let us know of
              special instructions.
            </li>
          </ul>
        </section>

        <section id="supplies">
          <h2 style={styles.h2} className="tos-h2">7. Supplies, Damage & Limits</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              We bring standard, pet-safe supplies. If you prefer specific products,
              please provide them.
            </li>
            <li style={styles.p} className="tos-p">
              We are not responsible for normal wear, pre-existing damage, or unstable
              items. Report concerns within <strong>24 hours</strong>.
            </li>
            <li style={styles.p} className="tos-p">
              If contacted within 24 hours, we will re-clean affected areas at no
              charge. Refunds are rare and discretionary.
            </li>
          </ul>
        </section>

        <section id="photos">
          <h2 style={styles.h2} className="tos-h2">8. Photos, Reviews & Testimonials</h2>
          <p style={styles.p} className="tos-p">
            With your permission, we may take before/after photos for quality
            assurance or marketing. We do not share identifying details without
            consent. Permission can be withdrawn anytime.
          </p>
        </section>

        <section id="privacy">
          <h2 style={styles.h2} className="tos-h2">9. Privacy & Data</h2>
          <p style={styles.p} className="tos-p">
            We collect and use your information only to provide services, manage
            accounts, and communicate about bookings. See our{" "}
            <a href="/privacy-policy">Privacy Policy</a> for details.
          </p>
        </section>

        <section id="other">
          <h2 style={styles.h2} className="tos-h2">10. Other Terms</h2>
          <ul style={styles.ul} className="tos-ul">
            <li style={styles.p} className="tos-p">
              We may update these Terms by posting a new version on our website.
              Updates apply to future bookings.
            </li>
            <li style={styles.p} className="tos-p">
              These Terms are governed by Rhode Island and Massachusetts law.
              Disputes will be handled in local courts of competent jurisdiction.
            </li>
            <li style={styles.p} className="tos-p">
              If any provision is unenforceable, the remainder remains valid.
            </li>
          </ul>
        </section>

        <section id="contact">
          <h2 style={styles.h2} className="tos-h2">11. Contact</h2>
          <p style={styles.p} className="tos-p">
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

        <a href="#top" style={styles.backTop} className="tos-backTop">
          Back to top
        </a>

        <p style={{ ...styles.p, marginTop: 16, color: "#777" }} className="tos-p">
          <em>
            Note: This page is for informational purposes only and does not
            constitute legal advice. Please consult a local attorney if you want
            legal review of these Terms.
          </em>
        </p>
      </main>
    </>
  );
}
