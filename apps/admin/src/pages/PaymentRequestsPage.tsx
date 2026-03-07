import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Space, Select, Tag, Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPaymentRequests } from '../api/paymentRequests';
import type { PaymentRequest } from '../api/paymentRequests';
import { getPersonas } from '../api/personas';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export default function PaymentRequestsPage() {
  const [status, setStatus] = useState<string | undefined>();
  const [creatorPersonaId, setCreatorPersonaId] = useState<string | undefined>();
  const [targetPersonaId, setTargetPersonaId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [creatorSearch, setCreatorSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payment-requests', status, creatorPersonaId, targetPersonaId, page, pageSize],
    queryFn: () => getPaymentRequests({ status, creatorPersonaId, targetPersonaId, page, limit: pageSize }),
  });

  const { data: creatorOptions } = useQuery({
    queryKey: ['personas-creator', creatorSearch],
    queryFn: () => getPersonas({ search: creatorSearch || undefined, limit: 20 }),
  });

  const { data: targetOptions } = useQuery({
    queryKey: ['personas-target', targetSearch],
    queryFn: () => getPersonas({ search: targetSearch || undefined, limit: 20 }),
  });

  const creatorSelectOptions = (creatorOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
  const targetSelectOptions = (targetOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const statusColorMap: Record<string, string> = { PENDING: 'orange', COMPLETED: 'green', CANCELLED: 'default', EXPIRED: 'red' };

  const renderEntity = (type: string, persona?: { id: string; name: string } | null, host?: { id: string; name: string } | null, rawId?: string | null) => {
    if (persona) return <Link to={`/personas/${persona.id}`} style={{ color: '#00ff41' }}>{persona.name}</Link>;
    if (host) return <Link to={`/hosts/${host.id}`} style={{ color: '#00ff41' }}>{host.name}</Link>;
    return rawId ? `${type}: ${rawId.substring(0, 8)}...` : '—';
  };

  const columns: ColumnsType<PaymentRequest> = [
    { title: 'Token', dataIndex: 'token', key: 'token', ellipsis: true, width: 120 },
    {
      title: 'Создатель',
      key: 'creator',
      render: (_, r) => renderEntity(r.creatorType, r.creatorPersona, r.creatorHost, r.creatorPersonaId ?? r.creatorHostId),
    },
    {
      title: 'Получатель',
      key: 'target',
      render: (_, r) => renderEntity(r.targetType, r.targetPersona, r.targetHost, r.targetPersonaId ?? r.targetHostId),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v: number | string) => <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>¥{Number(v).toFixed(2)}</span>,
    },
    { title: 'Назначение', dataIndex: 'purpose', key: 'purpose', ellipsis: true, render: (v: string | null) => v ?? '—' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <Tag color={statusColorMap[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>ПЛАТЁЖНЫЕ ЗАПРОСЫ</Typography.Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select allowClear placeholder="Статус" value={status} onChange={(v) => { setStatus(v); setPage(1); }} style={{ width: 160 }}
          options={[{ value: 'PENDING', label: 'PENDING' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }, { value: 'EXPIRED', label: 'EXPIRED' }]}
        />
        <Select showSearch allowClear placeholder="Создатель" filterOption={false} onSearch={setCreatorSearch} onChange={(v) => { setCreatorPersonaId(v); setPage(1); }} options={creatorSelectOptions} style={{ width: 200 }} />
        <Select showSearch allowClear placeholder="Получатель" filterOption={false} onSearch={setTargetSearch} onChange={(v) => { setTargetPersonaId(v); setPage(1); }} options={targetSelectOptions} style={{ width: 200 }} />
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
    </div>
  );
}
