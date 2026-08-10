import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Text, Title, Avatar, Divider,
  Stack, Group, TextInput, PasswordInput, Button, Switch,
  Select, ActionIcon, Box, LoadingOverlay, rem, FileButton, Tooltip
} from '@mantine/core';
import { ChevronLeft, User as UserIcon, Mail, Lock, Bell, ShieldCheck, Languages, Camera, Key, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../services/api';

// --- Updated PageHeader Component ---
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void; // New prop for back action
}

export function PageHeader({ title, subtitle, actions, onBack }: PageHeaderProps) {
  return (
    <Box mb="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
        <Stack gap={4}>
          <Group gap="xs" align="center">
            {onBack && (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={onBack}
                size="lg"
                style={{ marginLeft: rem(-8) }} // Tighten spacing to title
              >
                <ChevronLeft size={24} />
              </ActionIcon>
            )}
            <Title order={2} style={{ textTransform: 'uppercase', fontSize: '1.25rem', fontWeight: 700 }}>
              {title}
            </Title>
          </Group>
          {subtitle && (
            <Text size="sm" c="dimmed" fw={400} style={{ paddingLeft: onBack ? rem(32) : 0 }}>
              {subtitle}
            </Text>
          )}
        </Stack>
        {actions && <Box pt={4}>{actions}</Box>}
      </Group>
      <Divider color="#e9ecef" />
    </Box>
  );
}

const translations = {
  English: {
    personal: "PERSONAL INFORMATION",
    personalSub: "Manage registrar attributes, contact emails, and secure account access settings",
    pref: "Preferences",
    prefSub: "Verifies user credentials for secure system access.",
    lang: "Language",
    save: "SAVE CHANGES",
    edit: "EDIT PROFILE",
    cancel: "CANCEL",
    passwordLabel: "PASSWORD",
    changePassBtn: "CHANGE PASSWORD",
    currentPass: "CURRENT PASSWORD",
    newPass: "NEW PASSWORD",
    confirmPass: "CONFIRM NEW PASSWORD"
  },
  Filipino: {
    personal: "PERSONAL NA IMPORMASYON",
    personalSub: "Pamahalaan ang iyong mga detalye at seguridad ng account",
    pref: "Mga Kagustuhan",
    prefSub: "Sinisiguro ang pagkakakilanlan para sa ligtas na pag-access.",
    lang: "Wika",
    save: "I-SAVE ANG PAGBABAGO",
    edit: "I-EDIT ANG PROFILE",
    cancel: "IKANSELA",
    passwordLabel: "PASSWORD",
    changePassBtn: "PALITAN ANG PASSWORD",
    currentPass: "KASALUKUYANG PASSWORD",
    newPass: "BAGONG PASSWORD",
    confirmPass: "I-KUMPIRMA ANG BAGONG PASSWORD"
  }
};

export default function ProfilePage() {
  const orangeColor = '#FF5C00';
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const [passwords, setPasswords] = useState({
    current: '',
    password: '',
    confirm: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      setUserData(res.data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setPasswords({ current: '', password: '', confirm: '' });
    fetchProfile(); // Re-fetch to undo any local text changes
  };

  const handleSave = async () => {
    if (isChangingPassword) {
      if (!passwords.current) {
        alert("Authorization required: Please enter current password.");
        return;
      }
      if (passwords.password.length < 8) {
        alert("New password must be at least 8 characters.");
        return;
      }
      if (passwords.password !== passwords.confirm) {
        alert("New passwords do not match!");
        return;
      }
    }

    setLoading(true);
    try {
      if (isChangingPassword) {
        await authAPI.verifyPassword(passwords.current);
      }

      const payload: any = {
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        email: userData.email,
      };

      if (isChangingPassword) {
        payload.password = passwords.password;
      }

      const res = await authAPI.updateProfile(payload);

      setUserData(res.data);
      setPasswords({ current: '', password: '', confirm: '' });
      setIsChangingPassword(false);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Update failed", err);
      const errorMsg = err.response?.data?.password?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Update failed. Check your current password.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const res = await authAPI.updateProfile(formData);
      setUserData((prev: any) => ({ ...prev, profile_picture: res.data.profile_picture }));
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload image.");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (field: string, value: any) => {
    try {
      const res = await authAPI.updateProfile({ [field]: value });
      setUserData(res.data);
    } catch (err) {
      console.error("Preference update failed", err);
    }
  };

  if (!userData) return <LoadingOverlay visible />;

  const t = translations[userData.preferred_language as 'English' | 'Filipino'] || translations.English;

  const   inputStyles = {
    label: { fontSize: rem(10), fontWeight: 700, marginBottom: rem(4), color: '#868e96', textTransform: 'uppercase' as const },
    input: {
      color: orangeColor,
      fontWeight: 600,
      border: isEditing ? undefined : '1px solid #e9ecef',
      backgroundColor: isEditing ? '#fff' : '#fcfcfc',
      cursor: isEditing ? 'text' : 'default',
      opacity: 1
    }
  };

  return (
    <Container size="lg" py="xl" bg="#fcfcfc" style={{ minHeight: '100vh', position: 'relative' }}>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      <PageHeader
        title="PROFILE"
        subtitle="Manage your personal details and how other see you."
        onBack={() => window.history.back()}
      />

      <Grid gutter="xl" mt="lg">
        <Grid.Col span={{ base: 12, md: 3.5 }}>
          <Paper withBorder radius="md" p="xl" bg="white">
            <Stack align="center" gap="xs">
              <Box style={{ position: 'relative' }}>
                <Avatar src={userData.profile_picture} size={160} radius={100} style={{ border: `4px solid ${orangeColor}`,  }} />
                <FileButton onChange={handleImageUpload} accept="image/png,image/jpeg">
                  {(props) => (
                    <Tooltip label="Change Profile Picture">
                      <ActionIcon {...props} variant="filled" color="orange" radius="xl" size="lg" style={{ position: 'absolute', bottom: 5, right: 5, border: '3px solid white' }}>
                        <Camera size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </FileButton>
              </Box>
              <Title order={4} mt="md" c={orangeColor} style={{ letterSpacing: '0.5px' }}>
                {userData.first_name} {userData.last_name}
              </Title>
              <Group gap={5}>
                <CheckCircle2 size={14} color="#40C057" />
                <Text size="sm" c="dimmed" fw={500}>{userData.role_display}</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8.5 }}>
          <Stack gap="xl">
            <Paper withBorder radius="md" p="xl" bg="white">
              <Group justify="space-between" align="flex-start" mb="xl">
                <Stack gap={2}>
                  <Title order={5} style={{ fontWeight: 700 }}>{t.personal}</Title>
                  <Text size="xs" c="dimmed">{t.personalSub}</Text>
                </Stack>
                <Group gap="xs">
                  {isEditing && (
                    <Button variant="subtle" color="gray" size="sm" onClick={handleCancel}>
                      {t.cancel}
                    </Button>
                  )}
                  <Button bg={orangeColor} radius="md" onClick={isEditing ? handleSave : () => setIsEditing(true)}>
                    {isEditing ? t.save : t.edit}
                  </Button>
                </Group>
              </Group>

              <Stack gap="md">
                <Grid grow>
                  <Grid.Col span={6}>
                    <TextInput label="FIRST NAME" readOnly={!isEditing} value={userData.first_name || ''} onChange={(e) => setUserData({ ...userData, first_name: e.target.value })} leftSection={<UserIcon size={16} color={orangeColor} />} styles={inputStyles} />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput label="LAST NAME" readOnly={!isEditing} value={userData.last_name || ''} onChange={(e) => setUserData({ ...userData, last_name: e.target.value })} leftSection={<UserIcon size={16} color={orangeColor} />} styles={inputStyles} />
                  </Grid.Col>
                </Grid>

                <Grid grow>
                  <Grid.Col span={6}>
                    <TextInput label="USERNAME" readOnly={!isEditing} value={userData.username || ''} onChange={(e) => setUserData({ ...userData, username: e.target.value })} leftSection={<UserIcon size={16} color={orangeColor} />} styles={inputStyles} />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput label="EMAIL" readOnly={!isEditing} value={userData.email || ''} onChange={(e) => setUserData({ ...userData, email: e.target.value })} leftSection={<Mail size={16} color={orangeColor} />} styles={inputStyles} />
                  </Grid.Col>
                </Grid>

                <Box>
                  <Group align="center" mb={4}>
                    <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>{t.passwordLabel}:</Text>
                    {isEditing && (
                      <Button variant="subtle" color="orange" size="xs" p={0} onClick={() => setIsChangingPassword(!isChangingPassword)}>
                        {t.changePassBtn}
                      </Button>
                    )}
                    {!isEditing && <Text fw={600} c={orangeColor}>••••••••</Text>}
                  </Group>
                </Box>

                {isEditing && isChangingPassword && (
                  <Stack gap="md" mt="xs" p="md" style={{ border: '1px dashed #FF5C00', borderRadius: '8px' }}>
                    <PasswordInput label={t.currentPass} required placeholder="Enter current password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} leftSection={<Lock size={16} color={orangeColor} />} styles={inputStyles} />
                    <Grid grow>
                      <Grid.Col span={6}>
                        <PasswordInput label={t.newPass} value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} leftSection={<Key size={16} color={orangeColor} />} styles={inputStyles} />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <PasswordInput label={t.confirmPass} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} leftSection={<Key size={16} color={orangeColor} />} styles={inputStyles} />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="xl" bg="white">
              <Title order={5} style={{ fontWeight: 700 }} mb="xl">{t.pref}</Title>
              <Stack gap="lg">
                <Group justify="space-between">
                  <Group gap="md">
                    <Bell size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>Receive Notifications</Text>
                      <Text size="xs" c="dimmed">Get alerts about important updates</Text>
                    </Stack>
                  </Group>
                  <Switch color="orange" checked={userData.receive_notifications} onChange={(e) => updatePreference('receive_notifications', e.currentTarget.checked)} />
                </Group>
                <Group justify="space-between">
                  <Group gap="md">
                    <ShieldCheck size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>Two-Factor Authentication</Text>
                      <Text size="xs" c="dimmed">Active only for new login devices</Text>
                    </Stack>
                  </Group>
                  <Switch color="orange" checked={userData.two_factor_enabled} onChange={(e) => updatePreference('two_factor_enabled', e.currentTarget.checked)} />
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Group gap="md">
                    <Languages size={20} color={orangeColor} />
                    <Text size="sm" fw={600}>{t.lang}</Text>
                  </Group>
                  <Select data={['English', 'Filipino']} value={userData.preferred_language} onChange={(val) => updatePreference('preferred_language', val)} w={150} />
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}