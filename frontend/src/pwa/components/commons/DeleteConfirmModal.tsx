import type { ReactNode } from 'react';
import { Trash } from '@boxicons/react';

import { ConfirmModal } from '../../../shared/components/modals/ConfirmModal';
import { DeleteTargetList } from './delete/DeleteTargetList';

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  /** Bold heading, e.g. "Delete incident". */
  title: string;
  /** Sentence under the heading that names the targets. */
  description: ReactNode;
  /** Names of the items being removed; the list shows when there are 2+. */
  items: string[];
  /** Singular noun used to pluralize the badge and confirm button. */
  noun: string;
  /** Caption above the list. */
  listTitle?: string;
  /** Overrides the confirm button label. */
  confirmLabel?: string;
}

/**
 * The destructive confirmation. It is deliberately red rather than orange:
 * deleting is the one action that should never look like the brand's normal
 * primary button, so the icon tile, the list markers and the confirm button
 * all carry the danger colour.
 */
export function DeleteConfirmModal({
  opened,
  onClose,
  onConfirm,
  loading = false,
  title,
  description,
  items,
  noun,
  listTitle = 'Items to be deleted',
  confirmLabel,
}: DeleteConfirmModalProps) {
  const count = items.length;
  /* Short enough to sit beside the icon at 320px: the count is already in
     the heading and the badge, so the button only needs the verb. */
  const label = confirmLabel ?? (count > 1 ? `Delete (${count})` : `Delete ${noun.toLowerCase()}`);

  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      tone="danger"
      layout="stacked"
      title={title}
      description={description}
      icon={<Trash width={28} height={28} />}
      confirmLabel={label}
      confirmIcon={<Trash width={16} height={16} />}
    >
      {count > 1 && <DeleteTargetList items={items} listTitle={listTitle} noun={noun} />}
    </ConfirmModal>
  );
}
