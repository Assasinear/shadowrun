import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CloudServerOutlined,
  MobileOutlined,
  BankOutlined,
  FileTextOutlined,
  FileOutlined,
  ThunderboltOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserSwitchOutlined,
  SettingOutlined,
  LockOutlined,
  HeatMapOutlined,
  MessageOutlined,
  TransactionOutlined,
  NotificationOutlined,
  FormOutlined,
  DollarOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/personas', icon: <TeamOutlined />, label: 'Персоны' },
  { key: '/hosts', icon: <CloudServerOutlined />, label: 'Хосты' },
  { key: '/devices', icon: <MobileOutlined />, label: 'Устройства' },
  {
    key: 'economy-group',
    icon: <BankOutlined />,
    label: 'Экономика',
    children: [
      { key: '/economy', label: 'Кошельки и подписки' },
      { key: '/economy/transactions', icon: <TransactionOutlined />, label: 'Транзакции' },
      { key: '/payment-requests', icon: <DollarOutlined />, label: 'Платёжные запросы' },
    ],
  },
  { key: '/hack-sessions', icon: <HeatMapOutlined />, label: 'Хак-сессии' },
  { key: '/messages', icon: <MessageOutlined />, label: 'Сообщения' },
  { key: '/blog-posts', icon: <FormOutlined />, label: 'Блог-посты' },
  { key: '/notifications', icon: <NotificationOutlined />, label: 'Уведомления' },
  { key: '/files', icon: <FileOutlined />, label: 'Файлы' },
  { key: '/licenses', icon: <SafetyCertificateOutlined />, label: 'Лицензии' },
  { key: '/access-tokens', icon: <KeyOutlined />, label: 'Токены доступа' },
  { key: '/logs', icon: <FileTextOutlined />, label: 'Логи' },
  { key: '/roles', icon: <UserSwitchOutlined />, label: 'Роли' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
  { key: '/emergency', icon: <ThunderboltOutlined />, label: 'Экстренное' },
  { key: '/security', icon: <LockOutlined />, label: 'Безопасность' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const allKeys = menuItems.flatMap((item) =>
    'children' in item && item.children ? item.children.map((c) => c.key) : [item.key],
  );
  const selectedKey = allKeys
    .filter((k) => k !== '/')
    .find((k) => location.pathname.startsWith(k)) ?? '/';

  const openKeys = menuItems
    .filter((item): item is typeof item & { children: unknown[] } => 'children' in item && !!item.children)
    .filter((item) => item.children.some((c: { key: string }) => location.pathname.startsWith(c.key)))
    .map((item) => item.key);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{
          background: '#0a0a0a',
          borderRight: '1px solid #1a3a1a',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #1a3a1a',
          }}
        >
          <Typography.Text
            strong
            style={{
              color: '#00ff41',
              fontSize: collapsed ? 14 : 16,
              fontFamily: 'monospace',
              letterSpacing: 2,
            }}
          >
            {collapsed ? 'SR' : 'MATRIX'}
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => {
            if (!key.startsWith('economy-group')) {
              navigate(key);
            }
          }}
          style={{ background: 'transparent', borderRight: 'none' }}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: '#0a0a0a',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1a3a1a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#00ff41' }}
            />
            <Typography.Title
              level={4}
              style={{ margin: 0, color: '#00ff41', fontFamily: 'monospace' }}
            >
              Shadowrun Matrix Admin
            </Typography.Title>
          </div>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
            style={{ color: '#ff4d4f' }}
          >
            Выход
          </Button>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#141414',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
