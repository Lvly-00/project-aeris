import React from 'react';
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
  SimpleGrid,
  Divider,
  Button,
  rem,
  ThemeIcon,
  Loader,
  Center,
  useMantineTheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import {
  ArrowLeft,
  Bell,
  Flame,
  Clock,
  Maximize,
  Video,
  MapPin,
  Sparkles,
  Truck,
  ShieldCheck,
  XCircle,
  CheckCircle,
  EyeOff,
  Check,
  RotateCcw,
  Car,
  CloudFog,
  Siren,
  AlertTriangle,
} from 'lucide-react';

import { incidentsAPI } from '../../../shared/services/api';
import { STATUS_COLORS, SEVERITY_COLORS } from '../../../shared/utils/constants';
import { formatDate, formatConfidence } from '../../../shared/utils/helpers';
import type { Incident, IncidentStatus } from '../../../shared/types';


const STATUS_ACTIONS: Record<string, { label: string; next: IncidentStatus; color: string; variant?: string; icon: any }[]> = {
  Detected: [
    { label: 'Incident Verified', next: 'Verified', color: 'orange', icon: ShieldCheck },
    { label: 'Dismiss Incident', next: 'Dismissed', color: 'red', variant: 'outline', icon: XCircle },
  ],
  Verified: [
    { label: 'Dispatch Tanod', next: 'Dispatched', color: 'red', icon: Truck },
    { label: 'Dismiss', next: 'Dismissed', color: 'gray', variant: 'subtle', icon: XCircle },
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
    label: 'FIRE',
    Icon: Flame,
    recommendation: 'Emergency Escalation',
    responder: 'BFP',
  },
  Vehicle_Accident: {
    label: 'VEHICULAR ACCIDENT',
    Icon: Car,
    recommendation: 'Dispatch Responders',
    responder: 'NDRRMC',
  },
  Smoke: {
    label: 'SMOKE',
    Icon: CloudFog,
    recommendation: 'Continue Monitoring',
    responder: 'Barangay Tanod',
  },
};

const STATUS_BADGE_COLOR: Record<string, string> = {
  Detected: 'red',
  Verified: 'orange',
  Dispatched: 'blue',
  Resolved: 'green',
  Dismissed: 'gray',
};

export default function IncidentDetailPage() {
  const theme = useMantineTheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
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
      navigate('/pwa/incidents');
    }
  };

  if (isLoading) {
    return (
      <Container size="xs" py="xl">
        <Center h={300}>
          <Loader variant="dots" color="blue" />
        </Center>
      </Container>
    );
  }

  if (!incident) {
    return (
      <Container size="xs" py="xl">
        <Stack align="center" gap="md" py="xl" style={{ textAlign: 'center' }}>
          <ThemeIcon size={80} radius="xl" color={isDark ? 'gray.9' : 'gray.1'}>
            <AlertTriangle size={40} color={isDark ? theme.colors.gray[4] : theme.colors.gray[5]} />
          </ThemeIcon>
          <Text fw={700} fz="xl">Incident Not Found</Text>
          <Text c="dimmed">This incident does not exist.</Text>
          <Button variant="subtle" onClick={() => navigate('/pwa/incidents')}>
            Back to Incidents
          </Button>
        </Stack>
      </Container>
    );
  }

  const typeInfo = TYPE_INFO[incident.incident_type] || TYPE_INFO.Fire;
  const status = incident.status;
  const statusColor = STATUS_COLORS[status] || SEVERITY_COLORS[incident.severity] || '#888';


  const activeStep =
    status === 'Verified' ? 2 :
      status === 'Dispatched' ? 3 :
        status === 'Resolved' ? 4 : 1;

  const isResolved = status === 'Resolved';
  const isDismissed = status === 'Dismissed';
  const cardBg = isDismissed
    ? (isDark ? 'gray.9' : 'gray.0')
    : isResolved
      ? (isDark ? 'green.9' : 'green.0')
      : status === 'Verified'
        ? (isDark ? 'orange.9' : 'orange.0')
        : (isDark ? 'red.9' : 'red.0');
  const borderBase = isDismissed ? 'gray' : isResolved ? 'green' : 'red';
  const cardBorder = isDark
    ? `var(--mantine-color-${borderBase}-9)`
    : theme.colors[borderBase as 'green' | 'red'][1];

  /*
   * Dismissed incidents show a red Detected -> Dismissed timeline,
   * everything else shows the full active flow.
   */
  type TimelineStep = { label: string; color?: string; done?: boolean };
  const timelineSteps: TimelineStep[] = isDismissed
    ? [
      { label: 'Detected', color: 'red' },
      { label: 'Dismissed', color: 'red' },
    ]
    : [
      { label: 'Detected', done: activeStep > 0 },
      { label: 'Verified', done: activeStep > 1 },
      { label: 'Dispatch', done: activeStep > 2 },
      { label: 'Resolved', done: activeStep > 3 },
    ];

  const actions = STATUS_ACTIONS[status] || [];

  return (
    <Container size="xs" py="md" bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group>
          <ActionIcon variant="subtle" color="gray" onClick={goBack}>
            <ArrowLeft size={20} />
          </ActionIcon>
          <Text fw={700} fz="lg">INC-2026-{String(incident.id).padStart(6, '0')}</Text>
        </Group>
      </Group>

      {/* Main Alert Card */}
      <Card
        radius="lg"
        p="md"
        mb="md"
        bg={cardBg}
        withBorder
        style={{
          borderColor: cardBorder,
          overflow: "hidden",
        }}
      >
        <Group
          align="center"
          gap="md"
          wrap="nowrap"
        >
          {/* Incident Icon */}
          <ThemeIcon
            size={64}
            radius="50%"
            color={
              isDismissed
                ? isDark
                  ? "gray.9"
                  : "gray.1"
                : isResolved
                  ? isDark
                    ? "green.9"
                    : "green.1"
                  : isDark
                    ? "red.9"
                    : "red.1"
            }
            style={{
              flexShrink: 0,
            }}
          >
            <typeInfo.Icon
              size={34}
              color={isDark ? theme.colors.red[4] : theme.colors.red[6]}
              fill={isDark ? theme.colors.red[4] : theme.colors.red[6]}
            />
          </ThemeIcon>

          {/* Incident Information */}
          <Stack
            gap={4}
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* Title */}
            <Text
              fw={800}
              fz="xl"
              lh={1}
              truncate
            >
              {typeInfo.label}
            </Text>

            {/* Status */}
            <Badge
              variant="light"
              color={
                status === "Dismissed"
                  ? "gray"
                  : status === "Detected"
                    ? "red"
                    : status === "Verified"
                      ? "orange"
                      : "green"
              }
              size="sm"
              radius="xl"
              w="fit-content"
              styles={{
                label: {
                  fontWeight: 800,
                },
              }}
            >
              {status.toUpperCase()}
            </Badge>

            {/* Detected Time */}
            <Group gap={5} mt={2} wrap="nowrap">
              <Clock
                size={16}
                color={theme.colors.gray[6]}
                style={{ flexShrink: 0 }}
              />

              <Text
                c="dimmed"
                fz="sm"
                fw={400}
                truncate
              >
                Detected: {formatDate(incident.detected_at)}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Card>

      {/* Status Timeline */}
      <Card withBorder radius="lg" p="md" mb="md">
        <Text
          fw={700}
          fz="xs"
          c="dimmed"
          tt="uppercase"
          mb="lg"
        >
          Status Timeline
        </Text>

        <Group gap={0} align="flex-start" wrap="nowrap">
          {timelineSteps.map((step, index, arr) => (
            <React.Fragment key={step.label}>
              <Stack align="center" gap={6} style={{ flex: 1, minWidth: 0 }}>
                <ThemeIcon
                  size={32}
                  radius="xl"
                  variant="filled"
                  color={step.color || (step.done ? 'green' : 'gray')}
                >
                  <Check size={16} />
                </ThemeIcon>

                <Text
                  size="xs"
                  fw={600}
                  ta="center"
                  lh={1.2}
                >
                  {step.label}
                </Text>
              </Stack>

              {index < arr.length - 1 && (
                <Divider
                  flex={1}
                  mt={16}
                  color={step.color || (step.done ? 'green' : 'gray.3')}
                />
              )}
            </React.Fragment>
          ))}
        </Group>
      </Card>

      {/* Grid: Confidence & Evidence */}
      <SimpleGrid cols={2} mb="md">
        <Card withBorder radius="lg" p="md">
          <Text fw={700} fz={10} c="dimmed" tt="uppercase" mb="lg">Confidence Level</Text>
          <Box style={{ display: 'flex', justifyContent: 'center' }}>
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[{ value: Math.round(incident.confidence_score * 100), color: 'orange' }]}
              label={<Text fw={700} ta="center" fz="xl">{Math.round(incident.confidence_score * 100)}%</Text>}
            />
          </Box>
        </Card>

        <Card withBorder radius="lg" p="md">
          <Text fw={700} fz={10} c="dimmed" tt="uppercase" mb="xs">Evidence</Text>
          <Box pos="relative" style={{ borderRadius: theme.radius.md, overflow: 'hidden' }}>
            <Image
              src={incident.evidence_image || undefined}
              height={100}
              fallbackSrc="https://images.unsplash.com/photo-1516496636080-14fb876e029d?q=80&w=400"
            />
            <Badge
              pos="absolute"
              top={8}
              left={8}
              color="red"
              radius={0}
              size="xs"
              fz={8}
            >
              {incident.incident_type} {formatConfidence(incident.confidence_score)}
            </Badge>
            <ActionIcon pos="absolute" bottom={4} right={4} variant="transparent" color="white">
              <Maximize size={14} />
            </ActionIcon>
          </Box>
        </Card>
      </SimpleGrid>

      {/* Camera Information */}
      <Card withBorder radius="lg" p="md" mb="md">
        <Group gap={6} mb="sm">
          <Video size={14} color={theme.colors.gray[6]} />
          <Text fw={700} fz={11} c="dimmed" tt="uppercase">Camera Information</Text>
        </Group>
        <Group grow preventGrowOverflow={false}>
          <Group gap="xs">
            <ThemeIcon color="orange.0" variant="light" radius="xl"><Video size={16} color="orange" /></ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text fz={9} c="dimmed">Camera</Text>
              <Text fz={11} fw={700} truncate>{incident.camera_name || `Camera #${incident.camera}`}</Text>
            </Box>
          </Group>
          <Divider orientation="vertical" />
          <Group gap="xs">
            <ThemeIcon color="orange.0" variant="light" radius="xl"><MapPin size={16} color="orange" /></ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text fz={9} c="dimmed">Location</Text>
              <Text fz={11} fw={700} truncate>
                {incident.camera_name || 'Unknown'}
              </Text>
            </Box>
          </Group>
        </Group>
      </Card>

      {/* AI Recommendation */}
      <Card
        withBorder
        radius="lg"
        p="md"
        mb="xl"
      >
        <Text
          fw={700}
          fz={11}
          c="dimmed"
          tt="uppercase"
          mb="sm"
        >
          AI Recommendation
        </Text>

        <Group
          align="center"
          gap="sm"
          wrap="nowrap"
        >
          {/* AI Icon */}
          <ThemeIcon
            size={42}
            color="orange"
            variant="light"
            radius="md"
            style={{ flexShrink: 0 }}
          >
            <Sparkles size={20} />
          </ThemeIcon>

          {/* Recommendation */}
          <Box
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text
              fz={10}
              c="dimmed"
              lh={1.3}
            >
              AI detected{" "}
              {incident.incident_type.replace(/_/g, " ")}
              {" — recommended action:"}
            </Text>

            <Text
              fz={13}
              fw={700}
              lh={1.25}
              mt={2}
            >
              {typeInfo.recommendation}
            </Text>
          </Box>

          {/* Responder */}
          <Stack
            gap={1}
            align="center"
            style={{
              flexShrink: 0,
              minWidth: 55,
            }}
          >
            <Text
              fz={8}
              c="dimmed"
              fw={600}
              tt="uppercase"
            >
              Responder
            </Text>

            <Group gap={3} wrap="nowrap">
              <Siren
                size={18}
                color="orange"
              />

              <Text
                fw={900}
                fz="sm"
                c="orange"
              >
                {typeInfo.responder}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Card>

      {/* Dynamic Action Buttons */}
      {isResolved ? (
        <Stack gap="sm">
          <Card withBorder radius="lg" p="lg" bg={isDark ? 'green.9' : 'green.0'} style={{ textAlign: 'center' }}>
            <ThemeIcon size={48} radius="xl" color={isDark ? 'green.9' : 'green.1'} mx="auto" mb="xs">
              <CheckCircle size={28} color={isDark ? theme.colors.green[3] : theme.colors.green[6]} />
            </ThemeIcon>
            <Text fw={700}>Incident Resolved</Text>
            <Text fz={12} c="dimmed">
              {incident.resolved_at ? `Resolved on ${formatDate(incident.resolved_at)}` : 'This incident has been closed.'}
            </Text>
          </Card>
          <Button fullWidth size="lg" radius="xl" color="orange" onClick={goBack}>
            Back
          </Button>
        </Stack>
      ) : isDismissed ? (
        <Button fullWidth size="lg" radius="xl" color="orange" onClick={goBack}>
          Back
        </Button>
      ) : actions.length > 0 ? (
        <Stack gap="sm">
          {actions.map((action) => (
            <Button key={action.next} fullWidth size="lg" radius="xl" color={action.color} variant={(action.variant as any) || 'filled'} leftSection={<action.icon size={20} />} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(action.next)}>
              {action.label}
            </Button>
          ))}
        </Stack>
      ) : null}
    </Container>
  );
}