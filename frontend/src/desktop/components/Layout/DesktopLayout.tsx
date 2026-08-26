import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LogOut, Settings, User, History, Camera, 
  PlusSquare, ShieldCheck, ShieldAlert, ChevronDown,
  Sun, Moon 
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authAPI } from '../../../shared/services/api';
import { 
  Avatar, Box, Group, Menu, Text, UnstyledButton, 
  Switch, Badge, Modal, PasswordInput, Button, 
  Stack, ActionIcon, useMantineColorScheme, useComputedColorScheme 
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

const SUDO_PROTECTED_PATHS = ['/desktop/profile', '/desktop/settings', '/desktop/accounts', '/desktop/audit'];

export default function DesktopLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, viewMode, setViewMode } = useAuth();
  
  // Theme Hooks
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const [sudoModalOpened, setSudoModalOpened] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isAdminLocked = isDesktop && user?.role === 'CCTV Chief' && viewMode === 'Operator';
  const activeRole = user?.role === 'CCTV Chief' ? viewMode : user?.role;

  // FR-PPD-005: When Chief Mode is exited while on a sudo-protected route,
  // redirect to cameras automatically.
  useEffect(() => {
    if (isAdminLocked && SUDO_PROTECTED_PATHS.some((p) => location.pathname.startsWith(p))) {
      navigate('/desktop/cameras', { replace: true });
    }
  }, [isAdminLocked, location.pathname, navigate]);

  const toggleTheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const handleModeToggle = (checked: boolean) => {
    if (checked) {
      setSudoModalOpened(true);
    } else {
      setViewMode('Operator');
      // FR-PPD-006: Audit log for Chief Mode exit
      authAPI.logChiefMode(false).catch(() => {});
      if (location.pathname.includes('/audit') || location.pathname.includes('/accounts') || location.pathname.includes('/profile') || location.pathname.includes('/settings')) {
        navigate('/desktop/cameras');
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
      // FR-PPD-006: Audit log for Chief Mode entry
      authAPI.logChiefMode(true).catch(() => {});
    } catch (err: any) {
      setError("Verification failed. Please check your password.");
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: 'Camera', icon: Camera, path: '/desktop/cameras', roles: ['Admin', 'Operator', 'Barangay Tanod'] },
    { label: 'Account', icon: PlusSquare, path: '/desktop/accounts', roles: ['Admin'] },
    { label: 'Audit', icon: History, path: '/desktop/audit', roles: ['Admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(activeRole || ''));

  return (
    <Box style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--mantine-color-body)', // Adapts to theme
      display: 'flex', 
      flexDirection: 'column' 
    }}>

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

      <Box 
        component="header" 
        style={{ 
          height: 64, 
          backgroundColor: 'var(--mantine-color-scheme-outline)', // Themed white/dark surface
          borderBottom: '1px solid var(--mantine-color-default-border)', 
          paddingInline: 24 
        }}
      >
        <Group justify="space-between" h="100%" maw={1400} mx="auto">
          <Group gap={30}>
            <img src="/icon.png" alt="logo" style={{ height: 32 }} />

            {user?.role === 'CCTV Chief' && (
              <Group gap="xs" style={{ 
                background: 'var(--mantine-color-default-hover)', 
                padding: '4px 12px', 
                borderRadius: 20 
              }}>
                <Text size="xs" fw={700} c={viewMode === 'Operator' ? 'orange' : 'dimmed'}>CCTV OPERATOR</Text>
                <Switch
                  checked={viewMode === 'Admin'}
                  onChange={(event) => handleModeToggle(event.currentTarget.checked)}
                  color="orange"
                  size="sm"
                  onLabel={<ShieldCheck size={12} />}
                  offLabel={<ShieldAlert size={12} />}
                />
                <Text size="xs" fw={700} c={viewMode === 'Admin' ? 'orange' : 'dimmed'}>CHIEF</Text>
              </Group>
            )}
          </Group>

          <Group component="nav" gap={40}>
            {filteredNav.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                style={{
                  textDecoration: 'none',
                  color: location.pathname.startsWith(item.path) 
                    ? 'var(--mantine-color-orange-filled)' 
                    : 'var(--mantine-color-text)', // Adaptive text color
                  fontWeight: 600, 
                  fontSize: 14,
                  borderBottom: location.pathname.startsWith(item.path) 
                    ? '2px solid var(--mantine-color-orange-filled)' 
                    : 'none',
                  paddingBottom: 4
                }}
              >
                {item.label}
              </Link>
            ))}
          </Group>

          <Group gap="md">
            {/* Dark/Light Mode Toggle Button */}
            <ActionIcon
              onClick={toggleTheme}
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
              radius="md"
            >
              {computedColorScheme === 'dark' ? (
                <Sun size={18} strokeWidth={1.5} />
              ) : (
                <Moon size={18} strokeWidth={1.5} />
              )}
            </ActionIcon>

            <Menu position="bottom-end" withArrow>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={10}>
                    <Avatar radius="xl" color="orange">{user?.first_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase()}</Avatar>
                    <Box visibleFrom="sm">
                      <Text fz={13} fw={700}>{user?.full_name || user?.email}</Text>
                      <Badge size="xs" variant="light" color="gray">{viewMode === 'Admin' ? 'Chief' : 'CCTV Operator'} Mode</Badge>
                    </Box>
                    <ChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown miw={200}>
                <Menu.Item
                  leftSection={<User size={14} />}
                  onClick={() => navigate('/desktop/profile')}
                  disabled={isAdminLocked}
                >
                  Profile {isAdminLocked && '(Locked)'}
                </Menu.Item>

                <Menu.Item
                  leftSection={<Settings size={14} />}
                  onClick={() => navigate('/desktop/settings')}
                  disabled={isAdminLocked}
                >
                  Settings {isAdminLocked && '(Locked)'}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<LogOut size={14} />} color="orange" onClick={logout}>Logout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      <Box component="main" style={{ flex: 1, padding: 24 }}>
        <Box maw={1400} mx="auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}