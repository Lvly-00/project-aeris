import { Modal, Stack, Text, ScrollArea, Box, Group, Title, ActionIcon, Button, Image } from '@mantine/core';

export interface TermsAndConditionsModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided (agreement flow), shows "I Understand & Accept" which checks the agreement checkbox. */
  onAcknowledge?: () => void;
}

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By accessing or using the Aeris system, you agree to be bound by these Terms and Conditions. If you do not agree to any part of these terms, you may not access or use the system.' },
  { title: '2. Authorized Use', body: 'This system is provided exclusively to authorized personnel of the barangay for CCTV incident monitoring, decision support, and administrative purposes. Access credentials must not be shared, and each user is responsible for all activity performed under their account.' },
  { title: '3. Acceptable Use', body: 'Users must not attempt to access areas of the system beyond their granted role, misuse recorded footage, or use the system for any unlawful purpose. Violations may result in suspension of access and appropriate action.' },
  { title: '4. Account Security', body: 'You are responsible for safeguarding your password and two-factor authentication device. Notify the administrator immediately if you suspect unauthorized access to your account.' },
  { title: '5. Changes to Terms', body: 'The system administrator may update these terms from time to time. Continued use of the system after changes are posted constitutes acceptance of the revised terms.' },
];

export default function TermsAndConditionsModal({ opened, onClose, onAcknowledge }: TermsAndConditionsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} // Custom header close button used instead
      centered
      size="lg"
      radius="lg"
      padding="xl"
    >
      {/* Custom Header Section - Matching Reference Aesthetic */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group align="center" gap="md">
          <Image src="/icon.png" alt="Aeris Logo" w={90} />
          <Stack gap={2}>
            <Title order={3} fw={700}>Terms and Conditions</Title>
            <Text size="sm" c="dimmed">
              Please review the system usage guidelines below.
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose}>
          <i className='bx bx-x' style={{ fontSize: '24px' }}></i>
        </ActionIcon>
      </Group>

      <hr style={{ border: '0.5px solid #eee', marginBottom: '20px' }} />

      {/* Main Content Area */}
      <ScrollArea.Autosize mah="50vh" mx={-10} px={10} type="hover">
        <Stack gap="lg" py="sm">
          {SECTIONS.map((s) => (
            <Box key={s.title}>
              <Text size="md" fw={700} mb={4} style={{ color: 'var(--mantine-color-text)' }}>
                {s.title}
              </Text>
              <Text size="md" c="dimmed" lh={1.6}>
                {s.body}
              </Text>
            </Box>
          ))}
        </Stack>
      </ScrollArea.Autosize>

      {/* Footer Action - Matching Button Aesthetic */}
      <Box mt="xl">
        {onAcknowledge ? (
          <Button
            fullWidth
            bg="#FF5722"
            radius="md"
            size="md"
            h={48}
            onClick={onAcknowledge}
            styles={{ root: { backgroundColor: '#FF5722' } }}
          >
            I Understand & Accept
          </Button>
        ) : (
          <Button
            fullWidth
            variant="default"
            radius="md"
            size="md"
            h={48}
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </Box>
    </Modal>
  );
}