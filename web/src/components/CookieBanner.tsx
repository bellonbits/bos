import { useState, useEffect } from 'react';
import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { SafetyOutlined } from '@ant-design/icons';
import { darkTokens, cactusTheme } from '@/theme';

const { Text } = Typography;

const CONSENT_KEY = 'bos_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      // Small delay so the banner doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'all');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'essential');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: darkTokens.sidebarBg,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
      }}
    >
      <Space align="start" style={{ flex: 1 }}>
        <SafetyOutlined style={{ color: cactusTheme.accent, fontSize: 20, marginTop: 2, flexShrink: 0 }} />
        <div>
          <Text style={{ color: '#fff', fontWeight: 600, display: 'block', marginBottom: 2 }}>
            We use cookies
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.5 }}>
            Essential cookies keep you signed in. We also use optional analytics cookies to improve the Service.{' '}
            <Link to="/cookies" style={{ color: cactusTheme.accent }}>Cookie Policy</Link>
            {' · '}
            <Link to="/privacy" style={{ color: cactusTheme.accent }}>Privacy Policy</Link>
          </Text>
        </div>
      </Space>

      <Space size={10} wrap>
        <Button
          onClick={decline}
          style={{
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)',
            background: 'transparent',
            height: 38,
          }}
        >
          Essential Only
        </Button>
        <Button
          type="primary"
          onClick={accept}
          style={{
            borderRadius: 8,
            background: cactusTheme.accent,
            border: 'none',
            fontWeight: 700,
            height: 38,
          }}
        >
          Accept All Cookies
        </Button>
      </Space>
    </div>
  );
}
