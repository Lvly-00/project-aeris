import { useEffect, useState } from 'react';
import { Power } from '@boxicons/react';

import { ConfirmModal } from '../../../shared/components/modals/ConfirmModal';

interface LogoutConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  /** Signs the user out; the app navigates away when it resolves. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Signing out ends the session, so it asks first. The prompt is orange, not
 * red: nothing is deleted, the user can simply sign back in.
 */
export function LogoutConfirmModal({ opened, onClose, onConfirm }: LogoutConfirmModalProps) {
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!opened) setSigningOut(false);
  }, [opened]);

  const handleClose = () => {
    if (signingOut) return;
    onClose();
  };

  const handleConfirm = async () => {
    setSigningOut(true);
    try {
      await onConfirm();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ConfirmModal
      opened={opened}
      onClose={handleClose}
      onConfirm={handleConfirm}
      loading={signingOut}
      title="Log out of AERIS?"
      description="You will need to sign in again to see incidents, dispatch messages, and camera feeds."
      icon={<Power width={22} height={22} />}
      confirmLabel={signingOut ? 'Logging out…' : 'Log out'}
      confirmIcon={<Power width={16} height={16} />}
      cancelLabel="Stay signed in"
      closeOnClickOutside={!signingOut}
    />
  );
}
