import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Space, Badge, Typography,
  Button, Tooltip, Input, message, Grid,
} from 'antd';
import {
  DashboardOutlined, AppstoreOutlined,
  BarChartOutlined, LogoutOutlined, UserOutlined, SyncOutlined,
  BellOutlined, SettingOutlined, SearchOutlined, QuestionCircleOutlined,
  DollarOutlined, ArrowRightOutlined, GlobalOutlined,
  SwapOutlined, PlusOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { darkTokens, cactusTheme } from '@/theme';
import { SyncAPI } from '@/services/api';

const { Sider, Header, Content } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export function AppLayout() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [collapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business, businesses, setActiveBusiness, logout } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  const NAV_ITEMS = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
    { key: '/income',    icon: <DollarOutlined />, label: 'Income (POS)' },
    { key: '/expenses',  icon: <AppstoreOutlined />, label: 'Expenses (Inventory)' },
    { key: '/accounts',  icon: <GlobalOutlined />, label: 'Accounts' },
    { key: '/reports',   icon: <BarChartOutlined />, label: 'Financial Reports' },
    { key: '/profile',   icon: <SettingOutlined />, label: 'Business Settings' },
  ];

  if (user?.role === 'admin') {
    NAV_ITEMS.push({ key: '/admin', icon: <SafetyOutlined />, label: 'Admin Portal' });
  }

  const handleSync = async () => {
    setSyncing(true);
    try {
      await SyncAPI.pull(0, business?.id);
      message.success('Data synchronized successfully!');
    } catch {
      message.error('Failed to sync. Please check connection.');
    } finally {
      setSyncing(false);
    }
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile Settings' },
      { key: 'help', icon: <QuestionCircleOutlined />, label: 'Help Center' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') logout();
      if (key === 'profile') navigate('/profile');
    },
  };

  // ─── Business Switcher Menu ───────────────────────────────────────────────
  const businessSwitchMenu = {
    items: [
      ...businesses.map(b => ({
        key: b.id,
        label: b.name,
        icon: <Badge dot color={b.id === business?.id ? cactusTheme.accent : 'transparent'} />,
        disabled: b.id === business?.id,
      })),
      { type: 'divider' as const },
      { 
        key: 'add_new', 
        icon: <PlusOutlined />, 
        label: (businesses.length >= 1 && business?.subscription_tier === 'free') ? 'Upgrade for More Profiles' : 'Add New Business',
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'add_new') {
        if (businesses.length >= 1 && business?.subscription_tier === 'free') {
          navigate('/pricing');
        } else {
          navigate('/profile');
        }
      } else {
        const selected = businesses.find(b => b.id === key);
        if (selected) setActiveBusiness(selected);
      }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh', background: cactusTheme.bg }}>
      {/* ── Cactus Sidebar ─────────────────────────────────────────────────── */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={260}
          style={{ 
            position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
            background: darkTokens.sidebarBg,
          }}
        >
        {/* Global Logo Header */}
        <div style={{
          padding: '24px 24px 8px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          alignItems: 'center',
        }}>
          <img 
            src="/bos.png" 
            alt="Biashara OS" 
            style={{ 
              height: collapsed ? 32 : 42, 
              objectFit: 'contain',
              transition: 'height 0.2s',
            }} 
          />
        </div>

        {/* Business Switcher / Logo area */}
        <Dropdown menu={businessSwitchMenu} trigger={['click']} placement="bottomLeft">
          <div style={{
            height: 60, display: 'flex', alignItems: 'center',
            padding: '0 24px', gap: 12, cursor: 'pointer',
            marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)',
            transition: 'background 0.2s',
          }} className="biz-switcher">
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 900, fontSize: 18, color: darkTokens.sidebarBg,
              flexShrink: 0,
            }}>
              {business?.name?.charAt(0).toUpperCase() || 'B'}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 600 }} ellipsis>
                  {business?.name || 'Biashara OS'}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  Switch Profile <SwapOutlined style={{ fontSize: 10 }} />
                </Text>
              </div>
            )}
          </div>
        </Dropdown>

        {/* Navigation */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ 
            background: 'transparent',
            borderRight: 0,
          }}
          className="cactus-menu"
        />

        {/* Upgrade Card */}
        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 40, left: 24, right: 24,
            padding: 20, borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <Text style={{ color: '#fff', fontWeight: 600, fontSize: 13, display: 'block', textTransform: 'capitalize' }}>
              {business?.subscription_tier || 'Free'} Tier
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block', marginTop: 4, lineHeight: 1.4 }}>
              Active business profile for {business?.business_type || 'Operations'}.
            </Text>
            <Button 
              block 
              style={{ 
                marginTop: 16, borderRadius: 8, height: 36, 
                background: '#fff', color: darkTokens.sidebarBg, fontWeight: 700, border: 'none'
              }}
              onClick={() => navigate('/pricing')}
            >
              Upgrade Plan
            </Button>
          </div>
        )}
      </Sider>
      )}

      {/* ── Content Area ───────────────────────────────────────────────────── */}
      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), 
        transition: 'all 0.2s', 
        background: 'transparent',
        paddingBottom: isMobile ? 70 : 0
      }}>
        {/* White Cactus Header */}
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: '#fff',
          borderBottom: '1px solid #EDEDED',
          padding: isMobile ? '0 16px' : '0 40px',
          height: isMobile ? 64 : 80,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ flex: '0 0 auto', marginRight: 16 }}>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cactusTheme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlobalOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <Text strong style={{ fontSize: 18, color: cactusTheme.accent, letterSpacing: -0.5 }}>Biashara</Text>
              </div>
            ) : (
              <Input 
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Search specific records..."
                variant="borderless"
                style={{ background: '#F8FAFC', borderRadius: 8, height: 44, padding: '0 16px', width: 400 }} 
              />
            )}
          </div>

          <Space size={isMobile ? 8 : 24} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 12, 
                padding: isMobile ? 0 : '4px 16px 4px 6px', 
                background: isMobile ? 'transparent' : '#F8FAFC', 
                borderRadius: 10,
                cursor: 'pointer', 
                border: isMobile ? 'none' : '1px solid #E2E8F0',
              }} className="user-pill">
                <Avatar
                  style={{ background: darkTokens.sidebarBg, borderRadius: 8 }}
                  size={isMobile ? 36 : 32}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <>
                    <div style={{ lineHeight: 1 }}>
                      <Text strong style={{ fontSize: 14 }}>{user?.name || 'Profile'}</Text>
                    </div>
                    <ArrowRightOutlined style={{ fontSize: 10, color: '#94A3B8', transform: 'rotate(90deg)' }} />
                  </>
                )}
              </div>
            </Dropdown>
            
            <Badge dot color="red" offset={[-2, 6]}>
              <Button 
                type="text" 
                icon={<BellOutlined />} 
                style={{ background: '#F8FAFC', borderRadius: 8, width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, border: '1px solid #E2E8F0' }} 
              />
            </Badge>

            <Tooltip title="Instant Sync">
              <Button 
                type="text" 
                icon={<SyncOutlined spin={syncing} />} 
                onClick={handleSync}
                style={{ background: darkTokens.sidebarBg, color: '#fff', borderRadius: 8, width: isMobile ? 38 : 44, height: isMobile ? 38 : 44 }} 
              />
            </Tooltip>
          </Space>
        </Header>

        {/* Page Content */}
        <Content style={{ padding: isMobile ? '20px 16px' : '40px 40px 60px' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 75,
          background: '#fff',
          borderTop: '1px solid #EDEDED',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
        }}>
          {NAV_ITEMS.slice(0, 4).map(item => (
            <div 
              key={item.key} 
              onClick={() => navigate(item.key)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                color: location.pathname === item.key ? cactusTheme.accent : '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 22 }}>{item.icon}</div>
              <Text style={{ 
                fontSize: 10, 
                marginTop: 4, 
                color: location.pathname === item.key ? cactusTheme.accent : '#94A3B8' 
              }}>
                {item.label.split(' ')[0]}
              </Text>
            </div>
          ))}
          <div 
             onClick={() => navigate('/profile')}
             style={{ 
               display: 'flex', 
               flexDirection: 'column', 
               alignItems: 'center',
               color: location.pathname === '/profile' ? cactusTheme.accent : '#94A3B8',
             }}
          >
            <Avatar size="small" style={{ background: location.pathname === '/profile' ? cactusTheme.accent : '#94A3B8' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Text style={{ fontSize: 10, marginTop: 4, color: location.pathname === '/profile' ? cactusTheme.accent : '#94A3B8' }}>
              Profile
            </Text>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .cactus-menu .ant-menu-item {
          margin: 4px 16px !important;
          border-radius: 8px !important;
          height: 46px !important;
          width: calc(100% - 32px) !important;
          color: rgba(255,255,255,0.7) !important;
        }
        .cactus-menu .ant-menu-item-selected {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .cactus-menu .ant-menu-item-selected .anticon {
          color: #fff !important;
        }
        .cactus-menu .ant-menu-item:hover {
          color: #fff !important;
        }
        .biz-switcher:hover {
          background: rgba(255,255,255,0.03);
        }
        .user-pill:hover {
          background-color: #E2E8F0 !important;
        }
      `}} />
    </Layout>
  );
}
