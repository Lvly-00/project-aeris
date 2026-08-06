import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Group,
  Text,
  UnstyledButton,
  Badge,
  Avatar,
  Menu,
  ActionIcon,
  Indicator,
  Divider,
  Box,
  ScrollArea,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  LayoutDashboard,
  Camera,
  TriangleAlert,
  Lightbulb,
  BarChart3,
  FileText,
  Bell,
  Settings,
  LogOut,
  User,
  Map,
  ChevronRight,
  Siren,
  History,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import { playAlertSound } from '../utils/sounds';
import type { AppNotification } from '../types';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'Operator', 'Viewer', 'Barangay_Official', 'Barangay_Tanod'] },
  { label: 'CCTV Cameras', icon: Camera, path: '/cameras', roles: ['Admin', 'Operator', 'Viewer'] },
  { label: 'Incidents', icon: TriangleAlert, path: '/incidents', roles: ['Admin', 'Operator', 'Viewer', 'Barangay_Official'] },
  { label: 'Recommendations', icon: Lightbulb, path: '/recommendations', roles: ['Admin', 'Operator'] },
  { label: 'Dispatch', icon: Siren, path: '/dispatch', roles: ['Admin', 'Operator', 'Barangay_Official'] },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['Admin', 'Operator'] },
  { label: 'Reports', icon: FileText, path: '/reports', roles: ['Admin', 'Operator'] },
  { label: 'Audit Log', icon: History, path: '/audit', roles: ['Admin', 'Operator'] },
  { label: 'Notifications', icon: Bell, path: '/notifications', roles: ['Admin', 'Operator', 'Barangay_Official', 'Barangay_Tanod'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['Admin', 'Operator'] },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [opened, { toggle }] = useDisclosure(true);
  const userRole = user?.role || 'Viewer';

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      try {
        const res = await notificationsAPI.unreadCount();
        return res.data.count;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000,
  });

  const lastSeenId = useRef<number>(0);

  const { data: recentNotifications } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const res = await notificationsAPI.list({ ordering: '-created_at', limit: 5 });
      return (res.data.results || res.data) as AppNotification[];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!recentNotifications || recentNotifications.length === 0) return;
    const newNotifs = recentNotifications.filter((n) => n.id > lastSeenId.current);
    if (newNotifs.length === 0) return;
    lastSeenId.current = Math.max(...newNotifs.map((n) => n.id));
    for (const n of newNotifs) {
      if (n.notification_type !== 'Alert') continue;
      playAlertSound(n.priority);
      notifications.show({
        title: n.title,
        message: n.message,
        color: n.priority === 'Critical' ? 'red' : n.priority === 'High' ? 'orange' : 'blue',
        autoClose: 8000,
      });
    }
  }, [recentNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={(theme) => ({
        main: {
          background: theme.colors.dark[8],
          minHeight: '100vh',
        },
      })}
    >
      <AppShell.Header
        style={{ background: '#1A1B1E', borderBottom: '1px solid #373A40' }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <TriangleAlert size={28} color="#FF4444" />
            <Text fw={700} size="lg">
              Aeris
            </Text>
          </Group>
          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Indicator
                  inline
                  label={unreadCount || 0}
                  size={16}
                  color="red"
                  offset={4}
                  disabled={!unreadCount}
                >
                  <ActionIcon variant="subtle" size="lg" radius="xl">
                    <Bell size={20} />
                  </ActionIcon>
                </Indicator>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => navigate('/notifications')}>
                  View All Notifications
                </Menu.Item>
                <Menu.Item onClick={() => navigate('/notifications')}>
                  {unreadCount || 0} Unread
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="red" radius="xl" size="sm">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" fw={500}>
                        {user?.username || 'User'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user?.role || 'Operator'}
                      </Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<User size={14} />}>
                  Profile
                </Menu.Item>
                <Menu.Item leftSection={<Settings size={14} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<LogOut size={14} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        style={{ background: '#1A1B1E', borderRight: '1px solid #373A40' }}
      >
        <AppShell.Section grow component={ScrollArea}>
          {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <UnstyledButton
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  color: isActive ? '#FF6B6B' : '#CED4DA',
                  backgroundColor: isActive ? '#25262B' : 'transparent',
                  borderRight: isActive ? '3px solid #FF4444' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={20} strokeWidth={1.5} />
                <Text ml="sm" size="sm" fw={isActive ? 600 : 400}>
                  {item.label}
                </Text>
                {isActive && (
                  <ChevronRight
                    size={14}
                    style={{ marginLeft: 'auto' }}
                    color="#FF4444"
                  />
                )}
              </UnstyledButton>
            );
          })}
        </AppShell.Section>

        <AppShell.Section
          style={{ borderTop: '1px solid #373A40', padding: '16px' }}
        >
          <Group gap="xs">
            <Map size={16} color="#666" />
            <Text size="xs" c="dimmed">
              v1.0.0
            </Text>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
