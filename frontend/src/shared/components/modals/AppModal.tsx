import type { ReactNode } from 'react';
import { Box, Modal } from '@mantine/core';

import {
  MODAL_MAX_HEIGHTS,
  MODAL_PADDING_X,
  MODAL_PADDING_Y,
  MODAL_RADIUS,
  MODAL_WIDTHS,
  type ModalSize,
} from './modalTheme';

interface AppModalProps {
  opened: boolean;
  onClose: () => void;
  /** A modal is a sheet: `md` suits a short form, `lg` a list, `xl` a document. */
  size?: ModalSize;
  /** Accessible name for the dialog; use the visible heading. */
  label: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  zIndex?: number;
}

/**
 * The one modal frame in the app. It keeps the header and footer pinned while
 * only the content scrolls, clamps itself to the phone's viewport, and takes
 * every colour from theme variables so light and dark mode both hold up.
 */
export function AppModal({
  opened,
  onClose,
  size = 'md',
  label,
  header,
  footer,
  children,
  closeOnClickOutside = true,
  closeOnEscape = true,
  zIndex,
}: AppModalProps) {
  /* A dialog with nothing under its header should not carry an empty band of
     padding between the two pinned edges. */
  const hasBody = children !== null && children !== undefined && children !== false;

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      centered
      padding={0}
      radius={MODAL_RADIUS}
      size={MODAL_WIDTHS[size]}
      /* Matching gutters above and beside the sheet keep it inside the screen */
      yOffset="1rem"
      xOffset="0.75rem"
      zIndex={zIndex}
      shadow="lg"
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={closeOnEscape}
      transitionProps={{ duration: 160, transition: 'pop' }}
    >
      {/* A firm dark veil: the page behind must read as inactive, not as a
          washed-out white sheet showing through the dialog. */}
      <Modal.Overlay color="#000" backgroundOpacity={0.72} blur={2} />

      <Modal.Content
        role="dialog"
        aria-label={label}
        /* `style` here is forwarded to the full-screen inner wrapper as well,
           which would paint it over the overlay — so the sheet is styled
           through `styles.content` only. */
        styles={{
          content: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            /* Never wider than the phone it is on, never taller than a sheet:
               the cap below keeps a long document from filling the screen. */
            maxWidth: `min(${MODAL_WIDTHS[size]}px, calc(100vw - 1.5rem))`,
            maxHeight: `min(${MODAL_MAX_HEIGHTS[size]}px, calc(100dvh - 4rem))`,
            overflow: 'hidden',
            border: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-body)',
            color: 'var(--mantine-color-text)',
          },
        }}
      >
        <Modal.Body
          style={{
            display: 'flex',
            flexDirection: 'column',
            /* Auto basis keeps a short modal content-sized, while minHeight 0
               lets a tall one shrink and hand the overflow to the body box. */
            flex: '1 1 auto',
            minHeight: 0,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {header}

          {hasBody && (
            <Box
              px={MODAL_PADDING_X}
              pt={MODAL_PADDING_Y}
              pb={footer ? 'md' : MODAL_PADDING_Y}
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                backgroundColor: 'var(--mantine-color-body)',
              }}
            >
              {children}
            </Box>
          )}

          {footer}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
