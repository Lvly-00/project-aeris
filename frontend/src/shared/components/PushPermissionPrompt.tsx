import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Group, Paper, Text, rem, ActionIcon } from '@mantine/core';
import { Bell, X } from '@boxicons/react';
import { useAuth } from '../hooks/useAuth';
import { isPushSupported, subscribeToPush, getPushPermission } from '../services/pushNotifications';

const DISMISSED_KEY = 'aeris_push_prompt_dismissed';

/**
 * A one-time bottom banner that fires after the user reaches the dashboard.
 *
 * Rules:
 *  - Only shown on PWA routes (/pwa/admin/* or /pwa/tanod/*) — never on the
 *    login page.
 *  - Only shown when the browser permission is still 'default' (not asked yet).
 *  - Only shown once per device; "Not now" stores a flag in localStorage.
 *  - Hidden in Electron (no service worker, no Push API).
 */
export default function PushPermissionPrompt() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  // Decide whether we're inside the authenticated app (not on login/forgot/etc.)
  const isInsideApp =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/tanod');

  useEffect(() => {
    // Must be logged in and inside the app shell (past login page)
    if (!isAuthenticated || !isInsideApp) return;

    // User opted out of notifications account-wide
    if (!user?.receive_notifications) return;

    // Browser doesn't support push (Electron, old browser)
    if (!isPushSupported()) return;

    // Browser already has an answer — 'granted' or 'denied' — no need to ask
    if (getPushPermission() !== 'default') return;

    // User explicitly said "Not now" on this device before
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;

    // Small delay so the banner doesn't appear while page transition animations
    // are still running (agreement modal, route animation, etc.)
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isInsideApp, user?.receive_notifications]);

  const handleEnable = async () => {
    setVisible(false);
    try {
      await subscribeToPush();
    } catch {
      // subscribeToPush() logs the error; nothing more to do here
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!visible) return null;

  return (
    <Paper
      withBorder
      shadow="md"
      p="md"
      radius="md"
      style={{
        position: 'fixed',
        bottom: rem(100), // clears the bottom nav bar
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(90vw, 420px)',
        zIndex: 1000,
      }}
    >
      <Group wrap="nowrap" gap="sm" align="flex-start">
        <Bell
          width={22}
          height={22}
          style={{
            flexShrink: 0,
            marginTop: rem(2),
            color: 'var(--mantine-color-orange-filled)',
          }}
        />
        <div style={{ flex: 1 }}>
          <Text fw={600} fz="sm" mb={rem(2)}>
            Enable push notifications
          </Text>
          <Text fz="xs" c="dimmed" lh={1.5}>
            Get alerted about incidents and dispatch orders even when AERIS is
            closed.
          </Text>
          <Group mt="sm" gap="xs">
            <Button size="xs" color="orange" onClick={handleEnable}>
              Enable
            </Button>
            <Button size="xs" variant="subtle" color="gray" onClick={handleDismiss}>
              Not now
            </Button>
          </Group>
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{ flexShrink: 0 }}
        >
          <X width={14} height={14} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
