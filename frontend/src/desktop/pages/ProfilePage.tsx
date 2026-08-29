import { useState, useEffect, useRef } from 'react';
import {
  Container, Grid, Paper, Text, Title, Avatar, Divider,
  Stack, Group, Switch, Box, LoadingOverlay, rem, FileButton, Badge, Button, Anchor,
  Menu, UnstyledButton,
} from '@mantine/core';
import { Bell, Camera, Check, CheckShield, ChevronDown, ChevronLeft, GlobeAlt } from '@boxicons/react';
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
  const { user: authUser, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const fileResetRef = useRef<() => void | null>(null);

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

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      setUserData(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceUpdate = async (field: string, value: any) => {
    setUpdating(true);
    try {
      const res = await authAPI.updateProfile({ [field]: value });
      setUserData(res.data);
      setUser(res.data);
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
    handlePreferenceUpdate('receive_notifications', false);
  };

  const handleNotificationConfirm = async () => {
    setNotifConfirming(true);
    try {
      const res = await authAPI.updateProfile({ receive_notifications: true });
      setUserData(res.data);
      setUser(res.data);
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
      setUserData(res.data);
      setUser(res.data);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUpdating(false);
    }
  };

  const maskedEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  };

  if (!userData) return <LoadingOverlay visible />;

  return (
    <Container size="xl" py="xl" style={{ backgroundColor: 'var(--mantine-color-body)', minHeight: '100vh' }}>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />

      {/* PageHeader */}
      <Box mb="xl">
        <Group gap="xs" align="center">
          <Box
            component="button"
            onClick={() => window.history.back()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronLeft width={32} height={32} strokeWidth={2.5} color="var(--mantine-color-dimmed)" />
          </Box>
          <Stack gap={0}>
            <Title order={2} style={{ fontSize: rem(22), fontWeight: 700, letterSpacing: '-0.5px' }}>
              PROFILE
            </Title>
            <Text size="sm" c="dimmed" fw={500}>
              Manage your personal details and how others see you.
            </Text>
          </Stack>
        </Group>
      </Box>

      <Grid gutter={30}>
        {/* SIDEBAR */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Paper withBorder radius={15} p={40} style={{ height: '100%' }}>
            <Stack align="center" gap="xs">
              <Box style={{ position: 'relative' }}>
                <Avatar
                  src={resolveMediaUrl(userData.profile_picture)}
                  size={180}
                  radius={100}
                  style={{ border: `3px solid ${ORANGE}` }}
                />
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
                        bottom: 8,
                        right: 8,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: ORANGE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '3px solid white',
                      }}
                    >
                      <Camera width={18} height={18} color="white" />
                    </Box>
                  )}
                </FileButton>
              </Box>

              <Title order={3} c="orange" fw={700} mt="md" ta="center">
                {userData.first_name} {userData.last_name}
              </Title>
              <Text c="dimmed" fz="sm" fw={600}>{userData.role}</Text>

              <Divider w="100%" my="xl" />

              <Button
                variant="subtle"
                color="gray"
                size="sm"
                fw={600}
                w="100%"
                onClick={() => setTermsOpened(true)}
                styles={{ label: { justifyContent: 'flex-start' } }}
              >
                Terms and Conditions
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
        </Grid.Col>

        {/* MAIN CONTENT */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="xl">
            {/* PERSONAL INFORMATION */}
            <Paper withBorder radius={15} p={30}>
              <Stack gap={0}>
                <Title order={4} fw={700}>PERSONAL INFORMATION</Title>
                <Text size="xs" c="dimmed" mb="xl">
                  Manage registrar attributes, contact emails, and secure account access settings
                </Text>

                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="wrap" py="xs" style={{ rowGap: 12 }}>
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="var(--mantine-color-text)">Name</Text>
                      <Text fz="sm" fw={500} c="var(--mantine-color-dimmed)">{userData.first_name} {userData.last_name}</Text>
                    </Stack>
                    <Button variant="filled" color="orange" size='sm' radius="sm" w={100} h={32}
                      onClick={() => setEditOpened(true)}>
                      Edit
                    </Button>
                  </Group>

                  <Group justify="space-between" align="center" wrap="wrap" py="xs" style={{ rowGap: 12 }}>
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="var(--mantine-color-text)">Email</Text>
                      <Text fz="sm" fw={500} c="var(--mantine-color-dimmed)">
                        {revealEmail ? userData.email : maskedEmail(userData.email)}
                      </Text>
                    </Stack>
                    <Group gap="md" wrap="nowrap">
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
                      <Button variant="filled" color="orange" size='sm'  fw={600} radius="sm" w={100} h={32}
                        onClick={() => setEmailOpened(true)}>
                        Change
                      </Button>
                    </Group>
                  </Group>

                  <Group justify="space-between" align="center" wrap="wrap" py="xs" style={{ rowGap: 12 }}>
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="var(--mantine-color-text)">Password</Text>
                      <Text fz="sm" fw={500} c="var(--mantine-color-dimmed)">••••••••</Text>
                    </Stack>
                    <Button variant="filled" color="orange" size='sm' radius="sm" w={100} h={32}
                      onClick={() => setPasswordOpened(true)}>
                      Change
                    </Button>
                  </Group>
                </Stack>
              </Stack>
            </Paper>

            {/* PREFERENCES */}
            <Paper withBorder radius={15} p={30}>
              <LoadingOverlay visible={updating} overlayProps={{ blur: 1 }} />
              <Title order={4} fw={700}>PREFERENCES</Title>
              <Text size="xs" c="dimmed" mb="xl">
                Customize your notification and display settings.
              </Text>

              <Stack gap="lg">
                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="var(--mantine-color-orange-light)" p={10}  style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    checked={userData.receive_notifications}
                    onChange={(e) => handleNotificationToggle(e.currentTarget.checked)}
                  />
                </Group>

                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="var(--mantine-color-orange-light)" p={8} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckShield width={20} height={20} color={userData.two_factor_enabled ? ORANGE : 'gray'} />
                    </Box>
                    <Stack gap={0}>
                      <Text size="sm" fw={700}>Two-Factor Authentication</Text>
                      <Text size="xs" c="dimmed">
                        {userData.two_factor_enabled ? 'Extra layer of security is active' : 'Add extra security to your account'}
                      </Text>
                    </Stack>
                  </Group>
                  <Switch
                    color="orange"
                    size="md"
                    checked={userData.two_factor_enabled}
                    onChange={() => {
                      setTwoFAIntent(userData.two_factor_enabled ? 'disable' : 'enable');
                      setTwoFAModalOpened(true);
                    }}
                  />
                </Group>

                <Divider />

                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="var(--mantine-color-orange-light)" p={8} style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GlobeAlt width={20} height={20} color={ORANGE} />
                    </Box>
                    <Stack gap={0}>
                      <Text size="sm" fw={700}>Language</Text>
                      <Text size="xs" c="dimmed">Select your preferred language</Text>
                    </Stack>
                  </Group>
                  <Menu position="bottom-end" withArrow width={220}>
                    <Menu.Target>
                      <UnstyledButton
                        style={{
                          width: '100%',
                          maxWidth: 220,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--mantine-color-default-border)',
                          backgroundColor: 'var(--mantine-color-body)',
                          color: 'var(--mantine-color-text)',
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <Text fz="sm" fw={500}>{userData.preferred_language}</Text>
                        <ChevronDown width={16} height={16} color="var(--mantine-color-dimmed)" />
                      </UnstyledButton>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {['English', 'Filipino'].map((lang) => (
                        <Menu.Item
                          key={lang}
                          fz="sm"
                          onClick={() => handlePreferenceUpdate('preferred_language', lang)}
                          rightSection={
                            userData.preferred_language === lang ? (
                              <Check width={16} height={16} color="var(--mantine-color-orange-filled)" />
                            ) : null
                          }
                        >
                          {lang}
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Modals */}
      <EditProfileModal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        user={{ first_name: userData.first_name, last_name: userData.last_name }}
        onUpdated={(updated) => {
          setUserData((prev) => prev ? { ...prev, ...updated } : prev);
          setUser((prev) => prev ? { ...prev, ...updated } : prev);
        }}
      />

      <ChangePasswordModal
        opened={passwordOpened}
        onClose={() => setPasswordOpened(false)}
      />

      <ChangeEmailModal
        opened={emailOpened}
        onClose={() => setEmailOpened(false)}
        currentEmail={userData.email}
        onEmailChanged={fetchProfile}
      />

      <VerificationCodeModal
        opened={twoFAModalOpened}
        onClose={() => setTwoFAModalOpened(false)}
        email={userData.email}
        onSendCode={async () => { await authAPI.send2FACode(); }}
        onVerify={async (code) => { await authAPI.verify2FACode(code); }}
        onVerified={fetchProfile}
        title="Two-Factor Authentication"
        subtitle={twoFAIntent === 'disable' ? '2FA has been disabled.' : '2FA has been enabled. You will need to verify your identity on future logins.'}
        verifyLabel={twoFAIntent === 'disable' ? 'Disable 2FA' : 'Enable 2FA'}
      />

      <NotificationPermissionModal
        opened={notifConsentOpened}
        onClose={() => setNotifConsentOpened(false)}
        onConfirm={handleNotificationConfirm}
        confirming={notifConfirming}
      />

      <TermsAndConditionsModal opened={termsOpened} onClose={() => setTermsOpened(false)} />
      <PrivacyPolicyModal opened={privacyOpened} onClose={() => setPrivacyOpened(false)} />
    </Container>
  );
}
