import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, Settings, User, History, Camera, PlusSquare, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { Avatar, Box, Group, Menu, Text, UnstyledButton, Switch, Badge, Modal, PasswordInput, Button, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';


export default function DesktopLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, viewMode, setViewMode } = useAuth();

  const [sudoModalOpened, setSudoModalOpened] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Logic to determine if a link should look disabled
  const isAdminLocked = isDesktop && user?.role === 'Admin' && viewMode === 'Operator';

  const activeRole = user?.role === 'Admin' ? viewMode : user?.role;

  const handleModeToggle = (checked: boolean) => {
    if (checked) {
      setSudoModalOpened(true);
    } else {
      setViewMode('Operator');
      // If we are on an Admin-only page, move to a safe page immediately
      if (location.pathname === '/audit' || location.pathname === '/accounts') {
        navigate('/cameras');
      }
    }
  };

  const handleVerifySudo = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.verifyPassword(password);
      setViewMode('Admin');
      setSudoModalOpened(false);
      setPassword('');
    } catch (err: any) {
      setError("Verification failed. Please check your password.");
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: 'Camera', icon: Camera, path: '/cameras', roles: ['Admin', 'Operator', 'Tanod'] },
    { label: 'Account', icon: PlusSquare, path: '/accounts', roles: ['Admin'] },
    { label: 'Audit', icon: History, path: '/audit', roles: ['Admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(activeRole || ''));

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>

      <Modal opened={sudoModalOpened} onClose={() => setSudoModalOpened(false)} title="Admin Verification" centered>
        <Stack>
          <Text size="sm">Please enter your password to enable Admin Mode.</Text>
          <PasswordInput
            label="Password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            error={error}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifySudo()}
          />
          <Button color="orange" fullWidth onClick={handleVerifySudo} loading={loading}>
            Unlock Admin View
          </Button>
        </Stack>
      </Modal>

      <Box component="header" style={{ height: 64, backgroundColor: 'white', borderBottom: '1px solid #e9ecef', paddingInline: 24 }}>
        <Group justify="space-between" h="100%" maw={1400} mx="auto">
          <Group gap={30}>
            <img src="/icon.png" alt="logo" style={{ height: 32 }} />

            {user?.role === 'Admin' && (
              <Group gap="xs" style={{ background: '#f1f3f5', padding: '4px 12px', borderRadius: 20 }}>
                <Text size="xs" fw={700} c={viewMode === 'Operator' ? 'orange' : 'dimmed'}>OPERATOR</Text>
                <Switch
                  checked={viewMode === 'Admin'}
                  onChange={(event) => handleModeToggle(event.currentTarget.checked)}
                  color="orange"
                  size="sm"
                  onLabel={<ShieldCheck size={12} />}
                  offLabel={<ShieldAlert size={12} />}
                />
                <Text size="xs" fw={700} c={viewMode === 'Admin' ? 'orange' : 'dimmed'}>ADMIN</Text>
              </Group>
            )}
          </Group>

          <Group component="nav" gap={40}>
            {filteredNav.map((item) => (
              <Link key={item.path} to={item.path} style={{
                textDecoration: 'none',
                color: location.pathname.startsWith(item.path) ? '#FF6B00' : '#495057',
                fontWeight: 600, fontSize: 14,
                borderBottom: location.pathname.startsWith(item.path) ? '2px solid #FF6B00' : 'none',
                paddingBottom: 4
              }}>
                {item.label}
              </Link>
            ))}
          </Group>

          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <UnstyledButton>
                <Group gap={10}>
                  <Avatar radius="xl" color="orange">{user?.username?.[0].toUpperCase()}</Avatar>
                  <Box>
                    <Text fz={13} fw={700}>{user?.username}</Text>
                    <Badge size="xs" variant="outline" color="gray">{viewMode} Mode</Badge>
                  </Box>
                  <ChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown miw={200}>
              <Menu.Item
                leftSection={<User size={14} />}
                onClick={() => navigate('/profile')}
                disabled={isAdminLocked} // Disabled only on desktop in operator mode
              >
                Profile {isAdminLocked && '(Locked)'}
              </Menu.Item>

              <Menu.Item
                leftSection={<Settings size={14} />}
                onClick={() => navigate('/settings')}
                disabled={isAdminLocked}
              >
                Settings {isAdminLocked && '(Locked)'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<LogOut size={14} />} color="red" onClick={logout}>Logout</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>

      <Box component="main" style={{ flex: 1, padding: 24 }}>
        <Box maw={1400} mx="auto"><Outlet /></Box>
      </Box>
    </Box>
  );
}