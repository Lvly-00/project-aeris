import { ActionIcon, Badge, Group, Menu, Stack, Text, Title, rem } from '@mantine/core';
import { DotsVerticalRounded, Trash } from '@boxicons/react';

interface MessageListHeaderProps {
  unreadCount: number;
  /** Opens delete mode; omitted while selection is already active. */
  onDeleteClick?: () => void;
  deleteDisabled?: boolean;
}

/**
 * Same header format as the Incidents page: one bold title, one line of
 * supporting copy, and the vertical-dots actions menu on the right.
 */
export function MessageListHeader({
  unreadCount,
  onDeleteClick,
  deleteDisabled = false,
}: MessageListHeaderProps) {
  return (
    <Stack mb="lg" gap={4} style={{ flexShrink: 0 }}>
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <Title
          order={1}
          fz={rem(32)}
          fw={700}
          lh={1.15}
          style={{ letterSpacing: rem(-1) }}
        >
          Messages
        </Title>

        <Group gap={rem(6)} wrap="nowrap">
          {unreadCount > 0 && (
            <Badge
              size="sm"
              variant="light"
              color="orange"
              radius="sm"
              tt="none"
              aria-live="polite"
              styles={{ label: { fontWeight: 700 } }}
            >
              {unreadCount} unread
            </Badge>
          )}

          {onDeleteClick && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  variant="transparent"
                  color="gray"
                  size="lg"
                  aria-label="Message actions"
                >
                  <DotsVerticalRounded width={24} height={24} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<Trash width={16} height={16} />}
                  disabled={deleteDisabled}
                  onClick={onDeleteClick}
                >
                  Delete Messages
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      <Text fz={{ base: 'sm', sm: 'md' }} c="dimmed" lh={1.5}>
        Dispatch orders and incident alerts sent to you.
      </Text>
    </Stack>
  );
}
