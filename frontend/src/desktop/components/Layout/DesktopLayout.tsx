import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Camera, ChevronDown, Cog, DoorOpen, History, Moon, PlusCircle, Toggles, Sun, User } from '@boxicons/react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authAPI } from '../../../shared/services/api';
import { parseThrottleSeconds } from '../../../shared/utils/authErrors';
import { AdminVerificationModal } from './AdminVerificationModal';
import { 
  Avatar, Box, Group, Menu, Text, UnstyledButton, Badge,
  useMantineColorScheme, useComputedColorScheme, Container
} from '@mantine/core';

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
  const [sudoThrottleSeconds, setSudoThrottleSeconds] = useState(0);

  // FR-PPD-005: Countdown for admin-verification (429) cooldown while the
  // submit button is disabled — mirrors the login rate-limit behaviour.
  useEffect(() => {
    if (sudoThrottleSeconds <= 0) return;
    const id = setInterval(() => {
      setSudoThrottleSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setError('');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sudoThrottleSeconds]);

  // FR-PPD-005: Profile/Settings (and other sudo-protected routes) are only
  // available to the Chief view — locked for every other role/mode.
  const isAdminLocked = viewMode !== 'Admin';
  // Mode used for nav filtering (matches the role strings in navItems).
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
      authAPI.logChiefMode(false).catch(() => { });
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
      setSudoThrottleSeconds(0);
      // FR-PPD-006: Audit log for Chief Mode entry
      authAPI.logChiefMode(true).catch(() => { });
    } catch (err: any) {
      if (err?.response?.status === 429) {
        const seconds = parseThrottleSeconds(err?.response?.data?.detail);
        setSudoThrottleSeconds(seconds || 60);
        setError(
          seconds > 0
            ? `Too many attempts. Please try again in ${seconds}s.`
            : 'Too many attempts. Please wait a moment and try again.'
        );
      } else {
        setError('Invalid Password');
      }
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: 'Camera', icon: Camera, path: '/desktop/cameras', roles: ['Admin', 'Operator', 'Barangay Tanod'] },
    { label: 'Account', icon: PlusCircle, path: '/desktop/accounts', roles: ['Admin'] },
    { label: 'Audit', icon: History, path: '/desktop/audit', roles: ['Admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(activeRole || ''));

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)', display: 'flex', flexDirection: 'column' }}>

      <AdminVerificationModal
        opened={sudoModalOpened}
        onClose={() => setSudoModalOpened(false)}
        password={password}
        onPasswordChange={setPassword}
        error={error}
        loading={loading}
        throttleSeconds={sudoThrottleSeconds}
        onSubmit={handleVerifySudo}
      />

      <Box
        component="header"
        style={{
          height: 80,
          backgroundColor: 'var(--mantine-color-scheme-outline)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Container size="xl" h="100%" w="100%" fluid px={{ base: 16, sm: 24, lg: 40 }}>
          <Group justify="space-between" h="100%" wrap="nowrap">

            {/* Logo Section */}
            <Group gap={80} wrap="nowrap" style={{ minWidth: 0 }}>
              <img src="/icon.png" alt="logo" style={{ height: 'clamp(40px, 6vw, 60px)', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/desktop/cameras')} />

              {/* Navigation Links */}
              <Group component="nav" gap={60} wrap="nowrap">
                {filteredNav.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Box key={item.path} style={{ position: 'relative', height: '100%' }}>
                      <Link
                        to={item.path}
                        style={{
                          textDecoration: 'none',
                          color: isActive ? 'var(--mantine-color-orange-filled)' : 'var(--mantine-color-dimmed)',
                          fontWeight: 600,
                          fontSize: 16,
                          display: 'block',
                          padding: '5px 0',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.label}
                      </Link>
                      {/* Custom Underline matching the image */}
                      {isActive && (
                        <Box
                          style={{
                            position: 'absolute',
                            bottom: -22,
                            left: -10,
                            right: -10,
                            height: 3,
                            backgroundColor: 'var(--mantine-color-orange-filled)',
                            borderRadius: '2px 2px 0 0'
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Group>
            </Group>

            {/* User Profile Section */}
            <Menu position="bottom-end" withArrow width={220}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={12}>
                    <Avatar
                      size={45}
                      radius="xl"
                      src={user?.profile_picture}
                      style={{ border: '1px solid var(--mantine-color-default-border)' }}
                    >
                      {user?.first_name?.[0]}
                    </Avatar>
                    <Box visibleFrom="xs">
                      <Text fz={16} fw={700} lh={1.2} style={{ color: 'var(--mantine-color-text)' }}>
                        {user?.full_name || "User Name"}
                      </Text>
                      <Badge
                        mt={4}
                        size="sm"
                        variant="filled"
                        color={viewMode === 'Admin' ? 'orange' : 'gray'}
                        tt="uppercase"
                        fw={600}
                        style={{ letterSpacing: 0.6 }}
                      >
                        {viewMode === 'Admin' ? 'Chief' : 'Operator'} Mode
                      </Badge>
                    </Box>
                    <ChevronDown size="sm" color="var(--mantine-color-dimmed)" style={{ marginLeft: 5 }} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<User size="sm" />} onClick={() => navigate('/desktop/profile')} disabled={isAdminLocked}>Profile</Menu.Item>
                <Menu.Item leftSection={<Cog size="sm" />} onClick={() => navigate('/desktop/settings')} disabled={isAdminLocked}>Settings</Menu.Item>
                <Menu.Divider />
                {user?.role === 'CCTV Chief' && (
                  <Menu.Item
                    leftSection={<Toggles size="sm" />}
                    onClick={() => handleModeToggle(viewMode === 'Operator')}
                  >
                    Switch to {viewMode === 'Admin' ? 'Operator' : 'Chief'}
                  </Menu.Item>
                )}
                <Menu.Item leftSection={computedColorScheme === 'dark' ? <Sun size="sm" /> : <Moon size="sm" />} onClick={toggleTheme}>
                  {computedColorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<DoorOpen size="sm" />} color="orange" onClick={logout}>Logout</Menu.Item>
              </Menu.Dropdown>
            </Menu>

          </Group>
        </Container>
      </Box>

      <Box component="main" style={{ flex: 1, padding: 24 }}>
        <Container size="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}