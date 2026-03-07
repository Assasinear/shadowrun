import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Input, Space, Modal, Form, Select, Tag,
  Typography, Tooltip, message,
} from 'antd';
import {
  SendOutlined, SearchOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, broadcastNotification, markAllRead } from '../api/notifications';
import type { Notification } from '../api/notifications';
import { getPersonas } from '../api/personas';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterPersonaId, setFilterPersonaId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [form] = Form.useForm();
  const [personaSearch, setPersonaSearch] = useState('');
  const [broadcastPersonaSearch, setBroadcastPersonaSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filterPersonaId, filterType, page, pageSize],
    queryFn: () => getNotifications({ personaId: filterPersonaId, type: filterType || undefined, page, limit: pageSize }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const { data: broadcastPersonaOptions } = useQuery({
    queryKey: ['personas-broadcast', broadcastPersonaSearch],
    queryFn: () => getPersonas({ search: broadcastPersonaSearch || undefined, limit: 50 }),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const broadcastMutation = useMutation({
    mutationFn: (values: { type: string; payload?: string; personaIds?: string[] }) => {
      let payload: Record<string, unknown> | undefined;
      if (values.payload) {
        try { payload = JSON.parse(values.payload); } catch { payload = { message: values.payload }; }
      }
      return broadcastNotification({ type: values.type, payload, personaIds: values.personaIds?.length ? values.personaIds : undefined });
    },
    onSuccess: (result) => { message.success(`Отправлено: ${result.count}`); inv(); setBroadcastOpen(false); form.resetFields(); },
    onError: () => message.error('Ошибка отправки'),
  });

  const markReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { message.success('Отмечено как прочитанное'); inv(); },
    onError: () => message.error('Ошибка'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const broadcastPersonaSelectOptions = (broadcastPersonaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const columns: ColumnsType<Notification> = [
    {
      title: 'Персона',
      key: 'persona',
      width: 180,
      render: (_, record) => record.persona ? <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>{record.persona.name}</Link> : record.personaId,
    },
    { title: 'Тип', dataIndex: 'type', key: 'type', width: 150 },
    {
      title: 'Payload',
      dataIndex: 'payload',
      key: 'payload',
      ellipsis: true,
      render: (v: Record<string, unknown> | null) => v ? (
        <Tooltip title={<pre style={{ maxHeight: 300, overflow: 'auto', margin: 0 }}>{JSON.stringify(v, null, 2)}</pre>}>
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(v).substring(0, 50)}...</span>
        </Tooltip>
      ) : '—',
    },
    {
      title: 'Прочитано',
      dataIndex: 'readAt',
      key: 'readAt',
      width: 120,
      render: (v: string | null) => v ? <Tag color="green">Да</Tag> : <Tag color="orange">Нет</Tag>,
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, record) => !record.readAt ? (
        <Button size="small" icon={<CheckOutlined />} onClick={() => markReadMutation.mutate(record.personaId)}>Прочитать все</Button>
      ) : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>УВЕДОМЛЕНИЯ</Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Select showSearch allowClear placeholder="По персоне" filterOption={false} onSearch={setPersonaSearch} onChange={(val) => { setFilterPersonaId(val); setPage(1); }} options={personaSelectOptions} style={{ width: 200 }} />
          <Input placeholder="Тип..." value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} style={{ width: 160 }} allowClear />
        </Space>
        <Button type="primary" icon={<SendOutlined />} onClick={() => setBroadcastOpen(true)}>Рассылка</Button>
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />

      <Modal title="Рассылка уведомлений" open={broadcastOpen} onCancel={() => { setBroadcastOpen(false); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={broadcastMutation.isPending} width={600}>
        <Form form={form} layout="vertical" onFinish={(values) => broadcastMutation.mutate(values)}>
          <Form.Item name="type" label="Тип уведомления" rules={[{ required: true }]}><Input placeholder="SYSTEM, NEWS, ALERT..." /></Form.Item>
          <Form.Item name="payload" label="Payload (текст или JSON)"><Input.TextArea rows={3} placeholder='{"message": "Внимание!"}' /></Form.Item>
          <Form.Item name="personaIds" label="Получатели (пусто = все)">
            <Select mode="multiple" showSearch placeholder="Поиск персон..." filterOption={false} onSearch={setBroadcastPersonaSearch} options={broadcastPersonaSelectOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
