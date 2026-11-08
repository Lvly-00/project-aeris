import type { ReactNode } from 'react';

import { AppModal } from './AppModal';
import { ModalFooter } from './ModalFooter';
import { ModalHeader } from './ModalHeader';
import type { ModalSize, ModalTone } from './modalTheme';

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** `danger` paints the header and primary button red. */
  tone?: ModalTone;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  cancelLabel?: string;
  loading?: boolean;
  size?: ModalSize;
  /** Centred icon above the title, or a compact icon beside it. */
  layout?: 'inline' | 'stacked';
  closeOnClickOutside?: boolean;
  zIndex?: number;
  /** Anything that belongs under the question, such as a list of targets. */
  children?: ReactNode;
}

/**
 * A yes/no dialog: one question, one accent, and no other way out besides
 * cancel. Delete confirmations and sign-out prompts are both this shape.
 */
export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  tone = 'brand',
  confirmLabel,
  confirmIcon,
  cancelLabel = 'Cancel',
  loading = false,
  size = 'md',
  layout = 'inline',
  closeOnClickOutside = true,
  zIndex,
  children,
}: ConfirmModalProps) {
  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size={size}
      label={title}
      zIndex={zIndex}
      closeOnClickOutside={!loading && closeOnClickOutside}
      closeOnEscape={!loading}
      header={
        <ModalHeader
          title={title}
          description={description}
          icon={icon}
          tone={tone}
          layout={layout}
          onClose={onClose}
          closeDisabled={loading}
        />
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel={cancelLabel}
          cancelDisabled={loading}
          confirmLabel={confirmLabel}
          confirmIcon={confirmIcon}
          confirmLoading={loading}
          confirmDisabled={loading}
          tone={tone}
          onConfirm={onConfirm}
        />
      }
    >
      {children}
    </AppModal>
  );
}
