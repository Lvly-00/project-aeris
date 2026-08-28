import { Modal, Stack, Text, ScrollArea, Box, Group, Title, ActionIcon, Button, Image } from '@mantine/core';

export interface PrivacyPolicyModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided (agreement flow), shows "I Understand" which checks the agreement checkbox. */
  onAcknowledge?: () => void;
}

const SECTIONS = [
  { title: '1. Information We Collect', body: 'We collect personal information you provide (such as your name and email), account preferences, and system usage records, including CCTV streams and incident reports processed by the barangay.' },
  { title: '2. How We Use Information', body: 'Information is used to operate and secure the system, process incident monitoring and decision-support workflows, and comply with applicable local regulations. We do not sell your personal information.' },
  { title: '3. Data Retention', body: 'Footage and incident data are retained only for as long as needed for their intended purpose or as required by law, after which they are securely deleted or anonymized.' },
  { title: '4. Security', body: 'We apply reasonable technical and organizational measures to protect your data against unauthorized access, alteration, or loss. Access to sensitive features is protected by administrative verification.' },
  { title: '5. Contact', body: 'For privacy-related inquiries, contact your barangay administrator.' },
];

export default function PrivacyPolicyModal({ opened, onClose, onAcknowledge }: PrivacyPolicyModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} 
      centered
      size="lg"
      radius="lg"
      padding="xl"
    >
      {/* Header Section */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group align="center" gap="md">
          <Image src="/icon.png" alt="Aeris Logo" w={90} />
          <Stack gap={2}>
            <Title order={3} fw={700}>Privacy Policy</Title>
            <Text size="sm" c="dimmed">
              Read how we handle and protect your information.
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

      {/* Footer Action */}
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
            I Understand
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