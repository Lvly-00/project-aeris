import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { AppNotification } from '../../shared/types/index';
import { notificationsAPI } from '../../shared/services/api';
import { onWebSocketMessage } from '../../shared/services/websocket';
import { AppModal } from '../../shared/components/modals/AppModal';
import { MODAL_PADDING_X } from '../../shared/components/modals/modalTheme';
import { NotificationHeader } from './notifications/NotificationHeader';
import { NotificationToolbar } from './notifications/NotificationToolbar';
import { NotificationList } from './notifications/NotificationList';

interface NotificationsModalProps {
  opened: boolean;
  onClose: () => void;
  onUnreadChange?: Dispatch<SetStateAction<number>>;
  onNavigate?: (notification: AppNotification) => void;
}

/**
 * The notification tray.
 *
 * Loading strategy:
 *  - Fetch the list once on the first open (not on every open).
 *  - After that, the list is kept live by WebSocket pushes — a new
 *    notification_new event prepends the item directly without a network
 *    round-trip, so opening the modal again never triggers a reload.
 *  - The unread badge in the header is updated the same way.
 */
export function NotificationsModal({
  opened,
  onClose,
  onUnreadChange,
  onNavigate,
}: NotificationsModalProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Track whether we have already loaded the initial list so we don't
  // re-fetch on subsequent opens. `loaded` is both a ref (for synchronous
  // reads inside callbacks) and a piece of state (to trigger the WS
  // subscription effect once the first fetch completes).
  const [loaded, setLoaded] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.unreadCount();
      onUnreadChange?.(res.data?.unread_count ?? 0);
    } catch {
      /* ignore */
    }
  }, [onUnreadChange]);

  // Load once — the first time the modal is opened.
  useEffect(() => {
    if (!opened || loaded) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await notificationsAPI.list();
        const data = res.data.results || res.data || [];
        if (!cancelled) {
          setItems(data);
          setLoaded(true);
        }
        await refreshCount();
      } catch (error) {
        console.error('[NOTIFICATIONS] Failed to load:', error);
        if (!cancelled) {
          notifications.show({
            title: 'Error',
            message: 'Failed to load notifications',
            color: 'orange',
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
  }, [opened, loaded, refreshCount]);

  /*
   * Real-time updates: listen for notification_new over the shared WebSocket.
   * This subscription starts once the initial fetch completes (`loaded` state
   * flips to true) and stays active regardless of whether the modal is open,
   * so new items are queued into local state even while the modal is closed
   * and appear instantly the next time the user opens it.
   */
  useEffect(() => {
    if (!loaded) return;

    return onWebSocketMessage((data) => {
      if (data.action !== 'notification_new' || !data.payload?.id) return;

      setItems((prev) => {
        const exists = prev.some((n) => n.id === data.payload.id);
        if (exists) return prev;
        return [data.payload, ...prev];
      });
    });
  }, [loaded]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onUnreadChange?.(0);
    } catch (error) {
      console.error('[NOTIFICATIONS] Mark all read failed:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to mark all as read',
        color: 'orange',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (n: AppNotification) => {
    if (n.is_read) return;

    try {
      await notificationsAPI.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
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
    <AppModal
      opened={opened}
      onClose={onClose}
      size="xl"
      label="Notifications"
      header={
        <>
          <NotificationHeader onClose={onClose} />
          <Box px={MODAL_PADDING_X} pt="md" style={{ flexShrink: 0 }}>
            <NotificationToolbar
              unreadCount={unreadCount}
              total={items.length}
              markingAll={markingAll}
              onMarkAllRead={handleMarkAllRead}
            />
          </Box>
        </>
      }
    >
      <NotificationList items={items} loading={loading} onOpen={handleOpen} />
    </AppModal>
  );
}
