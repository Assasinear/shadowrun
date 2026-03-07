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
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  Typography,
  Dropdown,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHosts, createHost, updateHost, deleteHost, massDeleteHosts } from '../api/hosts';
import { getPersonas } from '../api/personas';
import type { Host } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function HostsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPublic, setFilterPublic] = useState<boolean | undefined>();
  const [filterOwner, setFilterOwner] = useState<string | undefined>();
  const [filterSpider, setFilterSpider] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');

  const inv = () => queryClient.invalidateQueries({ queryKey: ['hosts'] });

  const { data, isLoading } = useQuery({
    queryKey: ['hosts', search, filterPublic, filterOwner, filterSpider, page, pageSize],
    queryFn: () => getHosts({
      search: search || undefined,
      isPublic: filterPublic,
      ownerPersonaId: filterOwner,
      spiderPersonaId: filterSpider,
      page,
      limit: pageSize,
    }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createHost(values),
    onSuccess: () => { message.success('Хост создан'); inv(); closeModal(); },
    onError: () => message.error('Ошибка создания'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) => updateHost(id, values),
    onSuccess: () => { message.success('Хост обновлён'); inv(); closeModal(); },
    onError: () => message.error('Ошибка обновления'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHost,
    onSuccess: () => { message.success('Хост удалён'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const massDeleteMutation = useMutation({
    mutationFn: () => massDeleteHosts(selectedIds),
    onSuccess: () => { message.success('Массовое удаление выполнено'); inv(); setSelectedIds([]); },
  });

  function closeModal() {
    setModalOpen(false);
    setEditingHost(null);
    form.resetFields();
  }

  function openEdit(host: Host) {
    setEditingHost(host);
    form.setFieldsValue({
      name: host.name,
      description: host.description,
      isPublic: host.isPublic,
      ownerPersonaId: host.ownerPersonaId,
      spiderPersonaId: host.spiderPersonaId,
      iceLevel: host.iceLevel,
    });
    setModalOpen(true);
  }

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const columns: ColumnsType<Host> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link to={`/hosts/${record.id}`} style={{ color: '#00ff41' }}>{name}</Link>
      ),
    },
    {
      title: 'Владелец',
      key: 'owner',
      render: (_, record) =>
        record.owner ? (
          <Link to={`/personas/${record.owner.id}`} style={{ color: '#00ff41' }}>{record.owner.name}</Link>
        ) : '—',
    },
    {
      title: 'Spider',
      key: 'spider',
      render: (_, record) =>
        record.spider ? (
          <Link to={`/personas/${record.spider.id}`} style={{ color: '#00ff41' }}>{record.spider.name}</Link>
        ) : '—',
    },
    { title: 'ICE', dataIndex: 'iceLevel', key: 'iceLevel', width: 60 },
    {
      title: 'Публичный',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (v: boolean) => v ? <Tag color="green">Да</Tag> : <Tag color="default">Нет</Tag>,
    },
    {
      title: 'Файлов',
      key: 'files',
      width: 80,
      render: (_, record) => record._count?.files ?? record.files?.length ?? 0,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Link to={`/hosts/${record.id}`}><Button type="text" icon={<EyeOutlined />} size="small" /></Link>
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить хост?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const massMenuItems = [
    { key: 'delete', label: 'Удалить', danger: true, onClick: () => { Modal.confirm({ title: `Удалить ${selectedIds.length} хостов?`, onOk: () => massDeleteMutation.mutate() }); } },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ХОСТЫ
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
            placeholder="Публичность"
            value={filterPublic === true ? 'public' : filterPublic === false ? 'private' : undefined}
            onChange={(v) => { setFilterPublic(v === 'public' ? true : v === 'private' ? false : undefined); setPage(1); }}
            style={{ width: 150 }}
            options={[
              { value: 'public', label: 'Публичные' },
              { value: 'private', label: 'Приватные' },
            ]}
          />
          <Select
            showSearch allowClear
            placeholder="Владелец"
            filterOption={false}
            onSearch={setPersonaSearch}
            onChange={(v) => { setFilterOwner(v); setPage(1); }}
            options={personaSelectOptions}
            style={{ width: 180 }}
          />
          <Select
            showSearch allowClear
            placeholder="Spider"
            filterOption={false}
            onSearch={setPersonaSearch}
            onChange={(v) => { setFilterSpider(v); setPage(1); }}
            options={personaSelectOptions}
            style={{ width: 180 }}
          />
        </Space>
        <Space>
          {selectedIds.length > 0 && (
            <Dropdown menu={{ items: massMenuItems }}>
              <Button>Массовые ({selectedIds.length}) <DownOutlined /></Button>
            </Dropdown>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
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
        title={editingHost ? 'Редактировать хост' : 'Создать хост'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingHost) {
              updateMutation.mutate({ id: editingHost.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Описание"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="isPublic" label="Публичный" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="ownerPersonaId" label="Владелец">
            <Select showSearch allowClear placeholder="Поиск..." filterOption={false} onSearch={setPersonaSearch} options={personaSelectOptions} />
          </Form.Item>
          <Form.Item name="spiderPersonaId" label="Spider">
            <Select showSearch allowClear placeholder="Поиск..." filterOption={false} onSearch={setPersonaSearch} options={personaSelectOptions} />
          </Form.Item>
          <Form.Item name="iceLevel" label="ICE Level" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
