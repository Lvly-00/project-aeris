import { CheckShield } from '@boxicons/react';

import { LegalDocumentModal } from './legal/LegalDocumentModal';
import { FOOTER, INTRO, SECTIONS } from './legal/termsContent';

export interface TermsAndConditionsModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided (agreement flow), shows "I understand and accept". */
  onAcknowledge?: () => void;
}

export default function TermsAndConditionsModal({
  opened,
  onClose,
  onAcknowledge,
}: TermsAndConditionsModalProps) {
  return (
    <LegalDocumentModal
      opened={opened}
      onClose={onClose}
      title="Terms of Use"
      description="The rules for using AERIS."
      icon={<CheckShield width={20} height={20} />}
      intro={INTRO}
      sections={SECTIONS}
      footer={FOOTER}
      onAcknowledge={onAcknowledge}
      acknowledgeLabel="I understand and accept"
    />
  );
}
