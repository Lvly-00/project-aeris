import type { ReactNode } from 'react';
import { Button } from '@mantine/core';

import { useModalAccent } from '../modals/modalTheme';

interface LegalLinkButtonProps {
  onClick: () => void;
  children: ReactNode;
}

/** Inline link that opens a policy without toggling the checkbox it sits in. */
export function LegalLinkButton({ onClick, children }: LegalLinkButtonProps) {
  const { accent } = useModalAccent();

  return (
    <Button
      variant="transparent"
      size="compact-sm"
      p={0}
      mih={0}
      h="auto"
      fw={600}
      radius={0}
      c={accent}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
