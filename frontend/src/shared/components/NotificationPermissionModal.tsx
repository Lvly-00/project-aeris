import {
  Modal, Stack, Button, Group, Text, Box, Title, ActionIcon, Divider
} from '@mantine/core';
import { Bell, X } from '@boxicons/react';

const ORANGE = '#FF6B00';

interface NotificationPermissionModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export default function NotificationPermissionModal({
  opened,
  onClose,
  onConfirm,
  confirming = false,
}: NotificationPermissionModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      radius="lg"
      size="sm"
      padding="xl"
    >
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md">
          <Box
            bg={ORANGE}
            p={10}
            style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Bell width={28} height={28} style={{ color: 'white', display: 'block' }} />
          </Box>
          <Stack gap={2}>
            <Title order={3} fw={700}>Receive Notifications</Title>
            <Text c="dimmed" fz="sm" fw={400}>
              Enable real-time alerts
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
          <X width={24} height={24} />
        </ActionIcon>
      </Group>
      <Divider my="lg" />

      <Stack gap="lg">
        <Text fz="sm" fw={500} lh={1.6} c="var(--mantine-color-text)">
          Do you want to receive notifications? You&apos;ll get real-time alerts
          about detected incidents and dispatches so you never miss an important update.
        </Text>

        <Group grow mt="lg">
          <Button
            variant="outline"
            color="gray"
            radius="md"
            size="md"
            h={48}
            onClick={onClose}
            styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333' } }}
          >
            Not Now
          </Button>
          <Button
            bg="#FF5722"
            radius="md"
            size="md"
            h={48}
            onClick={onConfirm}
            loading={confirming}
            styles={{ root: { backgroundColor: '#FF5722' } }}
          >
            Yes, Enable
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}