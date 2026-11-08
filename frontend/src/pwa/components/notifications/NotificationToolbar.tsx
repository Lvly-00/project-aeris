import { Box, Button, Group, Loader, rem, Text } from '@mantine/core';
import { Check } from '@boxicons/react';

import { ORANGE } from './notificationMeta';

/**
 * The count, and the one action that clears it. Sits above the list so the
 * tray answers "how many are waiting?" before the first row is read.
 */
export function NotificationToolbar({
  unreadCount,
  total,
  markingAll,
  onMarkAllRead,
}: {
  unreadCount: number;
  total: number;
  markingAll: boolean;
  onMarkAllRead: () => void;
}) {
  return (
    <Group justify="space-between" align="center" gap="sm" wrap="wrap">
      <Group gap={rem(7)} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
        <Box
          w={7}
          h={7}
          style={{
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: unreadCount > 0 ? ORANGE : 'var(--mantine-color-gray-4)',
          }}
        />
        <Text
          fz={rem(13)}
          fw={600}
          c={unreadCount > 0 ? undefined : 'dimmed'}
          aria-live="polite"
          style={{ whiteSpace: 'nowrap' }}
        >
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </Text>
        {unreadCount > 0 && total > 0 && (
          <Text fz={rem(13)} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            of {total}
          </Text>
        )}
      </Group>

      <Button
        variant="subtle"
        color="gray"
        size="compact-sm"
        px={rem(6)}
        fz={rem(13)}
        leftSection={markingAll ? <Loader size={12} /> : <Check width={14} height={14} />}
        onClick={onMarkAllRead}
        disabled={unreadCount === 0 || markingAll}
      >
        Mark all read
      </Button>
    </Group>
  );
}
