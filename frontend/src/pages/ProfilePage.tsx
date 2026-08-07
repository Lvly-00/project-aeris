import React from 'react';
import {
  Container, Grid, Paper, Text, Title, Avatar, Divider,
  Stack, Group, TextInput, PasswordInput, Button, Switch,
  Select, ActionIcon, rem
} from '@mantine/core';
import { ChevronLeft, User, Mail, Lock, Bell, ShieldCheck, Languages, Phone } from 'lucide-react';

// Mock data based on the Django Serializer response
const user = {
  username: "ADMIN 01",
  full_name: "Michael De Cruz",
  email: "michaeldcuz@gmail.com",
  role: "Admin",
  role_display: "Barangay Official",
  phone_number: "09123456789"
};

export default function ProfilePage() {
  const orangeColor = '#FF5C00';

  return (
    <Container size="lg" py="xl" bg="#fcfcfc" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Group justify="flex-start" mb="md">
        <ActionIcon variant="subtle" color="gray"><ChevronLeft size={20} /></ActionIcon>
        <Stack gap={0}>
          <Title order={4} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Profile</Title>
          <Text size="xs" c="dimmed">Manage your personal details and how others see you.</Text>
        </Stack>
      </Group>

      <Divider mb="xl" />

      <Grid gutter="xl">
        {/* Left Column: Profile Summary */}
        <Grid.Col span={{ base: 12, md: 3.5 }}>
          <Paper withBorder radius="md" p="xl">
            <Stack align="center" gap="xs">
              <Avatar
                src="https://i.imgflip.com/4/39t1o9.jpg"
                size={140}
                radius={100}
                style={{ border: `3px solid ${orangeColor}` }}
              />
              <Title order={4} mt="md" c={orangeColor}>
                {user.username}
              </Title>
              <Text size="sm" c="dimmed">{user.role_display}</Text>

              <Divider w="100%" my="lg" />

              <Stack gap={0} w="100%">
                <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>Role</Text>
                <Text fw={700} c={orangeColor} size="sm">{user.role.toUpperCase()}</Text>
              </Stack>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right Column: Forms and Preferences */}
        <Grid.Col span={{ base: 12, md: 8.5 }}>
          <Stack gap="xl">
            {/* Personal Info Card */}
            <Paper withBorder radius="md" p="xl">
              <Group justify="space-between" align="flex-start" mb="lg">
                <Stack gap={2}>
                  <Title order={5} style={{ textTransform: 'uppercase' }}>Personal Information</Title>
                  <Text size="xs" c="dimmed">Manage registrar attributes and account access.</Text>
                </Stack>
                <Button color="orange" radius="md" size="xs">EDIT PROFILE</Button>
              </Group>

              <Stack gap="md">
                <TextInput
                  label="NAME"
                  defaultValue={user.full_name}
                  leftSection={<User size={16} color={orangeColor} />}
                  styles={{ label: { fontSize: 10, fontWeight: 700, marginBottom: 4 }, input: { color: orangeColor, fontWeight: 600 }}}
                />

                <Group grow>
                  <TextInput
                    label="EMAIL"
                    defaultValue={user.email}
                    leftSection={<Mail size={16} color={orangeColor} />}
                    styles={{ label: { fontSize: 10, fontWeight: 700, marginBottom: 4 }, input: { color: orangeColor, fontWeight: 600 }}}
                  />
                  <PasswordInput
                    label="PASSWORD"
                    defaultValue="password123"
                    leftSection={<Lock size={16} color={orangeColor} />}
                    styles={{ label: { fontSize: 10, fontWeight: 700, marginBottom: 4 }}}
                  />
                </Group>
              </Stack>
            </Paper>

            {/* Preferences Card */}
            <Paper withBorder radius="md" p="xl">
              <Stack gap={2} mb="xl">
                <Title order={5}>Preferences</Title>
                <Text size="xs" c="dimmed">Verifies user credentials for secure system access.</Text>
              </Stack>

              <Stack gap="lg">
                <Group justify="space-between">
                  <Group gap="md">
                    <Bell size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Receive Notifications</Text>
                      <Text size="xs" c="dimmed">Get alerts about important updates</Text>
                    </Stack>
                  </Group>
                  <Switch color="orange" defaultChecked />
                </Group>

                <Group justify="space-between">
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

                <Group justify="space-between">
                  <Group gap="md">
                    <Languages size={20} color={orangeColor} />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Language</Text>
                      <Text size="xs" c="dimmed">Select your preferred language</Text>
                    </Stack>
                  </Group>
                  <Select
                    data={['English', 'Filipino']}
                    defaultValue="English"
                    size="sm"
                    w={150}
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