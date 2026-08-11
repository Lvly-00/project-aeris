import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Avatar,
  Text,
  Stack,
  Group,
  ThemeIcon,
  Switch,
  Select,
  Button,
  UnstyledButton,
  Box,
  LoadingOverlay,
} from '@mantine/core';
import { ChevronRight, User, Settings, Globe } from 'lucide-react';
import { authAPI } from '../../shared/services/api';
import { useAuth } from '../../shared/hooks/useAuth';

interface ProfilePageProps {
  hideHeader?: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { logout } = useAuth();

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

  const onLogout = async () => {
    await logout();
  };

  if (loading) return <LoadingOverlay visible />;

  return (
    <Box bg="white" style={{ minHeight: '100vh' }}>
      <Container size="xs" py="xl">
        <Stack gap="md">
          <Text ta="center" fw={700} fz="lg">
            Profile
          </Text>

          <Paper
            p="xl"
            radius="md"
            style={{
              backgroundColor: '#FFF9F5',
              border: '1px solid #FFE8D9',
            }}
          >
            <Stack align="center" gap="xs">
              <Box
                p={4}
                style={{
                  border: '2px solid #FF5A00',
                  borderRadius: '100%',
                }}
              >
                <Avatar
                  src={user?.profile_picture}
                  size={120}
                  radius={120}
                />
              </Box>

              <Text fw={800} fz="24px">
                {user?.first_name} {user?.last_name}
              </Text>

              <Text fw={700} fz="md" c="#FF5A00" tt="uppercase">
                {user?.role || 'Staff'}
              </Text>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <UnstyledButton w="100%">
              <Group justify="space-between">
                <Group>
                  <ThemeIcon
                    variant="light"
                    color="orange.1"
                    size="xl"
                  >
                    <User color="#FF5A00" />
                  </ThemeIcon>

                  <Text fw={700} fz="sm">
                    Account Settings
                  </Text>
                </Group>

                <ChevronRight size={20} color="#FF5A00" />
              </Group>
            </UnstyledButton>
          </Paper>

          <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay
              visible={updating}
              overlayProps={{ blur: 1 }}
            />

            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon color="#FF5A00">
                  <Settings size={18} />
                </ThemeIcon>

                <Text fw={700} fz="sm">
                  Preferences
                </Text>
              </Group>

              <Group justify="space-between">
                <Box>
                  <Text fw={700} fz="sm">
                    Receive Notifications
                  </Text>

                  <Text fz="xs" c="dimmed">
                    Important security alerts
                  </Text>
                </Box>

                <Switch
                  checked={user?.receive_notifications}
                  onChange={(e) =>
                    handleUpdate(
                      'receive_notifications',
                      e.currentTarget.checked
                    )
                  }
                  color="#FF5A00"
                />
              </Group>

              <Box>
                <Text fw={700} fz="xs" c="dimmed" mb={5}>
                  Language
                </Text>

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
            color="#FF5A00"
            size="lg"
            onClick={onLogout}
          >
            LOG OUT
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
