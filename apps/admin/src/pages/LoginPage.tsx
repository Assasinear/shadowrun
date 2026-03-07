import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { verifyLogin2fa } from '../api/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(values.username, values.password);
      if (result.requires2fa) {
        setNeeds2fa(true);
        setPendingUserId(result.userId ?? null);
      } else if (result.success) {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Login failed. Check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify2fa = async () => {
    if (!pendingUserId || totpCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const response = await verifyLogin2fa(pendingUserId, totpCode);

      if (response.role !== 'GRIDGOD') {
        throw new Error('Access denied. Only GRIDGOD role can access the admin panel.');
      }

      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify({
        personaId: response.personaId,
        role: response.role,
        is2faEnabled: true,
      }));
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Invalid 2FA code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0, 255, 65, 0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Card
        style={{
          width: 420,
          background: '#141414',
          border: '1px solid #1a3a1a',
          borderRadius: 12,
          boxShadow: '0 0 40px rgba(0, 255, 65, 0.05)',
        }}
      >
        <Space
          direction="vertical"
          size="large"
          style={{ width: '100%', textAlign: 'center' }}
        >
          <div>
            <Typography.Title
              level={2}
              style={{
                color: '#00ff41',
                fontFamily: 'monospace',
                letterSpacing: 4,
                marginBottom: 4,
              }}
            >
              SHADOWRUN
            </Typography.Title>
            <Typography.Title
              level={4}
              style={{
                color: '#00ff41',
                fontFamily: 'monospace',
                opacity: 0.7,
                marginTop: 0,
              }}
            >
              MATRIX ADMIN
            </Typography.Title>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ textAlign: 'left' }}
            />
          )}

          {needs2fa ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <SafetyOutlined style={{ fontSize: 32, color: '#00ff41' }} />
              <Typography.Text style={{ color: '#ccc' }}>
                Enter the 6-digit code from your authenticator app
              </Typography.Text>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 24,
                  letterSpacing: 12,
                  textAlign: 'center',
                  background: '#0a0a0a',
                  borderColor: '#1a3a1a',
                }}
                size="large"
              />
              <Button
                type="primary"
                onClick={onVerify2fa}
                loading={loading}
                disabled={totpCode.length !== 6}
                block
                size="large"
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                  fontWeight: 'bold',
                }}
              >
                VERIFY
              </Button>
              <Button
                type="text"
                onClick={() => {
                  setNeeds2fa(false);
                  setPendingUserId(null);
                  setTotpCode('');
                  setError(null);
                }}
                style={{ color: '#888' }}
              >
                Back to login
              </Button>
            </Space>
          ) : (
            <Form layout="vertical" onFinish={onFinish} autoComplete="off">
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Enter username' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#00ff41' }} />}
                  placeholder="Username"
                  size="large"
                  style={{ background: '#0a0a0a', borderColor: '#1a3a1a' }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Enter password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#00ff41' }} />}
                  placeholder="Password"
                  size="large"
                  style={{ background: '#0a0a0a', borderColor: '#1a3a1a' }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  style={{
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                    fontWeight: 'bold',
                  }}
                >
                  JACK IN
                </Button>
              </Form.Item>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}
