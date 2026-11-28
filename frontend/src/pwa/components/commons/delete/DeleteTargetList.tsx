import { Badge, Box, Divider, Group, Paper, Stack, Text, rem } from '@mantine/core';

interface DeleteTargetListProps {
  /** Names shown one per row; only used when there are two or more. */
  items: string[];
  listTitle: string;
  /** Singular noun used to pluralize the count badge. */
  noun: string;
}

/**
 * The scrollable preview of what the confirm button removes, styled like the
 * desktop bulk-delete list: a rule, a caption with a count badge, and one red
 * dot per target. It stays capped at a few rows so a bulk delete never turns
 * the modal into a full page.
 */
export function DeleteTargetList({ items, listTitle, noun }: DeleteTargetListProps) {
  const count = items.length;
  const plural = `${noun}${count === 1 ? '' : 's'}`;

  return (
    <>
      <Divider />

      <Stack gap={12} px={32} py={22}>
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm" c="var(--mantine-color-text)">
            {listTitle}
          </Text>

          <Badge color="red" variant="light" size="lg" radius="md" tt="none">
            {count} {plural}
          </Badge>
        </Group>

        <Paper
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: 'var(--mantine-color-body)',
            borderColor: 'var(--mantine-color-default-border)',
            maxHeight: rem(150),
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <Stack gap={9}>
            {items.map((label, index) => (
              <Group key={`${label}-${index}`} gap={10} wrap="nowrap">
                <Box
                  aria-hidden
                  style={{
                    width: rem(6),
                    height: rem(6),
                    borderRadius: '50%',
                    backgroundColor: 'var(--mantine-color-red-6)',
                    flexShrink: 0,
                  }}
                />

                <Text size="sm" fw={500} c="var(--mantine-color-text)" truncate>
                  {label}
                </Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </>
  );
}
