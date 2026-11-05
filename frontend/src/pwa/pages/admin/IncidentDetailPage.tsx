import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  rem,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { AlertCircle, ChevronLeft } from '@boxicons/react';

import { incidentsAPI, contactsAPI, camerasAPI } from '../../../shared/services/api';
import { formatRelativeTime } from '../../../shared/utils/helpers';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import { STATUS_BADGE_COLORS as STATUS_COLOR } from '../../../shared/utils/constants';
import { IncidentActions } from '../../components/incidents/IncidentActions';
import { IncidentClosedNotice } from '../../components/incidents/IncidentClosedNotice';
import { IncidentContact } from '../../components/incidents/IncidentContact';
import { IncidentDetailSheet } from '../../components/incidents/IncidentDetailSheet';
import { IncidentDetailSkeleton } from '../../components/incidents/IncidentDetailSkeleton';
import { IncidentEvidence } from '../../components/incidents/IncidentEvidence';
import { IncidentProgress } from '../../components/incidents/IncidentProgress';
import {
  INCIDENT_TYPE_INFO,
  SEVERITY_COLOR,
  STATUS_ACTIONS,
  buildTimelineSteps,
  confidenceBand,
  statusStepIndex,
} from '../../components/incidents/incidentMeta';
import type { Camera, Incident, IncidentStatus } from '../../../shared/types';

/**
 * One incident, end to end: the frame that triggered it, the record behind the
 * frame, how far it has moved, who to call, and the transitions it still
 * allows. The sections live in components/incidents/; this file owns the data.
 */
export default function IncidentDetailPage() {
  const theme = useMantineTheme();
  const isDark = useComputedColorScheme('light', { getInitialValueInEffect: true }) === 'dark';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const incidentId = Number(id);

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const res = await incidentsAPI.get(incidentId);
      return res.data as Incident;
    },
    enabled: !!incidentId,
    refetchInterval: 10000,
  });

  /*
   * The incident record only carries the camera's id and name. Its location
   * lives on the camera, so it is read from there for the detail sheet.
   */
  const { data: camera } = useQuery({
    queryKey: ['camera', incident?.camera],
    queryFn: async () => {
      const res = await camerasAPI.get(incident!.camera as number);
      return res.data as Camera;
    },
    enabled: !!incident?.camera,
    staleTime: 5 * 60 * 1000,
  });

  /*
   * Emergency contact for this incident type — powers the Call button.
   * No contact configured means the button renders disabled.
   */
  const { data: emergencyContacts = [] } = useQuery({
    queryKey: ['contacts', incident?.incident_type],
    queryFn: async () => {
      const res = await contactsAPI.list({
        incident_type: incident?.incident_type,
        is_active: true,
      });
      return (res.data.results || res.data) as {
        id: number;
        name: string;
        phone_number: string;
      }[];
    },
    enabled: !!incident,
  });
  const callContact = emergencyContacts[0];

  const statusMutation = useMutation({
    mutationFn: (newStatus: IncidentStatus) =>
      incidentsAPI.statusTransition(incidentId, newStatus),

    /*
     * Optimistic update: repaint the UI in the same tick as the click,
     * before the network round-trip finishes.
     */
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['incident', incidentId] });
      const previous = queryClient.getQueryData(['incident', incidentId]);
      queryClient.setQueryData(['incident', incidentId], (old: Incident | undefined) =>
        old ? { ...old, status: newStatus } : old
      );
      return { previous };
    },

    onSuccess: (res) => {
      // Replace the optimistic data with the server's authoritative record.
      queryClient.setQueryData(['incident', incidentId], res.data);

      /*
       * Closed incidents must appear in History right away. Invalidate
       * directly here — don't rely on the WebSocket broadcast, which can
       * be missed if the socket reconnects.
       */
      if (res.data.status === 'Resolved' || res.data.status === 'Dismissed') {
        queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      }

      notifications.show({
        title: 'Status updated',
        message: `Incident marked as ${res.data.status.replace(/_/g, ' ').toLowerCase()}`,
        color: 'green',
      });
    },

    onError: (err: any, _newStatus, context) => {
      // Roll back to the real state if the server rejected the transition.
      if (context?.previous) {
        queryClient.setQueryData(['incident', incidentId], context.previous);
      }
      notifications.show({
        title: 'Error',
        message: err.response?.data?.error || err.response?.data?.detail || 'Failed to update status',
        color: 'red',
      });
    },
  });

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/pwa/admin/incidents');
    }
  };

  if (isLoading) return <IncidentDetailSkeleton />;

  if (!incident) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md" py="xl" style={{ textAlign: 'center' }}>
          <ThemeIcon size={72} radius="xl" color={isDark ? 'gray.9' : 'gray.1'}>
            <AlertCircle
              width={36}
              height={36}
              color={isDark ? theme.colors.gray[4] : theme.colors.gray[5]}
            />
          </ThemeIcon>
          <Stack gap={rem(4)} align="center">
            <Text fw={700} fz={rem(19)}>
              Incident not found
            </Text>
            <Text fz={rem(15)} c="dimmed" maw={260}>
              This incident no longer exists or the link is wrong.
            </Text>
          </Stack>
          <Button
            variant="subtle"
            size="md"
            radius="md"
            onClick={() => navigate('/pwa/admin/incidents')}
          >
            Back to incidents
          </Button>
        </Stack>
      </Container>
    );
  }

  const typeInfo = INCIDENT_TYPE_INFO[incident.incident_type] ?? INCIDENT_TYPE_INFO.Fire;
  const status = incident.status;
  const statusColor = STATUS_COLOR[status] || 'gray';
  const severityColor = SEVERITY_COLOR[incident.severity] || 'gray';
  const cameraName = incident.camera_name
    || (incident.camera ? `Camera #${incident.camera}` : 'Unknown camera');

  const isResolved = status === 'Resolved';
  const isDismissed = status === 'Dismissed';

  const confidencePct = Math.round(incident.confidence_score * 100);
  const band = confidenceBand(confidencePct);

  const steps = buildTimelineSteps(incident);
  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <Container size="sm" py="md" pb="xl" px={0}>
      {/* Identity: which record this is, and where it currently stands */}
      <Group justify="space-between" align="center" gap="sm" wrap="nowrap" mb="md">
        <Group gap={rem(6)} wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="md"
            onClick={goBack}
            aria-label="Go back"
            style={{ flexShrink: 0 }}
          >
            <ChevronLeft width={24} height={24} />
          </ActionIcon>

          <Box style={{ minWidth: 0 }}>
            <Text fw={800} fz={rem(20)} lh={1.2} truncate>
              INC-{new Date().getFullYear()}-{String(incident.id).padStart(6, '0')}
            </Text>
            <Text fz={rem(13)} c="dimmed" lh={1.4} mt={rem(2)} truncate>
              Detected {formatRelativeTime(incident.detected_at)}
            </Text>
          </Box>
        </Group>

        <Badge
          variant="light"
          color={statusColor}
          size="lg"
          radius="sm"
          tt="none"
          styles={{ label: { fontWeight: 700 } }}
        >
          {status}
        </Badge>
      </Group>

      <IncidentEvidence
        src={resolveMediaUrl(incident.evidence_image) ?? null}
        incidentId={incident.id}
        typeLabel={typeInfo.label}
        severity={incident.severity}
        severityColor={severityColor}
      />

      <IncidentDetailSheet
        cameraName={cameraName}
        locationName={camera?.location_name || null}
        detectedAt={incident.detected_at}
        confidencePct={confidencePct}
        confidenceLabel={band.label}
        confidenceColor={band.color}
      />

      <IncidentProgress
        steps={steps}
        active={statusStepIndex(status)}
        isDismissed={isDismissed}
      />

      <IncidentContact contact={callContact} responder={typeInfo.responder} />

      <IncidentActions
        actions={actions}
        pendingStatus={statusMutation.variables}
        isPending={statusMutation.isPending}
        onAction={(next) => statusMutation.mutate(next)}
      />
    </Container>
  );
}
