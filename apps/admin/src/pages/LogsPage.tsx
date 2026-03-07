import { useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Input,
  DatePicker,
  message,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getGridLogs,
  getAdminLogs,
  exportGridLogsCsv,
  exportAdminLogsCsv,
} from '../api/logs';
import type { GridLog, AdminLog } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function GridLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState('');
  const [actorPersonaId, setActorPersonaId] = useState('');
  const [targetHostId, setTargetHostId] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const params = {
    page,
    limit: pageSize,
    type: type || undefined,
    actorPersonaId: actorPersonaId || undefined,
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
      message.error('Failed to export CSV');
    }
  };

  const columns: ColumnsType<GridLog> = [
    { title: 'Type', dataIndex: 'type', key: 'type', width: 160 },
    {
      title: 'Actor',
      key: 'actor',
      render: (_, record) => record.actor?.name ?? record.actorPersonaId ?? '—',
    },
    {
      title: 'Target Persona',
      key: 'targetPersona',
      render: (_, record) => record.targetPersona?.name ?? record.targetPersonaId ?? '—',
    },
    {
      title: 'Target Host',
      key: 'targetHost',
      render: (_, record) => record.targetHost?.name ?? record.targetHostId ?? '—',
    },
    {
      title: 'Meta',
      dataIndex: 'metaJson',
      key: 'meta',
      ellipsis: true,
      render: (v: Record<string, unknown> | null) =>
        v ? JSON.stringify(v).substring(0, 60) : '—',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
        <Input
          placeholder="Actor Persona ID"
          value={actorPersonaId}
          onChange={(e) => setActorPersonaId(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="Target Host ID"
          value={targetHostId}
          onChange={(e) => setTargetHostId(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
          }
        />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
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
          showTotal: (total) => `Total: ${total}`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
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
      message.error('Failed to export CSV');
    }
  };

  const columns: ColumnsType<AdminLog> = [
    { title: 'Action', dataIndex: 'action', key: 'action', width: 180 },
    { title: 'Admin User', dataIndex: 'adminUserId', key: 'adminUserId', ellipsis: true },
    { title: 'Target Type', dataIndex: 'targetType', key: 'targetType', render: (v: string) => v ?? '—' },
    { title: 'Target ID', dataIndex: 'targetId', key: 'targetId', ellipsis: true, render: (v: string) => v ?? '—' },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (v: Record<string, unknown> | null) =>
        v ? JSON.stringify(v).substring(0, 60) : '—',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
        <Input
          placeholder="Admin User ID"
          value={adminUserId}
          onChange={(e) => setAdminUserId(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
          }
        />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Export CSV
        </Button>
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
          showTotal: (total) => `Total: ${total}`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </>
  );
}

export default function LogsPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        LOGS
      </Typography.Title>

      <Tabs
        items={[
          { key: 'grid', label: 'Grid Logs', children: <GridLogsTab /> },
          { key: 'admin', label: 'Admin Logs', children: <AdminLogsTab /> },
        ]}
      />
    </div>
  );
}
