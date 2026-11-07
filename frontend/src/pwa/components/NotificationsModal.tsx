import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { AppNotification } from '../../shared/types/index';
import { notificationsAPI } from '../../shared/services/api';
import { onWebSocketMessage } from '../../shared/services/websocket';
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
 * The tray shell: it owns the alert list and its unread count, and composes the
 * header, toolbar and list. Presentation lives in ./notifications.
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
        const exists = prev.some((n) => n.id === data.payload.id);
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
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
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
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} // Custom close button in header
      centered
      radius="md"
      size="lg"
      padding="md"
      /* Keeps the tray inside a narrow window instead of scrolling sideways */
      styles={{
        content: { maxWidth: 'calc(100vw - 2rem)' },
        body: { overflowX: 'hidden' },
      }}
    >
      <NotificationHeader onClose={onClose} />

      <NotificationToolbar
        unreadCount={unreadCount}
        total={items.length}
        markingAll={markingAll}
        onMarkAllRead={handleMarkAllRead}
      />

      <NotificationList items={items} loading={loading} onOpen={handleOpen} />
    </Modal>
  );
}
