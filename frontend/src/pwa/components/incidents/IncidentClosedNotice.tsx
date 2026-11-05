import { Box, Card, Group, Text, ThemeIcon, rem, useComputedColorScheme } from '@mantine/core';
import { CheckCircle, XCircle } from '@boxicons/react';

import { formatDate } from '../../../shared/utils/helpers';

interface IncidentClosedNoticeProps {
  status: 'Resolved' | 'Dismissed';
  statusColor: string;
  /** resolved_at or dismissed_at, whichever matches the status. */
  closedAt: string | null;
}

/**
 * A closed incident says so once, in its own status colour, so the reader knows
 * why the action buttons are missing or limited.
 */
export const IncidentClosedNotice = ({
  status,
  statusColor,
  closedAt,
}: IncidentClosedNoticeProps) => {
  const isDark = useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';
  const isResolved = status === 'Resolved';

  const detail = closedAt
    ? `${isResolved ? 'Closed' : 'Dismissed'} ${formatDate(closedAt)}`
    : isResolved
      ? 'This incident has been closed.'
      : 'This incident was dismissed.';

  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      mb="md"
      bg={isDark ? 'dark.6' : `var(--mantine-color-${statusColor}-0)`}
      style={{
        borderColor: isDark
          ? `var(--mantine-color-${statusColor}-9)`
          : `var(--mantine-color-${statusColor}-2)`,
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={36} radius="xl" variant="light" color={statusColor} style={{ flexShrink: 0 }}>
          {isResolved ? <CheckCircle width={20} height={20} /> : <XCircle width={20} height={20} />}
        </ThemeIcon>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} fz={rem(15)} lh={1.3}>
            {isResolved ? 'Incident resolved' : 'Incident dismissed'}
          </Text>
          <Text fz={rem(13)} c="dimmed" lh={1.4} mt={rem(2)}>
            {detail}
          </Text>
        </Box>
      </Group>
    </Card>
  );
};
