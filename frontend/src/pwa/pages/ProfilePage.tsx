import React, { useEffect, useState } from 'react';
import {
  Container, Paper, Avatar, Text, Stack, Group, ThemeIcon, Switch,
  Select, Button, UnstyledButton, Box, LoadingOverlay, useMantineColorScheme, useComputedColorScheme
} from '@mantine/core';
import { ChevronRight, User, Settings, Globe, Moon, Sun } from 'lucide-react';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { logout } = useAuth();

  // Theme logic
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  useEffect(() => {
    authAPI
      .getProfile()
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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

  const toggleTheme = (checked: boolean) => {
    setColorScheme(checked ? 'dark' : 'light');
  };

  if (loading) return <LoadingOverlay visible />;

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Container size="xs" py="xl">
        <Stack gap="md">
          <Text ta="center" fw={700} fz="lg">
            Profile
          </Text>

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
              <Box p={4} style={{ border: '2px solid var(--mantine-color-orange-filled)', borderRadius: '100%' }}>
                <Avatar src={user?.profile_picture} size={120} radius={120} />
              </Box>

              <Text fw={700} fz="24px">
                {user?.first_name} {user?.last_name}
              </Text>

              <Text fw={600} fz="md" c="orange" tt="uppercase">
                {user?.role || 'Staff'}
              </Text>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
            <UnstyledButton w="100%">
              <Group justify="space-between">
                <Group>
                  <ThemeIcon variant="light" color="orange" size="xl">
                    <User size={20} />
                  </ThemeIcon>
                  <Text fw={700} fz="sm">Account Settings</Text>
                </Group>
                <ChevronRight size={20} color="var(--mantine-color-orange-filled)" />
              </Group>
            </UnstyledButton>
          </Paper>

          <Paper withBorder p="md" radius="md" pos="relative" bg="var(--mantine-color-body)">
            <LoadingOverlay visible={updating} overlayProps={{ blur: 1 }} />
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon color="orange" variant="light">
                  <Settings size={18} />
                </ThemeIcon>
                <Text fw={700} fz="sm">Preferences</Text>
              </Group>

              {/* Receive Notifications Toggle */}
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

              {/* NEW: Theme Toggle Switch */}
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

              <Box>
                <Text fw={700} fz="xs" c="dimmed" mb={5}>Language</Text>
                <Select
                  leftSection={<Globe size={16} />}
                  value={user?.language || 'English'}
                  onChange={(val) => handleUpdate('language', val)}
                  data={['English', 'Tagalog']}
                />
              </Box>
            </Stack>
          </Paper>

          <Button
            fullWidth
            color="orange"
            size="lg"
            onClick={logout}
          >
            LOG OUT
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}