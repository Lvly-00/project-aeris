import { useState, type ReactNode } from 'react';
import { Modal, Stack, Text, Button, Divider, Center, Image, Title, Box, Checkbox, Group } from '@mantine/core';
import { CheckShield } from '@boxicons/react';
import TermsAndConditionsModal from './TermsAndConditionsModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

export interface AgreementModalProps {
  opened: boolean;
  /** Called when the user agrees. Should resolve once accepted server-side. */
  onAgree: () => Promise<void>;
  /** Called when the user declines (e.g. sign out). */
  onDecline: () => void;
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button
      variant="subtle"
      size="sm"
      p={0}
      mih={0}
      h="auto"
      fw={600}
      radius={0}
      color="orange"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

/**
 * Non-dismissible first-login acceptance gate. Presents the summary and lets
 * the user open the full Terms and Conditions / Privacy Policy modals before
 * agreeing.
 */
export default function AgreementModal({ opened, onAgree, onDecline }: AgreementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsOpened, setTermsOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const allChecked = termsChecked && privacyChecked;
  const someChecked = termsChecked || privacyChecked;

  const handleAgree = async () => {
    setLoading(true);
    setError('');
    try {
      await onAgree();
    } catch (err) {
      setError('Something went wrong while saving your agreement. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => { }}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        centered
        radius="lg"
        size="md"
      >
        <Box style={{ overflow: 'hidden', borderRadius: '15px' }}>
          <Center py="xl" style={{ flexDirection: 'column' }}>
            <Image src="/icon.png" alt="Aeris Logo" w={110} mb="lg" />
            <Text c="dimmed" fz="sm" ta="center" style={{ maxWidth: 360, lineHeight: 1.5 }}>
              Before you continue, please review and accept our Terms and
              Conditions and Privacy Policy.
            </Text>
          </Center>

          <Divider />

          <Stack gap="md" p="xl">
            <Checkbox
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.currentTarget.checked)}
              label={
                <span>
                  I accept the <LinkButton onClick={() => setTermsOpened(true)}>Terms and Conditions</LinkButton>
                </span>
              }
            />
            <Checkbox
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.currentTarget.checked)}
              label={
                <span>
                  I accept the <LinkButton onClick={() => setPrivacyOpened(true)}>Privacy Policy</LinkButton>
                </span>
              }
            />

            <Divider />

            <Checkbox
              checked={allChecked}
              indeterminate={!allChecked && someChecked}
              onChange={(e) => {
                const v = e.currentTarget.checked;
                setTermsChecked(v);
                setPrivacyChecked(v);
              }}
              label={
                <Text size="sm" fw={600}>
                  I agree to everything (Terms and Conditions and Privacy Policy)
                </Text>
              }
            />
          </Stack>

          {error && (
            <Text size="sm" c="red" ta="center" pb="xs">
              {error}
            </Text>
          )}

          <Box px="xl" pb="xl">
            <Group gap="sm" grow>

              <Button
                variant="subtle"
                color="gray"
                size="md"
                h={48}
                fw={600}
                onClick={onDecline}
                disabled={loading}
              >
                Decline
              </Button>
              <Button
                disabled={!allChecked || loading}
                color="#FA5401"
                size="md"
                h={48}
                radius="md"
                loading={loading}
                onClick={handleAgree}
              >
                Agree
              </Button>
            </Group>
          </Box>
        </Box>
      </Modal>

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