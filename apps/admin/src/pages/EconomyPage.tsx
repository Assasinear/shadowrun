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
  Drawer,
} from 'antd';
import { DeleteOutlined, QrcodeOutlined, PlusOutlined, SearchOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons';
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
  getWalletTransactions,
} from '../api/economy';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import type { Wallet, Subscription, Transaction } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

function WalletsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [ownerType, setOwnerType] = useState<string | undefined>();
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [historyWallet, setHistoryWallet] = useState<Wallet | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [balanceForm] = Form.useForm();
  const [adjustForm] = Form.useForm();

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

  const adjustMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => deposit(id, amount),
    onSuccess: (_, vars) => {
      const sign = vars.amount >= 0 ? '+' : '';
      message.success(`Баланс изменён на ${sign}${vars.amount.toFixed(2)} ¥`);
      inv();
      setAdjustModalOpen(false);
    },
    onError: () => message.error('Ошибка'),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['wallet-transactions', historyWallet?.id, historyPage],
    queryFn: () => getWalletTransactions(historyWallet!.id, { page: historyPage, limit: 20 }),
    enabled: !!historyWallet,
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
      width: 310,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => {
            setSelectedWallet(record);
            balanceForm.setFieldsValue({ balance: Number(record.balance) });
            setBalanceModalOpen(true);
          }}>
            Установить
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setSelectedWallet(record);
            adjustForm.resetFields();
            setAdjustModalOpen(true);
          }}>
            Изменить
          </Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => {
            setHistoryWallet(record);
            setHistoryPage(1);
          }}>
            История
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

      <Modal title="Установить точный баланс" open={balanceModalOpen} onCancel={() => setBalanceModalOpen(false)} onOk={() => balanceForm.submit()} confirmLoading={setBalanceMutation.isPending}>
        <Form form={balanceForm} layout="vertical" onFinish={(v) => selectedWallet && setBalanceMutation.mutate({ id: selectedWallet.id, balance: v.balance })}>
          <Form.Item name="balance" label="Новый баланс (¥)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Изменить баланс${selectedWallet ? ` — ${selectedWallet.persona?.name ?? selectedWallet.host?.name ?? ''}` : ''}`}
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjustMutation.isPending}
      >
        {selectedWallet && (
          <div style={{ marginBottom: 12, fontFamily: 'monospace', color: '#888' }}>
            Текущий баланс: <span style={{ color: '#00ff41' }}>¥{Number(selectedWallet.balance).toFixed(2)}</span>
          </div>
        )}
        <Form form={adjustForm} layout="vertical" onFinish={(v) => selectedWallet && adjustMutation.mutate({ id: selectedWallet.id, amount: v.amount })}>
          <Form.Item
            name="amount"
            label="Сумма (+ пополнение / − списание)"
            rules={[
              { required: true, message: 'Введите сумму' },
              { validator: (_, v) => v !== 0 ? Promise.resolve() : Promise.reject('Сумма не может быть 0') },
            ]}
          >
            <InputNumber
              precision={2}
              style={{ width: '100%' }}
              placeholder="Например: 500 или -200"
              formatter={(v) => {
                if (v === undefined || v === null || v === '') return '';
                const n = Number(v);
                if (n > 0) return `+${n}`;
                return String(v);
              }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const amount = getFieldValue('amount');
              if (!amount || amount === 0) return null;
              const current = Number(selectedWallet?.balance ?? 0);
              const result = current + Number(amount);
              const color = Number(amount) >= 0 ? '#52c41a' : '#ff4d4f';
              return (
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#888' }}>
                  Итоговый баланс:{' '}
                  <span style={{ color }}>¥{result.toFixed(2)}</span>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          historyWallet
            ? `История транзакций — ${historyWallet.persona?.name ?? historyWallet.host?.name ?? historyWallet.id}`
            : 'История транзакций'
        }
        open={!!historyWallet}
        onClose={() => setHistoryWallet(null)}
        width={640}
      >
        <Table<Transaction>
          size="small"
          dataSource={historyData?.items}
          rowKey="id"
          loading={historyLoading}
          pagination={{
            current: historyPage,
            pageSize: 20,
            total: historyData?.total,
            showTotal: (t) => `Всего: ${t}`,
            onChange: (p) => setHistoryPage(p),
          }}
          columns={[
            {
              title: 'Тип',
              dataIndex: 'type',
              width: 120,
              render: (t: string) => {
                const colors: Record<string, string> = {
                  TRANSFER: 'blue', SUBSCRIPTION: 'purple', SALARY: 'green', PAYMENT_REQUEST: 'orange',
                };
                return <Tag color={colors[t] ?? 'default'}>{t}</Tag>;
              },
            },
            {
              title: 'Сумма',
              dataIndex: 'amount',
              width: 110,
              render: (v: number | string) => {
                const n = Number(v);
                const color = n >= 0 ? '#52c41a' : '#ff4d4f';
                const sign = n > 0 ? '+' : '';
                return <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{sign}¥{n.toFixed(2)}</span>;
              },
            },
            {
              title: 'Статус',
              dataIndex: 'status',
              width: 100,
              render: (s: string) => {
                const colors: Record<string, string> = { COMPLETED: 'green', PENDING: 'orange', FAILED: 'red', CANCELLED: 'default' };
                return <Tag color={colors[s] ?? 'default'}>{s}</Tag>;
              },
            },
            {
              title: 'Кража',
              dataIndex: 'isTheft',
              width: 60,
              render: (v: boolean) => v ? <Tag color="red">Да</Tag> : null,
            },
            {
              title: 'Время',
              dataIndex: 'createdAt',
              render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
            },
          ]}
        />
      </Drawer>
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
  const [targetType, setTargetType] = useState<'PERSONA' | 'HOST'>('PERSONA');
  const [result, setResult] = useState<{ qrDataUrl: string; payload: { targetName: string; amount: number; purpose?: string } } | null>(null);
  const [personaSearch, setPersonaSearch] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
    enabled: targetType === 'PERSONA',
  });

  const { data: hostOptions } = useQuery({
    queryKey: ['hosts-select', hostSearch],
    queryFn: () => getHosts({ search: hostSearch || undefined, limit: 20 }),
    enabled: targetType === 'HOST',
  });

  const generateMutation = useMutation({
    mutationFn: generatePaymentQr,
    onSuccess: (data) => { setResult(data); message.success('QR создан'); },
    onError: () => message.error('Ошибка генерации'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const hostSelectOptions = (hostOptions?.items ?? []).map((h) => ({ value: h.id, label: h.name }));

  const handleFinish = (values: { targetType: 'PERSONA' | 'HOST'; targetId: string; amount: number; purpose?: string }) => {
    generateMutation.mutate(values);
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.qrDataUrl;
    const name = result.payload.targetName.replace(/\s+/g, '_');
    link.download = `qr_${name}_${result.payload.amount}.png`;
    link.click();
  };

  return (
    <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 360, maxWidth: 440, flex: '1 1 360px' }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Параметры QR</Typography.Title>
        <Form form={form} layout="vertical" onFinish={handleFinish}
          initialValues={{ targetType: 'PERSONA' }}>
          <Form.Item name="targetType" label="Тип получателя" rules={[{ required: true }]}>
            <Select
              options={[{ value: 'PERSONA', label: 'Персона' }, { value: 'HOST', label: 'Хост' }]}
              onChange={(v) => { setTargetType(v); form.setFieldValue('targetId', undefined); }}
            />
          </Form.Item>
          <Form.Item name="targetId" label={targetType === 'PERSONA' ? 'Персона' : 'Хост'} rules={[{ required: true, message: 'Выберите получателя' }]}>
            {targetType === 'PERSONA' ? (
              <Select showSearch placeholder="Поиск персоны..." filterOption={false}
                onSearch={setPersonaSearch} options={personaSelectOptions} />
            ) : (
              <Select showSearch placeholder="Поиск хоста..." filterOption={false}
                onSearch={setHostSearch} options={hostSelectOptions} />
            )}
          </Form.Item>
          <Form.Item name="amount" label="Сумма (¥)" rules={[{ required: true, message: 'Укажите сумму' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purpose" label="Назначение">
            <Input placeholder="Например: Пиво, Аренда, Услуги" />
          </Form.Item>
          <Button type="primary" icon={<QrcodeOutlined />} htmlType="submit" loading={generateMutation.isPending} block>
            Генерировать QR
          </Button>
        </Form>
      </div>

      {result && (
        <div style={{ flex: '1 1 300px', textAlign: 'center' }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            {result.payload.targetName} — ¥{result.payload.amount}
            {result.payload.purpose && <Typography.Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>{result.payload.purpose}</Typography.Text>}
          </Typography.Title>
          <Image
            src={result.qrDataUrl}
            alt="Static Payment QR"
            style={{ maxWidth: 400, width: '100%', border: '1px solid #333', borderRadius: 4 }}
            preview={false}
          />
          <div style={{ marginTop: 12 }}>
            <Button icon={<QrcodeOutlined />} onClick={handleDownload} type="default">
              Скачать PNG
            </Button>
          </div>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            QR без срока действия — можно распечатать
          </Typography.Text>
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
