import { Paper, Stack, Text, ThemeIcon, rem } from '@mantine/core';
import { Inbox } from '@boxicons/react';

/** Empty inbox, framed like the Incidents page's "All clear" panel. */
export function MessageEmptyState() {
  return (
    <Paper
      withBorder
      p="xl"
      py={rem(72)}
      ta="center"
      radius="md"
      bg="var(--mantine-color-body)"
    >
      <Stack align="center" gap="sm">
        <ThemeIcon size={rem(64)} radius="xl" variant="light" color="orange">
          <Inbox width={30} height={30} aria-hidden />
        </ThemeIcon>

        <Text fw={700} fz={rem(17)}>
          No messages yet
        </Text>

        <Text size="sm" c="dimmed" maw={280} lh={1.5}>
          Dispatch orders from command will appear here as soon as they are sent.
        </Text>
      </Stack>
    </Paper>
  );
}
