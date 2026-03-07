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
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHosts, createHost, updateHost, deleteHost } from '../api/hosts';
import { getPersonas } from '../api/personas';
import type { Host } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function HostsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hosts', search, page, pageSize],
    queryFn: () => getHosts({ search: search || undefined }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createHost(values),
    onSuccess: () => {
      message.success('Host created');
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      closeModal();
    },
    onError: () => message.error('Failed to create host'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateHost(id, values),
    onSuccess: () => {
      message.success('Host updated');
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      closeModal();
    },
    onError: () => message.error('Failed to update host'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHost,
    onSuccess: () => {
      message.success('Host deleted');
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
    },
    onError: () => message.error('Failed to delete host'),
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link to={`/hosts/${record.id}`} style={{ color: '#00ff41' }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) =>
        record.owner ? (
          <Link to={`/personas/${record.owner.id}`} style={{ color: '#00ff41' }}>
            {record.owner.name}
          </Link>
        ) : '—',
    },
    {
      title: 'Spider',
      key: 'spider',
      render: (_, record) =>
        record.spider ? (
          <Link to={`/personas/${record.spider.id}`} style={{ color: '#00ff41' }}>
            {record.spider.name}
          </Link>
        ) : '—',
    },
    {
      title: 'ICE',
      dataIndex: 'iceLevel',
      key: 'iceLevel',
      width: 80,
    },
    {
      title: 'Public',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: 'Files',
      key: 'files',
      width: 80,
      render: (_, record) => record.files?.length ?? 0,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Link to={`/hosts/${record.id}`}>
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Link>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Delete this host?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        HOSTS
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Input
          placeholder="Search hosts..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          Create Host
        </Button>
      </Space>

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
        title={editingHost ? 'Edit Host' : 'Create Host'}
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
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="ownerPersonaId" label="Owner Persona">
            <Select
              showSearch
              allowClear
              placeholder="Search persona..."
              filterOption={false}
              onSearch={setPersonaSearch}
              options={personaSelectOptions}
            />
          </Form.Item>
          <Form.Item name="spiderPersonaId" label="Spider Persona">
            <Select
              showSearch
              allowClear
              placeholder="Search persona..."
              filterOption={false}
              onSearch={setPersonaSearch}
              options={personaSelectOptions}
            />
          </Form.Item>
          <Form.Item name="iceLevel" label="ICE Level" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
