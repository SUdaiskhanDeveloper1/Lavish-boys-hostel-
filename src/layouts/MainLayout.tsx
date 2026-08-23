import { useMemo, useState } from 'react';
import { Layout, Menu, Breadcrumb, Avatar, Dropdown, Button, theme, Grid } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  TeamOutlined,
  DollarOutlined,
  WalletOutlined,
  UsergroupAddOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/constants';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const NAV = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/rooms', icon: <HomeOutlined />, label: 'Rooms' },
  { key: '/students', icon: <TeamOutlined />, label: 'Students' },
  { key: '/fees', icon: <DollarOutlined />, label: 'Fees & Receipts' },
  { key: '/expenses', icon: <WalletOutlined />, label: 'Expenses' },
  { key: '/employees', icon: <UsergroupAddOutlined />, label: 'Employees' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode, toggle } = useThemeMode();
  const screens = useBreakpoint();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const isMobile = !screens.md;

  const selectedKey =
    NAV.map((n) => n.key)
      .filter((k) => (k === '/' ? location.pathname === '/' : location.pathname.startsWith(k)))
      .sort((a, b) => b.length - a.length)[0] ?? '/';

  const crumbs = useMemo(() => {
    const current = NAV.find((n) => n.key === selectedKey);
    return [{ title: 'Home' }, { title: current?.label ?? '' }];
  }, [selectedKey]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        trigger={null}
        style={{ position: isMobile ? 'fixed' : 'relative', height: '100vh', zIndex: 100 }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
          }}
        >
          <img src="/logo-mark.svg" alt="LBH" style={{ height: 40 }} />
          {!collapsed && (
            <span style={{ color: '#E0B94A', fontWeight: 700, marginLeft: 8, fontSize: 13 }}>
              LAVISH BOYS
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => {
            navigate(key);
            if (isMobile) setCollapsed(true);
          }}
          items={NAV.map((n) => ({ key: n.key, icon: n.icon, label: n.label }))}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<BulbOutlined />} onClick={toggle} title="Toggle theme">
              {mode === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'settings', label: <Link to="/settings">Profile & Settings</Link> },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Logout',
                    onClick: async () => {
                      await signOut();
                      navigate('/login');
                    },
                  },
                ],
              }}
            >
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} style={{ background: '#1B2A4A' }} />
                {!isMobile && <span>{user?.email}</span>}
              </span>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 16 }}>
          <Breadcrumb items={crumbs} style={{ marginBottom: 16 }} />
          <div style={{ background: colorBgContainer, padding: isMobile ? 12 : 24, borderRadius: 8, minHeight: '75vh' }}>
            <Outlet />
          </div>
          <div style={{ textAlign: 'center', color: '#999', padding: 16, fontSize: 12 }}>
            {APP_NAME} · Management System © {new Date().getFullYear()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
