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
  Tabs,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDevices, createDevice, bindDevice, unbindDevice, resetBrick } from '../api/devices';
import { getPersonas } from '../api/personas';
import type { Device } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tab, setTab] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindDeviceId, setBindDeviceId] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [bindForm] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');

  const isUnowned = tab === 'unowned';

  const { data, isLoading } = useQuery({
    queryKey: ['devices', search, page, pageSize, isUnowned],
    queryFn: () =>
      getDevices({
        unownedOnly: isUnowned || undefined,
      }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createDevice(values),
    onSuccess: () => {
      message.success('Device created');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: () => message.error('Failed to create device'),
  });

  const bindMutation = useMutation({
    mutationFn: ({ id, personaId }: { id: string; personaId: string }) =>
      bindDevice(id, personaId),
    onSuccess: () => {
      message.success('Device bound');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setBindModalOpen(false);
      bindForm.resetFields();
    },
    onError: () => message.error('Failed to bind device'),
  });

  const unbindMutation = useMutation({
    mutationFn: unbindDevice,
    onSuccess: () => {
      message.success('Device unbound');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => message.error('Failed to unbind device'),
  });

  const resetBrickMutation = useMutation({
    mutationFn: resetBrick,
    onSuccess: () => {
      message.success('Brick reset');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => message.error('Failed to reset brick'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const columns: ColumnsType<Device> = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => v ?? '—' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) =>
        record.owner ? (
          <Link to={`/personas/${record.owner.id}`} style={{ color: '#00ff41' }}>
            {record.owner.name}
          </Link>
        ) : (
          <Tag>Unowned</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string, record) =>
        s === 'BRICKED' ? (
          <Tag color="error">
            BRICKED{record.brickUntil ? ` until ${dayjs(record.brickUntil).format('HH:mm')}` : ''}
          </Tag>
        ) : (
          <Tag color="success">ACTIVE</Tag>
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
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<LinkOutlined />}
            size="small"
            onClick={() => {
              setBindDeviceId(record.id);
              setBindModalOpen(true);
            }}
            title="Bind"
          />
          {record.ownerPersonaId && (
            <Popconfirm
              title="Unbind device?"
              onConfirm={() => unbindMutation.mutate(record.id)}
            >
              <Button
                type="text"
                icon={<DisconnectOutlined />}
                size="small"
                title="Unbind"
              />
            </Popconfirm>
          )}
          {record.status === 'BRICKED' && (
            <Button
              type="text"
              icon={<ToolOutlined />}
              size="small"
              onClick={() => resetBrickMutation.mutate(record.id)}
              style={{ color: '#faad14' }}
              title="Reset Brick"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        DEVICES
      </Typography.Title>

      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        items={[
          { key: 'all', label: 'All' },
          { key: 'unowned', label: 'Unowned' },
        ]}
      />

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Input
          placeholder="Search devices..."
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
          onClick={() => setCreateModalOpen(true)}
        >
          Create Device
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
        title="Create Device"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="COMMLINK">
            <Select
              options={[
                { value: 'COMMLINK', label: 'COMMLINK' },
                { value: 'DECK', label: 'DECK' },
                { value: 'OTHER', label: 'OTHER' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bind Device"
        open={bindModalOpen}
        onCancel={() => {
          setBindModalOpen(false);
          bindForm.resetFields();
        }}
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
          <Form.Item name="personaId" label="Persona" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Search persona..."
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
