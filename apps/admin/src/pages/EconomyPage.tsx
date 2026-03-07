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
import { DeleteOutlined, DollarOutlined, QrcodeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWallets,
  setBalance,
  deposit,
  getSubscriptions,
  createSubscription,
  deleteSubscription,
  generatePaymentQr,
  createAdminTransfer,
} from '../api/economy';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import type { Wallet, Subscription } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

function WalletsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [ownerType, setOwnerType] = useState<string | undefined>();
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [balanceForm] = Form.useForm();
  const [depositForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['wallets', search, ownerType, page, pageSize],
    queryFn: () => getWallets({ search: search || undefined, ownerType }),
  });

  const filtered = data?.filter((w) => {
    if (ownerType === 'PERSONA') return !!w.personaId;
    if (ownerType === 'HOST') return !!w.hostId;
    return true;
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['wallets'] });

  const setBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) => setBalance(id, balance),
    onSuccess: () => { message.success('Баланс установлен'); inv(); setBalanceModalOpen(false); },
    onError: () => message.error('Ошибка'),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => deposit(id, amount),
    onSuccess: () => { message.success('Пополнение выполнено'); inv(); setDepositModalOpen(false); },
    onError: () => message.error('Ошибка'),
  });

  const columns: ColumnsType<Wallet> = [
    {
      title: 'Владелец',
      key: 'owner',
      render: (_, record) => {
        if (record.persona) return <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>{record.persona.name}</Link>;
        if (record.host) return <Link to={`/hosts/${record.host.id}`} style={{ color: '#00ff41' }}>{record.host.name} (Host)</Link>;
        return record.personaId ?? record.hostId ?? '—';
      },
    },
    {
      title: 'Тип',
      key: 'type',
      width: 100,
      render: (_, record) => record.personaId ? <Tag color="blue">Persona</Tag> : <Tag color="purple">Host</Tag>,
    },
    {
      title: 'Баланс',
      dataIndex: 'balance',
      key: 'balance',
      render: (v: number | string) => <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>¥{Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => { setSelectedWallet(record); balanceForm.setFieldsValue({ balance: Number(record.balance) }); setBalanceModalOpen(true); }}>
            Установить
          </Button>
          <Button size="small" icon={<DollarOutlined />} onClick={() => { setSelectedWallet(record); depositForm.resetFields(); setDepositModalOpen(true); }}>
            Пополнить
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Поиск..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} allowClear />
        <Select allowClear placeholder="Тип владельца" value={ownerType} onChange={setOwnerType} style={{ width: 160 }}
          options={[{ value: 'PERSONA', label: 'Persona' }, { value: 'HOST', label: 'Host' }]}
        />
      </Space>
      <Table columns={columns} dataSource={filtered} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
      <Modal title="Установить баланс" open={balanceModalOpen} onCancel={() => setBalanceModalOpen(false)} onOk={() => balanceForm.submit()} confirmLoading={setBalanceMutation.isPending}>
        <Form form={balanceForm} layout="vertical" onFinish={(v) => selectedWallet && setBalanceMutation.mutate({ id: selectedWallet.id, balance: v.balance })}>
          <Form.Item name="balance" label="Новый баланс" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="Пополнить" open={depositModalOpen} onCancel={() => setDepositModalOpen(false)} onOk={() => depositForm.submit()} confirmLoading={depositMutation.isPending}>
        <Form form={depositForm} layout="vertical" onFinish={(v) => selectedWallet && depositMutation.mutate({ id: selectedWallet.id, amount: v.amount })}>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SubscriptionsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [payerSearch, setPayerSearch] = useState('');
  const [payeeSearch, setPayeeSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', filterType, page, pageSize],
    queryFn: () => getSubscriptions({ type: filterType, page, limit: pageSize }),
  });

  const { data: payerOptions } = useQuery({
    queryKey: ['personas-payer', payerSearch],
    queryFn: () => getPersonas({ search: payerSearch || undefined, limit: 20 }),
  });

  const { data: payeeOptions } = useQuery({
    queryKey: ['personas-payee', payeeSearch],
    queryFn: () => getPersonas({ search: payeeSearch || undefined, limit: 20 }),
  });

  const { data: hostOptions } = useQuery({
    queryKey: ['hosts-sub'],
    queryFn: () => getHosts({}),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => { message.success('Подписка удалена'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createSubscription(values),
    onSuccess: () => { message.success('Подписка создана'); inv(); setCreateModalOpen(false); createForm.resetFields(); },
    onError: () => message.error('Ошибка создания'),
  });

  const payerPersonaOptions = (payerOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const payeePersonaOptions = (payeeOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const hostSelectOptions = (hostOptions?.items ?? []).map((h) => ({ value: h.id, label: h.name }));

  const payerType = Form.useWatch('payerType', createForm);
  const payeeType = Form.useWatch('payeeType', createForm);

  const columns: ColumnsType<Subscription> = [
    {
      title: 'Плательщик',
      key: 'payer',
      render: (_, record) => {
        const name = record.payerPersona?.name;
        if (name) return <Link to={`/personas/${record.payerId}`} style={{ color: '#00ff41' }}>{name}</Link>;
        return `${record.payerType}: ${record.payerId.substring(0, 8)}...`;
      },
    },
    {
      title: 'Получатель',
      key: 'payee',
      render: (_, record) => {
        const name = record.payeePersona?.name;
        if (name) return <Link to={`/personas/${record.payeeId}`} style={{ color: '#00ff41' }}>{name}</Link>;
        return `${record.payeeType}: ${record.payeeId.substring(0, 8)}...`;
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'amountPerTick',
      key: 'amount',
      render: (v: number | string) => <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>¥{Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Период',
      dataIndex: 'periodSeconds',
      key: 'period',
      width: 100,
      render: (v: number) => v >= 3600 ? `${v / 3600}ч` : `${v}с`,
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Последний платёж',
      dataIndex: 'lastChargedAt',
      key: 'lastChargedAt',
      width: 140,
      render: (d: string | null) => d ? dayjs(d).format('DD.MM.YY HH:mm') : 'Ещё не было',
    },
    {
      title: 'Создана',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm title="Удалить подписку?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Select allowClear placeholder="Тип" value={filterType} onChange={setFilterType} style={{ width: 160 }}
            options={[{ value: 'SUBSCRIPTION', label: 'SUBSCRIPTION' }, { value: 'SALARY', label: 'SALARY' }]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>Создать подписку</Button>
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />

      <Modal title="Создать подписку" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()} confirmLoading={createMutation.isPending} width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="payerType" label="Тип плательщика" rules={[{ required: true }]} initialValue="PERSONA">
            <Select options={[{ value: 'PERSONA', label: 'Persona' }, { value: 'HOST', label: 'Host' }]} />
          </Form.Item>
          <Form.Item name="payerId" label="Плательщик" rules={[{ required: true }]}>
            <Select showSearch filterOption={false}
              onSearch={setPayerSearch}
              options={payerType === 'HOST' ? hostSelectOptions : payerPersonaOptions}
              placeholder="Поиск..."
            />
          </Form.Item>
          <Form.Item name="payeeType" label="Тип получателя" rules={[{ required: true }]} initialValue="PERSONA">
            <Select options={[{ value: 'PERSONA', label: 'Persona' }, { value: 'HOST', label: 'Host' }]} />
          </Form.Item>
          <Form.Item name="payeeId" label="Получатель" rules={[{ required: true }]}>
            <Select showSearch filterOption={false}
              onSearch={setPayeeSearch}
              options={payeeType === 'HOST' ? hostSelectOptions : payeePersonaOptions}
              placeholder="Поиск..."
            />
          </Form.Item>
          <Form.Item name="amountPerTick" label="Сумма за период (¥)" rules={[{ required: true }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="periodSeconds" label="Период (секунды)" initialValue={3600}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="Тип" rules={[{ required: true }]} initialValue="SUBSCRIPTION">
            <Select options={[{ value: 'SUBSCRIPTION', label: 'SUBSCRIPTION' }, { value: 'SALARY', label: 'SALARY' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
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
    onSuccess: (data) => { setQrImage(data.qrDataUrl); message.success('QR создан'); },
    onError: () => message.error('Ошибка генерации'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  return (
    <div style={{ maxWidth: 500 }}>
      <Form form={form} layout="vertical" onFinish={(values) => generateMutation.mutate(values)}>
        <Form.Item name="targetPersonaId" label="Целевая персона" rules={[{ required: true }]}>
          <Select showSearch placeholder="Поиск..." filterOption={false} onSearch={setPersonaSearch} options={personaSelectOptions} />
        </Form.Item>
        <Form.Item name="amount" label="Сумма (¥)" rules={[{ required: true }]}>
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="purpose" label="Назначение"><Input /></Form.Item>
        <Button type="primary" icon={<QrcodeOutlined />} htmlType="submit" loading={generateMutation.isPending}>Генерировать QR</Button>
      </Form>
      {qrImage && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Image src={qrImage} alt="Payment QR" style={{ maxWidth: 300 }} />
        </div>
      )}
    </div>
  );
}

function AdminTransferTab() {
  const [form] = Form.useForm();
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: fromWallets } = useQuery({
    queryKey: ['wallets-from', fromSearch],
    queryFn: () => getWallets({ search: fromSearch || undefined }),
  });

  const { data: toWallets } = useQuery({
    queryKey: ['wallets-to', toSearch],
    queryFn: () => getWallets({ search: toSearch || undefined }),
  });

  const transferMutation = useMutation({
    mutationFn: createAdminTransfer,
    onSuccess: () => {
      message.success('Перевод выполнен');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      form.resetFields();
    },
    onError: () => message.error('Ошибка перевода'),
  });

  const walletOptions = (wallets: typeof fromWallets) =>
    (wallets ?? []).map((w) => ({
      value: w.id,
      label: `${w.persona?.name ?? w.host?.name ?? w.id} (¥${Number(w.balance).toFixed(2)})`,
    }));

  return (
    <div style={{ maxWidth: 500 }}>
      <Form form={form} layout="vertical" onFinish={(v) => transferMutation.mutate(v)}>
        <Form.Item name="fromWalletId" label="Откуда (кошелёк)" rules={[{ required: true }]}>
          <Select showSearch placeholder="Поиск..." filterOption={false} onSearch={setFromSearch} options={walletOptions(fromWallets)} />
        </Form.Item>
        <Form.Item name="toWalletId" label="Куда (кошелёк)" rules={[{ required: true }]}>
          <Select showSearch placeholder="Поиск..." filterOption={false} onSearch={setToSearch} options={walletOptions(toWallets)} />
        </Form.Item>
        <Form.Item name="amount" label="Сумма (¥)" rules={[{ required: true }]}>
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="purpose" label="Назначение"><Input /></Form.Item>
        <Button type="primary" htmlType="submit" loading={transferMutation.isPending}>Выполнить перевод</Button>
      </Form>
    </div>
  );
}

export default function EconomyPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ЭКОНОМИКА
      </Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Link to="/economy/transactions"><Button>Все транзакции</Button></Link>
      </Space>
      <Tabs items={[
        { key: 'wallets', label: 'Кошельки', children: <WalletsTab /> },
        { key: 'subscriptions', label: 'Подписки', children: <SubscriptionsTab /> },
        { key: 'transfer', label: 'Админ-перевод', children: <AdminTransferTab /> },
        { key: 'qr', label: 'QR Генератор', children: <QrGeneratorTab /> },
      ]} />
    </div>
  );
}
