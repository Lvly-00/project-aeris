import { useState, useEffect, useRef } from 'react';
import {
  Container, Grid, Paper, Text, Title, Avatar, Divider,
  Stack, Group, Switch, Box, LoadingOverlay, rem, FileButton, Badge, Button,
} from '@mantine/core';
import {
  ChevronLeft, Bell, ShieldCheck, Languages, Camera, EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';
import { User } from '../../shared/types';
import EditProfileModal from '../../shared/components/profile/EditProfileModal';
import ChangePasswordModal from '../../shared/components/profile/ChangePasswordModal';
import ChangeEmailModal from '../../shared/components/profile/ChangeEmailModal';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';

const ORANGE = '#FF6B00';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const fileResetRef = useRef<() => void | null>(null);

  // Modals
  const [editOpened, setEditOpened] = useState(false);
  const [passwordOpened, setPasswordOpened] = useState(false);
  const [emailOpened, setEmailOpened] = useState(false);
  const [twoFAModalOpened, setTwoFAModalOpened] = useState(false);

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
      setUserData(res.data);
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
            <ChevronLeft size={32} strokeWidth={2.5} color="var(--mantine-color-dimmed)" />
          </Box>
          <Stack gap={0}>
            <Title order={2} style={{ fontSize: rem(22), fontWeight: 900, letterSpacing: '-0.5px' }}>
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
          <Paper withBorder radius={16} p={40} style={{ height: '100%' }}>
            <Stack align="center" gap="xs">
              <Box style={{ position: 'relative' }}>
                <Avatar
                  src={userData.profile_picture}
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
                      <Camera size={18} color="white" />
                    </Box>
                  )}
                </FileButton>
              </Box>

              <Title order={3} c="orange" fw={900} mt="md" ta="center">
                {userData.first_name} {userData.last_name}
              </Title>
              <Text c="dimmed" fz="sm" fw={600}>{userData.role}</Text>

              <Divider w="100%" my="xl" />

              <Box w="100%">
                <Text fz={10} fw={800} c="dimmed" mb={4}>ROLE</Text>
                <Group gap="sm">
                  <Badge variant="light" color="orange" size="lg" tt="uppercase" fw={700}>
                    {userData.role || 'Staff'}
                  </Badge>
                </Group>
              </Box>

              <Box w="100%" mt="sm">
                <Text fz={10} fw={800} c="dimmed" mb={4}>STATUS</Text>
                <Badge variant="outline" color={userData.is_active ? 'green' : 'red'} size="sm">
                  {userData.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Box>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* MAIN CONTENT */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="xl">
            {/* PERSONAL INFORMATION */}
            <Paper withBorder radius={16} p={30}>
              <Stack gap={0}>
                <Title order={4} fw={800}>PERSONAL INFORMATION</Title>
                <Text size="xs" c="dimmed" mb="xl">
                  Manage registrar attributes, contact emails, and secure account access settings
                </Text>

                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="nowrap" py="xs">
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="dark.4">Account Name</Text>
                      <Text fz="sm" fw={500} c="gray.7">{userData.first_name} {userData.last_name}</Text>
                    </Stack>
                    <Button variant="filled" color="orange" size="xs" radius="sm" px="xl" h={28}
                      onClick={() => setEditOpened(true)}>
                      Edit
                    </Button>
                  </Group>

                  <Group justify="space-between" align="center" wrap="nowrap" py="xs">
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="dark.4">Email</Text>
                      <Group gap="xs">
                        <Text fz="sm" fw={500} c="gray.7">{maskedEmail(userData.email)}</Text>
                        <EyeOff size={14} color="gray" />
                      </Group>
                    </Stack>
                    <Button variant="filled" color="orange" size="xs" radius="sm" px="xl" h={28}
                      onClick={() => setEmailOpened(true)}>
                      Change
                    </Button>
                  </Group>

                  <Group justify="space-between" align="center" wrap="nowrap" py="xs">
                    <Stack gap={2}>
                      <Text fw={700} fz="sm" c="dark.4">Password</Text>
                      <Text fz="sm" fw={500} c="gray.7">••••••••</Text>
                    </Stack>
                    <Button variant="filled" color="orange" size="xs" radius="sm" px="xl" h={28}
                      onClick={() => setPasswordOpened(true)}>
                      Change
                    </Button>
                  </Group>
                </Stack>
              </Stack>
            </Paper>

            {/* PREFERENCES */}
            <Paper withBorder radius={16} p={30}>
              <LoadingOverlay visible={updating} overlayProps={{ blur: 1 }} />
              <Title order={4} fw={800}>Preferences</Title>
              <Text size="xs" c="dimmed" mb="xl">
                Customize your notification and display settings.
              </Text>

              <Stack gap="lg">
                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="#FFF0E6" p={8} style={{ borderRadius: 8 }}>
                      <Bell size={20} color={ORANGE} fill={ORANGE} />
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
                    onChange={(e) => handlePreferenceUpdate('receive_notifications', e.currentTarget.checked)}
                  />
                </Group>

                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="#FFF0E6" p={8} style={{ borderRadius: 8 }}>
                      <ShieldCheck size={20} color={userData.two_factor_enabled ? ORANGE : 'gray'} />
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
                    onChange={() => setTwoFAModalOpened(true)}
                  />
                </Group>

                <Divider />

                <Group justify="space-between">
                  <Group gap="md">
                    <Box bg="#FFF0E6" p={8} style={{ borderRadius: 8 }}>
                      <Languages size={20} color={ORANGE} />
                    </Box>
                    <Stack gap={0}>
                      <Text size="sm" fw={700}>Language</Text>
                      <Text size="xs" c="dimmed">Select your preferred language</Text>
                    </Stack>
                  </Group>
                  <Box w={220}>
                    <select
                      value={userData.preferred_language}
                      onChange={(e) => handlePreferenceUpdate('preferred_language', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--mantine-color-default-border)',
                        backgroundColor: 'var(--mantine-color-body)',
                        color: 'var(--mantine-color-text)',
                        fontSize: 14,
                      }}
                    >
                      <option value="English">English</option>
                      <option value="Filipino">Filipino</option>
                    </select>
                  </Box>
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
        onUpdated={(updated) => setUserData((prev) => prev ? { ...prev, ...updated } : prev)}
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
        subtitle={userData.two_factor_enabled ? '2FA has been disabled.' : '2FA has been enabled. You will need to verify your identity on future logins.'}
        verifyLabel={userData.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
      />
    </Container>
  );
}
