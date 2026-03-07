import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Typography,
  Select,
  Input,
  DatePicker,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTransactions, exportTransactionsCsv } from '../api/economy';
import type { Transaction } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [walletId, setWalletId] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const params = {
    page,
    limit: pageSize,
    type: type || undefined,
    status: status || undefined,
    walletId: walletId || undefined,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => getTransactions(params),
  });

  const handleExport = async () => {
    try {
      const blob = await exportTransactionsCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to export CSV');
    }
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      width: 120,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        const colorMap: Record<string, string> = {
          TRANSFER: 'blue',
          SUBSCRIPTION: 'purple',
          SALARY: 'green',
          PAYMENT_REQUEST: 'orange',
        };
        return <Tag color={colorMap[t] ?? 'default'}>{t}</Tag>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number | string) => (
        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>
          ¥{Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          COMPLETED: 'green',
          PENDING: 'orange',
          FAILED: 'red',
          CANCELLED: 'default',
        };
        return <Tag color={colorMap[s] ?? 'default'}>{s}</Tag>;
      },
    },
    {
      title: 'Theft?',
      dataIndex: 'isTheft',
      key: 'isTheft',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="red">Yes</Tag> : <span style={{ color: '#666' }}>No</span>,
    },
    {
      title: 'Wallet',
      dataIndex: 'walletId',
      key: 'walletId',
      ellipsis: true,
      width: 120,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/economy')}>
          Назад
        </Button>
        <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', margin: 0 }}>
          ТРАНЗАКЦИИ
        </Typography.Title>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Тип"
          allowClear
          style={{ width: 180 }}
          value={type}
          onChange={setType}
          options={[
            { value: 'TRANSFER', label: 'TRANSFER' },
            { value: 'SUBSCRIPTION', label: 'SUBSCRIPTION' },
            { value: 'SALARY', label: 'SALARY' },
            { value: 'PAYMENT_REQUEST', label: 'PAYMENT_REQUEST' },
          ]}
        />
        <Select
          placeholder="Статус"
          allowClear
          style={{ width: 150 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'COMPLETED', label: 'COMPLETED' },
            { value: 'PENDING', label: 'PENDING' },
            { value: 'FAILED', label: 'FAILED' },
            { value: 'CANCELLED', label: 'CANCELLED' },
          ]}
        />
        <Input
          placeholder="Wallet ID"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
          }
        />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          CSV
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
    </div>
  );
}
