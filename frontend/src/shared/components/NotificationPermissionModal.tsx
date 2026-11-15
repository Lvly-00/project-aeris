import { Text, rem } from '@mantine/core';
import { Bell } from '@boxicons/react';

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

  /**
   * When the user clicks Enable:
   *  1. Subscribe to Web Push so background notifications work.
   *  2. Call the parent's onConfirm() to also set receive_notifications=true
   *     on the account (which controls WS + push delivery on the backend).
   *
   * subscribeToPush() is best-effort — a failure doesn't block the in-app
   * WebSocket notifications from working.
   */
  const handleConfirm = async () => {
    if (isPushSupported()) {
      try {
        await subscribeToPush();
      } catch {
        // Browser may have already granted or denied — either way proceed
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
