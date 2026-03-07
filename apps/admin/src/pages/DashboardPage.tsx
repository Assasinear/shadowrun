import { Row, Col, Card, Statistic, Typography, Spin } from 'antd';
import {
  TeamOutlined,
  CloudServerOutlined,
  MobileOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPersonas } from '../api/personas';
import { getHosts } from '../api/hosts';
import { getDevices } from '../api/devices';
import { getWallets } from '../api/economy';

export default function DashboardPage() {
  const { data: personasData, isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas', 'count'],
    queryFn: () => getPersonas({ limit: 1 }),
  });

  const { data: hostsData, isLoading: loadingHosts } = useQuery({
    queryKey: ['hosts', 'count'],
    queryFn: () => getHosts({}),
  });

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices', 'count'],
    queryFn: () => getDevices({}),
  });

  const { data: walletsData, isLoading: loadingWallets } = useQuery({
    queryKey: ['wallets', 'count'],
    queryFn: () => getWallets({}),
  });

  const totalBalance = (walletsData ?? []).reduce(
    (sum, w) => sum + Number(w.balance),
    0,
  );

  const loading = loadingPersonas || loadingHosts || loadingDevices || loadingWallets;

  return (
    <div>
      <Typography.Title level={3} style={{ color: '#00ff41', fontFamily: 'monospace' }}>
        GRID OVERVIEW
      </Typography.Title>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: '#1a1a1a',
                border: '1px solid #1a3a1a',
                borderRadius: 8,
              }}
            >
              <Statistic
                title={<span style={{ color: '#888' }}>Total Personas</span>}
                value={personasData?.total ?? 0}
                prefix={<TeamOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: '#1a1a1a',
                border: '1px solid #1a3a1a',
                borderRadius: 8,
              }}
            >
              <Statistic
                title={<span style={{ color: '#888' }}>Total Hosts</span>}
                value={hostsData?.length ?? 0}
                prefix={<CloudServerOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: '#1a1a1a',
                border: '1px solid #1a3a1a',
                borderRadius: 8,
              }}
            >
              <Statistic
                title={<span style={{ color: '#888' }}>Total Devices</span>}
                value={devicesData?.length ?? 0}
                prefix={<MobileOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                background: '#1a1a1a',
                border: '1px solid #1a3a1a',
                borderRadius: 8,
              }}
            >
              <Statistic
                title={<span style={{ color: '#888' }}>Total Balance (¥)</span>}
                value={totalBalance}
                precision={2}
                prefix={<BankOutlined style={{ color: '#00ff41' }} />}
                valueStyle={{ color: '#00ff41' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
