import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await sendPasswordReset(values.email.trim());
      setSent(true);
    } catch (err) {
      message.error((err as Error).message);
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
      <Card style={{ width: 420, maxWidth: '100%', borderRadius: 12 }}>
        {sent ? (
          <Result
            status="success"
            title="Check your email"
            subTitle="We sent a password reset link to your inbox."
            extra={<Link to="/login">Back to login</Link>}
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 0 }}>
                Reset Password
              </Title>
              <Text type="secondary">We&apos;ll email you a reset link</Text>
            </div>
            <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Enter a valid email' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="admin@hostel.com" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Send Reset Link
              </Button>
            </Form>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login">Back to login</Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
