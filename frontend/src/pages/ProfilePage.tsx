import React from 'react';
import {
  Container,
  Grid,
  Paper,
  Text,
  Title,
  Avatar,
  Divider,
  Stack,
  Group,
  TextInput,
  PasswordInput,
  Button,
  Switch,
  Select,
  ActionIcon,
  rem,
} from '@mantine/core';
import {
  ChevronLeft,
  User,
  Mail,
  Lock,
  Bell,
  ShieldCheck,
  Languages,
} from 'lucide-react';

export default function ProfilePage() {
  const orangeColor = '#FF5C00';

  return (
    <Container size="lg" py="xl" bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      {/* Header Section */}
      <Group justify="flex-start" mb="md">
        <ActionIcon variant="subtle" color="gray">
          <ChevronLeft size={20} />
        </ActionIcon>
        <Stack gap={0}>
          <Title order={4} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
            Profile
          </Title>
          <Text size="xs" c="dimmed">
            Manage your personal details and how others see you.
          </Text>
        </Stack>
      </Group>

      <Divider mb="xl" />

      <Grid gutter="xl">
        {/* Left Column: Avatar and Role */}
        <Grid.Col span={{ base: 12, md: 3.5 }}>
          <Paper withBorder radius="md" p="xl" style={{ height: '100%' }}>
            <Stack align="center" gap="xs">
              <Avatar
                src="https://i.imgflip.com/4/39t1o9.jpg" // Mike Wazowski placeholder
                size={140}
                radius={100}
                style={{ border: `3px solid ${orangeColor}` }}
              />
              <Title order={4} mt="md" c={orangeColor}>
                ADMIN 01
              </Title>
              <Text size="sm" c="dimmed">
                Barangay Official
              </Text>

              <Divider w="100%" my="lg" />

              <Stack gap={0} w="100%">
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                  Role
                </Text>
                <Text fw={700} c={orangeColor} size="sm">
                  ADMIN
                </Text>
              </Stack>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right Column: Information and Preferences */}
        <Grid.Col span={{ base: 12, md: 8.5 }}>
          <Stack gap="xl">
            {/* Personal Information Card */}
            <Paper withBorder radius="md" p="xl">
              <Group justify="space-between" align="flex-start" mb="lg">
                <Stack gap={0}>
                  <Title order={5} style={{ textTransform: 'uppercase' }}>
                    Personal Information
                  </Title>
                  <Text size="xs" c="dimmed">
                    Manage registrar attributes, contact emails, and secure account access settings.
                  </Text>
                </Stack>
                <Button color="orange" radius="md" size="xs">
                  EDIT PROFILE
                </Button>
              </Group>

              <Stack gap="md">
                <TextInput
                  label="NAME"
                  placeholder="ADMIN"
                  defaultValue="ADMIN"
                  leftSection={<User size={18} color={orangeColor} />}
                  styles={{
                    label: { fontSize: rem(10), fontWeight: 700, marginBottom: 5 },
                    input: { color: orangeColor, fontWeight: 600 },
                  }}
                />

                <Group grow>
                  <TextInput
                    label="EMAIL"
                    placeholder="michaeldcuz@gmail.com"
                    defaultValue="michaeldcuz@gmail.com"
                    leftSection={<Mail size={18} color={orangeColor} />}
                    styles={{
                      label: { fontSize: rem(10), fontWeight: 700, marginBottom: 5 },
                      input: { color: orangeColor, fontWeight: 600 },
                    }}
                  />
                  <PasswordInput
                    label="PASSWORD"
                    defaultValue="password123"
                    leftSection={<Lock size={18} color={orangeColor} />}
                    styles={{
                      label: { fontSize: rem(10), fontWeight: 700, marginBottom: 5 },
                      input: { color: orangeColor },
                    }}
                  />
                </Group>
              </Stack>
            </Paper>

            {/* Preferences Card */}
            <Paper withBorder radius="md" p="xl">
              <Stack gap={0} mb="xl">
                <Title order={5}>Preferences</Title>
                <Text size="xs" c="dimmed">
                  Verifies user credentials for secure system access.
                </Text>
              </Stack>

              <Stack gap="lg">
                {/* Notification Toggle */}
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <Bell size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Receive Notifications</Text>
                      <Text size="xs" c="dimmed">Get alerts about important updates</Text>
                    </Stack>
                  </Group>
                  <Switch color="orange" defaultChecked />
                </Group>

                {/* 2FA Toggle */}
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <ShieldCheck size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Two-Factor Authentication</Text>
                      <Text size="xs" c="dimmed">Add extra security to your account</Text>
                    </Stack>
                  </Group>
                  <Switch color="orange" />
                </Group>

                <Divider />

                {/* Language Select */}
                <Group justify="space-between" align="center">
                  <Group gap="md">
                    <Languages size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Language</Text>
                      <Text size="xs" c="dimmed">Select your preferred language</Text>
                    </Stack>
                  </Group>
                  <Select
                    data={['English', 'Spanish', 'Filipino']}
                    defaultValue="English"
                    size="sm"
                    style={{ width: 200 }}
                  />
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}