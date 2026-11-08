import { Group, Loader, Skeleton, Stack, Text, rem } from '@mantine/core';

/**
 * The wait before the first code exists. Rather than a second envelope (the
 * header already shows one), it previews the six slots that are about to
 * appear, so the dialog does not jump when the form arrives.
 */
export function VerificationCodeSending() {
  return (
    <Stack gap="lg" align="center" py="xs" aria-live="polite" aria-busy>
      <Group gap={rem(6)} justify="center" wrap="nowrap" w="100%">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton
            key={index}
            height={50}
            radius={10}
            /* Matches the width of a real code slot so nothing shifts when the
               skeletons are replaced by the inputs. */
            style={{ flex: '1 1 0', minWidth: 0, maxWidth: rem(52) }}
          />
        ))}
      </Group>

      <Group gap={rem(8)} justify="center" wrap="nowrap">
        <Loader size={13} color="orange" type="dots" />
        <Text fz={rem(13)} c="dimmed" ta="center">
          Waiting for the email to go out…
        </Text>
      </Group>
    </Stack>
  );
}
