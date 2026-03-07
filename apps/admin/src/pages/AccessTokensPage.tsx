import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Space, Select, Popconfirm, Typography, message,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccessTokens, deleteAccessToken } from '../api/accessTokens';
import type { AccessTokenItem } from '../api/accessTokens';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function AccessTokensPage() {
  const queryClient = useQueryClient();
  const [filterPersonaId, setFilterPersonaId] = useState<string | undefined>();
  const [filterHostId, setFilterHostId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [personaSearch, setPersonaSearch] = useState('');
  const [hostSearch, setHostSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['access-tokens', filterPersonaId, filterHostId, page, pageSize],
    queryFn: () => getAccessTokens({ personaId: filterPersonaId, hostId: filterHostId, page, limit: pageSize }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const { data: hostOptions } = useQuery({
    queryKey: ['hosts-select', hostSearch],
    queryFn: () => getHosts({ search: hostSearch || undefined }),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['access-tokens'] });

  const deleteMutation = useMutation({
    mutationFn: deleteAccessToken,
    onSuccess: () => { message.success('Токен удалён'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const hostSelectOptions = (hostOptions?.items ?? []).map((h) => ({ value: h.id, label: h.name }));

  const columns: ColumnsType<AccessTokenItem> = [
    { title: 'Token', dataIndex: 'token', key: 'token', ellipsis: true, width: 150 },
    {
      title: 'Персона',
      key: 'persona',
      render: (_, r) => r.persona ? <Link to={`/personas/${r.persona.id}`} style={{ color: '#00ff41' }}>{r.persona.name}</Link> : r.personaId,
    },
    {
      title: 'Хост',
      key: 'host',
      render: (_, r) => r.host ? <Link to={`/hosts/${r.host.id}`} style={{ color: '#00ff41' }}>{r.host.name}</Link> : r.hostId,
    },
    { title: 'Назначение', dataIndex: 'purpose', key: 'purpose', ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: 'Истекает',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 140,
      render: (d: string | null) => d ? dayjs(d).format('DD.MM.YY HH:mm') : 'Никогда',
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
        <Popconfirm title="Удалить токен?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>ТОКЕНЫ ДОСТУПА</Typography.Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select showSearch allowClear placeholder="По персоне" filterOption={false} onSearch={setPersonaSearch} onChange={(v) => { setFilterPersonaId(v); setPage(1); }} options={personaSelectOptions} style={{ width: 200 }} />
        <Select showSearch allowClear placeholder="По хосту" filterOption={false} onSearch={setHostSearch} onChange={(v) => { setFilterHostId(v); setPage(1); }} options={hostSelectOptions} style={{ width: 200 }} />
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
    </div>
  );
}
