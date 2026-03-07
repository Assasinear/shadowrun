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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPersonas,
  createPersona,
  blockPersona,
  unblockPersona,
  deletePersona,
  issueLicenses,
} from '../api/personas';
import type { Persona } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [licenseForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['personas', search, page, pageSize],
    queryFn: () => getPersonas({ search: search || undefined, page, limit: pageSize }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createPersona(values),
    onSuccess: () => {
      message.success('Persona created');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: () => message.error('Failed to create persona'),
  });

  const blockMutation = useMutation({
    mutationFn: blockPersona,
    onSuccess: () => {
      message.success('Persona blocked');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: unblockPersona,
    onSuccess: () => {
      message.success('Persona unblocked');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePersona,
    onSuccess: () => {
      message.success('Persona deleted');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
    onError: () => message.error('Failed to delete persona'),
  });

  const licenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issueLicenses(id, data),
    onSuccess: () => {
      message.success('Licenses issued');
      setLicenseModalOpen(false);
      licenseForm.resetFields();
      setSelectedIds([]);
    },
    onError: () => message.error('Failed to issue licenses'),
  });

  const columns: ColumnsType<Persona> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link to={`/personas/${record.id}`} style={{ color: '#00ff41' }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'SIN',
      key: 'sin',
      render: (_, record) => record.lls?.sin ?? '—',
    },
    {
      title: 'Role',
      key: 'role',
      render: (_, record) => {
        const role = record.user?.role;
        const colorMap: Record<string, string> = {
          GRIDGOD: 'red',
          SPIDER: 'purple',
          DECKER: 'blue',
          USER: 'default',
        };
        return role ? <Tag color={colorMap[role] ?? 'default'}>{role}</Tag> : '—';
      },
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) =>
        record.wallet ? `¥${Number(record.wallet.balance).toFixed(2)}` : '—',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) =>
        record.user?.isBlocked ? (
          <Tag color="error">Blocked</Tag>
        ) : (
          <Tag color="success">Active</Tag>
        ),
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
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Link to={`/personas/${record.id}`}>
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Link>
          {record.user?.isBlocked ? (
            <Button
              type="text"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => unblockMutation.mutate(record.id)}
              style={{ color: '#52c41a' }}
            />
          ) : (
            <Button
              type="text"
              icon={<StopOutlined />}
              size="small"
              onClick={() => blockMutation.mutate(record.id)}
              style={{ color: '#faad14' }}
            />
          )}
          <Popconfirm
            title="Delete this persona?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        PERSONAS
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space>
          <Input
            placeholder="Search personas..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
            allowClear
          />
        </Space>
        <Space>
          {selectedIds.length > 0 && (
            <Button
              icon={<IdcardOutlined />}
              onClick={() => setLicenseModalOpen(true)}
            >
              Issue Licenses ({selectedIds.length})
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Persona
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
          showTotal: (total) => `Total: ${total}`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title="Create Persona"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="personaName" label="Persona Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="USER">
            <Select
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'DECKER', label: 'DECKER' },
                { value: 'SPIDER', label: 'SPIDER' },
                { value: 'GRIDGOD', label: 'GRIDGOD' },
              ]}
            />
          </Form.Item>
          <Form.Item name="avatar" label="Avatar URL">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="profession" label="Profession">
            <Input />
          </Form.Item>
          <Form.Item name="extraInfo" label="Extra Info">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="initialBalance" label="Initial Balance">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Issue Licenses to ${selectedIds.length} persona(s)`}
        open={licenseModalOpen}
        onCancel={() => setLicenseModalOpen(false)}
        onOk={() => licenseForm.submit()}
        confirmLoading={licenseMutation.isPending}
      >
        <Form
          form={licenseForm}
          layout="vertical"
          onFinish={(values) => {
            const licensePayload = { licenses: [{ type: values.type, name: values.name, description: values.description }] };
            selectedIds.forEach((id) => {
              licenseMutation.mutate({ id, data: licensePayload });
            });
          }}
        >
          <Form.Item name="type" label="License Type" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="License Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
