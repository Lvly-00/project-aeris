import { ActionIcon, Divider, Group, Stack, Text, Title, rem } from '@mantine/core';
import { ChevronLeft } from '@boxicons/react';

import type { DispatchMessage } from '../../../../shared/types';
import { formatDate } from '../../../../shared/utils/helpers';

interface MessageDetailHeaderProps {
  message: DispatchMessage;
  onBack: () => void;
}

/**
 * The original dispatch header: a centered title between the back control and
 * an empty spacer, a rule, then the time the order arrived.
 */
export function MessageDetailHeader({ message, onBack }: MessageDetailHeaderProps) {
  return (
    <Stack gap="xs" mb="lg">
      <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          radius="md"
          onClick={onBack}
          aria-label="Back to messages"
          style={{ flexShrink: 0 }}
        >
          <ChevronLeft width={24} height={24} />
        </ActionIcon>

        <Title order={3} style={{ flex: 1, textAlign: 'center', marginRight: rem(40) }}>
          Dispatch Message
        </Title>
      </Group>

      <Divider />

      <Text ta="center" c="dimmed" size="sm" fw={500} mt="xs">
        {formatDate(message.created_at)}
      </Text>
    </Stack>
  );
}
