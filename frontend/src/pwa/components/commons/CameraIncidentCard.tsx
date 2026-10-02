import { Paper, Group, Stack, Text, Box, Badge, rem, useMantineTheme, Tooltip, Progress } from '@mantine/core';
import { Car, ChevronRight, Cloud, Flame, Video } from '@boxicons/react';
import type { CameraIncidentRow } from '../../../shared/types';
import { STATUS_COLORS } from '../../../shared/utils/constants';
import { formatRelativeTime } from '../../../shared/utils/helpers';

interface CameraIncidentCardProps {
  row: CameraIncidentRow;
  onClick?: (row: CameraIncidentRow) => void;
}

const STATUS_BADGE: Record<string, string> = {
  Detected: 'red',
  Verified: 'orange',
  Dispatched: 'blue',
  Resolved: 'green',
  Dismissed: 'gray',
};

const TYPE_ICON: Record<string, any> = {
  Fire: Flame,
  Smoke: Cloud,
  Vehicle_Accident: Car,
};

const TYPE_LABEL: Record<string, string> = {
  Fire: 'Fire',
  Smoke: 'Smoke',
  Vehicle_Accident: 'Vehicular Accident',
};

const TYPE_BADGE_COLOR: Record<string, string> = {
  Fire: 'red',
  Smoke: 'orange',
  Vehicle_Accident: 'yellow',
};

/** A camera has three possible incident types; show them all, never more. */
const MAX_TYPE_BADGES = 3;

/**
 * The Incidents page is grouped by camera, so the lead element is the camera
 * itself. The open incident type and how many detections still need reviewing
 * are supporting detail underneath.
 */
export const CameraIncidentCard = ({ row, onClick }: CameraIncidentCardProps) => {
  const theme = useMantineTheme();
  const { incident, verdict_counts: counts } = row;
  const Icon = TYPE_ICON[incident.incident_type] || Car;
  const accentColor = STATUS_COLORS[incident.status] || '#888';

  // Rows we actually retain for review. detection_count keeps counting every
  // hit even after the retention cap, so the two can differ on long incidents.
  const retained = counts.pending + counts.true + counts.false;
  const isCapped = retained > 0 && row.detection_count > retained;
  const reviewed = counts.true + counts.false;
  const total = retained;
  const reviewedPct = total > 0 ? (reviewed / total) * 100 : 0;

  // Fall back to the incident's own type if the payload predates this field.
  const allTypes =
    row.incident_types?.length
      ? row.incident_types
      : [incident.incident_type];
  const visibleTypes = allTypes.slice(0, MAX_TYPE_BADGES);
  const overflowTypes = allTypes.slice(MAX_TYPE_BADGES);

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      onClick={() => onClick?.(row)}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `${rem(5)} solid ${accentColor}`,
      }}
    >
      <Group align="flex-start" wrap="nowrap" gap="md">
        {/* Camera Icon Container */}
        <Box
          p="sm"
          style={{
            borderRadius: theme.radius.md,
            backgroundColor: 'var(--mantine-color-orange-light)',
            color: 'var(--mantine-color-orange-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: rem(45),
            height: rem(65),
          }}
        >
          <Icon size={40} fill="currentColor" strokeWidth={1.5} />
        </Box>

        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} size="lg" style={{ lineHeight: 1.2 }} truncate>
                {row.camera_name}
              </Text>
              <Group gap={6} mt={2} wrap="nowrap">
                <Video width={13} height={13} color={theme.colors.gray[6]} style={{ flexShrink: 0 }} />
                <Text size="xs" c="dimmed" style={{ minWidth: 0 }} truncate>
                  {row.location_name || 'No location set'}
                </Text>
              </Group>
            </Box>
            <Text size="xs" c="dimmed" fw={500} mt={2} style={{ whiteSpace: 'nowrap' }}>
              {formatRelativeTime(incident.detected_at)}
            </Text>
          </Group>

          <Group gap={6} mt="xs">
            <Badge
              size="sm"
              variant="light"
              color={STATUS_BADGE[incident.status] || 'gray'}
              styles={{ label: { fontWeight: 700 } }}
            >
              {incident.status}
            </Badge>

            {/* Every incident type detected on this camera, capped at 3 */}
            {visibleTypes.map((type) => (
              <Badge
                key={type}
                size="sm"
                variant="outline"
                color={TYPE_BADGE_COLOR[type] || 'gray'}
                styles={{ label: { fontWeight: 600 } }}
              >
                {TYPE_LABEL[type] || type?.replace(/_/g, ' ')}
              </Badge>
            ))}
            {overflowTypes.length > 0 && (
              <Tooltip label={overflowTypes.join(', ')} withArrow>
                <Badge size="sm" variant="outline" color="gray">
                  +{overflowTypes.length}
                </Badge>
              </Tooltip>
            )}

            {retained > 0 && (
              <Text size="xs" c="dimmed" style={{ marginLeft: 'auto', minWidth: 0 }} truncate>
                {isCapped
                  ? `showing ${retained} of ${row.detection_count}`
                  : `${retained} detection${retained === 1 ? '' : 's'}`}
              </Text>
            )}
          </Group>

          {/* Review progress — how many detections have been checked/crossed */}
          {total > 0 && (
            <Box mt="md">
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Text size="xs" c="dimmed" fw={500}>
                  Detections reviewed
                </Text>
                <Group gap={8} wrap="nowrap">
                  <Tooltip label="Confirmed real" withArrow>
                    <Group gap={2} wrap="nowrap">
                      <Text fw={700} size="xs" c="green">
                        {counts.true}
                      </Text>
                      <Text size="xs" c="dimmed">
                        true
                      </Text>
                    </Group>
                  </Tooltip>
                  <Tooltip label="False positive" withArrow>
                    <Group gap={2} wrap="nowrap">
                      <Text fw={700} size="xs" c="red">
                        {counts.false}
                      </Text>
                      <Text size="xs" c="dimmed">
                        false
                      </Text>
                    </Group>
                  </Tooltip>
                  <Text size="xs" c="dimmed">
                    of {total}
                  </Text>
                </Group>
              </Group>
              <Group gap="md">
                <Progress
                  color={reviewedPct === 100 ? 'green' : 'orange'}
                  value={reviewedPct}
                  size="sm"
                  radius="xl"
                  style={{ flex: 1 }}
                />
                {onClick && (
                  <ChevronRight width={20} height={20} color={theme.colors.gray[5]} strokeWidth={3} />
                )}
              </Group>
            </Box>
          )}
        </Stack>
      </Group>
    </Paper>
  );
};

export default CameraIncidentCard;
