import type { ReactNode } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Trash, X } from '@boxicons/react';

import { DeleteTargetList } from './delete/DeleteTargetList';

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  /** Bold heading, e.g. "Delete incident". */
  title: string;
  /** Sentence under the heading that names the targets. */
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

/**
 * The destructive confirmation, matching the desktop delete dialog: a red
 * circle, the question, and one clear red action beside a quiet cancel. A
 * single delete is only that; a bulk delete adds the list of targets.
 */
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
  const label = confirmLabel ?? (count > 1 ? `Delete (${count})` : `Delete ${noun}`);

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
      aria-label={title}
      overlayProps={{ backgroundOpacity: 0.6 }}
      styles={{
        content: {
          overflow: 'hidden',
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Stack gap={0}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Close"
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
          }}
        >
          <X size="sm" />
        </ActionIcon>

        <Stack align="center" gap={12} px={32} pt={30} pb={24}>
          <ThemeIcon
            size={72}
            radius="50%"
            variant="light"
            color="red"
            style={{
              backgroundColor: 'var(--mantine-color-red-light)',
            }}
          >
            <Trash size="lg" color="var(--mantine-color-red-6)" />
          </ThemeIcon>

          <Stack align="center" gap={6}>
            <Text fw={700} size="xl" ta="center" c="var(--mantine-color-text)">
              {title}
            </Text>

            <Text size="sm" c="dimmed" ta="center" maw={350} lh={1.5}>
              {description}
            </Text>
          </Stack>
        </Stack>

        {count > 1 && <DeleteTargetList items={items} listTitle={listTitle} noun={noun} />}

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
              {label}
            </Button>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
