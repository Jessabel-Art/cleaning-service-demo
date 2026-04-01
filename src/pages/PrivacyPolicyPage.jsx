// src/pages/PrivacyPolicyPage.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

const styles = {
  wrap: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  h1: { fontSize: 28, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b6b6b", marginBottom: 20, fontSize: 14 },
  h2: { fontSize: 18, fontWeight: 800, marginTop: 24, marginBottom: 10 },
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
  }
};

// Responsive overrides for larger screens
const mediaQueryStyles = `
  @media (min-width: 640px) {
    .privacy-wrap { padding: 32px 18px !important; }
    .privacy-h1 { font-size: 34px !important; }
    .privacy-sub { font-size: 15px !important; margin-bottom: 24px !important; }
    .privacy-h2 { font-size: 20px !important; margin-top: 26px !important; }
    .privacy-p { font-size: 15px !important; }
    .privacy-ul { padding-left: 20px !important; }
    .privacy-tag { padding: 5.5px 11px !important; margin-right: 7px !important; margin-bottom: 7px !important; font-size: 13px !important; }
    .privacy-backTop { padding: 9px 15px !important; margin-top: 26px !important; font-size: 15px !important; }
  }
  @media (min-width: 768px) {
    .privacy-wrap { padding: 40px 20px !important; }
    .privacy-h1 { font-size: 40px !important; }
    .privacy-sub { font-size: 16px !important; margin-bottom: 28px !important; }
    .privacy-h2 { font-size: 22px !important; margin-top: 28px !important; }
    .privacy-p { font-size: 16px !important; }
    .privacy-ul { padding-left: 22px !important; }
    .privacy-tag { padding: 6px 12px !important; margin-right: 8px !important; margin-bottom: 8px !important; font-size: 14px !important; }
    .privacy-backTop { padding: 10px 16px !important; margin-top: 28px !important; font-size: 16px !important; }
  }
`;

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <Helmet>
        <title>Privacy Policy | Sanchez Services</title>
        <meta
          name="description"
          content="Read the Sanchez Services privacy policy to understand how we collect, use, and protect customer information for cleaning services in RI and MA."
        />
      </Helmet>
      <style>{mediaQueryStyles}</style>
      <main style={styles.wrap} className="privacy-wrap">
        <a id="top" />
        <h1 style={styles.h1} className="privacy-h1">Privacy Policy</h1>
        <p style={styles.sub} className="privacy-sub">Effective: August 24, {year}</p>

        <p style={styles.p} className="privacy-p">
          This Privacy Policy explains how <strong>Sanchez Services</strong> ("we," "us," or "our")
          collects, uses, and shares your information when you visit our website, create a client
          account, or book cleaning services in Rhode Island and Massachusetts. By using our services,
          you agree to this Policy. If you do not agree, please do not use our services.
        </p>

        <p style={styles.p} className="privacy-p">
          <span style={styles.tag} className="privacy-tag">Licensed & Insured</span>
          <span style={styles.tag} className="privacy-tag">Residential & Commercial</span>
          <span style={styles.tag} className="privacy-tag">Rhode Island & Massachusetts</span>
        </p>

        <section id="info-we-collect">
          <h2 style={styles.h2} className="privacy-h2">1) Information We Collect</h2>
          <ul style={styles.ul} className="privacy-ul">
            <li style={styles.p} className="privacy-p">
              <strong>Information you provide</strong> — name, email, phone, service address, access
              notes (gate codes/parking), service preferences, account credentials, and messages you send us.
            </li>
            <li style={styles.p} className="privacy-p">
              <strong>Payment information</strong> — processed securely by our payment providers.
              We do not store full card numbers on our servers.
            </li>
            <li style={styles.p} className="privacy-p">
              <strong>Automatically collected data</strong> — device/browser details, IP address,
              pages viewed, and interactions collected via cookies or analytics tools.
            </li>
            <li style={styles.p} className="privacy-p">
              <strong>From service partners</strong> — limited updates from scheduling, messaging,
              or review platforms to manage your bookings and feedback.
            </li>
          </ul>
        </section>

        <section id="how-we-use">
          <h2 style={styles.h2} className="privacy-h2">2) How We Use Your Information</h2>
          <ul style={styles.ul} className="privacy-ul">
            <li style={styles.p} className="privacy-p">Provide, schedule, and manage cleaning services.</li>
            <li style={styles.p} className="privacy-p">Create and maintain client portal accounts.</li>
            <li style={styles.p} className="privacy-p">Process payments and send invoices/receipts.</li>
            <li style={styles.p} className="privacy-p">Communicate about bookings, reminders, and service updates.</li>
            <li style={styles.p} className="privacy-p">Improve our website, services, and customer experience.</li>
            <li style={styles.p} className="privacy-p">Detect, prevent, and address security or fraud issues.</li>
            <li style={styles.p} className="privacy-p">Comply with legal obligations and enforce our Terms.</li>
          </ul>
        </section>

        <section id="sharing">
          <h2 style={styles.h2} className="privacy-h2">3) How We Share Information</h2>
          <ul style={styles.ul} className="privacy-ul">
            <li style={styles.p} className="privacy-p">
            <strong>Service providers</strong> — scheduling, messaging, analytics, payment processing,
            and bookkeeping partners that help us operate (access limited to what’s needed).
          </li>
          <li style={styles.p}>
            <strong>Legal & safety</strong> — to comply with law, respond to lawful requests,
            or protect rights, property, and safety.
          </li>
          <li style={styles.p}>
            <strong>Business transfers</strong> — if we undergo a merger, sale, or acquisition,
            information may transfer as part of the transaction.
          </li>
          <li style={styles.p}>
            <strong>With your consent</strong> — for example, publishing a testimonial or
            before/after photos you approve (never including personal details).
          </li>
        </ul>
        <p style={styles.p}>
          <strong>We do not sell your personal information</strong> and we do not share it with third
          parties for their own direct marketing.
        </p>
      </section>

      <section id="cookies">
        <h2 style={styles.h2}>4) Cookies & Analytics</h2>
          <p style={styles.p} className="privacy-p">
            We use cookies and similar technologies to run the site and understand usage
            (e.g., basic analytics). You can control cookies in your browser settings.
            Some features may not work without certain cookies.
          </p>
        </section>

        <section id="retention">
          <h2 style={styles.h2} className="privacy-h2">5) Data Retention</h2>
          <p style={styles.p} className="privacy-p">
            We retain personal information as long as necessary to provide services, comply with legal
            obligations, resolve disputes, and enforce agreements. When no longer needed, we take steps
            to delete or anonymize it.
          </p>
        </section>

        <section id="security">
          <h2 style={styles.h2} className="privacy-h2">6) Data Security</h2>
          <p style={styles.p} className="privacy-p">
            We implement reasonable administrative, technical, and physical safeguards to protect your
            information. No method of transmission or storage is 100% secure; we cannot guarantee
            absolute security.
          </p>
        </section>

        <section id="your-choices">
          <h2 style={styles.h2} className="privacy-h2">7) Your Choices & Rights</h2>
          <ul style={styles.ul} className="privacy-ul">
            <li style={styles.p} className="privacy-p">
            <strong>Access/Update</strong> — log in to your client portal or contact us to update account details.
          </li>
          <li style={styles.p}>
            <strong>Delete</strong> — request deletion of your account where permitted by law
            (we may retain limited records as required).
          </li>
          <li style={styles.p}>
            <strong>Marketing</strong> — opt out of non-essential emails/SMS by using unsubscribe links or contacting us.
          </li>
          <li style={styles.p}>
            <strong>Cookies</strong> — manage in your browser settings.
          </li>
        </ul>
      </section>

      <section id="children">
        <h2 style={styles.h2}>8) Children’s Privacy</h2>
        <p style={styles.p}>
          Our services are not directed to children under 13, and we do not knowingly collect their personal information.
        </p>
      </section>

      <section id="intl">
        <h2 style={styles.h2}>9) International Users</h2>
        <p style={styles.p}>
          We are a U.S.-based business serving Rhode Island and Massachusetts. If you access our services from outside
          the U.S., your information may be processed in the U.S. and other countries with different data laws than your country.
        </p>
      </section>

      <section id="dnt">
        <h2 style={styles.h2}>10) “Do Not Track”</h2>
        <p style={styles.p}>
          Some browsers offer a “Do Not Track” setting. We do not currently respond to DNT signals.
        </p>
      </section>

      <section id="changes">
        <h2 style={styles.h2}>11) Changes to This Policy</h2>
        <p style={styles.p}>
          We may update this Policy from time to time. The updated version will be indicated by an updated “Effective” date
          and is effective when posted.
        </p>
      </section>

      <section id="contact">
        <h2 style={styles.h2}>12) Contact Us</h2>
          <p style={styles.p} className="privacy-p">
            Questions about this Policy? Contact us:
            <br />
            <strong>Sanchez Services</strong>
            <br />
            Phone: (401) 658-6708
            <br />
            Email: <a href="mailto:sanchezservices24@yahoo.com">sanchezservices24@yahoo.com</a>
            <br />
            Serving all of Rhode Island & Massachusetts
          </p>
        </section>

        <a href="#top" style={styles.backTop} className="privacy-backTop">Back to top</a>

        <p style={{ ...styles.p, marginTop: 16, color: "#777" }} className="privacy-p">
          <em>
            This page is for general informational purposes and does not constitute legal advice.
            Consider legal review to ensure compliance with your local laws and industry obligations.
          </em>
        </p>
      </main>
    </>
  );
}
