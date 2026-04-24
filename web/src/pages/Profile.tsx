import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Typography, Form, Input, Button,
  Select, List, Space, Tag, Modal, message, Avatar, Alert, Divider,
} from 'antd';
import {
  PlusOutlined, ShopOutlined, SettingOutlined,
  EnvironmentOutlined, PhoneOutlined,
  CheckCircleOutlined, UserOutlined, CrownOutlined,
  ExclamationCircleOutlined, SafetyOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BusinessAPI, AuthAPI } from '@/services/api';
import { tokens, cactusTheme, darkTokens } from '@/theme';

const { Title, Text } = Typography;

const TIER_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  free:     { label: 'Free',     color: '#64748B',      desc: 'Free forever · Upgrade to unlock more' },
  standard: { label: 'Standard', color: tokens.primary, desc: 'Monthly Plan (Active)' },
  premium:  { label: 'Premium',  color: '#F97316',      desc: 'Premium Plan (Active)' },
};

export default function ProfilePage() {
  const { business, businesses, user, setActiveBusiness, initialize, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [createForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tier = (business?.subscription_tier ?? 'free').toLowerCase();
  const tierInfo = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

  useEffect(() => {
    profileForm.setFieldsValue({
      biz_name: business?.name ?? '',
      business_type: business?.business_type ?? '',
      location: business?.location ?? '',
      biz_phone: business?.phone ?? '',
      currency: business?.currency ?? 'KES',
      owner_name: user?.name ?? '',
      owner_phone: user?.phone ?? '',
    });
  }, [business, user, profileForm]);

  async function handleUpdateProfile(values: any) {
    if (!business) return;
    setSaving(true);
    try {
      await Promise.all([
        BusinessAPI.update(business.id, {
          name: values.biz_name,
          business_type: values.business_type,
          location: values.location,
          phone: values.biz_phone,
          currency: values.currency,
        }),
        AuthAPI.updateMe({ name: values.owner_name, phone: values.owner_phone }),
      ]);
      message.success('Profile updated successfully!');
      await initialize();
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
      message.error(`Failed to update profile: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateBusiness(values: any) {
    setCreating(true);
    try {
      await BusinessAPI.create(values);
      message.success('New business profile created!');
      await initialize();
      setIsModalOpen(false);
      createForm.resetFields();
    } catch {
      message.error('Failed to create business profile.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
      message.error(`Failed to delete account: ${detail}`);
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 32, fontWeight: 500, fontSize: 24 }}>
        Business Settings
      </Title>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={14}>
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 32 }}
            title={<Space><SettingOutlined /> <Text strong>Active Profile Details</Text></Space>}
          >
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Text style={{ display: 'block', marginBottom: 14, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>
                BUSINESS INFO
              </Text>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Business Name" name="biz_name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Industry / Type" name="business_type">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Location" name="location">
                    <Input prefix={<EnvironmentOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Business Phone" name="biz_phone">
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Currency" name="currency">
                <Select
                  options={[
                    { label: 'Kenyan Shilling (KSh)', value: 'KES' },
                    { label: 'US Dollar ($)', value: 'USD' },
                    { label: 'Euro (€)', value: 'EUR' },
                  ]}
                />
              </Form.Item>

              <Text style={{ display: 'block', marginBottom: 14, marginTop: 8, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>
                YOUR ACCOUNT
              </Text>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Your Name" name="owner_name">
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Your Phone" name="owner_phone">
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  style={{ background: darkTokens.sidebarBg, borderRadius: 8, border: 'none', color: '#fff', height: 40 }}
                >
                  Update Profile
                </Button>
              </div>
            </Form>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 32 }}
            title={<Space><CheckCircleOutlined /> <Text strong>Subscription & Billing</Text></Space>}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Space>
                  <Text strong style={{ fontSize: 18, color: tierInfo.color }}>{tierInfo.label} Tier</Text>
                  {tier !== 'free' && <Tag color="success" bordered={false}>Active</Tag>}
                </Space>
                <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                  {tierInfo.desc}
                </Text>
              </div>
              <Button
                icon={<CrownOutlined />}
                style={{ borderRadius: 8, background: darkTokens.sidebarBg, color: '#fff', border: 'none', height: 40 }}
                onClick={() => navigate('/pricing')}
              >
                {tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
              </Button>
            </div>
          </Card>

          {/* Legal & Policies */}
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 32 }}
            title={<Space><SafetyOutlined /> <Text strong>Legal & Policies</Text></Space>}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={0}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <Space>
                  <FileTextOutlined style={{ color: '#64748B' }} />
                  <Text>Terms of Service</Text>
                </Space>
                <Link to="/terms" target="_blank" style={{ color: darkTokens.sidebarBg, fontWeight: 600, fontSize: 13 }}>
                  View →
                </Link>
              </div>
              <Divider style={{ margin: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <Space>
                  <FileTextOutlined style={{ color: '#64748B' }} />
                  <Text>Privacy Policy</Text>
                </Space>
                <Link to="/privacy" target="_blank" style={{ color: darkTokens.sidebarBg, fontWeight: 600, fontSize: 13 }}>
                  View →
                </Link>
              </div>
              <Divider style={{ margin: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <Space>
                  <FileTextOutlined style={{ color: '#64748B' }} />
                  <Text>Cookie Policy</Text>
                </Space>
                <Link to="/cookies" target="_blank" style={{ color: darkTokens.sidebarBg, fontWeight: 600, fontSize: 13 }}>
                  View →
                </Link>
              </div>
            </Space>
          </Card>

          {/* Danger Zone */}
          <Card
            variant="borderless"
            style={{
              borderRadius: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #EF4444',
            }}
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#EF4444' }} />
                <Text strong style={{ color: '#EF4444' }}>Danger Zone</Text>
              </Space>
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <Text strong>Delete Account</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                  Permanently remove your account and all associated business data. This cannot be undone.
                </Text>
              </div>
              <Button
                danger
                style={{ borderRadius: 8, height: 40, flexShrink: 0 }}
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            title={<Text strong>Your Business Profiles</Text>}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                style={{ borderRadius: 6, background: (businesses.length >= 1 && tier === 'free') ? '#94A3B8' : darkTokens.sidebarBg, border: 'none' }}
                onClick={() => {
                  if (businesses.length >= 1 && tier === 'free') {
                    navigate('/pricing');
                  } else {
                    setIsModalOpen(true);
                  }
                }}
              >
                {(businesses.length >= 1 && tier === 'free') ? 'Upgrade' : 'Add'}
              </Button>
            }
          >
            <List
              dataSource={businesses}
              locale={{ emptyText: 'No business profiles yet' }}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '16px 12px',
                    borderRadius: 10,
                    background: item.id === business?.id ? '#F1F5F9' : 'transparent',
                    marginBottom: 8,
                    border: item.id === business?.id ? `1px solid ${cactusTheme.border}` : '1px solid transparent',
                  }}
                  onClick={() => setActiveBusiness(item)}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<ShopOutlined />} style={{ background: darkTokens.sidebarBg }} />}
                    title={<Text strong>{item.name}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.business_type} · {item.location || 'Online'}
                      </Text>
                    }
                  />
                  {item.id === business?.id && <Tag color="blue" bordered={false}>Active</Tag>}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Create Business Modal */}
      <Modal
        title="Create New Business Profile"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        okText="Create Business"
        okButtonProps={{ style: { background: darkTokens.sidebarBg, borderRadius: 8, border: 'none' } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateBusiness} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Business Name" rules={[{ required: true, message: 'Please enter business name' }]}>
            <Input placeholder="e.g. Acme Retail Ltd" />
          </Form.Item>
          <Form.Item name="business_type" label="Business Type" rules={[{ required: true }]}>
            <Select
              placeholder="Select industry"
              options={[
                { label: 'Retail Shop', value: 'Retail' },
                { label: 'Restaurant / Cafe', value: 'F&B' },
                { label: 'Service Business', value: 'Service' },
                { label: 'Hardware Store', value: 'Hardware' },
                { label: 'Pharmacy', value: 'Pharmacy' },
                { label: 'Salon / Barbershop', value: 'Salon' },
                { label: 'Wholesale / Distributor', value: 'Wholesale' },
                { label: 'Electronics Shop', value: 'Electronics' },
                { label: 'Other', value: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="location" label="Location (Optional)">
            <Input placeholder="e.g. Nairobi, CBD" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#EF4444' }} />
            <span>Delete Account</span>
          </Space>
        }
        open={deleteModalOpen}
        onCancel={() => { setDeleteModalOpen(false); setDeleteConfirmText(''); }}
        footer={null}
        width={480}
      >
        <Alert
          type="error"
          showIcon
          message="This action is permanent and irreversible"
          description="All your businesses, sales records, expenses, products, and account data will be permanently deleted. There is no way to recover this data."
          style={{ marginBottom: 20, marginTop: 8 }}
        />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Type <Text strong code>DELETE</Text> below to confirm:
        </Text>
        <Input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE"
          style={{ marginTop: 8, marginBottom: 20 }}
          onPressEnter={handleDeleteAccount}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(''); }}>
            Cancel
          </Button>
          <Button
            danger
            type="primary"
            loading={deleting}
            disabled={deleteConfirmText !== 'DELETE'}
            onClick={handleDeleteAccount}
          >
            Permanently Delete Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
