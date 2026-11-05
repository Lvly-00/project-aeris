import { useState, type ReactNode } from 'react';
import {
  Container,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  ActionIcon,
  RingProgress,
  Image,
  Box,
  Divider,
  Button,
  ThemeIcon,
  Center,
  Skeleton,
  SimpleGrid,
  Modal,
  Collapse,
  useMantineTheme,
  useComputedColorScheme,
  Timeline,
  rem,
} from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import {
  AlertCircle,
  ArrowLeft,
  Car,
  Check,
  CheckCircle,
  CheckShield,
  ChevronDown,
  Clipboard,
  Clock,
  Cloud,
  Flame,
  Maximize,
  Phone,
  RotateCcw,
  Siren,
  Star,
  Video,
  XCircle,
} from '@boxicons/react';

import { incidentsAPI, detectionsAPI, contactsAPI } from '../../../shared/services/api';
import { formatDate, formatConfidence } from '../../../shared/utils/helpers';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import { STATUS_BADGE_COLORS as STATUS_COLOR } from '../../../shared/utils/constants';
import { DetectionList } from '../../components/commons/DetectionList';
import type { Detection, Incident, IncidentStatus, DetectionVerdict } from '../../../shared/types';

const STATUS_ACTIONS: Record<string, { label: string; next: IncidentStatus; color: string; variant?: string; icon: any }[]> = {
  Detected: [
    { label: 'Verify Incident', next: 'Verified', color: 'orange', icon: CheckShield },
    { label: 'Dismiss Incident', next: 'Dismissed', color: 'red', variant: 'light', icon: XCircle },
  ],
  Verified: [
    { label: 'Dispatch Tanod', next: 'Dispatched', color: 'red', icon: Car },
    { label: 'Dismiss Incident', next: 'Dismissed', color: 'gray', variant: 'light', icon: XCircle },
  ],
  Dispatched: [
    { label: 'Mark as Resolved', next: 'Resolved', color: 'green', icon: CheckCircle },
  ],
  Resolved: [],
  Dismissed: [
    { label: 'Reopen Incident', next: 'Detected', color: 'blue', icon: RotateCcw },
  ],
};

const TYPE_INFO: Record<string, { label: string; Icon: any; recommendation: string; responder: string }> = {
  Fire: {
    label: 'Fire',
    Icon: Flame,
    recommendation: 'Emergency Escalation',
    responder: 'BFP',
  },
  Vehicle_Accident: {
    label: 'Vehicular Accident',
    Icon: Car,
    recommendation: 'Dispatch Responders',
    responder: 'NDRRMC',
  },
  Smoke: {
    label: 'Smoke',
    Icon: Cloud,
    recommendation: 'Continue Monitoring',
    responder: 'PNP',
  },
};

const SEVERITY_COLOR: Record<string, string> = {
  Low: 'gray',
  Medium: 'yellow',
  High: 'orange',
  Critical: 'red',
};

const TYPE_COLOR: Record<string, string> = {
  Fire: 'red',
  Smoke: 'orange',
  Vehicle_Accident: 'yellow',
};

const SOURCE_LABEL: Record<string, string> = {
  ai: 'AI detection',
  simulation: 'Simulated',
  manual: 'Manual entry',
};

/** Consistent card shell: readable section title, optional trailing slot. */
function SectionCard({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  icon: any;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="md" mb="md">
      <Group justify="space-between" align="center" mb="sm" wrap="wrap" gap="sm">
        <Group gap={8} wrap="nowrap">
          <Icon width={16} height={16} color="var(--mantine-color-dimmed)" />
          <Text fw={600} fz="sm">
            {title}
          </Text>
        </Group>
        {right}
      </Group>
      {children}
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box style={{ minWidth: 0 }}>
      <Text fz="xs" c="dimmed" mb={2}>
        {label}
      </Text>
      <Text fz="sm" fw={600} style={{ wordBreak: 'break-word' }}>
        {value}
      </Text>
    </Box>
  );
}

export default function IncidentDetailPage() {
  const theme = useMantineTheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const incidentId = Number(id);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);

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
   * Every AI hit recorded for this camera's incident. The camera keeps
   * re-detecting while the incident is live, so this grows over time — it
   * refetches on the same cadence the detector posts at.
   */
  const { data: detections = [], isLoading: detectionsLoading } = useQuery({
    queryKey: ['detections', incidentId],
    queryFn: async () => {
      const res = await detectionsAPI.list({
        incident: incidentId,
        ordering: '-created_at',
      });
      return (res.data.results || res.data) as Detection[];
    },
    enabled: !!incidentId,
    refetchInterval: 15000,
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

  const [pendingVerdictId, setPendingVerdictId] = useState<number | null>(null);

  /*
   * Check / cross on a single detection. Annotation only — it deliberately
   * does not touch the incident's status, which still moves through the
   * Verify/Dispatch buttons above.
   */
  const verdictMutation = useMutation({
    mutationFn: ({ id, verdict }: { id: number; verdict: DetectionVerdict }) =>
      detectionsAPI.setVerdict(id, verdict),

    onMutate: async ({ id, verdict }) => {
      setPendingVerdictId(id);
      await queryClient.cancelQueries({ queryKey: ['detections', incidentId] });
      const previous = queryClient.getQueryData(['detections', incidentId]);
      queryClient.setQueryData(['detections', incidentId], (old: Detection[] | undefined) =>
        old ? old.map((d) => (d.id === id ? { ...d, verdict } : d)) : old
      );
      return { previous };
    },

    onSuccess: (res) => {
      queryClient.setQueryData(['detections', incidentId], (old: Detection[] | undefined) =>
        old ? old.map((d) => (d.id === res.data.id ? res.data : d)) : old
      );
      // The camera row on the Incidents page shows review progress.
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },

    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['detections', incidentId], context.previous);
      }
      notifications.show({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to save verdict',
        color: 'red',
      });
    },

    onSettled: () => setPendingVerdictId(null),
  });

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
        title: 'Status Updated',
        message: `Incident marked as ${res.data.status.replace(/_/g, ' ')}`,
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

  if (isLoading) {
    return (
      <Container size="sm" py="md" pb="xl" aria-busy="true" aria-label="Loading incident">
        {/* Header: back button + incident id */}
        <Group justify="space-between" align="center" mb="md" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Skeleton h={rem(36)} w={rem(36)} radius="md" />
            <Stack gap={6}>
              <Skeleton h={rem(10)} w={rem(84)} radius="xl" />
              <Skeleton h={rem(14)} w={rem(140)} radius="xl" />
            </Stack>
          </Group>
        </Group>

        {/* Summary hero */}
        <Card withBorder radius="lg" p="lg" mb="md">
          <Group align="flex-start" gap="md" wrap="nowrap">
            <Skeleton h={rem(56)} w={rem(56)} radius="md" />

            <Stack gap={rem(10)} style={{ flex: 1, minWidth: 0 }}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Skeleton h={rem(18)} w="55%" radius="xl" />
                <Skeleton h={rem(24)} w={rem(92)} radius="sm" />
              </Group>
              <Skeleton h={rem(12)} w="40%" radius="xl" />
              <Skeleton h={rem(20)} w={rem(110)} radius="sm" />
              <Skeleton h={rem(12)} w="55%" radius="xl" />
            </Stack>
          </Group>
        </Card>

        {/* Status timeline */}
        <Card withBorder radius="lg" p="lg" mb="md">
          <Group justify="space-between" mb="md" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Skeleton h={rem(16)} w={rem(16)} radius="sm" />
              <Skeleton h={rem(13)} w={rem(110)} radius="xl" />
            </Group>
            <Skeleton h={rem(24)} w={rem(24)} radius="sm" />
          </Group>

          <Stack gap="sm">
            {[0, 1, 2, 3].map((step) => (
              <Group key={step} gap="md" wrap="nowrap">
                <Skeleton h={rem(22)} w={rem(22)} circle />
                <Skeleton h={rem(12)} w={`${58 - step * 8}%`} radius="xl" />
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Evidence */}
        <Card withBorder radius="lg" p="lg" mb="md">
          <Group gap="xs" mb="md" wrap="nowrap">
            <Skeleton h={rem(16)} w={rem(16)} radius="sm" />
            <Skeleton h={rem(13)} w={rem(90)} radius="xl" />
          </Group>
          <Skeleton h={rem(180)} radius="md" />
        </Card>

        {/* Status actions */}
        <Group grow gap="sm" wrap="nowrap">
          <Skeleton h={rem(38)} radius="md" />
          <Skeleton h={rem(38)} radius="md" />
        </Group>
      </Container>
    );
  }

  if (!incident) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md" py="xl" style={{ textAlign: 'center' }}>
          <ThemeIcon size={80} radius="xl" color={isDark ? 'gray.9' : 'gray.1'}>
            <AlertCircle width={40} height={40} color={isDark ? theme.colors.gray[4] : theme.colors.gray[5]} />
          </ThemeIcon>
          <Text fw={700} fz="xl">Incident Not Found</Text>
          <Text c="dimmed">This incident does not exist.</Text>
          <Button variant="subtle" onClick={() => navigate('/pwa/admin/incidents')}>
            Back to Incidents
          </Button>
        </Stack>
      </Container>
    );
  }

  const typeInfo = TYPE_INFO[incident.incident_type] || TYPE_INFO.Fire;
  const status = incident.status;
  const statusColor = STATUS_COLOR[status] || 'gray';
  const typeColor = TYPE_COLOR[incident.incident_type] || 'gray';
  const severityColor = SEVERITY_COLOR[incident.severity] || 'gray';
  const cameraName = incident.camera_name
    || (incident.camera ? `Camera #${incident.camera}` : 'Unknown camera');

  const activeStep =
    status === 'Verified' ? 2 :
      status === 'Dispatched' ? 3 :
        status === 'Resolved' ? 4 : 1;

  const isResolved = status === 'Resolved';
  const isDismissed = status === 'Dismissed';

  const confidencePct = Math.round(incident.confidence_score * 100);
  const confidenceLabel =
    confidencePct >= 85 ? 'Very high'
      : confidencePct >= 70 ? 'High'
        : confidencePct >= 50 ? 'Moderate'
          : 'Low';

  const evidenceSrc = resolveMediaUrl(incident.evidence_image);

  /*
   * Dismissed incidents show a red Detected -> Dismissed timeline,
   * everything else shows the full active flow. Each step carries its
   * own timestamp so the operator can see when it actually happened.
   */
  type TimelineStep = {
    label: string;
    time: string | null;
    done: boolean;
    color: string;
    icon: any;
  };
  const timelineSteps: TimelineStep[] = isDismissed
    ? [
      { label: 'Detected', time: incident.detected_at, done: true, color: 'red', icon: AlertCircle },
      { label: 'Dismissed', time: incident.dismissed_at, done: true, color: 'red', icon: XCircle },
    ]
    : [
      { label: 'Detected', time: incident.detected_at, done: activeStep > 0, color: 'red', icon: AlertCircle },
      { label: 'Verified', time: incident.verified_at, done: activeStep > 1, color: 'orange', icon: CheckShield },
      { label: 'Dispatched', time: incident.dispatched_at, done: activeStep > 2, color: 'blue', icon: Car },
      { label: 'Resolved', time: incident.resolved_at, done: activeStep > 3, color: 'green', icon: CheckCircle },
    ];

  const actions = STATUS_ACTIONS[status] || [];

  return (
    <Container size="sm" py="md" pb="xl">
      {/* Page header */}
      <Group justify="space-between" align="center" mb="md" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft width={18} height={18} />
          </ActionIcon>
          <Box style={{ minWidth: 0 }}>
            <Text fz="xs" c="dimmed" fw={600}>
              Incident details
            </Text>
            <Text fw={700} fz="md" truncate>
              INC-2026-{String(incident.id).padStart(6, '0')}
            </Text>
          </Box>
        </Group>
      </Group>

      {/* Summary hero */}
      <Card
        withBorder
        radius="lg"
        p="lg"
        mb="md"
        pos="relative"
        style={{ overflow: 'hidden' }}
      >
        <Box pos="absolute" top={0} left={0} right={0} h={4} bg={`${statusColor}.6`} />

        <Group align="flex-start" gap="md" wrap="nowrap" mt={4}>
          <ThemeIcon
            size={56}
            radius="md"
            variant="light"
            color={statusColor}
            style={{ flexShrink: 0 }}
          >
            <Video width={28} height={28} />
          </ThemeIcon>

          <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8} align="center" wrap="nowrap">
              <Text
                fw={800}
                fz="lg"
                lh={1.2}
                truncate
                title={typeInfo.label}
                style={{ flex: 1, minWidth: 0 }}
              >
                {typeInfo.label}
              </Text>

              {/* Status badge beside the incident name */}
              <Badge
                variant="light"
                color={statusColor}
                size="md"
                radius="sm"
                tt="none"
                style={{ flexShrink: 0 }}
                leftSection={
                  <Box
                    w={6}
                    h={6}
                    bg={`${statusColor}.6`}
                    style={{ borderRadius: '50%' }}
                  />
                }
                styles={{ label: { fontWeight: 700 } }}
              >
                {status}
              </Badge>
            </Group>

            {/* Camera where the incident was detected */}
            <Group gap={6} wrap="nowrap">
              <Video width={14} height={14} color="var(--mantine-color-dimmed)" />
              <Text fz="xs" c="dimmed" truncate title={cameraName}>
                {cameraName}
              </Text>
            </Group>

            <Group gap={6} wrap="wrap">
              <Badge
                variant="light"
                color={severityColor}
                size="sm"
                radius="sm"
                tt="none"
                styles={{ label: { fontWeight: 600 } }}
              >
                {incident.severity} severity
              </Badge>
            </Group>

            <Group gap={6} wrap="nowrap">
              <Clock width={14} height={14} color="var(--mantine-color-dimmed)" />
              <Text fz="xs" c="dimmed" truncate>
                {formatDate(incident.detected_at)}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Card>


      {/* Status timeline */}
      <SectionCard
        title="Status timeline"
        icon={Clock}
        right={
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            aria-label={timelineOpen ? 'Collapse status timeline' : 'Expand status timeline'}
            aria-expanded={timelineOpen}
            onClick={() => setTimelineOpen((open) => !open)}
          >
            <ChevronDown
              width={16}
              height={16}
              style={{
                transform: timelineOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}
            />
          </ActionIcon>
        }
      >
        <Collapse in={timelineOpen}>
          <Timeline
            active={isDismissed ? 1 : activeStep - 1}
            bulletSize={28}
            lineWidth={2}
            color={isDismissed ? 'red' : 'green'}
          >
            {timelineSteps.map((step) => (
              <Timeline.Item
                key={step.label}
                bullet={
                  <ThemeIcon
                    size={28}
                    radius="xl"
                    variant={step.done ? 'filled' : 'light'}
                    color={step.done ? step.color : 'gray'}
                  >
                    <step.icon width={15} height={15} />
                  </ThemeIcon>
                }
                title={
                  <Group justify="space-between" gap="xs" wrap="wrap">
                    <Text fw={600} fz="sm" c={step.done ? undefined : 'dimmed'}>
                      {step.label}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {step.time ? formatDate(step.time) : 'Pending'}
                    </Text>
                  </Group>
                }
              />
            ))}
          </Timeline>
        </Collapse>
      </SectionCard>

      <SimpleGrid cols={2} spacing="md" mb="md">
        {/* Detection confidence */}
        <Card withBorder radius="lg" p="md">
          <Group justify="space-between" align="center" mb="sm" wrap="wrap" gap="sm">
            <Group gap={8} wrap="nowrap">
              <CheckShield width={16} height={16} color="var(--mantine-color-dimmed)" />
              <Text fw={600} fz="sm">
                Detection confidence
              </Text>
            </Group>
            <Badge variant="light" color="orange" size="sm" radius="sm" tt="none">
              {confidenceLabel}
            </Badge>
          </Group>

          <Group justify="space-between" align="center" gap="md" wrap="nowrap">
            <RingProgress
              size={64}
              thickness={7}
              roundCaps
              sections={[{ value: confidencePct, color: 'orange' }]}
              label={
                <Text fw={800} fz="sm" ta="center">
                  {confidencePct}%
                </Text>
              }
            />

            <Text fz="xs" c="dimmed" lh={1.5} style={{ flex: 1, minWidth: 0 }}>
              {confidenceLabel} confidence this is a real{' '}
              {incident.incident_type.replace(/_/g, ' ').toLowerCase()}.
            </Text>
          </Group>
        </Card>

        {/* Emergency call */}
        <Card withBorder radius="lg" p="md">
          <Group gap={8} wrap="nowrap" mb="sm">
            <Phone width={16} height={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} fz="sm">
              Emergency call
            </Text>
          </Group>

          <Stack gap="sm">
            <Button
              component="a"
              href={callContact ? `tel:${callContact.phone_number}` : undefined}
              color="red"
              radius="md"
              size="md"
              fullWidth
              disabled={!callContact}
              leftSection={<Phone width={16} height={16} />}
            >
              Call {typeInfo.responder}
            </Button>

            <Stack gap={2}>
              {callContact ? (
                <>
                  <Text fz="xs" fw={600} lh={1.3}>
                    {callContact.name}
                  </Text>
                  <Text fz="xs" c="dimmed" lh={1.3}>
                    {callContact.phone_number}
                  </Text>
                </>
              ) : (
                <Text fz="xs" c="dimmed" lh={1.5}>
                  No contact configured.
                </Text>
              )}
            </Stack>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Evidence */}
      <SectionCard
        title="Evidence"
        icon={Video}
        right={
          <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
            {incident.incident_type.replace(/_/g, ' ')}
          </Badge>
        }
      >
        {evidenceSrc ? (
          <>
            <Box
              pos="relative"
              style={{
                aspectRatio: '16 / 9',
                borderRadius: theme.radius.md,
                overflow: 'hidden',
                background: 'var(--mantine-color-default-hover)',
              }}
            >
              <Image
                src={evidenceSrc}
                alt={`Evidence captured for incident ${incident.id}`}
                w="100%"
                h="100%"
                fit="cover"
              />

              <Badge
                pos="absolute"
                top={10}
                left={10}
                variant="filled"
                color="dark"
                radius="sm"
                size="sm"
                tt="none"
                styles={{
                  root: { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
                  label: { fontWeight: 600 },
                }}
              >
                {formatConfidence(incident.confidence_score)} confidence
              </Badge>

              <ActionIcon
                pos="absolute"
                bottom={10}
                right={10}
                variant="filled"
                color="dark"
                radius="md"
                size="md"
                aria-label="View evidence full size"
                onClick={() => setEvidenceOpen(true)}
                styles={{ root: { backgroundColor: 'rgba(0, 0, 0, 0.65)' } }}
              >
                <Maximize width={16} height={16} />
              </ActionIcon>
            </Box>

            <Modal
              opened={evidenceOpen}
              onClose={() => setEvidenceOpen(false)}
              title={<Text fw={700}>Incident evidence</Text>}
              size="xl"
              centered
              radius="lg"
              padding="md"
            >
              <Image
                src={evidenceSrc}
                alt={`Evidence captured for incident ${incident.id}`}
                w="100%"
                radius="md"
              />
            </Modal>
          </>
        ) : (
          <Box
            style={{
              aspectRatio: '16 / 9',
              borderRadius: theme.radius.md,
              background: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)',
              border: '1px dashed var(--mantine-color-default-border)',
            }}
          >
            <Center h="100%">
              <Stack align="center" gap={6}>
                <ThemeIcon variant="light" color="gray" size={44} radius="xl">
                  <Video width={22} height={22} />
                </ThemeIcon>
                <Text fz="xs" c="dimmed">
                  No snapshot captured for this incident
                </Text>
              </Stack>
            </Center>
          </Box>
        )}
      </SectionCard>


      {/* Closed-state banner */}
      {(isResolved || isDismissed) && (
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
            <ThemeIcon size={40} radius="xl" variant="light" color={statusColor} style={{ flexShrink: 0 }}>
              {isResolved
                ? <CheckCircle width={22} height={22} />
                : <XCircle width={22} height={22} />}
            </ThemeIcon>

            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} fz="sm">
                {isResolved ? 'Incident resolved' : 'Incident dismissed'}
              </Text>
              <Text fz="xs" c="dimmed">
                {isResolved
                  ? (incident.resolved_at
                    ? formatDate(incident.resolved_at)
                    : 'This incident has been closed.')
                  : (incident.dismissed_at
                    ? formatDate(incident.dismissed_at)
                    : 'This incident was dismissed.')}
              </Text>
            </Box>
          </Group>
        </Card>
      )}

      {/* Primary actions, kept near the top of the page */}
      {actions.length > 0 && (
        <Card withBorder radius="lg" p="md" mb="md">
          <Stack gap="sm">
            {actions.map((action, index) => {
              const isPrimary = index === 0;
              const isThisPending =
                statusMutation.isPending && statusMutation.variables === action.next;

              return (
                <Button
                  key={action.next}
                  fullWidth
                  size="md"
                  radius="md"
                  color={action.color}
                  variant={isPrimary ? 'filled' : ((action.variant as any) || 'light')}
                  leftSection={<action.icon width={18} height={18} />}
                  loading={isThisPending}
                  disabled={statusMutation.isPending && !isThisPending}
                  onClick={() => statusMutation.mutate(action.next)}
                >
                  {action.label}
                </Button>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* Back for closed incidents */}
      {(isResolved || isDismissed) && (
        <Button
          fullWidth
          size="md"
          radius="md"
          variant="default"
          leftSection={<ArrowLeft width={18} height={18} />}
          onClick={goBack}
          mb="md"
        >
          Back to incidents
        </Button>
      )}
    </Container>
  );
}
