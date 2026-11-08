import { Badge, Box, Group, Paper, Stack, Text, rem } from '@mantine/core';

interface DeleteTargetListProps {
  /** Names shown one per row; only used when there are two or more. */
  items: string[];
  listTitle: string;
  /** Singular noun used to pluralize the count badge. */
  noun: string;
}

/**
 * The scrollable preview of what the confirm button removes. It stays capped
 * at a few rows so a bulk delete never turns the modal into a full page.
 */
export function DeleteTargetList({ items, listTitle, noun }: DeleteTargetListProps) {
  const count = items.length;
  const plural = `${noun}${count === 1 ? '' : 's'}`;

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center" gap="sm">
        <Text fz={rem(13)} fw={600}>
          {listTitle}
        </Text>

        <Badge color="red" variant="light" size="sm" radius="sm" tt="none">
          {count} {plural}
        </Badge>
      </Group>

      <Paper
        withBorder
        radius="md"
        p={0}
        style={{
          backgroundColor: 'var(--mantine-color-default)',
          borderColor: 'var(--mantine-color-default-border)',
          maxHeight: rem(148),
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <Stack gap={0}>
          {items.map((label, index) => (
            <Group
              key={`${label}-${index}`}
              gap="sm"
              wrap="nowrap"
              align="center"
              px="sm"
              py={rem(9)}
              style={{
                borderTop:
                  index === 0 ? 'none' : '1px solid var(--mantine-color-default-border)',
                backgroundColor:
                  index % 2 === 1 ? 'var(--mantine-color-red-light)' : undefined,
              }}
            >
              <Box
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: rem(6),
                  height: rem(6),
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-red-6)',
                }}
              />
              <Text fz={rem(13)} truncate>
                {label}
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>

      {count > 4 && (
        <Text fz={rem(12)} c="dimmed" ta="center">
          Scroll the list to check all {count} before deleting.
        </Text>
      )}
    </Stack>
  );
}
