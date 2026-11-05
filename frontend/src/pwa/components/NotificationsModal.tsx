import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Badge,
  Center,
  Box,
  rem,
  UnstyledButton,
  ScrollArea,
  Skeleton,
  ThemeIcon,
  Title,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { Bell, Check, Inbox, LocationPin, X } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import { AppNotification } from '../../shared/types/index';
import { notificationsAPI } from '../../shared/services/api';
import { onWebSocketMessage } from '../../shared/services/websocket';
import { formatRelativeTime } from '../../shared/utils/helpers';
import { PRIORITY_COLORS } from '../../shared/utils/constants';

const ORANGE = '#FF6B00';

/** Type badges follow the same colour language as the incident cards. */
const TYPE_BADGE_COLORS: Record<string, string> = {
  Fire: 'red',
  Smoke: 'orange',
  Vehicle_Accident: 'yellow',
};

interface NotificationsModalProps {
  opened: boolean;
  onClose: () => void;
  onUnreadChange?: Dispatch<SetStateAction<number>>;
  onNavigate?: (notification: AppNotification) => void;
}

/**
 * A single alert in the tray. The left stripe carries priority, so what needs
 * attention reads before the text does; read alerts fall back to a neutral
 * stripe and a plain background.
 */
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isUnread = !notification.is_read;
  const priorityColor = PRIORITY_COLORS[notification.priority] || '#888888';
  const typeColor = TYPE_BADGE_COLORS[notification.incident_type ?? ''] || 'gray';

  return (
    <UnstyledButton
      onClick={() => onOpen(notification)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Open notification for incident ${notification.incident ?? 'unknown'}`}
      w="100%"
      style={{
        border: '1px solid',
        borderColor: hovered
          ? 'var(--mantine-color-gray-4)'
          : 'var(--mantine-color-default-border)',
        borderLeft: `${rem(4)} solid ${isUnread ? priorityColor : 'var(--mantine-color-gray-4)'}`,
        borderRadius: rem(10),
        padding: rem(12),
        backgroundColor: isUnread ? 'var(--mantine-color-orange-light)' : 'transparent',
        boxShadow: hovered ? 'var(--mantine-shadow-sm)' : 'none',
        transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <Stack gap={rem(6)}>
        {/* Which incident, and when */}
        <Group justify="space-between" wrap="nowrap" align="center" gap="xs"  >
          <Text fw={700} size="sm" truncate>
            Incident #{notification.incident ?? '—'}
          </Text>
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </Group>

        {/* What happened, and where */}
        <Group gap={6} wrap="nowrap" align="center">
          <Badge
            size="xs"
            variant="light"
            color={typeColor}
            radius="sm"
            tt="none"
            styles={{ label: { fontWeight: 700 } }}
          >
            {notification.incident_type?.replace(/_/g, ' ') ?? 'Unknown type'}
          </Badge>

          {notification.location && (
            <Group gap={4} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
              <LocationPin
                width={13}
                height={13}
                color="var(--mantine-color-dimmed)"
                style={{ flexShrink: 0 }}
              />
              <Text size="xs" c="dimmed" truncate>
                {notification.location}
              </Text>
            </Group>
          )}
        </Group>
      </Stack>
    </UnstyledButton>
  );
}

export function NotificationsModal({
  opened,
  onClose,
  onUnreadChange,
  onNavigate,
}: NotificationsModalProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.unreadCount();
      onUnreadChange?.(res.data?.unread_count ?? 0);
    } catch {
      /* ignore */
    }
  }, [onUnreadChange]);

  /*
   * Load notifications when the modal opens
   */
  useEffect(() => {
    if (!opened) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await notificationsAPI.list();
        const data = res.data.results || res.data || [];
        if (!cancelled) setItems(data);
        await refreshCount();
      } catch (error) {
        console.error('[NOTIFICATIONS] Failed to load:', error);
        if (!cancelled) {
          notifications.show({
            title: 'Error',
            message: 'Failed to load notifications',
            color: 'red',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [opened, refreshCount]);

  /*
   * Real-time updates: listen for notification_new over the single shared
   * WebSocket (only while the tray is open).
   */
  useEffect(() => {
    if (!opened) return;

    return onWebSocketMessage((data) => {
      if (data.action !== 'notification_new' || !data.payload?.id) return;

      setItems((prev) => {
        const exists = prev.some(
          (n) => n.id === data.payload.id
        );
        if (exists) return prev;
        return [data.payload, ...prev];
      });
    });
  }, [opened]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      onUnreadChange?.(0);
    } catch (error) {
      console.error('[NOTIFICATIONS] Mark all read failed:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to mark all as read',
        color: 'red',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (n: AppNotification) => {
    if (n.is_read) return;

    try {
      await notificationsAPI.markRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, is_read: true } : x
        )
      );
      onUnreadChange?.((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  /*
   * Clicking a notification marks it read, closes the tray, then
   * redirects to its source (incident detail for admins, dispatch
   * list for tanods) when one is attached.
   */
  const handleOpen = (n: AppNotification) => {
    if (!n.is_read) {
      void handleMarkRead(n);
    }
    onClose();
    onNavigate?.(n);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} // Custom close button in header
      centered
      radius="lg"
      size="md"
      padding="xl"
    >
      {/* Custom Header Section */}
      <Group
        justify="space-between"
        align="flex-start"
        mb="lg"
        wrap="wrap"
        gap="sm"
      >
        <Group
          align="center"
          gap="md"
          style={{ flex: 1, minWidth: 200 }}
        >
          <Box
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
            <Bell
              width={28}
              height={28}
              style={{ color: 'white', display: 'block' }}
            />
          </Box>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>
              Notifications
            </Title>
            <Text
              c="dimmed"
              fz="sm"
              fw={400}
              style={{ maxWidth: 300, lineHeight: 1.4 }}
            >
              Review real-time incident alerts and dispatches.
            </Text>
          </Stack>
        </Group>
        <ActionIcon
          variant="transparent"
          color="gray"
          onClick={onClose}
          aria-label="Close"
        >
          <X width={24} height={24} />
        </ActionIcon>
      </Group>
      <Divider my="lg" />

      {/* Toolbar */}
      <Group justify="space-between" mb="md" wrap="nowrap" gap="sm">
        <Badge
          size="sm"
          variant="light"
          color={unreadCount > 0 ? 'orange' : 'gray'}
          radius="sm"
          tt="none"
          styles={{ label: { fontWeight: 700 } }}
        >
          {unreadCount} unread
        </Badge>

        <Button
          variant="light"
          size="compact-sm"
          leftSection={<Check width={14} height={14} />}
          onClick={handleMarkAllRead}
          loading={markingAll}
          disabled={unreadCount === 0}
        >
          Mark all read
        </Button>
      </Group>

      <ScrollArea.Autosize mah={420}>
        {loading ? (
          /* Row-shaped placeholders so the tray keeps its height. */
          <Stack gap="xs" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((placeholder) => (
              <Box
                key={placeholder}
                p={rem(12)}
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderLeft: `${rem(4)} solid var(--mantine-color-default-border)`,
                  borderRadius: rem(10),
                }}
              >
                <Group justify="space-between" wrap="nowrap" mb={rem(8)}>
                  <Skeleton h={12} w="45%" radius="xl" />
                  <Skeleton h={10} w={rem(48)} radius="xl" />
                </Group>
                <Group gap={6} wrap="nowrap">
                  <Skeleton h={18} w={rem(70)} radius="sm" />
                  <Skeleton h={10} w="40%" radius="xl" />
                </Group>
              </Box>
            ))}
          </Stack>
        ) : items.length === 0 ? (
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
        ) : (
          <Stack gap="xs">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} onOpen={handleOpen} />
            ))}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
}
