import type { ReactNode } from 'react';
import { Box, Card, Divider, Group, Text, rem } from '@mantine/core';

import { formatDay, formatTime } from '../../../shared/utils/helpers';

interface IncidentDetailSheetProps {
  cameraName: string;
  locationName: string | null;
  detectedAt: string;
  confidencePct: number;
  confidenceColor: string;
}

/** A fixed label column keeps every value on the same edge, so the sheet scans. */
const Row = ({
  label,
  value,
  secondary,
  children,
}: {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  children?: ReactNode;
}) => (
  <Group align="flex-start" wrap="nowrap" gap="md" px="md" py="sm">
    <Text fz={rem(13)} c="dimmed" lh={1.5} style={{ width: rem(92), flexShrink: 0 }}>
      {label}
    </Text>

    <Box style={{ flex: 1, minWidth: 0 }}>
      <Text fz={rem(15)} fw={600} lh={1.4} style={{ wordBreak: 'break-word' }}>
        {value}
      </Text>
      {secondary && (
        <Text fz={rem(13)} c="dimmed" lh={1.4} mt={rem(2)}>
          {secondary}
        </Text>
      )}
      {children}
    </Box>
  </Group>
);

/**
 * The record behind the frame: which camera took it, where that camera stands,
 * when it was taken, and how sure the model was.
 */
export const IncidentDetailSheet = ({
  cameraName,
  locationName,
  detectedAt,
  confidencePct,
  confidenceColor,
}: IncidentDetailSheetProps) => (
  <Card withBorder radius="lg" p={0} mb="md">
    <Row label="Camera" value={cameraName} />
    <Divider />

    <Row label="Location" value={locationName || 'Not recorded'} />
    <Divider />

    <Row
      label="Detected"
      value={formatDay(detectedAt)}
      secondary={formatTime(detectedAt)}
    />
    <Divider />

    <Row label="Confidence" value={`${confidencePct}%`}>
      <Box
        mt={rem(8)}
        h={6}
        aria-hidden
        style={{
          borderRadius: rem(99),
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-default-border)',
        }}
      >
        <Box
          h="100%"
          w={`${confidencePct}%`}
          style={{
            borderRadius: rem(99),
            backgroundColor: `var(--mantine-color-${confidenceColor}-6)`,
            transition: 'width 240ms ease',
          }}
        />
      </Box>
    </Row>
  </Card>
);
