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
  Descriptions,
  Image,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
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
  const [filterPublic, setFilterPublic] = useState<string | undefined>();
  const [filterIce, setFilterIce] = useState<string | undefined>();
  const [filterRedeem, setFilterRedeem] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [viewingFile, setViewingFile] = useState<FileRecord | null>(null);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['files', search, filterPersonaId, filterHostId],
    queryFn: () =>
      getFiles({
        search: search || undefined,
        personaId: filterPersonaId,
        hostId: filterHostId,
      }),
  });

  const data = rawData?.filter((f) => {
    if (filterPublic === 'public' && !f.isPublic) return false;
    if (filterPublic === 'private' && f.isPublic) return false;
    if (filterIce === '0' && f.iceLevel !== 0) return false;
    if (filterIce === '1+' && f.iceLevel < 1) return false;
    if (filterIce === '3+' && f.iceLevel < 3) return false;
    if (filterIce === '5+' && f.iceLevel < 5) return false;
    if (filterRedeem === 'has' && !f.redeemCode) return false;
    if (filterRedeem === 'no' && f.redeemCode) return false;
    return true;
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

  const hostSelectOptions = (hostOptions?.items ?? []).map((h) => ({
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
        if (record.persona) return (
          <><Tag color="blue">Persona</Tag>{' '}
            <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>{record.persona.name}</Link>
          </>
        );
        if (record.host) return (
          <><Tag color="purple">Host</Tag>{' '}
            <Link to={`/hosts/${record.host.id}`} style={{ color: '#00ff41' }}>{record.host.name}</Link>
          </>
        );
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
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => setViewingFile(record)}
          />
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
        ФАЙЛЫ
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input
            placeholder="Поиск..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            showSearch allowClear
            placeholder="По персоне"
            filterOption={false}
            onSearch={setPersonaSearch}
            onChange={(val) => setFilterPersonaId(val)}
            options={personaSelectOptions}
            style={{ width: 180 }}
          />
          <Select
            showSearch allowClear
            placeholder="По хосту"
            filterOption={false}
            onSearch={setHostSearch}
            onChange={(val) => setFilterHostId(val)}
            options={hostSelectOptions}
            style={{ width: 180 }}
          />
          <Select
            allowClear
            placeholder="Публичность"
            value={filterPublic}
            onChange={setFilterPublic}
            style={{ width: 140 }}
            options={[
              { value: 'public', label: 'Публичные' },
              { value: 'private', label: 'Приватные' },
            ]}
          />
          <Select
            allowClear
            placeholder="ICE"
            value={filterIce}
            onChange={setFilterIce}
            style={{ width: 120 }}
            options={[
              { value: '0', label: 'ICE = 0' },
              { value: '1+', label: 'ICE ≥ 1' },
              { value: '3+', label: 'ICE ≥ 3' },
              { value: '5+', label: 'ICE ≥ 5' },
            ]}
          />
          <Select
            allowClear
            placeholder="Redeem код"
            value={filterRedeem}
            onChange={setFilterRedeem}
            style={{ width: 150 }}
            options={[
              { value: 'has', label: 'С кодом' },
              { value: 'no', label: 'Без кода' },
            ]}
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
        title={viewingFile ? `Файл: ${viewingFile.name}` : 'Просмотр файла'}
        open={!!viewingFile}
        onCancel={() => setViewingFile(null)}
        footer={[
          <Button key="close" onClick={() => setViewingFile(null)}>
            Закрыть
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              if (viewingFile) {
                openEdit(viewingFile);
                setViewingFile(null);
              }
            }}
          >
            Редактировать
          </Button>,
        ]}
        width={700}
      >
        {viewingFile && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="ID" span={2}>{viewingFile.id}</Descriptions.Item>
              <Descriptions.Item label="Name">{viewingFile.name}</Descriptions.Item>
              <Descriptions.Item label="Type">{viewingFile.type ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="ICE">{viewingFile.iceLevel}</Descriptions.Item>
              <Descriptions.Item label="Public">
                {viewingFile.isPublic ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Size">{viewingFile.size ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Redeem Code">{viewingFile.redeemCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Owner" span={2}>
                {viewingFile.persona ? (
                  <><Tag color="blue">Persona</Tag>{' '}
                    <Link to={`/personas/${viewingFile.persona.id}`} style={{ color: '#00ff41' }}>
                      {viewingFile.persona.name}
                    </Link>
                  </>
                ) : viewingFile.host ? (
                  <><Tag color="purple">Host</Tag>{' '}
                    <Link to={`/hosts/${viewingFile.host.id}`} style={{ color: '#00ff41' }}>
                      {viewingFile.host.name}
                    </Link>
                  </>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {viewingFile.createdAt ? dayjs(viewingFile.createdAt).format('DD.MM.YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {viewingFile.updatedAt ? dayjs(viewingFile.updatedAt).format('DD.MM.YYYY HH:mm') : '—'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                Content
              </Typography.Text>
              {!viewingFile.content ? (
                <Typography.Text type="secondary">Пусто</Typography.Text>
              ) : viewingFile.type === 'image' || /^data:image\//i.test(viewingFile.content) ? (
                <Image
                  src={viewingFile.content}
                  alt={viewingFile.name}
                  style={{ maxWidth: '100%', maxHeight: 400 }}
                />
              ) : (
                <Input.TextArea
                  value={viewingFile.content}
                  readOnly
                  autoSize={{ minRows: 4, maxRows: 16 }}
                  style={{ fontFamily: 'monospace' }}
                />
              )}
            </div>
          </Space>
        )}
      </Modal>

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
