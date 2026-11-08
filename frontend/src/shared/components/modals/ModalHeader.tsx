import type { ReactNode } from 'react';
import { ActionIcon, Box, Divider, Group, Stack, Text, Title, rem } from '@mantine/core';
import { X } from '@boxicons/react';

import {
  MODAL_PADDING_X,
  MODAL_PADDING_Y,
  MODAL_TONES,
  type ModalTone,
} from './modalTheme';

interface ModalHeaderProps {
  title: string;
  /** One line of context under the title; kept short so the header stays slim. */
  description?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  /** Hide the close button for gates the user must answer. */
  showClose?: boolean;
  /** Block dismissal while the dialog is busy, e.g. mid-request. */
  closeDisabled?: boolean;
  /** `danger` paints the icon tile red for destructive dialogs. */
  tone?: ModalTone;
  /**
   * `inline` puts the icon beside the title; `stacked` centres a round icon
   * above it, which gives a confirmation the weight of a decision.
   */
  layout?: 'inline' | 'stacked';
  /**
   * Stacked layouts only: `solid` fills the circle with the accent, `soft`
   * tints it and draws the glyph in the accent instead.
   */
  iconVariant?: 'solid' | 'soft';
  /** Draw the hairline under the header. Off when the body starts its own rule. */
  divider?: boolean;
}

/**
 * The fixed top of every modal: an accent icon tile, the title, and the only
 * close affordance. Square for regular dialogs, round when centred.
 */
export function ModalHeader({
  title,
  description,
  icon,
  onClose,
  closeLabel = 'Close',
  showClose = true,
  closeDisabled = false,
  tone = 'brand',
  layout = 'inline',
  iconVariant = 'solid',
  divider = true,
}: ModalHeaderProps) {
  const palette = MODAL_TONES[tone];

  const closeButton = showClose && (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="md"
      radius="md"
      aria-label={closeLabel}
      onClick={onClose}
      disabled={closeDisabled}
      style={{ flexShrink: 0 }}
    >
      <X width={18} height={18} />
    </ActionIcon>
  );

  if (layout === 'stacked') {
    return (
      <Box style={{ flexShrink: 0 }}>
        <Box
          px={MODAL_PADDING_X}
          pt="lg"
          pb="md"
          style={{ position: 'relative' }}
        >
          {showClose && (
            <Box style={{ position: 'absolute', top: rem(10), right: rem(10) }}>
              {closeButton}
            </Box>
          )}

          <Stack align="center" gap="sm">
            {icon && (
              <Box
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: rem(64),
                  height: rem(64),
                  borderRadius: '50%',
                  backgroundColor: iconVariant === 'soft' ? palette.soft : palette.tile,
                  color: iconVariant === 'soft' ? palette.solid : palette.icon,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: rem(4),
                }}
              >
                {icon}
              </Box>
            )}

            <Stack gap={6} align="center">
              <Title
                order={3}
                fz={{ base: rem(19), sm: rem(21) }}
                fw={700}
                lh={1.25}
                ta="center"
                tabIndex={-1}
                data-autofocus
                style={{ overflowWrap: 'anywhere', outline: 'none' }}
              >
                {title}
              </Title>

              {description && (
                <Text
                  component="div"
                  fz={rem(13.5)}
                  c="dimmed"
                  lh={1.5}
                  ta="center"
                  maw={rem(330)}
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {description}
                </Text>
              )}
            </Stack>
          </Stack>
        </Box>

        {divider && <Divider color="var(--mantine-color-default-border)" />}
      </Box>
    );
  }

  return (
    <Box style={{ flexShrink: 0 }}>
      <Group
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        gap="sm"
        px={MODAL_PADDING_X}
        pt={MODAL_PADDING_Y}
        pb="md"
      >
        <Group gap="sm" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {icon && (
            <Box
              aria-hidden
              style={{
                flexShrink: 0,
                width: rem(42),
                height: rem(42),
                borderRadius: rem(12),
                backgroundColor: palette.tile,
                color: palette.icon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}

          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title
              order={3}
              fz={{ base: rem(18), sm: rem(20) }}
              fw={700}
              lh={1.25}
              tabIndex={-1}
              data-autofocus
              style={{ overflowWrap: 'anywhere', outline: 'none' }}
            >
              {title}
            </Title>

            {description && (
              <Text
                component="div"
                fz={rem(13)}
                c="dimmed"
                lh={1.45}
                lineClamp={2}
                style={{ overflowWrap: 'anywhere' }}
              >
                {description}
              </Text>
            )}
          </Stack>
        </Group>

        {closeButton}
      </Group>

      <Divider color="var(--mantine-color-default-border)" />
    </Box>
  );
}
