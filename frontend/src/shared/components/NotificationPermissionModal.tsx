import { Text, rem } from '@mantine/core';
import { Bell } from '@boxicons/react';

import { AppModal } from './modals/AppModal';
import { ModalHeader } from './modals/ModalHeader';
import { ModalFooter } from './modals/ModalFooter';

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
          onConfirm={onConfirm}
        />
      }
    >
      <Text fz={rem(14)} c="dimmed" lh={1.55}>
        Turn on notifications to hear about detected incidents and dispatch orders
        as they happen. You can switch them off again from your profile.
      </Text>
    </AppModal>
  );
}
