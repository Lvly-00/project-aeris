import { useMemo } from 'react';
import { Card, Text, Group, Stack, Image, ActionIcon, ThemeIcon, Badge, ScrollArea, Skeleton, Tooltip, useMantineTheme } from '@mantine/core';
import { Car, Check, Cloud, Flame, X, RotateCcw } from '@boxicons/react';

import type { Detection, DetectionVerdict } from '../../../shared/types';
import { formatRelativeTime } from '../../../shared/utils/helpers';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';

interface DetectionListProps {
  detections: Detection[];
  isLoading: boolean;
  onVerdict: (id: number, verdict: DetectionVerdict) => void;
  isPendingId: number | null;
  /** Lifetime hit count, which exceeds the listed rows once the cap applies. */
  totalHits?: number;
}

const TYPE_ICON: Record<string, any> = {
  Fire: Flame,
  Smoke: Cloud,
  Vehicle_Accident: Car,
};

const TYPE_COLOR: Record<string, string> = {
  Fire: 'red',
  Smoke: 'orange',
  Vehicle_Accident: 'yellow',
};

/**
 * The list of individual AI detections recorded for this camera's incident.
 *
 * Each row is one hit with a check (real incident) and a cross (false
 * positive) so an operator can triage the hits one by one. Setting a verdict
 * is an annotation only — it does not move the incident's own status.
 */
export const DetectionList = ({ detections, isLoading, onVerdict, isPendingId, totalHits }: DetectionListProps) => {
  const theme = useMantineTheme();

  const uniqueDetections = useMemo(() => {
    const seen = new Set<number>();
    const result: Detection[] = [];
    for (const d of detections) {
      // One row per incident so a repeated detection never shows twice.
      const key = (d as any).incident || d.id;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(d);
      }
    }
    return result;
  }, [detections]);

  const counts = useMemo(
    () => ({
      pending: uniqueDetections.filter((d) => d.verdict === 'pending').length,
      true: uniqueDetections.filter((d) => d.verdict === 'true').length,
      false: uniqueDetections.filter((d) => d.verdict === 'false').length,
    }),
    [uniqueDetections]
  );

  const isCapped = !!totalHits && totalHits > uniqueDetections.length;

  /* Placeholder rows keep the incident detail sections from jumping. */
  if (isLoading) {
    return (
      <Stack gap="xs" aria-busy="true" aria-label="Loading detections">
        {[0, 1, 2].map((placeholder) => (
          <Card key={placeholder} withBorder radius="md" p="sm">
            <Group wrap="nowrap" gap="sm">
              <Skeleton h={52} w={64} radius="sm" />

              <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                <Skeleton h={12} w="40%" radius="xl" />
                <Skeleton h={10} w="25%" radius="xl" />
              </Stack>

              <Skeleton h={32} w={76} radius="xl" />
            </Group>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {/* Summary */}
      <Group gap={6} wrap="wrap">
        <Badge size="sm" variant="light" color="gray" radius="sm" tt="none" styles={{ label: { fontWeight: 700 } }}>
          {uniqueDetections.length} listed
        </Badge>
        <Badge size="sm" variant="light" color="green" radius="sm" tt="none" styles={{ label: { fontWeight: 700 } }}>
          {counts.true} true
        </Badge>
        <Badge size="sm" variant="light" color="red" radius="sm" tt="none" styles={{ label: { fontWeight: 700 } }}>
          {counts.false} false
        </Badge>
        {counts.pending > 0 && (
          <Badge size="sm" variant="light" color="yellow" radius="sm" tt="none" styles={{ label: { fontWeight: 700 } }}>
            {counts.pending} pending
          </Badge>
        )}
      </Group>

      {isCapped && (
        <Text fz="xs" c="dimmed">
          Showing the most recent {uniqueDetections.length} of {totalHits} hits.
        </Text>
      )}

      <ScrollArea.Autosize mah={340} offsetScrollbars type="auto">
        <Stack gap="xs" pr={4}>
          {uniqueDetections.map((detection) => {
            const Icon = TYPE_ICON[detection.incident_type] || Car;
            const color = TYPE_COLOR[detection.incident_type] || 'gray';
            const busy = isPendingId === detection.id;

            return (
              <Card
                key={detection.id}
                withBorder
                radius="md"
                p="sm"
                style={{
                  opacity: busy ? 0.6 : 1,
                  borderColor:
                    detection.verdict === 'true'
                      ? theme.colors.green[4]
                      : detection.verdict === 'false'
                        ? theme.colors.red[4]
                        : undefined,
                }}
              >
                <Group wrap="nowrap" gap="sm">
                  {/* Snapshot thumbnail */}
                  {detection.snapshot_image ? (
                    <Image
                      src={resolveMediaUrl(detection.snapshot_image)}
                      w={64}
                      h={52}
                      fit="cover"
                      radius="sm"
                      fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
                    />
                  ) : (
                    <ThemeIcon size={52} radius="sm" variant="light" color={color}>
                      <Icon size={26} />
                    </ThemeIcon>
                  )}

                  {/* Detection info */}
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <Text fw={600} fz="sm" truncate>
                        {detection.incident_type?.replace(/_/g, ' ')}
                      </Text>
                      <Badge size="xs" variant="light" color="gray" radius="sm" tt="none" styles={{ label: { fontWeight: 600 } }}>
                        {Math.round(detection.confidence_score * 100)}%
                      </Badge>
                    </Group>
                    <Text fz="xs" c="dimmed" truncate>
                      {formatRelativeTime(detection.frame_timestamp || detection.created_at)}
                    </Text>
                    {detection.reviewed_by_name && (
                      <Text fz="xs" c="dimmed" truncate>
                        Reviewed by {detection.reviewed_by_name}
                      </Text>
                    )}
                  </Stack>

                  {/* Check / cross */}
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Real incident" withArrow>
                      <ActionIcon
                        variant={detection.verdict === 'true' ? 'filled' : 'light'}
                        color="green"
                        size="lg"
                        radius="xl"
                        loading={busy}
                        aria-label={`Mark detection ${detection.id} as a real incident`}
                        onClick={() => onVerdict(detection.id, 'true')}
                      >
                        <Check width={18} height={18} strokeWidth={3} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="False positive" withArrow>
                      <ActionIcon
                        variant={detection.verdict === 'false' ? 'filled' : 'light'}
                        color="red"
                        size="lg"
                        radius="xl"
                        loading={busy}
                        aria-label={`Mark detection ${detection.id} as a false positive`}
                        onClick={() => onVerdict(detection.id, 'false')}
                      >
                        <X width={18} height={18} strokeWidth={3} />
                      </ActionIcon>
                    </Tooltip>

                    {detection.verdict !== 'pending' && (
                      <Tooltip label="Reset" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          radius="xl"
                          loading={busy}
                          aria-label={`Reset verdict for detection ${detection.id}`}
                          onClick={() => onVerdict(detection.id, 'pending')}
                        >
                          <RotateCcw width={14} height={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
};

export default DetectionList;
