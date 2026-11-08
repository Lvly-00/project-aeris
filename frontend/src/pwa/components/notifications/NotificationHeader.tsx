import { Bell } from '@boxicons/react';

import { ModalHeader } from '../../../shared/components/modals/ModalHeader';

/** Identity block and the single close affordance at the top of the tray. */
export function NotificationHeader({ onClose }: { onClose: () => void }) {
  return (
    <ModalHeader
      title="Notifications"
      description="Review incident alerts and dispatches."
      icon={<Bell width={20} height={20} />}
      onClose={onClose}
    />
  );
}
