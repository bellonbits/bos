import { useState } from 'react';
import { Row, Col, Typography, Button, Tag, Space, message } from 'antd';
import { CheckCircleFilled, CrownOutlined, RocketOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { BusinessAPI } from '@/services/api';
import { cactusTheme, darkTokens } from '@/theme';

const { Title, Text } = Typography;

interface Plan {
  key: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    icon: <ThunderboltOutlined />,
    color: '#64748B',
    features: [
      'Point of Sale (Online & Offline)',
      'Up to 50 Products',
      'Daily Revenue Reports',
      '1 Business Profile',
      'Basic Dashboard',
    ],
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 499,
    icon: <RocketOutlined />,
    color: cactusTheme.accent,
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited Products',
      'Expense Tracking',
      'AI Business Insights',
      'Weekly Financial Reports',
      'Data Export (CSV)',
      'Multiple Business Profiles',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 999,
    icon: <CrownOutlined />,
    color: darkTokens.sidebarBg,
    features: [
      'Everything in Standard',
      'Up to 5 Branch Locations',
      'Staff Accounts (Cashiers)',
      'Advanced Analytics',
      'Balance Sheet & Cash Flow',
      'Priority Support',
      'Custom Integrations',
    ],
  },
];

// KSh formatter without the util import to keep this self-contained
function kes(n: number) { return `KSh ${n.toLocaleString('en-KE')}`; }

export default function PricingPage() {
  const { business, initialize } = useAuthStore();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const currentTier = (business?.subscription_tier ?? 'free').toLowerCase();

  async function handleUpgrade(planKey: string) {
    if (planKey === currentTier) return;
    if (!business) { message.error('No active business selected.'); return; }

    setUpgrading(planKey);
    try {
      await BusinessAPI.update(business.id, { subscription_tier: planKey });
      await initialize();
      message.success(`Switched to ${PLANS.find((p) => p.key === planKey)?.name} plan!`);
    } catch {
      message.error('Plan change failed. Please try again.');
    } finally {
      setUpgrading(null);
    }
  }

  const planRank = (key: string) => PLANS.findIndex((p) => p.key === key);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <Title style={{ fontWeight: 700, fontSize: 36, margin: 0 }}>Simple, Transparent Pricing</Title>
        <Text type="secondary" style={{ fontSize: 16, marginTop: 12, display: 'block' }}>
          Choose the best plan for your business. Upgrade or downgrade anytime.
        </Text>
        <div style={{ marginTop: 16 }}>
          <Tag bordered={false} color="success" style={{ borderRadius: 20, padding: '4px 14px' }}>
            Current plan: <strong>{PLANS.find((p) => p.key === currentTier)?.name ?? 'Free'}</strong>
          </Tag>
        </div>
      </div>

      <Row gutter={[24, 24]} justify="center">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentTier;
          const isDowngrade = planRank(plan.key) < planRank(currentTier);
          const isLoading = upgrading === plan.key;

          return (
            <Col key={plan.key} xs={24} md={8}>
              <div
                style={{
                  position: 'relative',
                  padding: '32px 28px',
                  borderRadius: 20,
                  border: plan.popular ? `2px solid ${cactusTheme.accent}` : '1px solid #E2E8F0',
                  background: isCurrent ? '#F8FAFC' : '#fff',
                  boxShadow: plan.popular
                    ? '0 8px 32px rgba(16,185,129,0.12)'
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }}>
                    <Tag
                      style={{
                        background: cactusTheme.accent, color: '#fff', border: 'none',
                        borderRadius: 20, padding: '4px 16px', fontWeight: 700,
                        fontSize: 11, letterSpacing: 1,
                      }}
                    >
                      MOST POPULAR
                    </Tag>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <Space>
                    <span style={{ fontSize: 22, color: plan.color }}>{plan.icon}</span>
                    <Text strong style={{ fontSize: 20, color: plan.color }}>{plan.name}</Text>
                  </Space>
                  <div style={{ marginTop: 16 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: '#1E293B' }}>
                      {kes(plan.price)}
                    </span>
                    <Text type="secondary" style={{ fontSize: 14 }}>/mo</Text>
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: 28 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <CheckCircleFilled style={{ color: cactusTheme.accent, fontSize: 15, marginTop: 1, flexShrink: 0 }} />
                      <Text style={{ fontSize: 14, lineHeight: 1.5 }}>{f}</Text>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button block disabled style={{ height: 48, borderRadius: 12, fontWeight: 700 }}>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    block
                    type={isDowngrade ? 'default' : 'primary'}
                    icon={plan.icon}
                    style={{
                      height: 48, borderRadius: 12, fontWeight: 700, border: 'none',
                      background: isDowngrade
                        ? '#F8FAFC'
                        : plan.popular ? cactusTheme.accent : darkTokens.sidebarBg,
                      color: isDowngrade ? '#64748B' : '#fff',
                    }}
                    onClick={() => handleUpgrade(plan.key)}
                    loading={isLoading}
                    disabled={!!upgrading && !isLoading}
                  >
                    {isDowngrade ? `Downgrade to ${plan.name}` : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      <div style={{ textAlign: 'center', marginTop: 48, padding: '0 40px' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          All plans include offline-first POS. Billing via M-Pesa Paybill or card.
          Changes take effect immediately.
        </Text>
      </div>
    </div>
  );
}
