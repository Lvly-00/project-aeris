import { Group, Paper, Skeleton, Stack, rem } from '@mantine/core';

/** Mirrors the message card's block order so the list does not jump. */
export function MessageListSkeleton() {
  return (
    <Stack gap="md" aria-busy="true" aria-label="Loading messages">
      {[0, 1, 2].map((placeholder) => (
        <Paper key={placeholder} withBorder p="md" radius="md" bg="var(--mantine-color-body)">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <Skeleton h={rem(52)} w={rem(52)} radius="md" />

            <Stack gap={rem(6)} style={{ flex: 1, minWidth: 0 }}>
              <Skeleton h={rem(14)} w="60%" radius="xl" />
              <Skeleton h={rem(11)} w="35%" radius="xl" />
              <Skeleton h={rem(11)} w="92%" radius="xl" />
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
