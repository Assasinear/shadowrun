import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Popconfirm,
  Image,
  Tag,
  message,
} from 'antd';
import { DeleteOutlined, DollarOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWallets,
  setBalance,
  deposit,
  getSubscriptions,
  deleteSubscription,
  generatePaymentQr,
} from '../api/economy';
import { getPersonas } from '../api/personas';
import type { Wallet, Subscription } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

function WalletsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [balanceForm] = Form.useForm();
  const [depositForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['wallets', page, pageSize],
    queryFn: () => getWallets({}),
  });

  const setBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) => setBalance(id, balance),
    onSuccess: () => {
      message.success('Balance set');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setBalanceModalOpen(false);
    },
    onError: () => message.error('Failed to set balance'),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => deposit(id, amount),
    onSuccess: () => {
      message.success('Deposit complete');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setDepositModalOpen(false);
    },
    onError: () => message.error('Failed to deposit'),
  });

  const columns: ColumnsType<Wallet> = [
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) => {
        if (record.persona) {
          return (
            <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>
              {record.persona.name}
            </Link>
          );
        }
        if (record.host) {
          return (
            <Link to={`/hosts/${record.host.id}`} style={{ color: '#00ff41' }}>
              {record.host.name} (Host)
            </Link>
          );
        }
        return record.personaId ?? record.hostId ?? '—';
      },
    },
    {
      title: 'Type',
      key: 'type',
      render: (_, record) =>
        record.personaId ? <Tag color="blue">Persona</Tag> : <Tag color="purple">Host</Tag>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (v: number | string) => (
        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>
          ¥{Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => {
              setSelectedWallet(record);
              balanceForm.setFieldsValue({ balance: Number(record.balance) });
              setBalanceModalOpen(true);
            }}
          >
            Set Balance
          </Button>
          <Button
            size="small"
            icon={<DollarOutlined />}
            onClick={() => {
              setSelectedWallet(record);
              depositForm.resetFields();
              setDepositModalOpen(true);
            }}
          >
            Deposit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total}`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title="Set Balance"
        open={balanceModalOpen}
        onCancel={() => setBalanceModalOpen(false)}
        onOk={() => balanceForm.submit()}
        confirmLoading={setBalanceMutation.isPending}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={(v) =>
            selectedWallet && setBalanceMutation.mutate({ id: selectedWallet.id, balance: v.balance })
          }
        >
          <Form.Item name="balance" label="New Balance" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Deposit"
        open={depositModalOpen}
        onCancel={() => setDepositModalOpen(false)}
        onOk={() => depositForm.submit()}
        confirmLoading={depositMutation.isPending}
      >
        <Form
          form={depositForm}
          layout="vertical"
          onFinish={(v) =>
            selectedWallet && depositMutation.mutate({ id: selectedWallet.id, amount: v.amount })
          }
        >
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SubscriptionsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: getSubscriptions,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      message.success('Subscription deleted');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: () => message.error('Failed to delete subscription'),
  });

  const columns: ColumnsType<Subscription> = [
    {
      title: 'Payer',
      key: 'payer',
      render: (_, record) => `${record.payerType}: ${record.payerId}`,
    },
    {
      title: 'Payee',
      key: 'payee',
      render: (_, record) => `${record.payeeType}: ${record.payeeId}`,
    },
    {
      title: 'Amount',
      dataIndex: 'amountPerTick',
      key: 'amount',
      render: (v: number | string) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: 'Period (s)',
      dataIndex: 'periodSeconds',
      key: 'period',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Delete subscription?"
          onConfirm={() => deleteMutation.mutate(record.id)}
        >
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data ?? []}
      rowKey="id"
      loading={isLoading}
      pagination={false}
    />
  );
}

function QrGeneratorTab() {
  const [form] = Form.useForm();
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [personaSearch, setPersonaSearch] = useState('');

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const generateMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => generatePaymentQr(values),
    onSuccess: (data) => {
      setQrImage(data.qrDataUrl);
      message.success('QR generated');
    },
    onError: () => message.error('Failed to generate QR'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div style={{ maxWidth: 500 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => generateMutation.mutate(values)}
      >
        <Form.Item name="targetPersonaId" label="Target Persona" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Search persona..."
            filterOption={false}
            onSearch={setPersonaSearch}
            options={personaSelectOptions}
          />
        </Form.Item>
        <Form.Item name="amount" label="Amount (¥)" rules={[{ required: true }]}>
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="purpose" label="Purpose">
          <Input />
        </Form.Item>
        <Button
          type="primary"
          icon={<QrcodeOutlined />}
          htmlType="submit"
          loading={generateMutation.isPending}
        >
          Generate QR
        </Button>
      </Form>

      {qrImage && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Image src={qrImage} alt="Payment QR" style={{ maxWidth: 300 }} />
        </div>
      )}
    </div>
  );
}

export default function EconomyPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ECONOMY
      </Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Link to="/economy/transactions">
          <Button>View All Transactions</Button>
        </Link>
      </Space>

      <Tabs
        items={[
          { key: 'wallets', label: 'Wallets', children: <WalletsTab /> },
          { key: 'subscriptions', label: 'Subscriptions', children: <SubscriptionsTab /> },
          { key: 'qr', label: 'QR Generator', children: <QrGeneratorTab /> },
        ]}
      />
    </div>
  );
}
