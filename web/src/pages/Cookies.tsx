import { Typography, Divider, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { darkTokens, cactusTheme } from '@/theme';

const { Title, Text, Paragraph } = Typography;

const EFFECTIVE_DATE = '24 April 2026';
const COMPANY = 'Biashara OS Ltd';
const EMAIL = 'privacy@biashara.co.ke';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 40 }}>
      <Title level={3} style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</Title>
      {children}
    </section>
  );
}

function CookieRow({
  name, type, purpose, duration, canDecline,
}: {
  name: string; type: 'Essential' | 'Functional' | 'Analytics';
  purpose: string; duration: string; canDecline: boolean;
}) {
  const typeColor = type === 'Essential' ? 'blue' : type === 'Functional' ? 'green' : 'orange';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 100px 2fr 120px 80px',
      gap: 12, padding: '14px 16px', borderBottom: '1px solid #F1F5F9',
      fontSize: 13, alignItems: 'center',
    }}>
      <Text strong style={{ fontSize: 13 }}>{name}</Text>
      <Tag color={typeColor} bordered={false} style={{ borderRadius: 6, fontWeight: 600 }}>{type}</Tag>
      <Text type="secondary">{purpose}</Text>
      <Text type="secondary">{duration}</Text>
      <Tag color={canDecline ? 'orange' : 'default'} bordered={false}>
        {canDecline ? 'Optional' : 'Required'}
      </Tag>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: darkTokens.sidebarBg, padding: '24px 40px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <img src="/bos.png" alt="Biashara OS" style={{ height: 36, objectFit: 'contain' }} />
        <div style={{ flex: 1 }} />
        <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>← Back to App</Link>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <Title style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Cookie Policy</Title>
          <Text type="secondary">Effective Date: {EFFECTIVE_DATE}</Text>
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            This policy explains how {COMPANY} uses cookies and similar technologies when you use Biashara OS.
          </Text>
        </div>

        <Section id="what-are-cookies" title="1. What Are Cookies?">
          <Paragraph>
            Cookies are small text files placed on your device when you visit a website. They allow the site to remember information about your visit — such as your preferred settings or login state — making your next visit easier and more useful.
          </Paragraph>
          <Paragraph>
            Biashara OS is primarily a web application (not a traditional marketing website), and we use <strong>localStorage</strong> (a browser storage mechanism) and session tokens rather than traditional HTTP cookies for core functionality. This Cookie Policy covers all such client-side storage technologies.
          </Paragraph>
        </Section>

        <Section id="types" title="2. Types of Cookies We Use">
          <Paragraph style={{ marginBottom: 4 }}>
            We classify our cookies into three categories:
          </Paragraph>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 2fr 120px 80px',
              gap: 12, padding: '12px 16px', background: '#F8FAFC',
              fontWeight: 700, fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              <span>Name / Key</span><span>Type</span><span>Purpose</span><span>Duration</span><span>Status</span>
            </div>

            <CookieRow
              name="access_token"
              type="Essential"
              purpose="Stores your JWT authentication token to keep you logged in"
              duration="1 hour"
              canDecline={false}
            />
            <CookieRow
              name="refresh_token"
              type="Essential"
              purpose="Used to renew your session without requiring re-login"
              duration="30 days"
              canDecline={false}
            />
            <CookieRow
              name="active_business_id"
              type="Essential"
              purpose="Remembers which business profile you last selected"
              duration="Persistent"
              canDecline={false}
            />
            <CookieRow
              name="bos_cookie_consent"
              type="Essential"
              purpose="Stores your cookie consent preference"
              duration="12 months"
              canDecline={false}
            />
            <CookieRow
              name="posStore (offline cache)"
              type="Functional"
              purpose="Persists your POS cart and offline transaction queue for offline-first operation"
              duration="Session / Until cleared"
              canDecline={false}
            />
            <CookieRow
              name="Analytics events"
              type="Analytics"
              purpose="Anonymised usage event tracking to understand feature adoption and improve the Service"
              duration="Session"
              canDecline={true}
            />
          </div>
        </Section>

        <Section id="essential" title="3. Essential Cookies — Why They Cannot Be Disabled">
          <Paragraph>
            Essential cookies are strictly necessary for the Service to function. Without them, you cannot log in, switch business profiles, or use offline POS features. Because they are required for the service you have requested, we do not need your consent to set them under the Kenya Data Protection Act, 2019.
          </Paragraph>
          <Paragraph>
            Your authentication tokens (<code>access_token</code>, <code>refresh_token</code>) are stored in <code>localStorage</code>, not in HTTP cookies, which means they are not transmitted to our server automatically on every request — reducing exposure to CSRF attacks.
          </Paragraph>
        </Section>

        <Section id="functional" title="4. Functional Cookies">
          <Paragraph>
            Functional storage (such as the POS offline cart state) remembers your in-progress sales session when you go offline. This data is stored entirely on your device using browser storage APIs and is cleared when you complete or cancel a transaction.
          </Paragraph>
        </Section>

        <Section id="analytics" title="5. Analytics">
          <Paragraph>
            We use anonymised analytics to understand how features are used. Analytics data does not include personal identifiers. If you choose "Essential Only" in the cookie banner, analytics tracking is disabled.
          </Paragraph>
          <Paragraph>
            We do not use any third-party advertising networks or tracking pixels (e.g., Meta Pixel, Google Ads) on the Biashara OS application.
          </Paragraph>
        </Section>

        <Section id="third-party" title="6. Third-Party Cookies">
          <Paragraph>
            Biashara OS does not embed third-party advertising or social media widgets that set their own cookies. The only third-party integrations are:
          </Paragraph>
          <ul style={{ paddingLeft: 24, lineHeight: 2.2, color: '#374151' }}>
            <li><strong>Safaricom M-Pesa API:</strong> Payment confirmation calls; no cookies set in your browser.</li>
            <li><strong>Cloud infrastructure providers:</strong> May set server-side session identifiers in HTTP headers, not accessible to browser JavaScript.</li>
          </ul>
        </Section>

        <Section id="manage" title="7. Managing Your Cookie Preferences">
          <Paragraph>
            You can manage your cookie preferences in the following ways:
          </Paragraph>

          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <Title level={5} style={{ margin: '0 0 8px' }}>Cookie Banner</Title>
            <Paragraph style={{ margin: 0 }}>
              When you first visit Biashara OS, a banner at the bottom of the screen allows you to <strong>Accept All</strong> (including analytics) or choose <strong>Essential Only</strong>. You can update this preference at any time by clearing your browser's localStorage (see instructions below).
            </Paragraph>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <Title level={5} style={{ margin: '0 0 8px' }}>Browser Settings</Title>
            <Paragraph style={{ margin: 0 }}>
              All major browsers allow you to view, block, or delete localStorage data and cookies:
            </Paragraph>
            <ul style={{ paddingLeft: 20, margin: '8px 0 0', lineHeight: 2, color: '#374151' }}>
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Site Settings → View permissions and data stored across sites</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Manage Data</li>
            </ul>
            <Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#64748B', fontSize: 13 }}>
              Note: Clearing essential storage keys will log you out of Biashara OS.
            </Paragraph>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20 }}>
            <Title level={5} style={{ margin: '0 0 8px' }}>Reset Consent</Title>
            <Paragraph style={{ margin: 0 }}>
              To reset your cookie consent and see the banner again, open your browser DevTools → Application → Local Storage → clear the <code>bos_cookie_consent</code> key and refresh the page.
            </Paragraph>
          </div>
        </Section>

        <Section id="changes" title="8. Changes to This Policy">
          <Paragraph>
            We may update this Cookie Policy as we add new features or as regulations change. Material changes will be communicated via in-app notice. The Effective Date at the top reflects when the current version came into force.
          </Paragraph>
        </Section>

        <Section id="contact" title="9. Contact">
          <Paragraph>
            For questions about our use of cookies or to exercise your data rights:
          </Paragraph>
          <Paragraph>
            <strong>{COMPANY}</strong><br />
            Nairobi, Kenya<br />
            Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </Paragraph>
        </Section>

        <Divider />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { to: '/terms', label: 'Terms of Service' },
            { to: '/privacy', label: 'Privacy Policy' },
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
