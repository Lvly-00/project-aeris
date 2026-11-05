import { useState } from 'react';
import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  Text,
  ThemeIcon,
  Timeline,
  rem,
} from '@mantine/core';
import { ChevronDown, Clock } from '@boxicons/react';

import { formatDate } from '../../../shared/utils/helpers';
import type { TimelineStep } from './incidentMeta';

interface IncidentProgressProps {
  steps: TimelineStep[];
  /** Index Mantine's Timeline treats as reached. */
  active: number;
  isDismissed: boolean;
}

/**
 * How far the incident has moved and when it reached each step. Collapsible so
 * the rest of the page stays short, but open by default: the timestamps are
 * usually why someone opened the record.
 */
export const IncidentProgress = ({ steps, active, isDismissed }: IncidentProgressProps) => {
  const [open, setOpen] = useState(true);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card withBorder radius="lg" p="md" mb="md">
      <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
        <Group gap={rem(8)} wrap="nowrap" style={{ minWidth: 0 }}>
          <Clock width={16} height={16} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          <Text fw={700} fz={rem(15)}>
            Progress
          </Text>
          <Text fz={rem(13)} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            {doneCount} of {steps.length} steps
          </Text>
        </Group>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          radius="md"
          aria-label={open ? 'Collapse progress' : 'Expand progress'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown
            width={18}
            height={18}
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          />
        </ActionIcon>
      </Group>

      <Collapse in={open}>
        <Timeline
          active={isDismissed ? 1 : active - 1}
          bulletSize={26}
          lineWidth={2}
          color={isDismissed ? 'red' : 'green'}
          mt="md"
        >
          {steps.map((step) => (
            <Timeline.Item
              key={step.label}
              bullet={
                <ThemeIcon
                  size={26}
                  radius="xl"
                  variant={step.done ? 'filled' : 'light'}
                  color={step.done ? step.color : 'gray'}
                >
                  <step.icon width={14} height={14} />
                </ThemeIcon>
              }
              title={
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text fw={600} fz={rem(14)} c={step.done ? undefined : 'dimmed'} truncate>
                    {step.label}
                  </Text>
                  <Text
                    fz={rem(12)}
                    c="dimmed"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {step.time ? formatDate(step.time) : 'Pending'}
                  </Text>
                </Group>
              }
            />
          ))}
        </Timeline>
      </Collapse>
    </Card>
  );
};
