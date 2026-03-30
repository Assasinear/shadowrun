import { useEffect } from 'react';
import {
  Form,
  InputNumber,
  Input,
  Switch,
  Button,
  Typography,
  Spin,
  message,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, bulkUpdateSettings } from '../api/settings';

interface SettingsFormValues {
  subscription_period_seconds: number;
  brick_duration_seconds: number;
  steal_percentage: number;
  messenger_enabled: boolean;
  push_notifications_enabled: boolean;
  decking_enabled: boolean;
  admin_allowed_ips: string;
}

const DEFAULTS: SettingsFormValues = {
  subscription_period_seconds: 3600,
  brick_duration_seconds: 300,
  steal_percentage: 10,
  messenger_enabled: true,
  push_notifications_enabled: true,
  decking_enabled: true,
  admin_allowed_ips: '',
};

const BOOLEAN_KEYS = new Set(['messenger_enabled', 'push_notifications_enabled', 'decking_enabled']);

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SettingsFormValues>();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (!settings) return;

    const values: Record<string, unknown> = { ...DEFAULTS };
    for (const s of settings) {
      if (BOOLEAN_KEYS.has(s.key)) {
        values[s.key] = s.value === 'true';
      } else if (['subscription_period_seconds', 'brick_duration_seconds', 'steal_percentage'].includes(s.key)) {
        values[s.key] = Number(s.value);
      } else {
        values[s.key] = s.value;
      }
    }
    form.setFieldsValue(values as unknown as SettingsFormValues);
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: (values: SettingsFormValues) => {
      const entries = Object.entries(values).map(([key, value]) => ({
        key,
        value: String(value ?? ''),
      }));
      return bulkUpdateSettings(entries);
    },
    onSuccess: () => {
      message.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => message.error('Failed to save settings'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        SYSTEM SETTINGS
      </Typography.Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate(values)}
        initialValues={DEFAULTS}
      >
        <Form.Item
          name="subscription_period_seconds"
          label="Интервал списания подписок (сек)"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="brick_duration_seconds"
          label="Время кирпича (сек)"
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="steal_percentage"
          label="Процент воровства (%)"
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="messenger_enabled"
          label="Мессенджер"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="push_notifications_enabled"
          label="Real-time уведомления (WebSocket)"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="decking_enabled"
          label="Декинг"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="admin_allowed_ips"
          label="IP-ограничение (через запятую)"
        >
          <Input placeholder="Пусто = без ограничений" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            size="large"
            style={{ fontFamily: 'monospace', letterSpacing: 2 }}
          >
            SAVE ALL
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
