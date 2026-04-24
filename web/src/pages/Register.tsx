import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Select, Steps } from 'antd';
import {
  MailOutlined, LockOutlined, UserOutlined,
  ShopOutlined, TagOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { BusinessAPI } from '@/services/api';
import { tokens, glassTokens } from '@/theme';

const { Title, Text } = Typography;

const BUSINESS_TYPES = [
  { label: 'Retail Shop / Duka', value: 'Retail' },
  { label: 'Restaurant / Cafe / Hotel', value: 'F&B' },
  { label: 'Pharmacy / Chemist', value: 'Pharmacy' },
  { label: 'Hardware Store', value: 'Hardware' },
  { label: 'Salon / Barbershop', value: 'Salon' },
  { label: 'Wholesale / Distributor', value: 'Wholesale' },
  { label: 'Service Business', value: 'Service' },
  { label: 'Clothing / Fashion', value: 'Fashion' },
  { label: 'Electronics Shop', value: 'Electronics' },
  { label: 'Agribusiness / Farm', value: 'Agriculture' },
  { label: 'Other', value: 'Other' },
];

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  business_name: string;
  business_type: string;
}

const inputStyle = {
  background: 'rgba(255,255,255,0.07)',
  borderColor: 'rgba(255,255,255,0.15)',
  color: '#fff',
  height: 48,
};

const labelStyle = { color: 'rgba(255,255,255,0.85)', fontSize: 13 };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [form] = Form.useForm<RegisterForm>();
  const [step, setStep] = useState(0);
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  async function handleSubmit(values: RegisterForm) {
    clearError();
    try {
      // 1. Create user account
      await register({ email: values.email, password: values.password, name: values.name });

      // 2. Create the business profile immediately
      setCreatingBusiness(true);
      await BusinessAPI.create({
        name: values.business_name,
        business_type: values.business_type,
      });

      // 3. Re-initialize store so business is loaded
      const { initialize } = useAuthStore.getState();
      await initialize();

      navigate('/dashboard');
    } catch {
      // error is set in the auth store for auth failures; business creation errors are caught here
    } finally {
      setCreatingBusiness(false);
    }
  }

  async function handleNextStep() {
    try {
      await form.validateFields(['name', 'email', 'password']);
      setStep(1);
    } catch {
      // validation error shown by antd
    }
  }

  const loading = isLoading || creatingBusiness;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("/auth-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.5) contrast(1.1)',
        zIndex: -1,
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 24,
          background: glassTokens.bg,
          backdropFilter: `blur(${glassTokens.blur})`,
          WebkitBackdropFilter: `blur(${glassTokens.blur})`,
          border: `1px solid ${glassTokens.border}`,
          boxShadow: glassTokens.shadow,
        }}
        styles={{ body: { padding: '36px 32px' } }}
        variant="borderless"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src="/bos.png" alt="Biashara OS" style={{ height: 52, objectFit: 'contain', marginBottom: 14 }} />
          <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 24, letterSpacing: -0.5 }}>
            Create your account
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
            Set up your business in under 2 minutes
          </Text>
        </div>

        {/* Step indicator */}
        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 28 }}
          items={[
            { title: <Text style={{ color: step >= 0 ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12 }}>Your Account</Text> },
            { title: <Text style={{ color: step >= 1 ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12 }}>Your Business</Text> },
          ]}
        />

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{
              marginBottom: 20,
              background: 'rgba(231, 76, 60, 0.2)',
              borderColor: 'rgba(231, 76, 60, 0.3)',
            }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {/* ── STEP 1: Account details ── */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
            <Form.Item
              name="name"
              label={<span style={labelStyle}>Full Name</span>}
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                placeholder="e.g. Amina Wanjiru"
                size="large"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span style={labelStyle}>Email Address</span>}
              rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                placeholder="name@business.co.ke"
                size="large"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={labelStyle}>Password</span>}
              rules={[
                { required: true, message: 'Password is required' },
                { min: 6, message: 'Minimum 6 characters' },
              ]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                placeholder="At least 6 characters"
                size="large"
                style={inputStyle}
              />
            </Form.Item>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleNextStep}
              style={{
                height: 52, fontWeight: 700, fontSize: 15,
                background: tokens.accent, borderColor: tokens.accent,
                color: tokens.primary, borderRadius: 12,
              }}
            >
              Continue →
            </Button>
          </div>

          {/* ── STEP 2: Business details ── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <Form.Item
              name="business_name"
              label={<span style={labelStyle}>Business Name</span>}
              rules={[{ required: true, message: 'Enter your business name' }]}
            >
              <Input
                prefix={<ShopOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                placeholder="e.g. Amina's Grocery Store"
                size="large"
                style={inputStyle}
              />
            </Form.Item>

            <Form.Item
              name="business_type"
              label={<span style={labelStyle}>Type of Business</span>}
              rules={[{ required: true, message: 'Select your business category' }]}
              style={{ marginBottom: 24 }}
            >
              <Select
                size="large"
                placeholder="Select category..."
                suffixIcon={<TagOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                options={BUSINESS_TYPES}
                style={{ height: 48 }}
                popupMatchSelectWidth
              />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                size="large"
                onClick={() => setStep(0)}
                style={{
                  height: 52, flex: '0 0 auto', borderRadius: 12,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                }}
              >
                ← Back
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{
                  height: 52, fontWeight: 700, fontSize: 15,
                  background: tokens.accent, borderColor: tokens.accent,
                  color: tokens.primary, borderRadius: 12,
                }}
              >
                {loading ? 'Setting up your business…' : 'Launch My Business'}
              </Button>
            </div>
          </div>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: tokens.accent, fontWeight: 600 }}>
              Sign in
            </Link>
          </Text>
        </div>
      </Card>

      {/* Decorative blur orbs */}
      <div style={{
        position: 'absolute', width: 350, height: 350,
        background: tokens.primary, filter: 'blur(100px)',
        opacity: 0.15, top: '15%', left: '10%', zIndex: -1,
      }} />
      <div style={{
        position: 'absolute', width: 450, height: 450,
        background: tokens.accent, filter: 'blur(150px)',
        opacity: 0.1, bottom: '5%', right: '5%', zIndex: -1,
      }} />
    </div>
  );
}
