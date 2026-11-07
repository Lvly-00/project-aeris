import { ActionIcon, Divider, Group, rem, Stack, Text, Title } from '@mantine/core';
import { X } from '@boxicons/react';

/** Identity block and the single close affordance at the top of the tray. */
export function NotificationHeader({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md" style={{ flex: 1, minWidth: 0 }}>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>
              Notifications
            </Title>
            <Text c="dimmed" fz={rem(13)} fw={400} lh={1.45} style={{ maxWidth: 320, minWidth: 0 }}>
              Review incident alerts and dispatches.
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
          <X width={24} height={24} />
        </ActionIcon>
      </Group>
      <Divider my="sm" />
    </>
  );
}
