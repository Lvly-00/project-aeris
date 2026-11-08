import type { ReactNode } from 'react';
import { Stack, Text, rem } from '@mantine/core';

import { AppModal } from '../modals/AppModal';
import { ModalHeader } from '../modals/ModalHeader';
import { ModalFooter } from '../modals/ModalFooter';

export interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocumentModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  intro: string;
  sections: LegalSection[];
  footer: string;
  /** When set, the footer offers acceptance instead of a plain close. */
  onAcknowledge?: () => void;
  acknowledgeLabel?: string;
}

/**
 * Long-form policy copy in a modal that never outgrows the screen: the header
 * and close button stay put while only the document scrolls. The copy itself
 * lives in ./termsContent and ./privacyContent.
 */
export function LegalDocumentModal({
  opened,
  onClose,
  title,
  description,
  icon,
  intro,
  sections,
  footer,
  onAcknowledge,
  acknowledgeLabel = 'I understand',
}: LegalDocumentModalProps) {
  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      size="lg"
      label={title}
      header={
        <ModalHeader title={title} description={description} icon={icon} onClose={onClose} />
      }
      footer={
        onAcknowledge ? (
          <ModalFooter confirmLabel={acknowledgeLabel} onConfirm={onAcknowledge} />
        ) : (
          <ModalFooter confirmLabel="Close" onConfirm={onClose} />
        )
      }
    >
      <Stack gap="lg">
        <Text fz={rem(13.5)} c="dimmed" lh={1.65} style={{ whiteSpace: 'pre-line' }}>
          {intro}
        </Text>

        {sections.map((section) => (
          <Stack key={section.title} gap={rem(6)}>
            <Text fz={rem(14)} fw={700} lh={1.4}>
              {section.title}
            </Text>
            <Text fz={rem(13.5)} c="dimmed" lh={1.65} style={{ whiteSpace: 'pre-line' }}>
              {section.body}
            </Text>
          </Stack>
        ))}

        <Text fz={rem(13)} c="dimmed" lh={1.6} style={{ whiteSpace: 'pre-line' }}>
          {footer}
        </Text>
      </Stack>
    </AppModal>
  );
}
