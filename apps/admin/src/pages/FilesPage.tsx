import { useState } from 'react';
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
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFiles, createFile, updateFile, deleteFile } from '../api/files';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import type { FileRecord } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const FILE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

export default function FilesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPersonaId, setFilterPersonaId] = useState<string | undefined>();
  const [filterHostId, setFilterHostId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['files', search, filterPersonaId, filterHostId],
    queryFn: () =>
      getFiles({
        search: search || undefined,
        personaId: filterPersonaId,
        hostId: filterHostId,
      }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const { data: hostOptions } = useQuery({
    queryKey: ['hosts-select', hostSearch],
    queryFn: () => getHosts({ search: hostSearch || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => createFile(values),
    onSuccess: () => {
      message.success('File created');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      closeModal();
    },
    onError: () => message.error('Failed to create file'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateFile(id, values),
    onSuccess: () => {
      message.success('File updated');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      closeModal();
    },
    onError: () => message.error('Failed to update file'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      message.success('File deleted');
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => message.error('Failed to delete file'),
  });

  function closeModal() {
    setModalOpen(false);
    setEditingFile(null);
    form.resetFields();
  }

  function openEdit(file: FileRecord) {
    setEditingFile(file);
    form.setFieldsValue({
      name: file.name,
      type: file.type,
      content: file.content,
      isPublic: file.isPublic,
      iceLevel: file.iceLevel,
      redeemCode: file.redeemCode,
      personaId: file.personaId,
      hostId: file.hostId,
    });
    setModalOpen(true);
  }

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const hostSelectOptions = (hostOptions ?? []).map((h) => ({
    value: h.id,
    label: h.name,
  }));

  const columns: ColumnsType<FileRecord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>{name}</span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string | null) => type ?? '—',
    },
    {
      title: 'ICE Level',
      dataIndex: 'iceLevel',
      key: 'iceLevel',
      width: 90,
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) => {
        if (record.personaId) return <Tag color="blue">Persona</Tag>;
        if (record.hostId) return <Tag color="purple">Host</Tag>;
        return '—';
      },
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
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => (d ? dayjs(d).format('DD.MM.YY HH:mm') : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Delete this file?"
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
        FILES
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input
            placeholder="Search files..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            showSearch
            allowClear
            placeholder="Filter by persona"
            filterOption={false}
            onSearch={setPersonaSearch}
            onChange={(val) => setFilterPersonaId(val)}
            options={personaSelectOptions}
            style={{ width: 200 }}
          />
          <Select
            showSearch
            allowClear
            placeholder="Filter by host"
            filterOption={false}
            onSearch={setHostSearch}
            onChange={(val) => setFilterHostId(val)}
            options={hostSelectOptions}
            style={{ width: 200 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Create File
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total}`,
        }}
      />

      <Modal
        title={editingFile ? 'Edit File' : 'Create File'}
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
            if (editingFile) {
              updateMutation.mutate({ id: editingFile.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select options={FILE_TYPES} allowClear placeholder="Select type" />
          </Form.Item>
          <Form.Item name="content" label="Content">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="iceLevel" label="ICE Level" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="redeemCode" label="Redeem Code">
            <Input />
          </Form.Item>
          <Form.Item name="personaId" label="Persona">
            <Select
              showSearch
              allowClear
              placeholder="Search persona..."
              filterOption={false}
              onSearch={setPersonaSearch}
              options={personaSelectOptions}
            />
          </Form.Item>
          <Form.Item name="hostId" label="Host">
            <Select
              showSearch
              allowClear
              placeholder="Search host..."
              filterOption={false}
              onSearch={setHostSearch}
              options={hostSelectOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
