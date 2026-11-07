import { Fragment } from 'react';
import {
  Box,
  Center,
  Divider,
  Group,
  rem,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Inbox } from '@boxicons/react';

import type { AppNotification } from '../../../shared/types/index';
import { groupByDay } from './notificationMeta';
import { NotificationRow } from './NotificationRow';

/**
 * Placeholder rows reuse the real row's geometry so the tray does not jump
 * when the alerts arrive.
 */
function NotificationListSkeleton() {
  return (
    <Stack gap={0} aria-busy="true" aria-label="Loading notifications">
      {[0, 1, 2].map((placeholder) => (
        <Group
          key={placeholder}
          gap={rem(12)}
          wrap="nowrap"
          align="flex-start"
          p={`${rem(10)} ${rem(8)}`}
        >
          <Skeleton h={44} w={44} radius={8} />
          <Stack gap={rem(7)} style={{ flex: 1 }}>
            <Group justify="space-between" wrap="nowrap">
              <Skeleton h={12} w="45%" radius="xl" />
              <Skeleton h={10} w={rem(40)} radius="xl" />
            </Group>
            <Skeleton h={10} w="55%" radius="xl" />
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

function NotificationListEmpty() {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <ThemeIcon size={rem(52)} radius="xl" variant="light" color="orange">
          <Inbox width={26} height={26} />
        </ThemeIcon>
        <Text fw={600}>No notifications yet</Text>
        <Text size="sm" c="dimmed" ta="center" maw={260}>
          Incident alerts and dispatch orders appear here as they happen.
        </Text>
      </Stack>
    </Center>
  );
}

export function NotificationList({
  items,
  loading,
  onOpen,
}: {
  items: AppNotification[];
  loading: boolean;
  onOpen: (notification: AppNotification) => void;
}) {
  return (
    <ScrollArea.Autosize mah={420}>
      {loading ? (
        <NotificationListSkeleton />
      ) : items.length === 0 ? (
        <NotificationListEmpty />
      ) : (
        <Stack gap="md">
          {groupByDay(items).map((group) => (
            <Box key={group.key}>
              <Text fz={rem(12)} fw={600} c="dimmed" mb={rem(2)} pl={rem(8)}>
                {group.label}
              </Text>
              <Stack gap={0}>
                {group.items.map((n, index) => (
                  <Fragment key={n.id}>
                    <NotificationRow notification={n} onOpen={onOpen} />
                    {index < group.items.length - 1 && (
                      <Divider ml={rem(64)} color="var(--mantine-color-default-border)" />
                    )}
                  </Fragment>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </ScrollArea.Autosize>
  );
}
