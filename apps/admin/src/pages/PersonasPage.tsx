import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  InputNumber,
  Popconfirm,
  Typography,
  Dropdown,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  StopOutlined,
  CheckOutlined,
  DeleteOutlined,
  IdcardOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPersonas,
  createPersona,
  blockPersona,
  unblockPersona,
  deletePersona,
  issueLicenses,
  massBlockPersonas,
  massUnblockPersonas,
  massDeletePersonas,
  massSetBalance,
  massChangeRole,
} from '../api/personas';
import type { Persona, Role } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const ROLE_COLORS: Record<Role, string> = {
  GRIDGOD: 'red',
  SPIDER: 'purple',
  DECKER: 'blue',
  USER: 'default',
};

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [filterBlocked, setFilterBlocked] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [massBalanceModalOpen, setMassBalanceModalOpen] = useState(false);
  const [massRoleModalOpen, setMassRoleModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [licenseForm] = Form.useForm();
  const [massBalanceForm] = Form.useForm();
  const [massRoleForm] = Form.useForm();

  const inv = () => queryClient.invalidateQueries({ queryKey: ['personas'] });

  const { data, isLoading } = useQuery({
    queryKey: ['personas', search, filterRole, filterBlocked, page, pageSize],
    queryFn: () => getPersonas({
      search: search || undefined,
      role: filterRole,
      isBlocked: filterBlocked,
      page,
      limit: pageSize,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createPersona(values),
    onSuccess: () => { message.success('Персона создана'); inv(); setCreateModalOpen(false); createForm.resetFields(); },
    onError: () => message.error('Ошибка создания'),
  });

  const blockMutation = useMutation({
    mutationFn: blockPersona,
    onSuccess: () => { message.success('Заблокирована'); inv(); },
  });

  const unblockMutation = useMutation({
    mutationFn: unblockPersona,
    onSuccess: () => { message.success('Разблокирована'); inv(); },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePersona,
    onSuccess: () => { message.success('Удалена'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const licenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => issueLicenses(id, data),
    onSuccess: () => { message.success('Лицензии выданы'); setLicenseModalOpen(false); licenseForm.resetFields(); setSelectedIds([]); },
    onError: () => message.error('Ошибка выдачи'),
  });

  const massBlockMutation = useMutation({
    mutationFn: () => massBlockPersonas(selectedIds),
    onSuccess: () => { message.success('Массовая блокировка выполнена'); inv(); setSelectedIds([]); },
  });

  const massUnblockMutation = useMutation({
    mutationFn: () => massUnblockPersonas(selectedIds),
    onSuccess: () => { message.success('Массовая разблокировка выполнена'); inv(); setSelectedIds([]); },
  });

  const massDeleteMutation = useMutation({
    mutationFn: () => massDeletePersonas(selectedIds),
    onSuccess: () => { message.success('Массовое удаление выполнено'); inv(); setSelectedIds([]); },
  });

  const massSetBalanceMutation = useMutation({
    mutationFn: (balance: number) => massSetBalance(selectedIds, balance),
    onSuccess: () => { message.success('Баланс установлен'); inv(); setMassBalanceModalOpen(false); setSelectedIds([]); },
  });

  const massChangeRoleMutation = useMutation({
    mutationFn: (role: string) => massChangeRole(selectedIds, role),
    onSuccess: () => { message.success('Роль изменена'); inv(); setMassRoleModalOpen(false); setSelectedIds([]); },
  });

  const columns: ColumnsType<Persona> = [
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link to={`/personas/${record.id}`} style={{ color: '#00ff41' }}>{name}</Link>
      ),
    },
    {
      title: 'SIN',
      key: 'sin',
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{record.lls?.sin ?? '—'}</span>
      ),
    },
    {
      title: 'Роль',
      key: 'role',
      width: 110,
      render: (_, record) => {
        const role = record.user?.role;
        return role ? <Tag color={ROLE_COLORS[role] ?? 'default'}>{role}</Tag> : '—';
      },
    },
    {
      title: 'Баланс',
      key: 'balance',
      width: 120,
      render: (_, record) =>
        record.wallet ? (
          <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>
            ¥{Number(record.wallet.balance).toFixed(2)}
          </span>
        ) : '—',
    },
    {
      title: 'Статус',
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.user?.isBlocked ? (
          <Tag color="error">Blocked</Tag>
        ) : (
          <Tag color="success">Active</Tag>
        ),
    },
    {
      title: 'Создана',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Link to={`/personas/${record.id}`}>
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Link>
          {record.user?.isBlocked ? (
            <Button type="text" icon={<CheckOutlined />} size="small" onClick={() => unblockMutation.mutate(record.id)} style={{ color: '#52c41a' }} />
          ) : (
            <Button type="text" icon={<StopOutlined />} size="small" onClick={() => blockMutation.mutate(record.id)} style={{ color: '#faad14' }} />
          )}
          <Popconfirm title="Удалить персону?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const massMenuItems = [
    { key: 'block', label: 'Заблокировать', onClick: () => massBlockMutation.mutate() },
    { key: 'unblock', label: 'Разблокировать', onClick: () => massUnblockMutation.mutate() },
    { key: 'setBalance', label: 'Установить баланс', onClick: () => setMassBalanceModalOpen(true) },
    { key: 'changeRole', label: 'Сменить роль', onClick: () => setMassRoleModalOpen(true) },
    { key: 'license', label: 'Выдать лицензию', icon: <IdcardOutlined />, onClick: () => setLicenseModalOpen(true) },
    { key: 'delete', label: 'Удалить', danger: true, onClick: () => { Modal.confirm({ title: `Удалить ${selectedIds.length} персон?`, onOk: () => massDeleteMutation.mutate() }); } },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ПЕРСОНЫ
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input
            placeholder="Поиск..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            allowClear
            placeholder="Роль"
            value={filterRole}
            onChange={(v) => { setFilterRole(v); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { value: 'USER', label: 'USER' },
              { value: 'DECKER', label: 'DECKER' },
              { value: 'SPIDER', label: 'SPIDER' },
              { value: 'GRIDGOD', label: 'GRIDGOD' },
            ]}
          />
          <Select
            allowClear
            placeholder="Статус"
            value={filterBlocked === true ? 'blocked' : filterBlocked === false ? 'active' : undefined}
            onChange={(v) => { setFilterBlocked(v === 'blocked' ? true : v === 'active' ? false : undefined); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { value: 'active', label: 'Активные' },
              { value: 'blocked', label: 'Заблокированные' },
            ]}
          />
        </Space>
        <Space>
          {selectedIds.length > 0 && (
            <Dropdown menu={{ items: massMenuItems }}>
              <Button>
                Массовые ({selectedIds.length}) <DownOutlined />
              </Button>
            </Dropdown>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Создать
          </Button>
        </Space>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.items}
        rowKey="id"
        loading={isLoading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <Modal
        title="Создать персону"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="username" label="Логин" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="personaName" label="Имя персоны" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="role" label="Роль" initialValue="USER">
            <Select options={[
              { value: 'USER', label: 'USER' },
              { value: 'DECKER', label: 'DECKER' },
              { value: 'SPIDER', label: 'SPIDER' },
              { value: 'GRIDGOD', label: 'GRIDGOD' },
            ]} />
          </Form.Item>
          <Form.Item name="avatar" label="Аватар (URL)"><Input /></Form.Item>
          <Form.Item name="address" label="Адрес"><Input /></Form.Item>
          <Form.Item name="profession" label="Профессия"><Input /></Form.Item>
          <Form.Item name="extraInfo" label="Доп. информация"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="initialBalance" label="Начальный баланс"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Выдать лицензию (${selectedIds.length} персон)`}
        open={licenseModalOpen}
        onCancel={() => setLicenseModalOpen(false)}
        onOk={() => licenseForm.submit()}
        confirmLoading={licenseMutation.isPending}
      >
        <Form
          form={licenseForm}
          layout="vertical"
          onFinish={(values) => {
            const payload = { licenses: [{ type: values.type, name: values.name, description: values.description }] };
            selectedIds.forEach((id) => { licenseMutation.mutate({ id, data: payload }); });
          }}
        >
          <Form.Item name="type" label="Тип лицензии" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Описание"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Установить баланс (${selectedIds.length} персон)`}
        open={massBalanceModalOpen}
        onCancel={() => setMassBalanceModalOpen(false)}
        onOk={() => massBalanceForm.submit()}
      >
        <Form form={massBalanceForm} layout="vertical" onFinish={(v) => massSetBalanceMutation.mutate(v.balance)}>
          <Form.Item name="balance" label="Новый баланс" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Сменить роль (${selectedIds.length} персон)`}
        open={massRoleModalOpen}
        onCancel={() => setMassRoleModalOpen(false)}
        onOk={() => massRoleForm.submit()}
      >
        <Form form={massRoleForm} layout="vertical" onFinish={(v) => massChangeRoleMutation.mutate(v.role)}>
          <Form.Item name="role" label="Новая роль" rules={[{ required: true }]}>
            <Select options={[
              { value: 'USER', label: 'USER' },
              { value: 'DECKER', label: 'DECKER' },
              { value: 'SPIDER', label: 'SPIDER' },
              { value: 'GRIDGOD', label: 'GRIDGOD' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
