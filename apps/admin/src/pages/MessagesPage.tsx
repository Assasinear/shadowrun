import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Input,
  Space,
  Tag,
  Typography,
  Select,
  DatePicker,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMessages } from '../api/messages';
import { getPersonas } from '../api/personas';
import type { Message, MessageTargetType } from '../types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [senderType, setSenderType] = useState<string | undefined>();
  const [receiverType, setReceiverType] = useState<string | undefined>();
  const [senderPersonaSearch, setSenderPersonaSearch] = useState('');
  const [senderPersonaId, setSenderPersonaId] = useState<string | undefined>();
  const [receiverPersonaSearch, setReceiverPersonaSearch] = useState('');
  const [receiverPersonaId, setReceiverPersonaId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const { data: senderOptions } = useQuery({
    queryKey: ['personas-select-sender', senderPersonaSearch],
    queryFn: () => getPersonas({ search: senderPersonaSearch || undefined, limit: 20 }),
  });

  const { data: receiverOptions } = useQuery({
    queryKey: ['personas-select-receiver', receiverPersonaSearch],
    queryFn: () => getPersonas({ search: receiverPersonaSearch || undefined, limit: 20 }),
  });

  const params = {
    page,
    limit: pageSize,
    search: search || undefined,
    senderType,
    receiverType,
    senderPersonaId,
    receiverPersonaId,
    dateFrom: dateRange?.[0]?.toISOString(),
    dateTo: dateRange?.[1]?.toISOString(),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['messages', params],
    queryFn: () => getMessages(params),
  });

  function renderParticipant(
    type: MessageTargetType,
    persona?: { id: string; name: string } | null,
    host?: { id: string; name: string } | null,
  ) {
    if (type === 'PERSONA' && persona) {
      return (
        <Link to={`/personas/${persona.id}`} style={{ color: '#00ff41' }}>
          {persona.name}
        </Link>
      );
    }
    if (type === 'HOST' && host) {
      return (
        <Link to={`/hosts/${host.id}`} style={{ color: '#00ff41' }}>
          {host.name}
        </Link>
      );
    }
    return <Tag>{type}</Tag>;
  }

  const senderSelectOptions = (senderOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const receiverSelectOptions = (receiverOptions?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const columns: ColumnsType<Message> = [
    {
      title: 'Отправитель',
      key: 'sender',
      width: 180,
      render: (_, record) =>
        renderParticipant(record.senderType, record.senderPersona, record.senderHost),
    },
    {
      title: 'Тип',
      key: 'senderType',
      width: 90,
      render: (_, record) => (
        <Tag color={record.senderType === 'PERSONA' ? 'blue' : 'purple'}>
          {record.senderType}
        </Tag>
      ),
    },
    {
      title: 'Получатель',
      key: 'receiver',
      width: 180,
      render: (_, record) =>
        renderParticipant(record.receiverType, record.receiverPersona, record.receiverHost),
    },
    {
      title: 'Тип',
      key: 'receiverType',
      width: 90,
      render: (_, record) => (
        <Tag color={record.receiverType === 'PERSONA' ? 'blue' : 'purple'}>
          {record.receiverType}
        </Tag>
      ),
    },
    {
      title: 'Сообщение',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (d: string) => dayjs(d).format('DD.MM.YY HH:mm:ss'),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        СООБЩЕНИЯ
      </Typography.Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Поиск по тексту..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          allowClear
          placeholder="Тип отправителя"
          value={senderType}
          onChange={setSenderType}
          style={{ width: 160 }}
          options={[
            { value: 'PERSONA', label: 'PERSONA' },
            { value: 'HOST', label: 'HOST' },
          ]}
        />
        <Select
          showSearch
          allowClear
          placeholder="Отправитель..."
          filterOption={false}
          onSearch={setSenderPersonaSearch}
          onChange={setSenderPersonaId}
          options={senderSelectOptions}
          style={{ width: 200 }}
        />
        <Select
          allowClear
          placeholder="Тип получателя"
          value={receiverType}
          onChange={setReceiverType}
          style={{ width: 160 }}
          options={[
            { value: 'PERSONA', label: 'PERSONA' },
            { value: 'HOST', label: 'HOST' },
          ]}
        />
        <Select
          showSearch
          allowClear
          placeholder="Получатель..."
          filterOption={false}
          onSearch={setReceiverPersonaSearch}
          onChange={setReceiverPersonaId}
          options={receiverSelectOptions}
          style={{ width: 200 }}
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
