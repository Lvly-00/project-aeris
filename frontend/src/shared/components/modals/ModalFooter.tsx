import type { ReactNode } from 'react';
import { Box, Button, Group } from '@mantine/core';

import {
  MODAL_BUTTON_HEIGHT,
  MODAL_PADDING_X,
  MODAL_PADDING_Y,
  MODAL_TONES,
  type ModalTone,
} from './modalTheme';

interface ModalFooterProps {
  onCancel?: () => void;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  /** Set to `submit` when the modal owns a form. */
  confirmType?: 'button' | 'submit';
  /** `danger` turns the primary action red for destructive dialogs. */
  tone?: ModalTone;
  /** Optional glyph shown before the confirm label. */
  confirmIcon?: ReactNode;
  /** Stacks the buttons on narrow phones where two long labels would clip. */
  stacked?: boolean;
  /** `text` renders cancel as a quiet text button instead of an outlined one. */
  cancelVariant?: 'default' | 'text';
  /**
   * `split` shares the row between the two buttons; `end` keeps them at their
   * natural width against the right edge, as a sheet with one clear action.
   */
  align?: 'split' | 'end';
  /** Draw the hairline above the footer. */
  divider?: boolean;
}

/**
 * The fixed bottom of every modal: a quiet cancel and one accent primary
 * action, both the same height so the pair reads as a single control.
 */
export function ModalFooter({
  onCancel,
  cancelLabel = 'Cancel',
  cancelDisabled,
  onConfirm,
  confirmLabel = 'Save',
  confirmDisabled,
  confirmLoading,
  confirmType = 'button',
  tone = 'brand',
  confirmIcon,
  stacked = false,
  cancelVariant = 'default',
  align = 'split',
  divider = true,
}: ModalFooterProps) {
  const isEndAligned = align === 'end';

  return (
    <Box
      px={MODAL_PADDING_X}
      py={MODAL_PADDING_Y}
      style={{
        flexShrink: 0,
        borderTop: divider ? '1px solid var(--mantine-color-default-border)' : undefined,
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Group
        grow={!stacked && !isEndAligned}
        justify={isEndAligned ? 'flex-end' : undefined}
        gap={isEndAligned ? 'md' : 'sm'}
        wrap={stacked ? 'wrap' : 'nowrap'}
      >
        {onCancel && (
          <Button
            variant={cancelVariant === 'text' ? 'subtle' : 'default'}
            color="gray"
            size="sm"
            h={MODAL_BUTTON_HEIGHT}
            radius="md"
            fz="sm"
            fw={cancelVariant === 'text' ? 500 : 600}
            px={cancelVariant === 'text' ? 'sm' : undefined}
            fullWidth={stacked}
            disabled={cancelDisabled || confirmLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        )}

        <Button
          type={confirmType}
          color={tone === 'danger' ? 'red' : 'orange'}
          size="sm"
          h={MODAL_BUTTON_HEIGHT}
          radius="md"
          fz="sm"
          fw={700}
          fullWidth={stacked}
          style={isEndAligned ? { flexShrink: 0 } : undefined}
          loading={confirmLoading}
          disabled={confirmDisabled}
          onClick={confirmType === 'submit' ? undefined : onConfirm}
          leftSection={confirmLoading ? undefined : confirmIcon}
          styles={{ label: { gap: 8 } }}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Box>
  );
}
