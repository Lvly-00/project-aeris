import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Loader,
  Center,
  Box,
  rem,
  UnstyledButton,
  ScrollArea,
  Title,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { Bell, Check, Inbox, LocationPin, Tag, X } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import { AppNotification } from '../../shared/types/index';
import { notificationsAPI } from '../../shared/services/api';
import { formatRelativeTime } from '../../shared/utils/helpers';
import { getAccessToken } from '../../shared/utils/tokenStorage';
import { PRIORITY_COLORS } from '../../shared/utils/constants';

const ORANGE = '#FF6B00';

interface NotificationsModalProps {
  opened: boolean;
  onClose: () => void;
  onUnreadChange?: Dispatch<SetStateAction<number>>;
  onNavigate?: (notification: AppNotification) => void;
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
   * Real-time updates: listen for notification_new over the WS
   */
  useEffect(() => {
    if (!opened) return;

    const token = getAccessToken();
    if (!token) return;

    const wsProtocol =
      window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl =
      `${wsProtocol}://${window.location.host}/ws/incidents/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    let disposed = false;

    ws.onopen = () => {
      if (disposed) {
        ws.close();
        return;
      }
      console.log('[NOTIF-WS] Connected');
    };

    ws.onmessage = (event) => {
      try {
        if (disposed) return;

        const data = JSON.parse(event.data);

        if (data.action === 'notification_new') {
          setItems((prev) => {
            const exists = prev.some(
              (n) => n.id === data.payload.id
            );
            if (exists) return prev;
            return [data.payload, ...prev];
          });
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      if (!disposed) {
        console.error('[NOTIF-WS] Socket error');
      }
    };

    ws.onclose = () => {
      if (!disposed) {
        console.log('[NOTIF-WS] Socket closed');
      }
    };

    return () => {
      disposed = true;

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
      }
    };
  }, [opened, onUnreadChange]);

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
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          {unreadCount} unread
        </Text>

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
          <Center py="xl">
            <Loader variant="dots" color="blue" />
          </Center>
        ) : items.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Inbox
                width={40}
                height={40}
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed">No notifications yet.</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {items.map((n) => {
              const color =
                PRIORITY_COLORS[n.priority] || '#888888';

              return (
                <UnstyledButton
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  w="100%"
                  style={{
                    border:
                      '1px solid var(--mantine-color-default-border)',
                    borderRadius: rem(10),
                    padding: rem(12),
                    backgroundColor: n.is_read
                      ? 'transparent'
                      : 'var(--mantine-color-orange-light)',
                  }}
                >
                  <Stack gap={8} align="stretch">
                    {/* Incident id + time */}
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      align="center"
                    >
                      <Group
                        gap="xs"
                        wrap="nowrap"
                        align="center"
                        style={{ minWidth: 0 }}
                      >
                        <Box
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: n.is_read
                              ? 'var(--mantine-color-dimmed)'
                              : color,
                            flexShrink: 0,
                          }}
                        />
                        <Text
                          fw={700}
                          size="sm"
                          lineClamp={1}
                        >
                          Incident #{n.incident ?? '—'}
                        </Text>
                      </Group>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {formatRelativeTime(n.created_at)}
                      </Text>
                    </Group>

                    <Divider />

                    {/* Incident type */}
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      gap="sm"
                    >
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Tag
                          width={15}
                          height={15}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text size="sm" c="dimmed" fw={500}>
                          Incident Type
                        </Text>
                      </Group>
                      <Text
                        size="sm"
                        fw={600}
                        lineClamp={1}
                        ta="right"
                      >
                        {n.incident_type ?? '—'}
                      </Text>
                    </Group>

                    {/* Location */}
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      gap="sm"
                    >
                      <Group gap="xs" wrap="nowrap" align="center">
                        <LocationPin
                          width={15}
                          height={15}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text size="sm" c="dimmed" fw={500}>
                          Location
                        </Text>
                      </Group>
                      <Text
                        size="sm"
                        fw={600}
                        lineClamp={1}
                        ta="right"
                      >
                        {n.location ?? '—'}
                      </Text>
                    </Group>
                  </Stack>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
}
