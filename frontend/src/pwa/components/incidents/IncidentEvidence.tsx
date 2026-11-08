import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Image,
  Stack,
  Text,
  rem,
  useComputedColorScheme,
} from '@mantine/core';
import { Maximize, Video } from '@boxicons/react';

import type { Severity } from '../../../shared/types';
import { EvidenceLightbox } from './EvidenceLightbox';

interface IncidentEvidenceProps {
  /** Resolved media URL, or null when the detector stored no frame. */
  src: string | null;
  incidentId: number;
  typeLabel: string;
  /** Omitted where the surface does not show severity (tanod messages). */
  severity?: Severity;
  severityColor?: string;
}

/**
 * The captured frame is the evidence, so it leads the page at full width with
 * the incident type sitting inside the image. The severity chip rides next to
 * it: on a phone that is the one glance that decides how fast to act.
 */
export const IncidentEvidence = ({
  src,
  incidentId,
  typeLabel,
  severity,
  severityColor,
}: IncidentEvidenceProps) => {
  const isDark = useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        pos="relative"
        mb="md"
        style={{
          aspectRatio: '16 / 9',
          borderRadius: rem(16),
          overflow: 'hidden',
          background: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-2)',
        }}
      >
        {src ? (
          <>
            <Image
              src={src}
              alt={`Snapshot captured for incident ${incidentId}`}
              w="100%"
              h="100%"
              fit="cover"
            />

            <Box
              pos="absolute"
              inset={0}
              style={{
                background:
                  'linear-gradient(to top, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.26) 44%, rgba(0, 0, 0, 0) 72%)',
              }}
            />

            <Box pos="absolute" bottom={rem(14)} left={rem(14)} right={rem(56)}>
              <Text c="white" fz={rem(23)} fw={800} lh={1.15}>
                {typeLabel}
              </Text>

              {severity && severityColor && (
                <Group gap={rem(8)} mt={rem(8)} wrap="nowrap">
                  {/* <Badge
                    size="sm"
                    radius="sm"
                    tt="none"
                    color={severityColor}
                    styles={{ label: { fontWeight: 700 } }}
                  >
                    {severity} severity
                  </Badge> */}
                </Group>
              )}
            </Box>

            <ActionIcon
              pos="absolute"
              top={rem(10)}
              right={rem(10)}
              variant="filled"
              color="dark"
              radius="md"
              size="lg"
              aria-label="View evidence full size"
              onClick={() => setOpen(true)}
              styles={{ root: { backgroundColor: 'rgba(0, 0, 0, 0.55)' } }}
            >
              <Maximize width={18} height={18} />
            </ActionIcon>
          </>
        ) : (
          <Center h="100%">
            <Stack align="center" gap={rem(6)} px="md">
              <Video width={28} height={28} color="var(--mantine-color-dimmed)" />
              <Text fz={rem(14)} c="dimmed" ta="center">
                No snapshot was captured for this incident
              </Text>
            </Stack>
          </Center>
        )}
      </Box>

      {src && (
        <EvidenceLightbox
          opened={open}
          onClose={() => setOpen(false)}
          src={src}
          incidentId={incidentId}
        />
      )}
    </>
  );
};
