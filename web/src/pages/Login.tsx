import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { tokens, glassTokens } from '@/theme';

const { Title, Text } = Typography;

interface LoginForm { email: string; password: string; }

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form] = Form.useForm<LoginForm>();

  async function handleSubmit(values: LoginForm) {
    clearError();
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      // error handled in store
    }
  }

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
      {/* Background Image with Fixed Position */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("/auth-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.6)',
        zIndex: -1,
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          background: glassTokens.bg,
          backdropFilter: `blur(${glassTokens.blur})`,
          WebkitBackdropFilter: `blur(${glassTokens.blur})`,
          border: `1px solid ${glassTokens.border}`,
          boxShadow: glassTokens.shadow,
        }}
        styles={{ body: { padding: '40px 32px' } }}
        variant="borderless"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img 
            src="/bos.png" 
            alt="Biashara OS Logo" 
            style={{ height: 64, objectFit: 'contain', marginBottom: 16 }} 
          />
          <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 28, letterSpacing: -0.5 }}>Biashara OS</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
            Professional Business Operating System
          </Text>
        </div>

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
              color: '#fff',
            }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          style={{ width: '100%' }}
        >
          <Form.Item
            name="email"
            label={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Email Address</span>}
            rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
              placeholder="name@business.co.ke"
              size="large"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                height: 48,
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Password</span>}
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
              placeholder="••••••••"
              size="large"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                height: 48,
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16, marginTop: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              style={{ 
                height: 52, 
                fontWeight: 700, 
                fontSize: 16,
                background: tokens.accent,
                borderColor: tokens.accent,
                color: tokens.primary,
                borderRadius: 12,
              }}
            >
              Sign In to Dashboard
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            New to the platform?{' '}
            <Link to="/register" style={{ color: tokens.accent, fontWeight: 600 }}>
              Create an account
            </Link>
          </Text>
        </div>
      </Card>

      {/* Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        width: 300, height: 300,
        background: tokens.primary,
        filter: 'blur(100px)',
        opacity: 0.2,
        top: '10%', right: '10%',
        zIndex: -1,
      }} />
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        background: tokens.accent,
        filter: 'blur(150px)',
        opacity: 0.1,
        bottom: '10%', left: '10%',
        zIndex: -1,
      }} />
    </div>
  );
}
