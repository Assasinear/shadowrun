import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Typography,
  Select,
  Input,
  DatePicker,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getTransfers } from '../api/economy';
import type { Transfer, TransferParty } from '../api/economy';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

function PartyCell({ party }: { party: TransferParty | null }) {
  if (!party) {
    return <span style={{ color: '#666' }}>—</span>;
  }
  const label = party.name ?? party.id.substring(0, 10) + '…';
  if (party.type === 'PERSONA') {
    return (
      <Link to={`/personas/${party.id}`} style={{ color: '#00ff41' }}>
        {label}
      </Link>
    );
  }
  if (party.type === 'HOST') {
    return (
      <Link to={`/hosts/${party.id}`} style={{ color: '#a78bfa' }}>
        {label}
      </Link>
    );
  }
  return <span style={{ color: '#aaa' }}>{label}</span>;
}

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [isTheft, setIsTheft] = useState<boolean | undefined>();
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const params = {
    page,
    limit: pageSize,
    search: search || undefined,
    isTheft,
    isAdmin,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', params],
    queryFn: () => getTransfers(params),
  });

  const columns: ColumnsType<Transfer> = [
    {
      title: 'Откуда',
      key: 'from',
      render: (_, record) => <PartyCell party={record.from} />,
    },
    {
      title: 'Куда',
      key: 'to',
      render: (_, record) => <PartyCell party={record.to} />,
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (v: number | string) => (
        <span style={{ color: '#00ff41', fontFamily: 'monospace', fontWeight: 600 }}>
          ¥{Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Метки',
      key: 'tags',
      width: 140,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.isTheft && <Tag color="red">Кража</Tag>}
          {record.isAdmin && <Tag color="gold">Адм.</Tag>}
          {record.status !== 'COMPLETED' && <Tag color="orange">{record.status}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Назначение',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (v: string | null) => v ? <span style={{ color: '#aaa' }}>{v}</span> : <span style={{ color: '#444' }}>—</span>,
    },
    {
      title: 'Время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/economy')}>
          Назад
        </Button>
        <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace', margin: 0 }}>
          ПЕРЕВОДЫ
        </Typography.Title>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Поиск по имени / назначению"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Тип"
          allowClear
          style={{ width: 150 }}
          value={isTheft === undefined ? undefined : isTheft ? 'theft' : 'normal'}
          onChange={(v) => {
            setIsTheft(v === 'theft' ? true : v === 'normal' ? false : undefined);
            setPage(1);
          }}
          options={[
            { value: 'normal', label: 'Обычные' },
            { value: 'theft', label: 'Кражи' },
          ]}
        />
        <Select
          placeholder="Источник"
          allowClear
          style={{ width: 160 }}
          value={isAdmin === undefined ? undefined : isAdmin ? 'admin' : 'user'}
          onChange={(v) => {
            setIsAdmin(v === 'admin' ? true : v === 'user' ? false : undefined);
            setPage(1);
          }}
          options={[
            { value: 'user', label: 'Пользовательские' },
            { value: 'admin', label: 'Административные' },
          ]}
        />
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
          }
        />
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
