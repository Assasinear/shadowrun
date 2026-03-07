import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Input, Space, Modal, Form, Select, Popconfirm,
  Typography, Dropdown, message,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, DeleteOutlined, DownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlogPosts, createBlogPost, deleteBlogPost, massDeleteBlogPosts } from '../api/blogPosts';
import type { BlogPost } from '../api/blogPosts';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function BlogPostsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPersonaId, setFilterPersonaId] = useState<string | undefined>();
  const [filterHostId, setFilterHostId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', search, filterPersonaId, filterHostId, page, pageSize],
    queryFn: () => getBlogPosts({ search: search || undefined, personaId: filterPersonaId, hostId: filterHostId, page, limit: pageSize }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const { data: hostOptions } = useQuery({
    queryKey: ['hosts-select', hostSearch],
    queryFn: () => getHosts({ search: hostSearch || undefined }),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] });

  const createMutation = useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => { message.success('Пост создан'); inv(); setModalOpen(false); form.resetFields(); },
    onError: () => message.error('Ошибка создания'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => { message.success('Пост удалён'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const massDeleteMutation = useMutation({
    mutationFn: () => massDeleteBlogPosts(selectedIds),
    onSuccess: () => { message.success('Массовое удаление выполнено'); inv(); setSelectedIds([]); },
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const hostSelectOptions = (hostOptions?.items ?? []).map((h) => ({ value: h.id, label: h.name }));

  const columns: ColumnsType<BlogPost> = [
    {
      title: 'Текст',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (t: string) => <span style={{ fontFamily: 'monospace' }}>{t}</span>,
    },
    {
      title: 'Автор',
      key: 'author',
      width: 180,
      render: (_, record) => {
        if (record.persona) return <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>{record.persona.name}</Link>;
        if (record.host) return <Link to={`/hosts/${record.host.id}`} style={{ color: '#00ff41' }}>{record.host.name} (Host)</Link>;
        return '—';
      },
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm title="Удалить пост?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>БЛОГ-ПОСТЫ</Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Input placeholder="Поиск..." prefix={<SearchOutlined />} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 220 }} allowClear />
          <Select showSearch allowClear placeholder="По персоне" filterOption={false} onSearch={setPersonaSearch} onChange={(val) => { setFilterPersonaId(val); setPage(1); }} options={personaSelectOptions} style={{ width: 180 }} />
          <Select showSearch allowClear placeholder="По хосту" filterOption={false} onSearch={setHostSearch} onChange={(val) => { setFilterHostId(val); setPage(1); }} options={hostSelectOptions} style={{ width: 180 }} />
        </Space>
        <Space>
          {selectedIds.length > 0 && (
            <Dropdown menu={{ items: [{ key: 'delete', label: 'Удалить', danger: true, onClick: () => Modal.confirm({ title: `Удалить ${selectedIds.length} постов?`, onOk: () => massDeleteMutation.mutate() }) }] }}>
              <Button>Массовые ({selectedIds.length}) <DownOutlined /></Button>
            </Dropdown>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Создать</Button>
        </Space>
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as string[]) }}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />

      <Modal title="Создать пост" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="text" label="Текст" rules={[{ required: true }]}><Input.TextArea rows={3} maxLength={70} showCount /></Form.Item>
          <Form.Item name="personaId" label="Персона">
            <Select showSearch allowClear placeholder="Поиск..." filterOption={false} onSearch={setPersonaSearch} options={personaSelectOptions} />
          </Form.Item>
          <Form.Item name="hostId" label="Хост">
            <Select showSearch allowClear placeholder="Поиск..." filterOption={false} onSearch={setHostSearch} options={hostSelectOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
