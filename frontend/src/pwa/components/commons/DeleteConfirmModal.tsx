import type { ReactNode } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Box,
  ActionIcon,
  ThemeIcon,
  Divider,
  Badge,
  Paper,
} from '@mantine/core';
import { X, Trash } from '@boxicons/react';

/*
 * Shared delete confirmation, mirroring the desktop camera delete modals.
 * A single target renders as the plain "single" layout; two or more targets
 * add the scrollable list of names (the "mass" layout).
 */
interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  /** Bold heading, e.g. "Delete Incident". */
  title: string;
  /** Sentence under the heading. */
  description: ReactNode;
  /** Names of the items being removed; the list shows when there are 2+. */
  items: string[];
  /** Singular noun used to pluralize the badge and confirm button. */
  noun: string;
  /** Caption above the list. */
  listTitle?: string;
  /** Overrides the confirm button label. */
  confirmLabel?: string;
}

export function DeleteConfirmModal({
  opened,
  onClose,
  onConfirm,
  loading = false,
  title,
  description,
  items,
  noun,
  listTitle = 'Items to be deleted',
  confirmLabel,
}: DeleteConfirmModalProps) {
  const count = items.length;
  const plural = `${noun}${count === 1 ? '' : 's'}`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={false}
      padding={0}
      radius="md"
      zIndex={1100}
      overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
      styles={{
        content: { overflow: 'hidden' },
        body: { padding: 0 },
      }}
    >
      <Stack gap={0}>
        {/* Close Button */}
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onClose}
          disabled={loading}
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}
        >
          <X width={18} height={18} />
        </ActionIcon>

        {/* Header */}
        <Stack align="center" gap={12} px={32} pt={30} pb={24}>
          <ThemeIcon
            size={72}
            radius="50%"
            variant="light"
            color="red"
            style={{ backgroundColor: 'var(--mantine-color-red-light)' }}
          >
            <Trash width={32} height={32} color="var(--mantine-color-red-6)" />
          </ThemeIcon>

          <Stack align="center" gap={6}>
            <Text fw={700} size="xl" ta="center" c="var(--mantine-color-text)">
              {title}
            </Text>

            <Text size="sm" c="dimmed" ta="center" maw={320} lh={1.5}>
              {description}
            </Text>
          </Stack>
        </Stack>

        {/* Selected Items (mass only) */}
        {count > 1 && (
          <>
            <Divider />

            <Stack gap={12} px={32} py={22}>
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm" c="var(--mantine-color-text)">
                  {listTitle}
                </Text>

                <Badge color="red" variant="light" size="lg" radius="md">
                  {count} {plural}
                </Badge>
              </Group>

              <Paper
                withBorder
                radius="md"
                p="md"
                style={{
                  backgroundColor: 'var(--mantine-color-body)',
                  borderColor: 'var(--mantine-color-default-border)',
                  maxHeight: 150,
                  overflowY: 'auto',
                }}
              >
                <Stack gap={9}>
                  {items.map((label, index) => (
                    <Group key={`${label}-${index}`} gap={10} wrap="nowrap">
                      <Box
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'var(--mantine-color-red-6)',
                          flexShrink: 0,
                        }}
                      />
                      <Text size="sm" fw={500} c="var(--mantine-color-text)" truncate>
                        {label}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </>
        )}

        {/* Footer */}
        <Box px={32} pt={8} pb={28}>
          <Group grow gap={12}>
            <Button
              variant="default"
              size="md"
              radius="md"
              disabled={loading}
              onClick={onClose}
              styles={{
                root: {
                  borderColor: 'var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-text)',
                  fontWeight: 600,
                },
              }}
            >
              Cancel
            </Button>

            <Button
              color="red"
              size="md"
              radius="md"
              loading={loading}
              onClick={onConfirm}
              styles={{
                root: {
                  backgroundColor: 'var(--mantine-color-red-6)',
                  fontWeight: 600,
                },
              }}
            >
              {confirmLabel ?? `Delete ${plural}`}
            </Button>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
