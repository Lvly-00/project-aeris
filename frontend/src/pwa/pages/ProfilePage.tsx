import { useEffect, useState, useRef } from 'react';
import {
  Container, Paper, Avatar, Text, Title, Stack, Group, Switch,
  Select, Button, Box, LoadingOverlay, useMantineColorScheme,
  useComputedColorScheme, FileButton, Divider, Badge, Anchor, Image, Loader,
} from '@mantine/core';
import { Bell, Camera, CheckShield, ChevronLeft, GlobeAlt, Moon, Sun } from '@boxicons/react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { resolveMediaUrl } from '../../shared/utils/mediaUrl';
import { User } from '../../shared/types';
import EditProfileModal from '../../shared/components/profile/EditNameModal';
import ChangePasswordModal from '../../shared/components/profile/ChangePasswordModal';
import ChangeEmailModal from '../../shared/components/profile/ChangeEmailModal';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';
import NotificationPermissionModal from '../../shared/components/NotificationPermissionModal';
import TermsAndConditionsModal from '../../shared/components/TermsAndConditionsModal';
import PrivacyPolicyModal from '../../shared/components/PrivacyPolicyModal';

const ORANGE = '#FF6B00';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { logout, setUser: setAuthUser } = useAuth();
  const fileResetRef = useRef<() => void | null>(null);

  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  // Modals
  const [editOpened, setEditOpened] = useState(false);
  const [passwordOpened, setPasswordOpened] = useState(false);
  const [emailOpened, setEmailOpened] = useState(false);
  const [twoFAModalOpened, setTwoFAModalOpened] = useState(false);
  const [twoFAIntent, setTwoFAIntent] = useState<'enable' | 'disable'>('enable');
  const [notifConsentOpened, setNotifConsentOpened] = useState(false);
  const [notifConfirming, setNotifConfirming] = useState(false);
  const [termsOpened, setTermsOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [revealEmail, setRevealEmail] = useState(false);

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
      setAuthUser(res.data);
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    if (checked) {
      // Ask for consent first, like every website does
      setNotifConsentOpened(true);
      return;
    }
    // Turning off takes effect immediately
    handleUpdate('receive_notifications', false);
  };

  const handleNotificationConfirm = async () => {
    setNotifConfirming(true);
    try {
      const res = await authAPI.updateProfile({ receive_notifications: true });
      setUser(res.data);
      setAuthUser(res.data);
      setNotifConsentOpened(false);
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setNotifConfirming(false);
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
      setAuthUser(res.data);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleTheme = (checked: boolean) => {
    setColorScheme(checked ? 'dark' : 'light');
  };

  const maskedEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  };

  if (!user) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Stack align="center" gap="md">
          <Image src="/icon.png" alt="Aeris Logo" w={96} />
          <Loader color="orange" size="lg" />
          <Text size="sm" c="dimmed" fw={500}>Loading your profile…</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Container size="xs" py="xl">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

        {/* PageHeader */}
        <Box mb={{ base: 'lg', sm: 'xl' }}>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Box
              component="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                display: 'flex', alignItems: 'center', flexShrink: 0,
              }}
            >
              <ChevronLeft
                width={28} height={28}
                strokeWidth={2.5}
                color="var(--mantine-color-dimmed)"
                style={{ display: 'block' }}
              />
            </Box>
            <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Title
                order={2}
                style={{
                  fontSize: 'clamp(18px, 5.5vw, 22px)',
                  lineHeight: 1.2,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                }}
              >
                PROFILE
              </Title>
              <Text
                fz={{ base: 'xs', sm: 'sm' }}
                c="dimmed"
                fw={500}
                style={{ lineHeight: 1.4 }}
              >
                Manage your personal details and how others see you.
              </Text>
            </Stack>
          </Group>
        </Box>

        <Stack gap="xl">
          {/* Avatar Card */}
          <Paper
            withBorder
            radius={15}
            p="xl"
            style={{
              backgroundColor: computedColorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-orange-0)',
              borderColor: 'var(--mantine-color-orange-light-color)',
            }}
          >
            <Stack align="center" gap="xs">
              <Box style={{ position: 'relative' }}>
                <Box p={4} style={{ border: `2px solid ${ORANGE}`, borderRadius: '100%' }}>
                  <Avatar src={resolveMediaUrl(user?.profile_picture)} size={120} radius={120} />
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
                      <Camera width={16} height={16} color="white" />
                    </Box>
                  )}
                </FileButton>
              </Box>

              <Title order={3} c="orange" fw={700} mt="xs" ta="center">
                {user?.first_name} {user?.last_name}
              </Title>

              <Badge
                mt={4}
                size="sm"
                variant="filled"
                color="orange"
                tt="uppercase"
                fw={600}
                style={{ letterSpacing: 0.6 }}
              >
                {user?.role || 'Staff'}
              </Badge>

              <Divider w="100%" my="lg" />

              <Button
                variant="subtle"
                color="gray"
                size="sm"
                fw={600}
                w="100%"
                onClick={() => setTermsOpened(true)}
                styles={{ label: { justifyContent: 'flex-start' } }}
              >
                Terms of Use
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                fw={600}
                w="100%"
                onClick={() => setPrivacyOpened(true)}
                styles={{ label: { justifyContent: 'flex-start' } }}
              >
                Privacy Policy
              </Button>
            </Stack>
          </Paper>

          {/* Personal Information */}
          <Paper withBorder radius={15} p="xl">
            <Stack gap={0}>
              <Title order={4} fw={700}>PERSONAL INFORMATION</Title>
              <Text size="xs" c="dimmed" mb="xl">
                Manage registrar attributes, contact emails, and secure account access settings
              </Text>

              <Stack gap="md">
                <Group justify="space-between" align="center" wrap="nowrap" py="xs" style={{ gap: 12 }}>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={700} fz="sm" c="var(--mantine-color-text)">Name</Text>
                    <Text fz="sm" fw={500} c="var(--mantine-color-dimmed)">{user?.first_name} {user?.last_name}</Text>
                  </Stack>
                  <Button variant="filled" color="orange" size="sm" radius="sm" w={100} h={32}
                    onClick={() => setEditOpened(true)}>
                    Edit
                  </Button>
                </Group>

                <Group justify="space-between" align="center" wrap="nowrap" py="xs" style={{ gap: 12 }}>
                  <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={700} fz="sm" c="var(--mantine-color-text)">Email</Text>
                    <Text
                      fz="sm"
                      fw={500}
                      c="var(--mantine-color-dimmed)"
                      truncate
                      title={revealEmail ? user?.email : maskedEmail(user?.email || '')}
                    >
                      {revealEmail ? user?.email : maskedEmail(user?.email || '')}
                    </Text>
                  </Stack>
                  <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Anchor
                      component="button"
                      type="button"
                      fz="sm"
                      fw={600}
                      c="var(--mantine-color-orange-filled)"
                      onClick={() => setRevealEmail((v) => !v)}
                    >
                      {revealEmail ? 'Hide' : 'Reveal'}
                    </Anchor>
                    <Button variant="filled" color="orange" size="sm" fw={600} radius="sm" w={100} h={32}
                      onClick={() => setEmailOpened(true)}>
                      Change
                    </Button>
                  </Group>
                </Group>

                <Group justify="space-between" align="center" wrap="nowrap" py="xs" style={{ gap: 12 }}>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={700} fz="sm" c="var(--mantine-color-text)">Password</Text>
                    <Text fz="sm" fw={500} c="var(--mantine-color-dimmed)">••••••••</Text>
                  </Stack>
                  <Button variant="filled" color="orange" size="sm" radius="sm" w={100} h={32}
                    onClick={() => setPasswordOpened(true)}>
                    Change
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Paper>

          {/* Preferences */}
          <Paper withBorder radius={15} p="xl" pos="relative">
            <LoadingOverlay visible={updating} overlayProps={{ blur: 1 }} />
            <Title order={4} fw={700}>PREFERENCES</Title>
            <Text size="xs" c="dimmed" mb="xl">
              Customize your notification and display settings.
            </Text>

            <Stack gap="lg">
              <Group justify="space-between" wrap="nowrap" style={{ gap: 12 }}>
                <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                  <Box bg="var(--mantine-color-orange-light)" p={10} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell width={20} height={20} color={ORANGE} fill={ORANGE} />
                  </Box>
                  <Stack gap={0}>
                    <Text size="sm" fw={700}>Receive Notifications</Text>
                    <Text size="xs" c="dimmed">Get alerts about important updates</Text>
                  </Stack>
                </Group>
                <Switch
                  color="orange"
                  size="md"
                  checked={user?.receive_notifications}
                  onChange={(e) => handleNotificationToggle(e.currentTarget.checked)}
                />
              </Group>

              <Group justify="space-between" wrap="nowrap" style={{ gap: 12 }}>
                <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                  <Box bg="var(--mantine-color-orange-light)" p={8} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckShield width={20} height={20} color={user?.two_factor_enabled ? ORANGE : 'gray'} />
                  </Box>
                  <Stack gap={0}>
                    <Text size="sm" fw={700}>Two-Factor Authentication</Text>
                    <Text size="xs" c="dimmed">
                      {user?.two_factor_enabled ? 'Extra layer of security is active' : 'Add extra security to your account'}
                    </Text>
                  </Stack>
                </Group>
                <Switch
                  color="orange"
                  size="md"
                  checked={user?.two_factor_enabled || false}
                  onChange={() => {
                    setTwoFAIntent(user?.two_factor_enabled ? 'disable' : 'enable');
                    setTwoFAModalOpened(true);
                  }}
                />
              </Group>

              <Group justify="space-between" wrap="nowrap" style={{ gap: 12 }}>
                <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                  <Box bg="var(--mantine-color-orange-light)" p={8} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {computedColorScheme === 'dark' ? <Moon width={20} height={20} color={ORANGE} /> : <Sun width={20} height={20} color={ORANGE} />}
                  </Box>
                  <Stack gap={0}>
                    <Text size="sm" fw={700}>Dark Mode</Text>
                    <Text size="xs" c="dimmed">Switch between dark and light theme</Text>
                  </Stack>
                </Group>
                <Switch
                  color="orange"
                  size="md"
                  checked={computedColorScheme === 'dark'}
                  onChange={(e) => toggleTheme(e.currentTarget.checked)}
                />
              </Group>

              <Divider />

              <Group justify="space-between" wrap="nowrap" style={{ gap: 12 }}>
                <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                  <Box bg="var(--mantine-color-orange-light)" p={8} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GlobeAlt width={20} height={20} color={ORANGE} />
                  </Box>
                  <Stack gap={0}>
                    <Text size="sm" fw={700}>Language</Text>
                    <Text size="xs" c="dimmed">Select your preferred language</Text>
                  </Stack>
                </Group>
                <Select
                  size="sm"
                  w={140}
                  allowDeselect={false}
                  value={user?.preferred_language || 'English'}
                  onChange={(val) => handleUpdate('preferred_language', val)}
                  data={['English', 'Filipino']}
                />
              </Group>
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

      <NotificationPermissionModal
        opened={notifConsentOpened}
        onClose={() => setNotifConsentOpened(false)}
        onConfirm={handleNotificationConfirm}
        confirming={notifConfirming}
      />

      <VerificationCodeModal
        opened={twoFAModalOpened}
        onClose={() => setTwoFAModalOpened(false)}
        email={user?.email || ''}
        onSendCode={async () => { await authAPI.send2FACode(); }}
        onVerify={async (code) => { await authAPI.verify2FACode(code); }}
        onVerified={fetchProfile}
        title="Two-Factor Authentication"
        subtitle={twoFAIntent === 'disable' ? '2FA has been disabled.' : '2FA has been enabled. You will need to verify your identity on future logins.'}
        verifyLabel={twoFAIntent === 'disable' ? 'Disable 2FA' : 'Enable 2FA'}
      />

      <TermsAndConditionsModal opened={termsOpened} onClose={() => setTermsOpened(false)} />
      <PrivacyPolicyModal opened={privacyOpened} onClose={() => setPrivacyOpened(false)} />
    </Box>
  );
}
