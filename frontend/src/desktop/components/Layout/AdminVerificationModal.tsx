import { Modal, PasswordInput, Button, Text, Stack, Group, Box, Title, ActionIcon, Divider } from '@mantine/core';
import { Lock, User, X } from '@boxicons/react';

const ORANGE = '#FF6B00';

interface AdminVerificationModalProps {
  opened: boolean;
  onClose: () => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error?: string | null;
  loading: boolean;
  throttleSeconds?: number;
  onSubmit: () => void;
}

export function AdminVerificationModal({
  opened,
  onClose,
  password,
  onPasswordChange,
  error,
  loading,
  throttleSeconds = 0,
  onSubmit,
}: AdminVerificationModalProps) {
  const throttled = throttleSeconds > 0;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      radius="lg"
      padding="xl"
      size="md"
      styles={{
        content: {
          width: 'min(100%, 480px)',
          '@media (max-width: 480px)': { padding: '1rem' },
        },
      }}
    >
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
          <Box
            bg={ORANGE}
            p={10}
            style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Lock width={28} height={28} style={{ color: 'white', display: 'block' }} />
          </Box>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>CCTV Chief Verification</Title>
            <Text c="dimmed" fz="sm" fw={400} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              Please enter your password to enable CCTV Chief Mode.
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
          <X width={24} height={24} />
        </ActionIcon>
      </Group>

      <Divider my="lg" />

      <Stack gap="lg">
        <PasswordInput
          label={
            <Text size="sm" fw={600} mb={5}>
              Password <span style={{ color: 'red' }}>*</span>
            </Text>
          }
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => onPasswordChange(e.currentTarget.value)}
          error={error}
          disabled={throttled}
          onKeyDown={(e) => e.key === 'Enter' && !throttled && onSubmit()}
          radius="md"
          size="md"
          leftSection={<Lock width={18} height={18} style={{ color: 'var(--mantine-color-dimmed)' }} />}
          styles={{
            input: { border: '1.5px solid var(--mantine-color-default-border)' },
            label: { marginBottom: '5px' },
          }}
        />

        <Group
          mt="md"
          grow
          wrap="wrap"
          styles={{
            root: {
              '& > *': {
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 140,
              },
            },
          }}
        >
          <Button
            variant="outline"
            color="gray"
            radius="md"
            size="md"
            h={44}
            onClick={onClose}
            styles={{
              root: { border: '1.5px solid var(--mantine-color-default-border)', color: 'var(--mantine-color-text)', height: 'auto' },
              label: { whiteSpace: 'normal', lineHeight: 1.4 },
            }}
          >
            Cancel
          </Button>
          <Button
            radius="md"
            size="md"
            h={44}
            onClick={onSubmit}
            loading={loading}
            disabled={throttled}
            color="#FA5401"
            styles={{
              root: { height: 'auto' },
              label: { whiteSpace: 'normal', lineHeight: 1.4 },
            }}
          >
            {throttled ? `Retry in ${throttleSeconds}s` : 'Continue as Chief'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}