import { Lock } from '@boxicons/react';

import { LegalDocumentModal } from './legal/LegalDocumentModal';
import { FOOTER, INTRO, SECTIONS } from './legal/privacyContent';

export interface PrivacyPolicyModalProps {
  opened: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export default function PrivacyPolicyModal({
  opened,
  onClose,
  onAcknowledge,
}: PrivacyPolicyModalProps) {
  return (
    <LegalDocumentModal
      opened={opened}
      onClose={onClose}
      title="Privacy Policy"
      description="How AERIS collects, uses, and protects information."
      icon={<Lock width={20} height={20} />}
      intro={INTRO}
      sections={SECTIONS}
      footer={FOOTER}
      onAcknowledge={onAcknowledge}
      acknowledgeLabel="I understand"
    />
  );
}
