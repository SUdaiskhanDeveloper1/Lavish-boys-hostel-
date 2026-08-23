import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseConfigError } from '@/api/supabaseClient';
import { logAudit } from '@/services/audit.service';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await signIn(values.email.trim(), values.password);
      await logAudit({ action: 'login', entity: 'auth' });
      message.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const reason = (err as Error).message || 'Invalid credentials';
      // A failed fetch means we never reached the project — surfacing it as
      // "invalid credentials" sends you off checking the password instead.
      message.error(
        /failed to fetch|networkerror|load failed/i.test(reason)
          ? 'Cannot reach the Supabase project. Check VITE_SUPABASE_URL in .env and your connection.'
          : reason,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0E1B33 0%, #1B2A4A 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: 400, maxWidth: '100%', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.svg" alt="Lavish Boys Hostel" style={{ maxWidth: '100%', height: 64 }} />
          <Title level={4} style={{ marginTop: 12, marginBottom: 0 }}>
            Admin Login
          </Title>
          <Text type="secondary">Sign in to manage the hostel</Text>
        </div>

        {supabaseConfigError && (
          <Alert
            type="error"
            showIcon
            message="Backend not configured"
            description={supabaseConfigError}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@hostel.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            disabled={!!supabaseConfigError}
          >
            Sign In
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </Card>
    </div>
  );
}
