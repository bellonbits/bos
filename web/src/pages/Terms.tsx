import { Typography, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { darkTokens, cactusTheme } from '@/theme';

const { Title, Text, Paragraph } = Typography;

const EFFECTIVE_DATE = '24 April 2026';
const COMPANY = 'Biashara OS Ltd';
const EMAIL = 'legal@biashara.co.ke';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40 }}>
      <Title level={3} style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</Title>
      {children}
    </section>
  );
}

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: darkTokens.sidebarBg, padding: '24px 40px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <img src="/bos.png" alt="Biashara OS" style={{ height: 36, objectFit: 'contain' }} />
        <div style={{ flex: 1 }} />
        <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>← Back to App</Link>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 40px 80px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 48 }}>
          <Title style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Terms of Service</Title>
          <Text type="secondary">Effective Date: {EFFECTIVE_DATE}</Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            These Terms govern your use of Biashara OS, operated by {COMPANY}.
          </Text>
        </div>

        <Paragraph style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: 16, fontSize: 14, marginBottom: 40 }}>
          Please read these Terms carefully before using Biashara OS. By registering an account or accessing our services, you agree to be bound by these Terms. If you do not agree, you must not use the service.
        </Paragraph>

        <Section id="definitions" title="1. Definitions">
          <Paragraph>
            <strong>"Service"</strong> refers to the Biashara OS web and mobile application, APIs, and related features provided by {COMPANY}.
          </Paragraph>
          <Paragraph>
            <strong>"Account"</strong> means the unique login and associated data profile you create to access the Service.
          </Paragraph>
          <Paragraph>
            <strong>"Business Profile"</strong> refers to a single commercial entity you manage within your Account.
          </Paragraph>
          <Paragraph>
            <strong>"User Data"</strong> means all sales records, expenses, inventory, and other business information you upload or generate using the Service.
          </Paragraph>
          <Paragraph>
            <strong>"Subscription"</strong> refers to the paid or free plan tier you select to access specific features.
          </Paragraph>
        </Section>

        <Section id="eligibility" title="2. Eligibility & Account Registration">
          <Paragraph>
            You must be at least 18 years old and have the legal authority to enter into a binding contract under the laws of Kenya to use the Service. By registering, you represent that:
          </Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2, color: '#374151' }}>
            <li>All registration information you provide is accurate and complete.</li>
            <li>You will keep your account credentials confidential and not share them with third parties.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You will notify us immediately at <a href={`mailto:${EMAIL}`}>{EMAIL}</a> if you suspect unauthorised access.</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            {COMPANY} reserves the right to suspend or terminate accounts that provide false information or violate these Terms.
          </Paragraph>
        </Section>

        <Section id="subscriptions" title="3. Subscription Plans & Billing">
          <Paragraph>
            Biashara OS offers three subscription tiers: <strong>Free</strong>, <strong>Standard</strong> (KSh 499/month), and <strong>Premium</strong> (KSh 999/month). Features available at each tier are as described on the Pricing page at the time of your subscription.
          </Paragraph>
          <Paragraph>
            <strong>Billing.</strong> Paid subscriptions are billed monthly in advance. Accepted payment methods include M-Pesa Paybill and supported debit/credit cards. All prices are inclusive of applicable taxes.
          </Paragraph>
          <Paragraph>
            <strong>Upgrades & Downgrades.</strong> You may change your plan at any time. Upgrades take effect immediately. Downgrades take effect at the start of the next billing cycle.
          </Paragraph>
          <Paragraph>
            <strong>Cancellation.</strong> You may cancel your subscription at any time from the Pricing page. Upon cancellation, your paid tier remains active until the end of the current billing period. We do not issue refunds for partial billing periods except where required by Kenyan consumer protection law.
          </Paragraph>
          <Paragraph>
            <strong>Free Tier Limits.</strong> The Free tier is subject to feature restrictions including a product catalogue limit of 50 items and access to basic reports only. {COMPANY} may adjust Free tier limits with 30 days' notice.
          </Paragraph>
        </Section>

        <Section id="acceptable-use" title="4. Acceptable Use">
          <Paragraph>You agree to use the Service only for lawful business management purposes. You must not:</Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2, color: '#374151' }}>
            <li>Use the Service to conduct fraudulent transactions or launder money.</li>
            <li>Attempt to reverse-engineer, decompile, or extract source code from the Service.</li>
            <li>Introduce malware, viruses, or any code designed to disrupt or harm the Service.</li>
            <li>Use automated scraping or bots to extract data from the Service without written permission.</li>
            <li>Resell or sublicense access to the Service to third parties.</li>
            <li>Use the Service in any manner that violates Kenyan law or applicable international regulations.</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            Violation of these restrictions may result in immediate account suspension without refund and referral to relevant authorities.
          </Paragraph>
        </Section>

        <Section id="intellectual-property" title="5. Intellectual Property">
          <Paragraph>
            The Service, including its software, design, trademarks, and content, is owned by {COMPANY} and protected under Kenyan intellectual property law. Nothing in these Terms transfers ownership of any {COMPANY} intellectual property to you.
          </Paragraph>
          <Paragraph>
            You retain full ownership of all User Data you submit to the Service. By using the Service, you grant {COMPANY} a limited, non-exclusive licence to store, process, and display your User Data solely for the purpose of providing the Service to you.
          </Paragraph>
        </Section>

        <Section id="data-ownership" title="6. Data Ownership & Portability">
          <Paragraph>
            Your business data belongs to you. You may export your data at any time using the CSV export feature available on paid plans. Upon account deletion, all your data is permanently and irreversibly removed from our systems within 30 days.
          </Paragraph>
        </Section>

        <Section id="third-party" title="7. Third-Party Services">
          <Paragraph>
            The Service integrates with third-party providers including Safaricom M-Pesa for payment processing. Use of these services is subject to their respective terms and privacy policies. {COMPANY} is not responsible for third-party service availability, accuracy, or data handling.
          </Paragraph>
        </Section>

        <Section id="availability" title="8. Service Availability & Warranty Disclaimer">
          <Paragraph>
            Biashara OS is designed as an offline-first application, enabling core POS functionality without an internet connection. Synchronisation features require periodic connectivity.
          </Paragraph>
          <Paragraph>
            <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE".</strong> {COMPANY} makes no warranty that the Service will be uninterrupted, error-free, or free from security vulnerabilities. We target 99% uptime for cloud features but do not guarantee it.
          </Paragraph>
        </Section>

        <Section id="liability" title="9. Limitation of Liability">
          <Paragraph>
            To the maximum extent permitted by law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the Service — including loss of profits, loss of data, or business interruption.
          </Paragraph>
          <Paragraph>
            Our total aggregate liability to you for any claim arising under or related to these Terms shall not exceed the total subscription fees paid by you in the 12 months preceding the claim.
          </Paragraph>
        </Section>

        <Section id="indemnification" title="10. Indemnification">
          <Paragraph>
            You agree to indemnify and hold {COMPANY}, its directors, employees, and agents harmless from any claims, liabilities, damages, and costs (including legal fees) arising from: (a) your breach of these Terms; (b) your User Data; or (c) your violation of any third-party right.
          </Paragraph>
        </Section>

        <Section id="termination" title="11. Termination">
          <Paragraph>
            You may delete your account at any time from the Business Settings page. {COMPANY} may suspend or terminate your account immediately if you breach these Terms, engage in fraudulent activity, or where required by law.
          </Paragraph>
          <Paragraph>
            Upon termination, your right to use the Service ceases immediately. Sections 5 (IP), 9 (Liability), 10 (Indemnification), and 13 (Governing Law) survive termination.
          </Paragraph>
        </Section>

        <Section id="governing-law" title="12. Governing Law & Dispute Resolution">
          <Paragraph>
            These Terms are governed by the laws of the Republic of Kenya. Any dispute arising out of or relating to these Terms shall first be submitted to good-faith negotiation. If unresolved within 30 days, the dispute shall be referred to the exclusive jurisdiction of the High Court of Kenya sitting in Nairobi.
          </Paragraph>
        </Section>

        <Section id="amendments" title="13. Amendments">
          <Paragraph>
            {COMPANY} may update these Terms from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Your continued use of the Service after that date constitutes acceptance of the revised Terms.
          </Paragraph>
        </Section>

        <Section id="contact" title="14. Contact">
          <Paragraph>
            For questions about these Terms, contact us at:
          </Paragraph>
          <Paragraph>
            <strong>{COMPANY}</strong><br />
            Nairobi, Kenya<br />
            Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </Paragraph>
        </Section>

        <Divider />

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { to: '/privacy', label: 'Privacy Policy' },
            { to: '/cookies', label: 'Cookie Policy' },
            { to: '/pricing', label: 'Pricing' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} style={{ color: cactusTheme.accent, fontSize: 13, fontWeight: 600 }}>{label}</Link>
          ))}
        </div>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          © {new Date().getFullYear()} {COMPANY}. All rights reserved.
        </Text>
      </div>
    </div>
  );
}
