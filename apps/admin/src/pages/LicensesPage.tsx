import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Input, Space, Select, Popconfirm, Typography, message,
} from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLicenses, deleteLicense } from '../api/licenses';
import { getPersonas } from '../api/personas';
import type { License } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function LicensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPersonaId, setFilterPersonaId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [personaSearch, setPersonaSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['licenses', search, filterPersonaId, filterType, page, pageSize],
    queryFn: () => getLicenses({ search: search || undefined, personaId: filterPersonaId, type: filterType || undefined, page, limit: pageSize }),
  });

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const inv = () => queryClient.invalidateQueries({ queryKey: ['licenses'] });

  const deleteMutation = useMutation({
    mutationFn: deleteLicense,
    onSuccess: () => { message.success('Лицензия удалена'); inv(); },
    onError: () => message.error('Ошибка удаления'),
  });

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const columns: ColumnsType<License & { persona?: { id: string; name: string } | null }> = [
    { title: 'Тип', dataIndex: 'type', key: 'type', width: 140 },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Описание', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: 'Персона',
      key: 'persona',
      width: 180,
      render: (_, record) => record.persona ? <Link to={`/personas/${record.persona.id}`} style={{ color: '#00ff41' }}>{record.persona.name}</Link> : record.personaId,
    },
    {
      title: 'Выдана',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
    { title: 'Кем', dataIndex: 'issuedBy', key: 'issuedBy', width: 120, render: (v: string | null) => v ?? '—' },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm title="Удалить лицензию?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>ЛИЦЕНЗИИ</Typography.Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Поиск..." prefix={<SearchOutlined />} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 200 }} allowClear />
        <Select showSearch allowClear placeholder="По персоне" filterOption={false} onSearch={setPersonaSearch} onChange={(v) => { setFilterPersonaId(v); setPage(1); }} options={personaSelectOptions} style={{ width: 200 }} />
        <Input placeholder="Тип..." value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} style={{ width: 160 }} allowClear />
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
    </div>
  );
}
