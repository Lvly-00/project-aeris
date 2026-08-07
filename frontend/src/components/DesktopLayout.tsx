import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  History,
  Camera,
  PlusSquare,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Group,
  Indicator,
  Menu,
  Text,
  UnstyledButton,
  rem
} from '@mantine/core';

// fix in the future
const navItems = [
  { label: 'Camera', icon: Camera, path: '/cameras', roles: ['Admin', 'Operator', 'Viewer'] },
  { label: 'Account', icon: PlusSquare, path: '/accounts', roles: ['Admin', 'Operator'] },
  { label: 'Audit', icon: History, path: '/audit', roles: ['Admin', 'Operator'] },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'Viewer';

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      try {
        const res = await notificationsAPI.unreadCount();
        return res.data.count;
      } catch { return 0; }
    },
    refetchInterval: 30000,
  });

  // change to function
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-0)', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER / NAVIGATION BAR */}
      <Box
        component="header"
        style={{
          height: 64,
          backgroundColor: 'white',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          paddingInline: 24,
        }}
      >
        <Group justify="space-between" h="100%" maw={1280} mx="auto">

          {/* LEFT: LOGO */}
          <Group gap={8} align="center" h="100%">
            <Box style={{ height: rem(32), display: 'flex', alignItems: 'center' }}>
              <img
                src="/icon.png"
                alt="logo"
                style={{
                  height: '100%',    
                  width: 'auto',     
                  objectFit: 'contain'
                }}
              />
            </Box>

          </Group>

          {/* CENTER: NAV LINKS */}
          <Group component="nav" gap={64} h="100%">
            {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Box
                  key={item.path}
                  component={Link}
                  to={item.path}
                  h="100%"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: 'none',
                    color: isActive ? '#FF6B00' : 'var(--mantine-color-gray-6)',
                    transition: 'color 150ms',
                  }}
                >
                  {item.label}
                  {isActive && (
                    <Box
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        left: 0,
                        right: 0,
                        height: 3,
                        backgroundColor: '#FF6B00',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Group>

          {/* RIGHT: ACTIONS & PROFILE */}
          <Group gap={16}>          
            {/* User Profile Dropdown */}
            <Menu position="bottom-end" offset={8} withArrow>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={10} align="center">
                    <Avatar radius="xl" size={36} color="gray">
                      {user?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box visibleFrom="md">
                      <Text fz={13} fw={700} tt="uppercase" lh={1} c="dark">
                        {user?.username || 'ADMIN 01'}
                      </Text>
                      <Text fz={10} c="dimmed" fw={500} mt={2}>
                        {user?.role?.replace('_', ' ') || 'Barangay Official'}
                      </Text>
                    </Box>
                    <ChevronDown size={16} color="var(--mantine-color-gray-5)" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown miw={200}>
                <Menu.Label>My Account</Menu.Label>
                <Menu.Item leftSection={<User size={14} />} onClick={() => navigate('/profile')}>
                  Profile
                </Menu.Item>
                <Menu.Item leftSection={<Settings size={14} />} onClick={() => navigate('/settings')}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<LogOut size={14} />} color="red" onClick={handleLogout}>
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

        </Group>
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box component="main" style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <Box maw={1280} mx="auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
