import { Stack, Text, rem } from '@mantine/core';

/**
 * The state after a correct code: the disc above has already flipped to a
 * check, so this is only the sentence that says what happens next.
 */
export function VerificationCodeSuccess({ message }: { message?: string }) {
  return (
    <Stack gap="sm" align="center" py="xs">
      <Text
        fz={rem(14)}
        c="dimmed"
        ta="center"
        lh={1.6}
        maw={rem(320)}
        aria-live="polite"
      >
        {message ?? 'Your identity has been verified. You can continue.'}
      </Text>
    </Stack>
  );
}
