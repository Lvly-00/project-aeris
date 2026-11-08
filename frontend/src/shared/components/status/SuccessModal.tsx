import { Box, Button, Divider, Modal, Stack, Text, Title, rem } from '@mantine/core';
import { Check } from '@boxicons/react';

import { AppModal } from '../modals/AppModal';
import { ModalHeader } from '../modals/ModalHeader';
import { ModalFooter } from '../modals/ModalFooter';
import { useModalAccent } from '../modals/modalTheme';

const GREEN_SUCCESS = '#2FB300';

export interface SuccessModalProps {
  opened: boolean;
  onClose?: () => void;
  /** Called when the action button is pressed. Defaults to onClose. */
  onAction?: () => void;
  /** Label of the action button. */
  actionLabel?: string;
  /** Main heading (e.g. "Change password"). */
  title: string;
  /** Short confirmation line under the title. */
  subtitle?: string;
  /** Body text. */
  message: string;
  /** Accent for the classic layout; the compact layout stays orange. */
  buttonColor?: string;
  /** Custom icon. Defaults to a check mark. */
  icon?: React.ReactNode;
  /**
   * `classic` is the original large centered layout (round accent halo, big
   * title, full-width action); `compact` is the shared sheet introduced with
   * the modal redesign. Desktop keeps `classic` where it was already in use.
   */
  variant?: 'classic' | 'compact';
}

/**
 * Shared success confirmation — used by password reset, account creation and
 * settings changes. Orange is the only accent, matching the rest of the app.
 */
export default function SuccessModal({
  opened,
  onClose,
  onAction,
  actionLabel = 'Done',
  title,
  subtitle,
  message,
  buttonColor = GREEN_SUCCESS,
  icon,
  variant = 'compact',
}: SuccessModalProps) {
  const { accent } = useModalAccent();

  const handleAction = () => {
    if (onAction) onAction();
    else if (onClose) onClose();
  };

  if (variant === 'classic') {
    return (
      <Modal
        opened={opened}
        onClose={() => (onClose ? onClose() : undefined)}
        centered
        radius={15}
        padding={40}
        size={440}
        overlayProps={{ blur: 4, opacity: 0.4 }}
      >
        <Stack align="center" gap="lg" w="100%">
          <Box
            bg="var(--mantine-color-green-light)"
            style={{
              borderRadius: '50%',
              width: rem(86),
              height: rem(86),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon ?? <Check size="lg" color="#00C853" strokeWidth={1.5} />}
          </Box>

          <Title order={3} fw={700} ta="center" style={{ lineHeight: 1.2 }}>
            {title}
          </Title>

          {subtitle && (
            <Text c={buttonColor} fw={700} fz={rem(28)} ta="center" mb="md" px={20}>
              {subtitle}
            </Text>
          )}

          <Text ta="center" c="dimmed" fz="sm" px={20} style={{ lineHeight: 1.5 }}>
            {message}
          </Text>

          <Divider w="100%" color="var(--mantine-color-default-border)" />

          <Button
            fullWidth
            h={54}
            radius="md"
            color={buttonColor}
            style={{ fontSize: rem(18), fontWeight: 700 }}
            onClick={handleAction}
          >
            {actionLabel}
          </Button>
        </Stack>
      </Modal>
    );
  }

  return (
    <AppModal
      opened={opened}
      onClose={onClose ?? handleAction}
      size="sm"
      label={title}
      header={
        <ModalHeader
          title={title}
          icon={icon ?? <Check width={20} height={20} />}
          onClose={onClose ?? handleAction}
        />
      }
      footer={<ModalFooter onConfirm={handleAction} confirmLabel={actionLabel} />}
    >
      <Stack gap="xs" align="center" py="xs">
        {subtitle && (
          <Text fz={rem(15)} fw={700} c={accent} ta="center" lh={1.35} style={{ overflowWrap: 'anywhere' }}>
            {subtitle}
          </Text>
        )}

        <Text fz={rem(14)} c="dimmed" ta="center" lh={1.55} maw={rem(300)}>
          {message}
        </Text>
      </Stack>
    </AppModal>
  );
}
