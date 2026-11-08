import { useState } from 'react';
import { Image, Stack, Text, rem } from '@mantine/core';
import { CheckShield } from '@boxicons/react';

import { AppModal } from './modals/AppModal';
import { ModalHeader } from './modals/ModalHeader';
import { ModalFooter } from './modals/ModalFooter';
import { AgreementChecklist } from './agreement/AgreementChecklist';
import TermsAndConditionsModal from './TermsAndConditionsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

export interface AgreementModalProps {
  opened: boolean;
  /** Called when the user agrees. Should resolve once accepted server-side. */
  onAgree: () => Promise<void>;
  /** Called when the user declines (e.g. sign out). */
  onDecline: () => void;
}

/**
 * Non-dismissible first-login acceptance gate. The checklist lives in
 * ./agreement; the full documents open on top of this modal.
 */
export default function AgreementModal({ opened, onAgree, onDecline }: AgreementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsOpened, setTermsOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const allChecked = termsChecked && privacyChecked;

  const handleAgree = async () => {
    setLoading(true);
    setError('');
    try {
      await onAgree();
    } catch {
      setError('Something went wrong while saving your agreement. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <AppModal
        opened={opened}
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        size="md"
        label="Review and accept the terms"
        header={
          <ModalHeader
            title="Before you continue"
            description="Review and accept both documents to use AERIS."
            icon={<CheckShield width={20} height={20} />}
            onClose={() => {}}
            showClose={false}
          />
        }
        footer={
          <ModalFooter
            onCancel={onDecline}
            cancelLabel="Decline"
            cancelDisabled={loading}
            confirmLabel="Agree"
            confirmDisabled={!allChecked}
            confirmLoading={loading}
            onConfirm={handleAgree}
          />
        }
      >
        <Stack gap="md">
          <Image src="/icon.png" alt="AERIS" w={rem(56)} mx="auto" />

          <Text fz={rem(14)} c="dimmed" ta="center" lh={1.55}>
            AERIS records and reviews CCTV footage for barangay public safety. Accept
            the terms and privacy policy to continue.
          </Text>

          <AgreementChecklist
            termsChecked={termsChecked}
            privacyChecked={privacyChecked}
            onTermsChange={setTermsChecked}
            onPrivacyChange={setPrivacyChecked}
            onOpenTerms={() => setTermsOpened(true)}
            onOpenPrivacy={() => setPrivacyOpened(true)}
          />

          {error && (
            <Text fz={rem(13)} c="orange.6" ta="center">
              {error}
            </Text>
          )}
        </Stack>
      </AppModal>

      <TermsAndConditionsModal
        opened={termsOpened}
        onClose={() => setTermsOpened(false)}
        onAcknowledge={() => {
          setTermsChecked(true);
          setTermsOpened(false);
        }}
      />
      <PrivacyPolicyModal
        opened={privacyOpened}
        onClose={() => setPrivacyOpened(false)}
        onAcknowledge={() => {
          setPrivacyChecked(true);
          setPrivacyOpened(false);
        }}
      />
    </>
  );
}
