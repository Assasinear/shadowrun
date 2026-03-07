import { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Typography,
  Space,
  Popconfirm,
  Tag,
  message,
  Spin,
} from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { setup2fa, verify2fa, disable2fa } from '../api/auth';

export default function SecurityPage() {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : {};
  const [is2faEnabled, setIs2faEnabled] = useState<boolean>(!!user.is2faEnabled);

  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrDataUrl: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  async function handleSetup() {
    setSetupLoading(true);
    try {
      const data = await setup2fa();
      setSetupData({ secret: data.secret, qrDataUrl: data.qrDataUrl });
    } catch {
      message.error('Failed to setup 2FA');
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleVerify() {
    if (!verifyCode || verifyCode.length !== 6) {
      message.warning('Enter a valid 6-digit code');
      return;
    }
    setVerifyLoading(true);
    try {
      await verify2fa(verifyCode);
      setIs2faEnabled(true);
      setSetupData(null);
      setVerifyCode('');

      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.is2faEnabled = true;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      message.success('2FA enabled successfully');
    } catch {
      message.error('Invalid verification code');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleDisable() {
    setDisableLoading(true);
    try {
      await disable2fa();
      setIs2faEnabled(false);

      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.is2faEnabled = false;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      message.success('2FA disabled');
    } catch {
      message.error('Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        SECURITY
      </Typography.Title>

      <Card
        title={
          <Space>
            <LockOutlined style={{ color: '#00ff41' }} />
            <span>Two-Factor Authentication</span>
          </Space>
        }
        style={{
          background: '#1a1a1a',
          border: '1px solid #1a3a1a',
        }}
        headStyle={{ borderBottom: '1px solid #1a3a1a' }}
      >
        {is2faEnabled ? (
          <Space direction="vertical" size="middle">
            <Space>
              <Tag icon={<CheckCircleOutlined />} color="success">
                2FA Enabled
              </Tag>
            </Space>
            <Popconfirm
              title="Disable two-factor authentication?"
              description="This will make your account less secure."
              onConfirm={handleDisable}
            >
              <Button danger loading={disableLoading}>
                Disable 2FA
              </Button>
            </Popconfirm>
          </Space>
        ) : setupData ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text style={{ color: '#ccc' }}>
              Scan the QR code with your authenticator app:
            </Typography.Text>
            <div style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 8, display: 'inline-block' }}>
              <img src={setupData.qrDataUrl} alt="2FA QR Code" style={{ width: 200, height: 200 }} />
            </div>
            <div>
              <Typography.Text style={{ color: '#888' }}>Secret key (manual entry):</Typography.Text>
              <Input
                readOnly
                value={setupData.secret}
                style={{ fontFamily: 'monospace', marginTop: 4 }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <div>
              <Typography.Text style={{ color: '#ccc' }}>
                Enter the 6-digit code from your app:
              </Typography.Text>
              <Space style={{ marginTop: 8 }}>
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{ width: 160, fontFamily: 'monospace', fontSize: 18, letterSpacing: 8, textAlign: 'center' }}
                />
                <Button type="primary" onClick={handleVerify} loading={verifyLoading}>
                  Verify & Enable
                </Button>
              </Space>
            </div>
            <Button type="text" onClick={() => setSetupData(null)} style={{ color: '#888' }}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Space direction="vertical" size="middle">
            <Typography.Text style={{ color: '#888' }}>
              Two-factor authentication adds an extra layer of security to your account.
            </Typography.Text>
            {setupLoading ? (
              <Spin />
            ) : (
              <Button type="primary" onClick={handleSetup}>
                Setup 2FA
              </Button>
            )}
          </Space>
        )}
      </Card>
    </div>
  );
}
