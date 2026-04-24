import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, Typography } from 'antd';
import { SplashScreen as CapSplashScreen } from '@capacitor/splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { antdTheme } from './theme';
import { AppLayout } from './components/layout/AppLayout';
import { CookieBanner } from './components/CookieBanner';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import IncomePage from './pages/Income';
import ExpensesPage from './pages/Expenses';
import ReportsPage from './pages/Reports';
import AccountsPage from './pages/Accounts';
import ProfilePage from './pages/Profile';
import PricingPage from './pages/Pricing';
import TermsPage from './pages/Terms';
import PrivacyPage from './pages/Privacy';
import CookiesPage from './pages/Cookies';
import AdminPage from './pages/Admin';
import { useAuthStore } from './stores/authStore';

const { Text } = Typography;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) return <FullPageSplash />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function FullPageSplash() {
  return (
    <div style={{ 
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', background: '#fff',
      position: 'fixed', inset: 0, zIndex: 9999
    }}>
       <div style={{ 
          width: 90, height: 90, borderRadius: 24, background: '#fff', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          marginBottom: 24,
          animation: 'pulse 2s infinite ease-in-out',
          padding: 12
        }}>
          <img src="/bos.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Text strong style={{ fontSize: 24, color: '#1E293B', letterSpacing: -0.5 }}>Biashara OS</Text>
        <Text type="secondary" style={{ fontSize: 13, marginTop: 8 }}>Initializing your workspace...</Text>
        <div style={{ marginTop: 40 }}>
          <Spin size="large" />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}} />
    </div>
  );
}

export default function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initialize();
      try {
        await CapSplashScreen.hide();
      } catch (e) {
        // Not on mobile or plugin error
      }
    };
    init();
  }, [initialize]);

  if (isLoading) {
    return (
      <ConfigProvider theme={antdTheme}>
        <FullPageSplash />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antdTheme}>
      <QueryClientProvider client={queryClient}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Public Legal Routes */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          <CookieBanner />
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
