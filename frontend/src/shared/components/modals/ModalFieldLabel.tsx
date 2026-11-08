import type { ReactNode } from 'react';
import { Text, rem } from '@mantine/core';

import { ORANGE } from './modalTheme';

interface ModalFieldLabelProps {
  children: ReactNode;
  /** Adds the brand-orange asterisk for a required field. */
  required?: boolean;
}

/**
 * One label treatment for every field in a modal, so required markers are the
 * same weight and colour everywhere instead of four different red asterisks.
 */
export function ModalFieldLabel({ children, required }: ModalFieldLabelProps) {
  return (
    <Text component="span" fz={rem(13.5)} fw={600} lh={1.35}>
      {children}
      {required && (
        <Text component="span" c={ORANGE} fw={700} aria-hidden>
          {' '}
          *
        </Text>
      )}
    </Text>
  );
}
