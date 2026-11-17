import { useEffect, useState } from 'react';
import { Radio, Stack, Textarea, rem } from '@mantine/core';

import { ConfirmModal } from '../../../shared/components/modals/ConfirmModal';
import type { DismissReason } from '../../../shared/types';
import { DISMISS_REASONS } from './dismissReasons';

interface DismissIncidentModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (reason: DismissReason, notes: string) => void | Promise<void>;
  loading?: boolean;
}

/**
 * Dismissing closes an incident without action, so the operator has to say
 * why. The reason feeds later analysis of wrong detections; "Other" needs a
 * description because the stored value alone says nothing.
 */
export function DismissIncidentModal({
  opened,
  onClose,
  onConfirm,
  loading = false,
}: DismissIncidentModalProps) {
  const [reason, setReason] = useState<DismissReason | ''>('');
  const [notes, setNotes] = useState('');

  // Each open starts from a blank form.
  useEffect(() => {
    if (!opened) {
      setReason('');
      setNotes('');
    }
  }, [opened]);

  const needsDescription = reason === 'other' && !notes.trim();
  const canSubmit = Boolean(reason) && !needsDescription;

  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={() => {
        if (!canSubmit || !reason) return;
        void onConfirm(reason, notes.trim());
      }}
      loading={loading}
      confirmDisabled={!canSubmit}
      closeOnClickOutside={!loading}
      title="Dismiss this incident?"
      description="Choose a reason so wrong detections can be reviewed later."
      confirmLabel="Dismiss incident"
      cancelLabel="Cancel"
    >
      <Radio.Group
        value={reason}
        onChange={(value) => setReason(value as DismissReason)}
        label="Reason"
        withAsterisk
      >
        <Stack gap={rem(6)} mt={rem(8)}>
          {DISMISS_REASONS.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </Stack>
      </Radio.Group>

      <Textarea
        mt="md"
        label={reason === 'other' ? 'Description' : 'Details (optional)'}
        placeholder={
          reason === 'other'
            ? 'Describe why this incident is being dismissed'
            : 'Anything else worth recording'
        }
        required={reason === 'other'}
        error={needsDescription ? 'Describe the reason.' : undefined}
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
        autosize
        minRows={2}
        maxRows={4}
        maxLength={500}
      />
    </ConfirmModal>
  );
}
