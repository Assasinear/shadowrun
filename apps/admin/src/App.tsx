import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PersonasPage from './pages/PersonasPage';
import PersonaDetailPage from './pages/PersonaDetailPage';
import HostsPage from './pages/HostsPage';
import HostDetailPage from './pages/HostDetailPage';
import DevicesPage from './pages/DevicesPage';
import EconomyPage from './pages/EconomyPage';
import TransactionsPage from './pages/TransactionsPage';
import HackSessionsPage from './pages/HackSessionsPage';
import MessagesPage from './pages/MessagesPage';
import BlogPostsPage from './pages/BlogPostsPage';
import NotificationsPage from './pages/NotificationsPage';
import PaymentRequestsPage from './pages/PaymentRequestsPage';
import AccessTokensPage from './pages/AccessTokensPage';
import LicensesPage from './pages/LicensesPage';
import LogsPage from './pages/LogsPage';
import EmergencyPage from './pages/EmergencyPage';
import FilesPage from './pages/FilesPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import SecurityPage from './pages/SecurityPage';
import GraphPage from './pages/GraphPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#00ff41',
            colorBgBase: '#141414',
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
          },
          components: {
            Menu: {
              darkItemBg: 'transparent',
              darkItemSelectedBg: 'rgba(0, 255, 65, 0.1)',
              darkItemHoverBg: 'rgba(0, 255, 65, 0.05)',
            },
            Table: {
              headerBg: '#1a1a1a',
              rowHoverBg: 'rgba(0, 255, 65, 0.04)',
            },
          },
        }}
      >
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/personas/:id" element={<PersonaDetailPage />} />
                <Route path="/hosts" element={<HostsPage />} />
                <Route path="/hosts/:id" element={<HostDetailPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/economy" element={<EconomyPage />} />
                <Route path="/economy/transactions" element={<TransactionsPage />} />
                <Route path="/hack-sessions" element={<HackSessionsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/blog-posts" element={<BlogPostsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/payment-requests" element={<PaymentRequestsPage />} />
                <Route path="/access-tokens" element={<AccessTokensPage />} />
                <Route path="/licenses" element={<LicensesPage />} />
                <Route path="/graph" element={<GraphPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/emergency" element={<EmergencyPage />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/security" element={<SecurityPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
