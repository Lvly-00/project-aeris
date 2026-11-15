import { Text, rem } from '@mantine/core';
import { Bell } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import { AppModal } from './modals/AppModal';
import { ModalHeader } from './modals/ModalHeader';
import { ModalFooter } from './modals/ModalFooter';
import { subscribeToPush, isPushSupported } from '../services/pushNotifications';

interface NotificationPermissionModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

/** Consent before switching alerts on for the account. */
export default function NotificationPermissionModal({
  opened,
  onClose,
  onConfirm,
  confirming = false,
}: NotificationPermissionModalProps) {

  const handleConfirm = async () => {
    if (isPushSupported()) {
      try {
        const result = await subscribeToPush();
        if (result === 'denied') {
          // User blocked the browser prompt — still save the account preference
          // so in-app (WebSocket) notifications work, but warn them.
          notifications.show({
            title: 'Push notifications blocked',
            message: 'You blocked the browser permission. Enable it in your browser settings to receive notifications when the app is closed.',
            color: 'yellow',
            autoClose: 7000,
          });
        }
      } catch (err) {
        console.error('[PUSH] Subscription failed:', err);
        notifications.show({
          title: 'Could not enable push notifications',
          message: 'Push notifications failed to set up. In-app alerts will still work. Check the browser console for details.',
          color: 'orange',
          autoClose: 6000,
        });
      }
    }
    onConfirm();
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="sm"
      label="Receive notifications"
      header={
        <ModalHeader
          title="Receive notifications"
          description="Real-time alerts for detections and dispatches."
          icon={<Bell width={20} height={20} />}
          onClose={onClose}
        />
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel="Not now"
          cancelDisabled={confirming}
          confirmLabel="Enable"
          confirmLoading={confirming}
          onConfirm={handleConfirm}
        />
      }
    >
      <Text fz={rem(14)} c="dimmed" lh={1.55}>
        Turn on notifications to hear about detected incidents and dispatch
        orders as they happen — even when the app is not open. You can switch
        them off again from your profile.
      </Text>
    </AppModal>
  );
}
