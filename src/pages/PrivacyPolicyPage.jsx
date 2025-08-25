// src/pages/PrivacyPolicyPage.jsx
import React from "react";

const styles = {
  wrap: { maxWidth: 960, margin: "0 auto", padding: "40px 20px" },
  h1: { fontSize: 40, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b6b6b", marginBottom: 28 },
  h2: { fontSize: 22, fontWeight: 800, marginTop: 28, marginBottom: 10 },
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

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <main style={styles.wrap}>
      <a id="top" />
      <h1 style={styles.h1}>Privacy Policy</h1>
      <p style={styles.sub}>Effective: August 24, {year}</p>

      <p style={styles.p}>
        This Privacy Policy explains how <strong>Sanchez Services</strong>
        {" "} (“we,” “us,” or “our”) collects, uses, and shares your information
        when you visit our website, create a client account, or book cleaning
        services. By using our services, you agree to this Policy. If you do not
        agree, please do not use our services.
      </p>

      <p style={styles.p}>
        <span style={styles.tag}>Licensed & Insured</span>
        <span style={styles.tag}>Residential & Commercial</span>
        <span style={styles.tag}>Serving Greater Metro Area</span>
      </p>

      <section id="info-we-collect">
        <h2 style={styles.h2}>1) Information We Collect</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            <strong>Information you provide</strong> — name, email, phone,
            address, access notes (gate codes/parking), service preferences,
            account credentials, and messages you send us.
          </li>
          <li style={styles.p}>
            <strong>Payment information</strong> — processed securely by our
            payment providers (e.g., Stripe/PayPal). We do not store full card
            numbers on our servers.
          </li>
          <li style={styles.p}>
            <strong>Automatically collected data</strong> — device/browser
            details, IP address, pages viewed, and interactions collected via
            cookies or analytics (e.g., Google Analytics 4).
          </li>
          <li style={styles.p}>
            <strong>From service partners</strong> — limited updates from
            scheduling, messaging, or review platforms to manage your bookings
            and feedback.
          </li>
        </ul>
      </section>

      <section id="how-we-use">
        <h2 style={styles.h2}>2) How We Use Your Information</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>Provide, schedule, and manage cleaning services.</li>
          <li style={styles.p}>Create and maintain client portal accounts.</li>
          <li style={styles.p}>Process payments and send invoices/receipts.</li>
          <li style={styles.p}>Communicate about bookings, reminders, and service updates.</li>
          <li style={styles.p}>Improve our website, services, and customer experience.</li>
          <li style={styles.p}>Detect, prevent, and address security or fraud issues.</li>
          <li style={styles.p}>Comply with legal obligations and enforce our Terms.</li>
        </ul>
      </section>

      <section id="sharing">
        <h2 style={styles.h2}>3) How We Share Information</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            <strong>Service providers</strong> — scheduling, messaging,
            analytics, payment processing, and bookkeeping partners that help us
            operate (access limited to what’s needed).
          </li>
          <li style={styles.p}>
            <strong>Legal & safety</strong> — to comply with law, respond to
            lawful requests, or protect rights, property, and safety.
          </li>
          <li style={styles.p}>
            <strong>Business transfers</strong> — in a merger, sale, or
            acquisition, your information may transfer as part of the assets.
          </li>
          <li style={styles.p}>
            <strong>With your consent</strong> — e.g., publishing a testimonial
            or before/after photos you approve (never including personal details).
          </li>
        </ul>
      </section>

      <section id="cookies">
        <h2 style={styles.h2}>4) Cookies & Analytics</h2>
        <p style={styles.p}>
          We use cookies and similar technologies to run the site and understand
          usage (e.g., Google Analytics 4). You can control cookies in your browser
          settings. Some features may not work without certain cookies.
        </p>
      </section>

      <section id="retention">
        <h2 style={styles.h2}>5) Data Retention</h2>
        <p style={styles.p}>
          We retain personal information for as long as necessary to provide
          services, comply with legal obligations, resolve disputes, and enforce
          agreements. When no longer needed, we take steps to delete or anonymize it.
        </p>
      </section>

      <section id="security">
        <h2 style={styles.h2}>6) Data Security</h2>
        <p style={styles.p}>
          We implement reasonable administrative, technical, and physical
          safeguards to protect your information. No method of transmission or
          storage is 100% secure; we cannot guarantee absolute security.
        </p>
      </section>

      <section id="your-choices">
        <h2 style={styles.h2}>7) Your Choices & Rights</h2>
        <ul style={styles.ul}>
          <li style={styles.p}>
            <strong>Access/Update</strong> — log in to your client portal or
            contact us to update account details.
          </li>
          <li style={styles.p}>
            <strong>Delete</strong> — request deletion of your account where
            permitted by law (we may retain limited records as required).
          </li>
          <li style={styles.p}>
            <strong>Marketing</strong> — opt out of non-essential emails/SMS by
            using unsubscribe links or contacting us.
          </li>
          <li style={styles.p}>
            <strong>Cookies</strong> — manage in your browser settings.
          </li>
        </ul>
      </section>

      <section id="children">
        <h2 style={styles.h2}>8) Children’s Privacy</h2>
        <p style={styles.p}>
          Our services are not directed to children under 13, and we do not
          knowingly collect their personal information.
        </p>
      </section>

      <section id="intl">
        <h2 style={styles.h2}>9) International Users</h2>
        <p style={styles.p}>
          We are a U.S.-based business. If you access our services from outside
          the U.S., you understand your information may be processed in the U.S.
          and other countries with different data laws than your country.
        </p>
      </section>

      <section id="dnt">
        <h2 style={styles.h2}>10) “Do Not Track”</h2>
        <p style={styles.p}>
          Some browsers offer a “Do Not Track” setting. We do not currently
          respond to DNT signals.
        </p>
      </section>

      <section id="changes">
        <h2 style={styles.h2}>11) Changes to This Policy</h2>
        <p style={styles.p}>
          We may update this Policy from time to time. The updated version will
          be indicated by an updated “Effective” date and is effective when posted.
        </p>
      </section>

      <section id="contact">
        <h2 style={styles.h2}>12) Contact Us</h2>
        <p style={styles.p}>
          Questions about this Policy? Contact us:
          <br />
          <strong>Sanchez Services</strong>
          <br />
          Phone: (555) 123-4567
          <br />
          Email: <a href="mailto:privacy@sanchezservices.com">privacy@sanchezservices.com</a>
          <br />
          Mailing: [Your Business Address]
        </p>
      </section>

      <a href="#top" style={styles.backTop}>Back to top</a>

      <p style={{ ...styles.p, marginTop: 16, color: "#777" }}>
        <em>
          This template is for general informational purposes and does not
          constitute legal advice. Consider legal review to ensure compliance
          with your local laws and industry obligations.
        </em>
      </p>
    </main>
  );
}
