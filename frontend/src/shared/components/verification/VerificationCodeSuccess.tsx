import { Badge, Stack, Text, rem } from '@mantine/core';
import { Check } from '@boxicons/react';

/**
 * The state after a correct code: the header flips its icon and this block
 * says what happens next, so the modal can stay small.
 */
export function VerificationCodeSuccess({ message }: { message?: string }) {
  return (
    <Stack gap="sm" py="xs" align="center">
      <Badge
        color="orange"
        variant="light"
        size="lg"
        radius="sm"
        tt="none"
        leftSection={<Check width={13} height={13} />}
        styles={{ label: { gap: 6, fontWeight: 700 } }}
      >
        Verified
      </Badge>

      <Text fz={rem(14)} c="dimmed" ta="center" lh={1.55} maw={rem(320)}>
        {message ?? 'Your identity has been verified. You can continue.'}
      </Text>
    </Stack>
  );
}
