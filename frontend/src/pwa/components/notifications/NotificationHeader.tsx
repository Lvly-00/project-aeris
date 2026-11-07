import { ActionIcon, Box, Divider, Group, rem, Stack, Text, Title } from '@mantine/core';
import { Bell, X } from '@boxicons/react';

import { ORANGE } from './notificationMeta';

/** Identity block and the single close affordance at the top of the tray. */
export function NotificationHeader({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
          {/* <Box
            bg={ORANGE}
            p={10}
            style={{
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell width={28} height={28} style={{ color: 'white', display: 'block' }} />
          </Box> */}
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>
              Notifications
            </Title>
            <Text c="dimmed" fz={rem(13)} fw={400} lh={1.45} style={{ maxWidth: 320 }}>
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
