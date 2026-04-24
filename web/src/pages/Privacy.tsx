import { Typography, Divider, Table } from 'antd';
import { Link } from 'react-router-dom';
import { darkTokens, cactusTheme } from '@/theme';

const { Title, Text, Paragraph } = Typography;

const EFFECTIVE_DATE = '24 April 2026';
const COMPANY = 'Biashara OS Ltd';
const DPO_EMAIL = 'privacy@biashara.co.ke';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40 }}>
      <Title level={3} style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</Title>
      {children}
    </section>
  );
}

const dataTable = [
  { category: 'Account Information', examples: 'Name, email address, phone number', purpose: 'Account creation, authentication, support', basis: 'Contract' },
  { category: 'Business Data', examples: 'Business name, type, location, currency', purpose: 'Operating your business profile', basis: 'Contract' },
  { category: 'Transaction Data', examples: 'Sales records, expenses, payment methods', purpose: 'Core POS and reporting features', basis: 'Contract' },
  { category: 'Product Catalogue', examples: 'Product names, prices, stock levels', purpose: 'Inventory and POS management', basis: 'Contract' },
  { category: 'Usage Data', examples: 'Pages visited, feature interactions, session duration', purpose: 'Improving the Service, analytics', basis: 'Legitimate interest' },
  { category: 'Device & Technical Data', examples: 'IP address, browser type, OS version', purpose: 'Security, fraud prevention, debugging', basis: 'Legitimate interest' },
  { category: 'Payment Data', examples: 'M-Pesa transaction codes (not card numbers)', purpose: 'Payment verification', basis: 'Contract' },
];

export default function PrivacyPage() {
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
          <Title style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</Title>
          <Text type="secondary">Effective Date: {EFFECTIVE_DATE}</Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            This Policy explains how {COMPANY} collects, uses, and protects your personal data.
          </Text>
        </div>

        <Paragraph style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 16, fontSize: 14, marginBottom: 40 }}>
          {COMPANY} is committed to protecting your privacy in accordance with the <strong>Kenya Data Protection Act, 2019</strong> and applicable international best practices. We act as the Data Controller for the personal data you provide when using Biashara OS.
        </Paragraph>

        <Section id="controller" title="1. Data Controller">
          <Paragraph>
            <strong>{COMPANY}</strong><br />
            Nairobi, Kenya<br />
            Data Protection Officer: <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>
          </Paragraph>
          <Paragraph>
            Our DPO is your primary contact for any privacy-related concerns. You may also lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> of Kenya at <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">odpc.go.ke</a>.
          </Paragraph>
        </Section>

        <Section id="data-collected" title="2. Data We Collect">
          <Paragraph>We collect the following categories of personal and business data:</Paragraph>
          <Table
            dataSource={dataTable}
            rowKey="category"
            pagination={false}
            size="small"
            style={{ marginTop: 12 }}
            columns={[
              { title: 'Category', dataIndex: 'category', key: 'category', width: 180 },
              { title: 'Examples', dataIndex: 'examples', key: 'examples' },
              { title: 'Purpose', dataIndex: 'purpose', key: 'purpose' },
              { title: 'Legal Basis', dataIndex: 'basis', key: 'basis', width: 150 },
            ]}
          />
          <Paragraph style={{ marginTop: 16 }}>
            We do not collect sensitive personal data (e.g., health, biometric, or financial account numbers) unless you explicitly provide it in a free-text field.
          </Paragraph>
        </Section>

        <Section id="legal-basis" title="3. Legal Basis for Processing">
          <Paragraph>We process your personal data under the following legal bases:</Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li><strong>Contract:</strong> Processing necessary to provide the Service you have requested (e.g., maintaining your account and business records).</li>
            <li><strong>Legitimate Interest:</strong> Improving the Service, preventing fraud, and ensuring security — where these interests do not override your rights.</li>
            <li><strong>Consent:</strong> Where we rely on your consent (e.g., marketing emails), you may withdraw it at any time without affecting prior processing.</li>
            <li><strong>Legal Obligation:</strong> Where we are required to retain data by Kenyan tax or regulatory law.</li>
          </ul>
        </Section>

        <Section id="how-we-use" title="4. How We Use Your Data">
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li>Provision and maintenance of your Biashara OS account and features.</li>
            <li>Processing transactions and generating financial reports.</li>
            <li>Sending transactional emails (account alerts, billing notifications).</li>
            <li>Analysing aggregate, anonymised usage patterns to improve the Service.</li>
            <li>Detecting and preventing fraud, abuse, and security incidents.</li>
            <li>Complying with legal obligations, including Kenya Revenue Authority (KRA) requirements.</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            We do not sell your personal data or User Data to third parties.
          </Paragraph>
        </Section>

        <Section id="sharing" title="5. Data Sharing & Disclosure">
          <Paragraph>We share data only in the following circumstances:</Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li><strong>Service Providers:</strong> Cloud infrastructure (database hosting, CDN), analytics tools, and email delivery providers — all bound by data processing agreements.</li>
            <li><strong>Payment Processors:</strong> Safaricom M-Pesa APIs for payment verification. We share only the minimum data required.</li>
            <li><strong>Legal Requirements:</strong> Where disclosure is required by a court order, government authority, or applicable law.</li>
            <li><strong>Business Transfer:</strong> In the event of a merger or acquisition, your data may be transferred to the successor entity, subject to the same protections.</li>
          </ul>
        </Section>

        <Section id="retention" title="6. Data Retention">
          <Paragraph>
            We retain your personal data and business records for as long as your account is active. If you delete your account, all personal data and User Data is permanently purged from our production systems within <strong>30 days</strong>. Anonymised, aggregated analytics data may be retained indefinitely.
          </Paragraph>
          <Paragraph>
            Financial transaction records may be retained for up to <strong>7 years</strong> in archived form to comply with Kenyan tax legislation, after which they are securely destroyed.
          </Paragraph>
        </Section>

        <Section id="your-rights" title="7. Your Rights">
          <Paragraph>Under the Kenya Data Protection Act, 2019, you have the right to:</Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> Correct inaccurate or incomplete data (available directly in Business Settings).</li>
            <li><strong>Erasure:</strong> Request deletion of your account and all associated data (available in Business Settings → Danger Zone).</li>
            <li><strong>Portability:</strong> Export your business data in CSV format (Standard and Premium plans).</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests, including profiling.</li>
            <li><strong>Restriction:</strong> Request that we limit how we process your data in certain circumstances.</li>
            <li><strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            To exercise any right, email <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>. We will respond within <strong>21 days</strong> as required by the KDPA. Identity verification may be required.
          </Paragraph>
        </Section>

        <Section id="security" title="8. Security">
          <Paragraph>
            We implement industry-standard technical and organisational measures to protect your data, including:
          </Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li>All data transmitted over HTTPS/TLS 1.3.</li>
            <li>Passwords hashed using bcrypt with a minimum cost factor of 12.</li>
            <li>JWT-based authentication with short-lived access tokens and rotating refresh tokens.</li>
            <li>Database access restricted to application servers only; no public exposure.</li>
            <li>Regular security reviews and dependency audits.</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            In the event of a data breach affecting your rights, we will notify you and the ODPC within <strong>72 hours</strong> of becoming aware of it.
          </Paragraph>
        </Section>

        <Section id="transfers" title="9. International Data Transfers">
          <Paragraph>
            Your data is primarily stored on servers located within or accessible from Kenya. Where we use third-party service providers based outside Kenya (e.g., cloud hosting), we ensure appropriate safeguards are in place through standard contractual clauses or equivalent mechanisms recognised under the KDPA.
          </Paragraph>
        </Section>

        <Section id="cookies" title="10. Cookies & Tracking">
          <Paragraph>
            We use cookies and similar technologies to operate the Service and improve your experience. For full details, please read our <Link to="/cookies" style={{ color: cactusTheme.accent }}>Cookie Policy</Link>.
          </Paragraph>
          <Paragraph>
            <strong>Essential cookies</strong> (authentication tokens stored in localStorage) are required to use the Service. You can decline non-essential cookies via the consent banner shown on first visit.
          </Paragraph>
        </Section>

        <Section id="children" title="11. Children's Privacy">
          <Paragraph>
            The Service is not directed at persons under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact our DPO immediately.
          </Paragraph>
        </Section>

        <Section id="changes" title="12. Changes to This Policy">
          <Paragraph>
            We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notice at least 14 days before they take effect. The "Effective Date" at the top of this page indicates when the current version came into force.
          </Paragraph>
        </Section>

        <Section id="contact" title="13. Contact Us">
          <Paragraph>
            For privacy-related enquiries or to exercise your rights:
          </Paragraph>
          <Paragraph>
            <strong>Data Protection Officer — {COMPANY}</strong><br />
            Nairobi, Kenya<br />
            Email: <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>
          </Paragraph>
          <Paragraph>
            You also have the right to complain to the <strong>Office of the Data Protection Commissioner (ODPC)</strong>:<br />
            <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">www.odpc.go.ke</a>
          </Paragraph>
        </Section>

        <Divider />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { to: '/terms', label: 'Terms of Service' },
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
