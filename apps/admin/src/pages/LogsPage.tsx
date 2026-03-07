import { useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  DatePicker,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getGridLogs,
  getAdminLogs,
  exportGridLogsCsv,
  exportAdminLogsCsv,
} from '../api/logs';
import { getPersonas } from '../api/personas';
import type { GridLog, AdminLog } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'POST': { label: 'СОЗДАНИЕ', color: 'green' },
  'PATCH': { label: 'ИЗМЕНЕНИЕ', color: 'blue' },
  'DELETE': { label: 'УДАЛЕНИЕ', color: 'red' },
};

const TARGET_LABELS: Record<string, string> = {
  personas: 'Персона',
  hosts: 'Хост',
  devices: 'Устройство',
  economy: 'Экономика',
  files: 'Файл',
  roles: 'Роли',
  settings: 'Настройки',
  emergency: 'Экстренное',
  'hack-sessions': 'Хак-сессия',
};

function parseAdminAction(action: string) {
  const match = action.match(/^(POST|PATCH|DELETE)\s+(.*)$/);
  if (!match) return { method: '?', path: action };
  return { method: match[1], path: match[2] };
}

function getMethodInfo(method: string) {
  return ACTION_LABELS[method] ?? { label: method, color: 'default' };
}

function getTargetLabel(targetType?: string | null) {
  if (!targetType) return null;
  return TARGET_LABELS[targetType] ?? targetType;
}

function formatDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return null;
  const entries = Object.entries(details).filter(([k]) => !k.startsWith('_'));
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => {
    const displayVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const truncated = displayVal.length > 50 ? displayVal.substring(0, 50) + '...' : displayVal;
    return `${key}: ${truncated}`;
  }).join(' | ');
}

function GridLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState('');
  const [personaSearch, setPersonaSearch] = useState('');
  const [actorPersonaId, setActorPersonaId] = useState<string | undefined>();
  const [targetHostId, setTargetHostId] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const { data: personaOptions } = useQuery({
    queryKey: ['personas-log-select', personaSearch],
    queryFn: () => getPersonas({ search: personaSearch || undefined, limit: 20 }),
  });

  const params = {
    page,
    limit: pageSize,
    type: type || undefined,
    actorPersonaId,
    targetHostId: targetHostId || undefined,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['gridLogs', params],
    queryFn: () => getGridLogs(params),
  });

  const handleExport = async () => {
    try {
      const blob = await exportGridLogsCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grid_logs_${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Ошибка экспорта');
    }
  };

  const personaSelectOptions = (personaOptions?.items ?? []).map((p) => ({ value: p.id, label: p.name }));

  const columns: ColumnsType<GridLog> = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 180,
      render: (t: string) => <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{t}</Tag>,
    },
    {
      title: 'Актор',
      key: 'actor',
      render: (_, record) => record.actor?.name ?? record.actorPersonaId ?? '—',
    },
    {
      title: 'Цель (Персона)',
      key: 'targetPersona',
      render: (_, record) => record.targetPersona?.name ?? record.targetPersonaId ?? '—',
    },
    {
      title: 'Цель (Хост)',
      key: 'targetHost',
      render: (_, record) => record.targetHost?.name ?? record.targetHostId ?? '—',
    },
    {
      title: 'Мета',
      dataIndex: 'metaJson',
      key: 'meta',
      ellipsis: true,
      render: (v: Record<string, unknown> | null) =>
        v ? (
          <Tooltip title={JSON.stringify(v, null, 2)} placement="left">
            <span style={{ cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
              {JSON.stringify(v).substring(0, 60)}
            </span>
          </Tooltip>
        ) : '—',
    },
    {
      title: 'Время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Тип события" value={type} onChange={(e) => setType(e.target.value)} style={{ width: 180 }} allowClear />
        <Select
          showSearch allowClear placeholder="Актор..."
          filterOption={false} onSearch={setPersonaSearch}
          onChange={setActorPersonaId} options={personaSelectOptions}
          style={{ width: 200 }}
        />
        <Input placeholder="Target Host ID" value={targetHostId} onChange={(e) => setTargetHostId(e.target.value)} style={{ width: 200 }} allowClear />
        <RangePicker onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>CSV</Button>
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
    </>
  );
}

function AdminLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const params = {
    page,
    limit: pageSize,
    action: action || undefined,
    adminUserId: adminUserId || undefined,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['adminLogs', params],
    queryFn: () => getAdminLogs(params),
  });

  const handleExport = async () => {
    try {
      const blob = await exportAdminLogsCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_logs_${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Ошибка экспорта');
    }
  };

  const columns: ColumnsType<AdminLog> = [
    {
      title: 'Действие',
      key: 'action',
      width: 280,
      render: (_, record) => {
        const { method, path } = parseAdminAction(record.action);
        const info = getMethodInfo(method);
        return (
          <Space size={4}>
            <Tag color={info.color} style={{ fontSize: 10, lineHeight: '18px', margin: 0 }}>{info.label}</Tag>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{path}</span>
          </Space>
        );
      },
    },
    {
      title: 'Цель',
      key: 'target',
      width: 160,
      render: (_, record) => {
        const label = getTargetLabel(record.targetType);
        if (!label && !record.targetId) return '—';
        return (
          <Space size={4}>
            {label && <Tag style={{ fontSize: 10, margin: 0 }}>{label}</Tag>}
            {record.targetId && (
              <Tooltip title={record.targetId}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>
                  {record.targetId.substring(0, 8)}...
                </span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Детали',
      key: 'details',
      ellipsis: true,
      render: (_, record) => {
        const formatted = formatDetails(record.details);
        if (!formatted) return '—';
        return (
          <Tooltip title={<pre style={{ margin: 0, fontSize: 11, maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(record.details, null, 2)}</pre>} placement="left">
            <Space size={4} style={{ cursor: 'pointer' }}>
              <InfoCircleOutlined style={{ color: '#666', fontSize: 12 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>{formatted}</span>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Админ',
      dataIndex: 'adminUserId',
      key: 'adminUserId',
      width: 120,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v.substring(0, 8)}...</span>
        </Tooltip>
      ),
    },
    {
      title: 'Время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {dayjs(d).format('DD.MM.YY HH:mm:ss')}
        </span>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Действие" value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 200 }} allowClear />
        <Input placeholder="Admin User ID" value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} style={{ width: 200 }} allowClear />
        <RangePicker onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>CSV</Button>
      </Space>

      <Table columns={columns} dataSource={data?.items} rowKey="id" loading={isLoading}
        size="small"
        pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `Всего: ${total}`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
      />
    </>
  );
}

export default function LogsPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        ЛОГИ
      </Typography.Title>
      <Tabs items={[
        { key: 'grid', label: 'Grid Логи', children: <GridLogsTab /> },
        { key: 'admin', label: 'Админ Логи', children: <AdminLogsTab /> },
      ]} />
    </div>
  );
}
