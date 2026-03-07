import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Select,
  DatePicker,
  Popconfirm,
  message,
} from 'antd';
import { StopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHackSessions, cancelHackSession, massCancelActive } from '../api/hackSessions';
import { getPersonas } from '../api/personas';
import type { HackSession, HackSessionStatus } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<HackSessionStatus, string> = {
  ACTIVE: 'processing',
  SUCCESS: 'success',
  FAILED: 'error',
  CANCELLED: 'warning',
  EXPIRED: 'default',
};

export default function HackSessionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [targetType, setTargetType] = useState<string | undefined>();
  const [attackerSearch, setAttackerSearch] = useState('');
  const [attackerPersonaId, setAttackerPersonaId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const { data: attackerOptions } = useQuery({
    queryKey: ['personas-select', attackerSearch],
    queryFn: () => getPersonas({ search: attackerSearch || undefined, limit: 20 }),
  });

  const params = {
    page,
    limit: pageSize,
    status,
    attackerPersonaId,
    targetType,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['hackSessions', params],
    queryFn: () => getHackSessions(params),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelHackSession,
    onSuccess: () => {
      message.success('Хак-сессия отменена');
      queryClient.invalidateQueries({ queryKey: ['hackSessions'] });
    },
    onError: () => message.error('Ошибка отмены'),
  });

  const massCancelMutation = useMutation({
    mutationFn: massCancelActive,
    onSuccess: (data) => {
      message.success(`Отменено сессий: ${data.cancelled}`);
      queryClient.invalidateQueries({ queryKey: ['hackSessions'] });
    },
    onError: () => message.error('Ошибка массовой отмены'),
  });

  const attackerSelectOptions = (attackerOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const columns: ColumnsType<HackSession> = [
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: HackSessionStatus) => <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
    },
    {
      title: 'Атакующий',
      key: 'attacker',
      render: (_, record) =>
        record.attacker ? (
          <Link to={`/personas/${record.attacker.id}`} style={{ color: '#00ff41' }}>
            {record.attacker.name}
          </Link>
        ) : record.attackerPersonaId ?? '—',
    },
    {
      title: 'Цель',
      key: 'target',
      render: (_, record) => {
        if (record.targetType === 'PERSONA' && record.targetPersona) {
          return (
            <Link to={`/personas/${record.targetPersona.id}`} style={{ color: '#00ff41' }}>
              {record.targetPersona.name}
            </Link>
          );
        }
        if (record.targetType === 'HOST' && record.targetHost) {
          return (
            <Link to={`/hosts/${record.targetHost.id}`} style={{ color: '#00ff41' }}>
              {record.targetHost.name}
            </Link>
          );
        }
        return `${record.targetType}: ${record.targetPersonaId ?? record.targetHostId ?? '—'}`;
      },
    },
    {
      title: 'Тип цели',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 100,
      render: (t: string) => <Tag color={t === 'PERSONA' ? 'blue' : 'purple'}>{t}</Tag>,
    },
    {
      title: 'Элемент',
      dataIndex: 'elementType',
      key: 'elementType',
      width: 120,
    },
    {
      title: 'ICE',
      dataIndex: 'iceLevel',
      key: 'iceLevel',
      width: 60,
    },
    {
      title: 'Истекает',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
    {
      title: 'Создана',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) =>
        record.status === 'ACTIVE' ? (
          <Popconfirm
            title="Отменить хак-сессию?"
            onConfirm={() => cancelMutation.mutate(record.id)}
          >
            <Button type="text" icon={<StopOutlined />} size="small" danger />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ХАК-СЕССИИ
      </Typography.Title>

      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Space wrap>
          <Select
            allowClear
            placeholder="Статус"
            value={status}
            onChange={setStatus}
            style={{ width: 150 }}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'SUCCESS', label: 'SUCCESS' },
              { value: 'FAILED', label: 'FAILED' },
              { value: 'CANCELLED', label: 'CANCELLED' },
              { value: 'EXPIRED', label: 'EXPIRED' },
            ]}
          />
          <Select
            allowClear
            placeholder="Тип цели"
            value={targetType}
            onChange={setTargetType}
            style={{ width: 140 }}
            options={[
              { value: 'PERSONA', label: 'PERSONA' },
              { value: 'HOST', label: 'HOST' },
            ]}
          />
          <Select
            showSearch
            allowClear
            placeholder="Атакующий..."
            filterOption={false}
            onSearch={setAttackerSearch}
            onChange={setAttackerPersonaId}
            options={attackerSelectOptions}
            style={{ width: 200 }}
          />
          <RangePicker
            onChange={(dates) =>
              setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
            }
          />
        </Space>
        <Popconfirm
          title="Отменить ВСЕ активные хак-сессии?"
          onConfirm={() => massCancelMutation.mutate()}
        >
          <Button danger icon={<ThunderboltOutlined />}>
            Отменить все активные
          </Button>
        </Popconfirm>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.items}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </div>
  );
}
