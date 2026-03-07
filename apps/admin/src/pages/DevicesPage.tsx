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
  Typography,
  Popconfirm,
  Dropdown,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ToolOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  bindDevice,
  unbindDevice,
  resetBrick,
  massUnbindDevices,
  massResetBrickDevices,
  massDeleteDevices,
} from '../api/devices';
import { getPersonas } from '../api/personas';
import type { Device } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterUnowned, setFilterUnowned] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindDeviceId, setBindDeviceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [bindForm] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['devices', search, filterType, filterStatus, filterUnowned, page, pageSize],
    queryFn: () =>
      getDevices({
        search: search || undefined,
        type: filterType,
        status: filterStatus,
        unownedOnly: filterUnowned,
        page,
        limit: pageSize,
      }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['devices'] });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createDevice(values),
    onSuccess: () => { message.success('Устройство создано'); inv(); setCreateModalOpen(false); createForm.resetFields(); },
    onError: () => message.error('Ошибка создания'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) => updateDevice(id, values),
    onSuccess: () => { message.success('Устройство обновлено'); inv(); setEditModalOpen(false); editForm.resetFields(); },
    onError: () => message.error('Ошибка обновления'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => { message.success('Устройство удалено'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const bindMutation = useMutation({
    mutationFn: ({ id, personaId }: { id: string; personaId: string }) => bindDevice(id, personaId),
    onSuccess: () => { message.success('Устройство привязано'); inv(); setBindModalOpen(false); bindForm.resetFields(); },
    onError: () => message.error('Ошибка привязки'),
  });

  const unbindMutation = useMutation({
    mutationFn: unbindDevice,
    onSuccess: () => { message.success('Устройство отвязано'); inv(); },
    onError: () => message.error('Ошибка отвязки'),
  });

  const resetBrickMutation = useMutation({
    mutationFn: resetBrick,
    onSuccess: () => { message.success('Brick сброшен'); inv(); },
    onError: () => message.error('Ошибка сброса'),
  });

  const massUnbindMutation = useMutation({
    mutationFn: () => massUnbindDevices(selectedIds),
    onSuccess: () => { message.success('Массовая отвязка выполнена'); inv(); setSelectedIds([]); },
  });

  const massResetBrickMutation = useMutation({
    mutationFn: () => massResetBrickDevices(selectedIds),
    onSuccess: () => { message.success('Массовый сброс brick выполнен'); inv(); setSelectedIds([]); },
  });

  const massDeleteMutation = useMutation({
    mutationFn: () => massDeleteDevices(selectedIds),
    onSuccess: () => { message.success('Массовое удаление выполнено'); inv(); setSelectedIds([]); },
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  function openEdit(device: Device) {
    setEditingDevice(device);
    editForm.setFieldsValue({ code: device.code, name: device.name, type: device.type });
    setEditModalOpen(true);
  }

  const columns: ColumnsType<Device> = [
    { title: 'Код', dataIndex: 'code', key: 'code', render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: 'Название', dataIndex: 'name', key: 'name', render: (v: string) => v ?? '—' },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Владелец',
      key: 'owner',
      render: (_, record) =>
        record.owner ? (
          <Link to={`/personas/${record.owner.id}`} style={{ color: '#00ff41' }}>
            {record.owner.name}
          </Link>
        ) : (
          <Tag>Нет</Tag>
        ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string, record) =>
        s === 'BRICKED' ? (
          <Tag color="error">
            BRICKED{record.brickUntil ? ` до ${dayjs(record.brickUntil).format('HH:mm')}` : ''}
          </Tag>
        ) : (
          <Tag color="success">ACTIVE</Tag>
        ),
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} title="Редактировать" />
          <Button type="text" icon={<LinkOutlined />} size="small" onClick={() => { setBindDeviceId(record.id); setBindModalOpen(true); }} title="Привязать" />
          {record.ownerPersonaId && (
            <Popconfirm title="Отвязать устройство?" onConfirm={() => unbindMutation.mutate(record.id)}>
              <Button type="text" icon={<DisconnectOutlined />} size="small" title="Отвязать" />
            </Popconfirm>
          )}
          {record.status === 'BRICKED' && (
            <Button type="text" icon={<ToolOutlined />} size="small" onClick={() => resetBrickMutation.mutate(record.id)} style={{ color: '#faad14' }} title="Сбросить Brick" />
          )}
          <Popconfirm title="Удалить устройство?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} size="small" danger title="Удалить" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const massMenuItems = [
    { key: 'unbind', label: 'Отвязать все', onClick: () => massUnbindMutation.mutate() },
    { key: 'resetBrick', label: 'Сбросить Brick', onClick: () => massResetBrickMutation.mutate() },
    { key: 'delete', label: 'Удалить', danger: true, onClick: () => { Modal.confirm({ title: `Удалить ${selectedIds.length} устройств?`, onOk: () => massDeleteMutation.mutate() }); } },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        УСТРОЙСТВА / СНАРЯЖЕНИЕ
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input
            placeholder="Поиск..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 220 }}
            allowClear
          />
          <Input
            placeholder="Тип (COMMLINK, оружие...)"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value || undefined); setPage(1); }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            allowClear
            placeholder="Статус"
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            style={{ width: 130 }}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'BRICKED', label: 'BRICKED' },
            ]}
          />
          <Select
            allowClear
            placeholder="Владелец"
            value={filterUnowned === true ? 'unowned' : filterUnowned === false ? 'owned' : undefined}
            onChange={(v) => { setFilterUnowned(v === 'unowned' ? true : v === 'owned' ? false : undefined); setPage(1); }}
            style={{ width: 140 }}
            options={[
              { value: 'unowned', label: 'Без владельца' },
              { value: 'owned', label: 'С владельцем' },
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
        title="Создать устройство"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="code" label="Код" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Название">
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Тип" rules={[{ required: true }]} initialValue="COMMLINK"
            extra="Произвольный: COMMLINK, DECK, оружие, имплант, транспорт и т.д."
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Редактировать устройство"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
        onOk={() => editForm.submit()}
        confirmLoading={editMutation.isPending}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (editingDevice) {
              editMutation.mutate({ id: editingDevice.id, values });
            }
          }}
        >
          <Form.Item name="code" label="Код" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Название">
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}
            extra="Произвольный: COMMLINK, DECK, оружие, имплант, транспорт и т.д."
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Привязать устройство"
        open={bindModalOpen}
        onCancel={() => { setBindModalOpen(false); bindForm.resetFields(); }}
        onOk={() => bindForm.submit()}
        confirmLoading={bindMutation.isPending}
      >
        <Form
          form={bindForm}
          layout="vertical"
          onFinish={(values) => {
            if (bindDeviceId) {
              bindMutation.mutate({ id: bindDeviceId, personaId: values.personaId });
            }
          }}
        >
          <Form.Item name="personaId" label="Персона" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Поиск персоны..."
              filterOption={false}
              onSearch={setPersonaSearch}
              options={personaSelectOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
