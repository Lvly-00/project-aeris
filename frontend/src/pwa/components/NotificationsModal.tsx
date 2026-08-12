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
} from '@mantine/core';
import { CheckCheck, Inbox } from 'lucide-react';
import { notifications } from '@mantine/notifications';

import { AppNotification } from '../../shared/types/index';
import { notificationsAPI } from '../../shared/services/api';
import { formatRelativeTime } from '../../shared/utils/helpers';
import { PRIORITY_COLORS } from '../../shared/utils/constants';

interface NotificationsModalProps {
  opened: boolean;
  onClose: () => void;
  onUnreadChange?: Dispatch<SetStateAction<number>>;
}

export function NotificationsModal({
  opened,
  onClose,
  onUnreadChange,
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

    const token = localStorage.getItem('access_token');
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Notifications"
      size="sm"
      centered
    >
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          {unreadCount} unread
        </Text>

        <Button
          variant="light"
          size="compact-sm"
          leftSection={<CheckCheck size={14} />}
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
                size={40}
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed">
                No notifications yet.
              </Text>
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
                  onClick={() => handleMarkRead(n)}
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
                  <Group
                    align="flex-start"
                    wrap="nowrap"
                    gap="sm"
                  >
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: n.is_read
                          ? 'var(--mantine-color-dimmed)'
                          : color,
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />

                    <Stack
                      gap={2}
                      style={{ flex: 1 }}
                      align="flex-start"
                    >
                      <Group
                        justify="space-between"
                        w="100%"
                        wrap="nowrap"
                      >
                        <Text fw={700} size="sm" lineClamp={1}>
                          {n.title}
                        </Text>
                        <Text
                          size="xs"
                          c="dimmed"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {formatRelativeTime(n.created_at)}
                        </Text>
                      </Group>

                      <Text
                        size="sm"
                        c="dimmed"
                        lineClamp={2}
                        ta="left"
                      >
                        {n.message}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
}
