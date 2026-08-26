import { useEffect, useState, useRef } from 'react';
import {
  Container, Paper, Avatar, Text, Stack, Group, ThemeIcon, Switch,
  Select, Button, Box, LoadingOverlay, useMantineColorScheme,
  useComputedColorScheme, FileButton, Divider, Badge,
} from '@mantine/core';
import {
  Settings, Globe, Moon, Sun, Camera, Lock, Mail, User as UserIcon,
} from 'lucide-react';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { User } from '../../shared/types';
import EditProfileModal from '../../shared/components/profile/EditProfileModal';
import ChangePasswordModal from '../../shared/components/profile/ChangePasswordModal';
import ChangeEmailModal from '../../shared/components/profile/ChangeEmailModal';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';

const ORANGE = '#FF6B00';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { logout } = useAuth();
  const fileResetRef = useRef<() => void | null>(null);

  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  // Modals
  const [editOpened, setEditOpened] = useState(false);
  const [passwordOpened, setPasswordOpened] = useState(false);
  const [emailOpened, setEmailOpened] = useState(false);
  const [twoFAModalOpened, setTwoFAModalOpened] = useState(false);

  const fetchProfile = () => {
    authAPI
      .getProfile()
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdate = async (field: string, value: any) => {
    setUpdating(true);
    try {
      const res = await authAPI.updateProfile({ [field]: value });
      setUser(res.data);
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const handlePictureUpload = async (file: File | null) => {
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Unsupported profile picture format. Use JPG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Profile picture exceeds the maximum allowed file size (5 MB).');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      const res = await authAPI.updateProfile(formData);
      setUser(res.data);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleTheme = (checked: boolean) => {
    setColorScheme(checked ? 'dark' : 'light');
  };

  if (loading) return <LoadingOverlay visible />;

  const maskedEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  };

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Container size="xs" py="xl">
        <Stack gap="md">
          <Text ta="center" fw={700} fz="lg">Profile</Text>

          {/* Avatar Card */}
          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{
              backgroundColor: computedColorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-orange-0)',
              borderColor: 'var(--mantine-color-orange-light-color)',
            }}
          >
            <Stack align="center" gap="xs">
              <Box style={{ position: 'relative' }}>
                <Box p={4} style={{ border: `2px solid ${ORANGE}`, borderRadius: '100%' }}>
                  <Avatar src={user?.profile_picture} size={120} radius={120} />
                </Box>
                <FileButton
                  resetRef={fileResetRef as any}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePictureUpload}
                >
                  {(props) => (
                    <Box
                      {...props}
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: ORANGE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '2px solid white',
                      }}
                    >
                      <Camera size={16} color="white" />
                    </Box>
                  )}
                </FileButton>
              </Box>

              <Text fw={700} fz="24px">
                {user?.first_name} {user?.last_name}
              </Text>

              <Badge variant="light" color="orange" size="lg" tt="uppercase" fw={700}>
                {user?.role || 'Staff'}
              </Badge>

              <Badge variant="outline" color={user?.is_active ? 'green' : 'red'} size="sm">
                {user?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Stack>
          </Paper>

          {/* Personal Information */}
          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="sm">
              <Group gap="sm">
                <ThemeIcon color="orange" variant="light">
                  <UserIcon size={18} />
                </ThemeIcon>
                <Text fw={700} fz="sm">Personal Information</Text>
              </Group>

              <Divider />

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text fz="xs" c="dimmed">Name</Text>
                  <Text fw={600} fz="sm">{user?.first_name} {user?.last_name}</Text>
                </Stack>
                <Button variant="light" color="orange" size="xs" px="xl" onClick={() => setEditOpened(true)}>
                  Edit
                </Button>
              </Group>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text fz="xs" c="dimmed">Email</Text>
                  <Text fw={600} fz="sm">{maskedEmail(user?.email || '')}</Text>
                </Stack>
                <Button variant="light" color="orange" size="xs" px="xl" onClick={() => setEmailOpened(true)}>
                  Change
                </Button>
              </Group>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text fz="xs" c="dimmed">Password</Text>
                  <Text fw={600} fz="sm">••••••••</Text>
                </Stack>
                <Button variant="light" color="orange" size="xs" px="xl" onClick={() => setPasswordOpened(true)}>
                  Change
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* Preferences */}
          <Paper withBorder p="md" radius="md" pos="relative" bg="var(--mantine-color-body)">
            <LoadingOverlay visible={updating} overlayProps={{ blur: 1 }} />
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon color="orange" variant="light">
                  <Settings size={18} />
                </ThemeIcon>
                <Text fw={700} fz="sm">Preferences</Text>
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={700} fz="sm">Receive Notifications</Text>
                  <Text fz="xs" c="dimmed">Important security alerts</Text>
                </Box>
                <Switch
                  checked={user?.receive_notifications}
                  onChange={(e) => handleUpdate('receive_notifications', e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Group gap={6}>
                    {computedColorScheme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                    <Text fw={700} fz="sm">Dark Mode</Text>
                  </Group>
                  <Text fz="xs" c="dimmed">Switch between dark and light theme</Text>
                </Box>
                <Switch
                  checked={computedColorScheme === 'dark'}
                  onChange={(e) => toggleTheme(e.currentTarget.checked)}
                  color="orange"
                />
              </Group>

              <Group justify="space-between">
                <Box>
                  <Group gap={6}>
                    <Lock size={14} />
                    <Text fw={700} fz="sm">Two-Factor Authentication</Text>
                  </Group>
                  <Text fz="xs" c="dimmed">
                    {user?.two_factor_enabled ? 'Extra layer of security is active' : 'Add extra security to your account'}
                  </Text>
                </Box>
                <Switch
                  color="orange"
                  checked={user?.two_factor_enabled || false}
                  onChange={() => setTwoFAModalOpened(true)}
                />
              </Group>

              <Box>
                <Text fw={700} fz="xs" c="dimmed" mb={5}>Language</Text>
                <Select
                  leftSection={<Globe size={16} />}
                  value={user?.preferred_language || 'English'}
                  onChange={(val) => handleUpdate('preferred_language', val)}
                  data={['English', 'Filipino']}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Logout */}
          <Button fullWidth color="orange" size="lg" onClick={logout}>
            LOG OUT
          </Button>
        </Stack>
      </Container>

      {/* Modals */}
      <EditProfileModal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        user={{ first_name: user?.first_name || '', last_name: user?.last_name || '' }}
        onUpdated={(updated) => setUser((prev) => prev ? { ...prev, ...updated } : prev)}
      />

      <ChangePasswordModal
        opened={passwordOpened}
        onClose={() => setPasswordOpened(false)}
      />

      <ChangeEmailModal
        opened={emailOpened}
        onClose={() => setEmailOpened(false)}
        currentEmail={user?.email || ''}
        onEmailChanged={fetchProfile}
      />

      <VerificationCodeModal
        opened={twoFAModalOpened}
        onClose={() => setTwoFAModalOpened(false)}
        email={user?.email || ''}
        onSendCode={async () => { await authAPI.send2FACode(); }}
        onVerify={async (code) => { await authAPI.verify2FACode(code); }}
        onVerified={fetchProfile}
        title="Two-Factor Authentication"
        subtitle={user?.two_factor_enabled ? '2FA has been disabled.' : '2FA has been enabled. You will need to verify your identity on future logins.'}
        verifyLabel={user?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
      />
    </Box>
  );
}
