import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Descriptions,
  Typography,
  Button,
  Space,
  Tag,
  Table,
  Card,
  Spin,
  Result,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Image,
  Select,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  QrcodeOutlined,
  PlusOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHost, addHostFile, createAccessToken, getHostQr, cloneHost } from '../api/hosts';
import { getPersonas } from '../api/personas';
import { setBalance } from '../api/economy';
import dayjs from 'dayjs';
import type { FileRecord, AccessToken } from '../types';

export default function HostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [fileForm] = Form.useForm();
  const [tokenForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [tokenPersonaSearch, setTokenPersonaSearch] = useState('');

  const { data: tokenPersonaOptions } = useQuery({
    queryKey: ['personas-select', tokenPersonaSearch],
    queryFn: () => getPersonas({ search: tokenPersonaSearch || undefined, limit: 20 }),
  });

  const tokenPersonaSelectOptions = (tokenPersonaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const { data: host, isLoading, error } = useQuery({
    queryKey: ['host', id],
    queryFn: () => getHost(id!),
    enabled: !!id,
  });

  const addFileMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => addHostFile(id!, values),
    onSuccess: () => {
      message.success('File added');
      queryClient.invalidateQueries({ queryKey: ['host', id] });
      setFileModalOpen(false);
      fileForm.resetFields();
    },
    onError: () => message.error('Failed to add file'),
  });

  const createTokenMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createAccessToken(id!, values),
    onSuccess: () => {
      message.success('Access token created');
      queryClient.invalidateQueries({ queryKey: ['host', id] });
      setTokenModalOpen(false);
      tokenForm.resetFields();
    },
    onError: () => message.error('Failed to create token'),
  });

  const balanceMutation = useMutation({
    mutationFn: (balance: number) => setBalance(host!.wallet!.id, balance),
    onSuccess: () => {
      message.success('Balance updated');
      queryClient.invalidateQueries({ queryKey: ['host', id] });
      setBalanceModalOpen(false);
    },
    onError: () => message.error('Failed to update balance'),
  });

  const cloneMutation = useMutation({
    mutationFn: () => cloneHost(id!),
    onSuccess: (newHost) => {
      message.success('Хост клонирован');
      navigate(`/hosts/${newHost.id}`);
    },
    onError: () => message.error('Ошибка клонирования'),
  });

  const handleGenerateQr = async () => {
    try {
      const result = await getHostQr(id!);
      setQrImage(result.qrDataUrl);
      setQrModalOpen(true);
    } catch {
      message.error('Failed to generate QR');
    }
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (error || !host) return <Result status="error" title="Failed to load host" />;

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hosts')}>
          Back
        </Button>
        <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', margin: 0 }}>
          {host.name}
        </Typography.Title>
        <Button icon={<QrcodeOutlined />} onClick={handleGenerateQr}>
          QR
        </Button>
        <Button icon={<CopyOutlined />} onClick={() => cloneMutation.mutate()} loading={cloneMutation.isPending}>
          Клонировать
        </Button>
      </Space>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Host Info" style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="ID">{host.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{host.name}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {host.description ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Public">
              {host.isPublic ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="ICE Level">{host.iceLevel}</Descriptions.Item>
            <Descriptions.Item label="Owner">
              {host.owner ? (
                <Link to={`/personas/${host.owner.id}`} style={{ color: '#00ff41' }}>
                  {host.owner.name}
                </Link>
              ) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Spider">
              {host.spider ? (
                <Link to={`/personas/${host.spider.id}`} style={{ color: '#00ff41' }}>
                  {host.spider.name}
                </Link>
              ) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(host.createdAt).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="Wallet"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            host.wallet && (
              <Button
                size="small"
                onClick={() => {
                  balanceForm.setFieldsValue({ balance: Number(host.wallet!.balance) });
                  setBalanceModalOpen(true);
                }}
              >
                Edit Balance
              </Button>
            )
          }
        >
          {host.wallet ? (
            <Typography.Title level={4} style={{ color: '#00ff41', margin: 0 }}>
              ¥{Number(host.wallet.balance).toFixed(2)}
            </Typography.Title>
          ) : (
            <Typography.Text type="secondary">No wallet</Typography.Text>
          )}
        </Card>

        <Card
          title="Files"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => setFileModalOpen(true)}>
              Add File
            </Button>
          }
        >
          <Table
            dataSource={host.files ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => v ?? '—' },
              { title: 'Size', dataIndex: 'size', key: 'size', render: (v: number) => v ?? '—' },
              {
                title: 'Public',
                dataIndex: 'isPublic',
                key: 'isPublic',
                render: (v: boolean) =>
                  v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
              },
              { title: 'ICE', dataIndex: 'iceLevel', key: 'iceLevel' },
              {
                title: 'Redeem Code',
                dataIndex: 'redeemCode',
                key: 'redeemCode',
                render: (v: string) => v ?? '—',
              },
            ]}
          />
        </Card>

        <Card
          title="Access Tokens"
          style={{ background: '#1a1a1a', border: '1px solid #1a3a1a' }}
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => setTokenModalOpen(true)}>
              Create Token
            </Button>
          }
        >
          <Table
            dataSource={host.accessTokens ?? []}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Token', dataIndex: 'token', key: 'token', ellipsis: true },
              {
                title: 'Persona',
                key: 'persona',
                render: (_: unknown, record: AccessToken) =>
                  record.persona ? (
                    <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>
                      {record.persona.name ?? record.personaId}
                    </Link>
                  ) : record.personaId,
              },
              { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', render: (v: string) => v ?? '—' },
              {
                title: 'Expires',
                dataIndex: 'expiresAt',
                key: 'expiresAt',
                render: (d: string) => d ? dayjs(d).format('DD.MM.YY HH:mm') : 'Never',
              },
              {
                title: 'Created',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
              },
            ]}
          />
        </Card>
      </Space>

      <Modal
        title="Host QR"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
      >
        {qrImage && (
          <div style={{ textAlign: 'center' }}>
            <Image src={qrImage} alt="Host QR Code" style={{ maxWidth: 300 }} />
          </div>
        )}
      </Modal>

      <Modal
        title="Add File"
        open={fileModalOpen}
        onCancel={() => setFileModalOpen(false)}
        onOk={() => fileForm.submit()}
        confirmLoading={addFileMutation.isPending}
      >
        <Form
          form={fileForm}
          layout="vertical"
          onFinish={(values) => addFileMutation.mutate(values)}
        >
          <Form.Item name="name" label="File Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Content">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="iceLevel" label="ICE Level" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Создать токен доступа"
        open={tokenModalOpen}
        onCancel={() => setTokenModalOpen(false)}
        onOk={() => tokenForm.submit()}
        confirmLoading={createTokenMutation.isPending}
      >
        <Form
          form={tokenForm}
          layout="vertical"
          onFinish={(values) => createTokenMutation.mutate(values)}
        >
          <Form.Item name="personaId" label="Персона" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Поиск персоны..."
              filterOption={false}
              onSearch={setTokenPersonaSearch}
              options={tokenPersonaSelectOptions}
            />
          </Form.Item>
          <Form.Item name="purpose" label="Назначение">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Set Balance"
        open={balanceModalOpen}
        onCancel={() => setBalanceModalOpen(false)}
        onOk={() => balanceForm.submit()}
        confirmLoading={balanceMutation.isPending}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={(values) => balanceMutation.mutate(values.balance)}
        >
          <Form.Item name="balance" label="New Balance" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
