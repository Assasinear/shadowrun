import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Spin, Table, Tag } from 'antd';
import {
  TeamOutlined,
  CloudServerOutlined,
  MobileOutlined,
  BankOutlined,
  HeatMapOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import { getDevices } from '../api/devices';
import { getWallets, getTransactions } from '../api/economy';
import { getHackSessions } from '../api/hackSessions';
import { getNotifications } from '../api/notifications';
import type { Transaction } from '../types';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const { data: personasData, isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas', 'count'],
    queryFn: () => getPersonas({ limit: 1 }),
  });

  const { data: hostsData, isLoading: loadingHosts } = useQuery({
    queryKey: ['hosts', 'count'],
    queryFn: () => getHosts({ limit: 1 }),
  });

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices', 'count'],
    queryFn: () => getDevices({ limit: 1 }),
  });

  const { data: walletsData, isLoading: loadingWallets } = useQuery({
    queryKey: ['wallets', 'count'],
    queryFn: () => getWallets({}),
  });

  const { data: hackData, isLoading: loadingHacks } = useQuery({
    queryKey: ['hackSessions', 'active-count'],
    queryFn: () => getHackSessions({ status: 'ACTIVE', limit: 1 }),
  });

  const { data: recentTxData } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => getTransactions({ limit: 5 }),
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getNotifications({ limit: 1 }),
  });

  const totalBalance = (walletsData ?? []).reduce(
    (sum, w) => sum + Number(w.balance),
    0,
  );

  const loading = loadingPersonas || loadingHosts || loadingDevices || loadingWallets || loadingHacks;

  const cardStyle = {
    background: '#1a1a1a',
    border: '1px solid #1a3a1a',
    borderRadius: 8,
  };

  const txColumns = [
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (t: string) => {
        const cm: Record<string, string> = { TRANSFER: 'blue', SUBSCRIPTION: 'purple', SALARY: 'green', PAYMENT_REQUEST: 'orange' };
        return <Tag color={cm[t] ?? 'default'}>{t}</Tag>;
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number | string) => <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>¥{Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cm: Record<string, string> = { COMPLETED: 'green', PENDING: 'orange', FAILED: 'red', CANCELLED: 'default' };
        return <Tag color={cm[s] ?? 'default'}>{s}</Tag>;
      },
    },
    {
      title: 'Время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM HH:mm'),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        GRID OVERVIEW
      </Typography.Title>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Персоны</span>}
                value={personasData?.total ?? 0}
                prefix={<TeamOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Хосты</span>}
                value={hostsData?.total ?? 0}
                prefix={<CloudServerOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Устройства</span>}
                value={devicesData?.total ?? 0}
                prefix={<MobileOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Общий баланс (¥)</span>}
                value={totalBalance}
                precision={2}
                prefix={<BankOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Активные хаки</span>}
                value={hackData?.total ?? 0}
                prefix={<HeatMapOutlined style={{ color: hackData?.total ? '#ff4d4f' : '#00ff41' }} />}
                valueStyle={{ color: hackData?.total ? '#ff4d4f' : '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle}>
              <Statistic
                title={<span style={{ color: '#888' }}>Уведомления</span>}
                value={notifData?.total ?? 0}
                prefix={<FileTextOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#00ff41', fontFamily: 'monospace' }}>Последние транзакции</span>}
              style={cardStyle}
              extra={<Link to="/economy/transactions" style={{ color: '#00ff41' }}>Все</Link>}
            >
              <Table<Transaction>
                columns={txColumns}
                dataSource={recentTxData?.items ?? []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<span style={{ color: '#00ff41', fontFamily: 'monospace' }}>Быстрые ссылки</span>}
              style={cardStyle}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link to="/hack-sessions"><Tag color="red" style={{ cursor: 'pointer', padding: '4px 12px' }}>Хак-сессии</Tag></Link>
                <Link to="/messages"><Tag color="blue" style={{ cursor: 'pointer', padding: '4px 12px' }}>Сообщения</Tag></Link>
                <Link to="/notifications"><Tag color="orange" style={{ cursor: 'pointer', padding: '4px 12px' }}>Уведомления</Tag></Link>
                <Link to="/blog-posts"><Tag color="purple" style={{ cursor: 'pointer', padding: '4px 12px' }}>Блог-посты</Tag></Link>
                <Link to="/licenses"><Tag color="green" style={{ cursor: 'pointer', padding: '4px 12px' }}>Лицензии</Tag></Link>
                <Link to="/payment-requests"><Tag color="cyan" style={{ cursor: 'pointer', padding: '4px 12px' }}>Платёжные запросы</Tag></Link>
                <Link to="/access-tokens"><Tag color="gold" style={{ cursor: 'pointer', padding: '4px 12px' }}>Токены доступа</Tag></Link>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
