import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Table, Badge, Card, Grid, Group, Text, Button, Progress,
  Timeline, Image, Select, TextInput, Pagination, Stack, Box,
  Title, Paper, SimpleGrid, ActionIcon, Menu, Tooltip, Modal,
  LoadingOverlay, ThemeIcon, Divider,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  TriangleAlert, Eye, Check, Car, Users,
  Flame, Droplets, Trash2, Package, CloudFog,
  Search, Filter, ArrowUpDown, Image as IconPhoto,
  RefreshCcw, ArrowRight, MapPin, Clock, ListChecks,
  X, Phone, PhoneCall, Copy,
} from 'lucide-react';
import { incidentsAPI, recommendationsAPI, camerasAPI, contactsAPI } from '../../shared/services/api';
import { formatDate, formatRelativeTime, formatConfidence, formatDuration } from '../../shared/utils/helpers';
import {
  INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES,
  INCIDENT_COLORS, SEVERITY_COLORS, STATUS_COLORS, PRIORITY_COLORS,
} from '../../shared/utils/constants';
import type { Incident, Recommendation, Camera, EmergencyContact } from '../../shared/types';

const STATUS_ORDER = ['Detected', 'Pending_Verification', 'Verified', 'Dispatched', 'Responding', 'Resolved', 'Archived'];

const NEXT_STATUS: Record<string, string> = {
  Detected: 'Pending_Verification',
  Pending_Verification: 'Verified',
  Verified: 'Dispatched',
  Dispatched: 'Responding',
  Responding: 'Resolved',
  Resolved: 'Archived',
  Archived: '',
  Dismissed: '',
  False_Positive: '',
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const incidentId = Number(id);

  const { data: incident, isLoading: incidentLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const res = await incidentsAPI.get(incidentId);
      return res.data as Incident;
    },
    enabled: !!incidentId,
    refetchInterval: 15000,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['incident-recommendations', incidentId],
    queryFn: async () => {
      const res = await recommendationsAPI.list({ incident: incidentId });
      return (res.data.results || res.data) as Recommendation[];
    },
    enabled: !!incidentId,
  });

  const { data: camera } = useQuery({
    queryKey: ['camera', incident?.camera],
    queryFn: async () => {
      const res = await camerasAPI.get(incident!.camera);
      return res.data as Camera;
    },
    enabled: !!incident?.camera,
  });

  const { data: emergencyContacts } = useQuery({
    queryKey: ['emergency-contacts', incident?.incident_type],
    queryFn: async () => {
      const res = await contactsAPI.list({ incident_type: incident!.incident_type });
      return (res.data.results || res.data) as EmergencyContact[];
    },
    enabled: !!incident?.incident_type,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      incidentsAPI.statusTransition(incidentId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      notifications.show({ title: 'Status Updated', message: 'Incident status changed successfully', color: 'green' });
      setStatusLoading(false);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.detail || 'Failed to update status',
        color: 'red',
      });
      setStatusLoading(false);
    },
  });

  function handleStatusTransition(newStatus: string) {
    setStatusLoading(true);
    statusMutation.mutate(newStatus);
  }

  function getTimelineEvents() {
    if (!incident) return [];
    const events: { title: string; description: string; color: string; active: boolean; time: string | null }[] = [];
    const statusIdx = STATUS_ORDER.indexOf(incident.status);

    events.push({
      title: 'Detected',
      description: 'Incident was detected by the system',
      color: STATUS_COLORS['Detected'],
      active: true,
      time: incident.detected_at,
    });

    if (statusIdx >= 1) {
      events.push({
        title: 'Pending Verification',
        description: incident.status === 'Pending_Verification' ? 'Awaiting operator verification' : 'Incident passed initial review',
        color: STATUS_COLORS['Pending_Verification'],
        active: statusIdx > 1,
        time: null,
      });
    }

    if (incident.verified_at || statusIdx >= 2) {
      events.push({
        title: 'Verified',
        description: incident.verified_at ? 'Incident was verified by an operator' : 'Pending verification',
        color: STATUS_COLORS['Verified'],
        active: !!incident.verified_at,
        time: incident.verified_at,
      });
    }

    if (incident.dispatched_at || statusIdx >= 3) {
      events.push({
        title: 'Dispatched',
        description: incident.dispatched_at ? 'Responders have been dispatched' : 'Pending dispatch',
        color: STATUS_COLORS['Dispatched'],
        active: !!incident.dispatched_at,
        time: incident.dispatched_at,
      });
    }

    if (incident.responded_at || statusIdx >= 4) {
      events.push({
        title: 'Responding',
        description: incident.responded_at ? 'Responders are on scene' : 'Pending response',
        color: STATUS_COLORS['Responding'],
        active: !!incident.responded_at,
        time: incident.responded_at,
      });
    }

    if (incident.resolved_at || statusIdx >= 5) {
      events.push({
        title: 'Resolved',
        description: incident.resolved_at ? 'Incident has been resolved' : 'Pending resolution',
        color: STATUS_COLORS['Resolved'],
        active: !!incident.resolved_at,
        time: incident.resolved_at,
      });
    }

    if (statusIdx >= 6) {
      events.push({
        title: 'Archived',
        description: 'Incident has been archived',
        color: STATUS_COLORS['Archived'],
        active: incident.status === 'Archived',
        time: incident.archived_at,
      });
    }

    return events;
  }

  function getActionableRecommendations() {
    if (!recommendations) return [];
    return recommendations.filter((r) => r.is_accepted === null);
  }

  function getStatusActionButton() {
    if (!incident) return null;
    const nextStatus = NEXT_STATUS[incident.status];
    if (!nextStatus) return null;

    const colorMap: Record<string, string> = {
      Pending_Verification: 'yellow',
      Verified: 'orange',
      Dispatched: 'grape',
      Responding: 'blue',
      Resolved: 'green',
      Archived: 'gray',
    };

    const iconMap: Record<string, JSX.Element> = {
      Pending_Verification: <Check size={16} />,
      Verified: <Check size={16} />,
      Dispatched: <ArrowRight size={16} />,
      Responding: <ArrowRight size={16} />,
      Resolved: <Check size={16} />,
      Archived: <Check size={16} />,
    };

    const canDismiss = ['Detected', 'Pending_Verification', 'Verified'].includes(incident.status);

    return (
      <Group>
        <Button
          size="lg"
          color={colorMap[nextStatus] || 'blue'}
          loading={statusLoading}
          leftSection={iconMap[nextStatus] || <ArrowRight size={16} />}
          onClick={() => handleStatusTransition(nextStatus)}
        >
          Mark as {nextStatus.replace(/_/g, ' ')}
        </Button>
        {canDismiss && (
          <Button
            size="lg"
            variant="outline"
            color="red"
            leftSection={<X size={16} />}
            onClick={() => handleStatusTransition('Dismissed')}
          >
            Dismiss
          </Button>
        )}
        {incident.status === 'Pending_Verification' && (
          <Button
            size="lg"
            variant="outline"
            color="gray"
            leftSection={<X size={16} />}
            onClick={() => handleStatusTransition('False_Positive')}
          >
            False Positive
          </Button>
        )}
      </Group>
    );
  }

  if (incidentLoading) {
    return (
      <Box p="md">
        <LoadingOverlay visible />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box p="md">
        <Stack align="center" py="xl">
          <TriangleAlert size={48} color="#666" />
          <Title order={3}>Incident Not Found</Title>
          <Text c="dimmed">The incident you are looking for does not exist.</Text>
          <Button variant="light" onClick={() => navigate('/incidents')}>
            Back to Incidents
          </Button>
        </Stack>
      </Box>
    );
  }

  const timelineEvents = getTimelineEvents();
  const actionableRecs = getActionableRecommendations();

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />}
            onClick={() => navigate('/incidents')}
          >
            Back
          </Button>
          <Title order={3}>Incident #{incident.id}</Title>
        </Group>
        <Group>
          {getStatusActionButton()}
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="lg" radius="md" mb="md">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  color={INCIDENT_COLORS[incident.incident_type] || 'gray'}
                  variant="light"
                >
                  <Flame size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="lg">{incident.incident_type.replace(/_/g, ' ')}</Text>
                  <Text size="sm" c="dimmed">Detected {formatRelativeTime(incident.detected_at)}</Text>
                </Box>
              </Group>
              <Group gap="xs">
                <Badge
                  size="lg"
                  color={SEVERITY_COLORS[incident.severity] || 'gray'}
                  variant="filled"
                  style={{ backgroundColor: SEVERITY_COLORS[incident.severity] }}
                >
                  {incident.severity}
                </Badge>
                <Badge
                  size="lg"
                  color={STATUS_COLORS[incident.status] || 'gray'}
                  variant={incident.status === 'Resolved' ? 'filled' : 'light'}
                >
                  {incident.status}
                </Badge>
              </Group>
            </Group>

            <Divider mb="md" />

            <Text fw={600} mb="sm">Description</Text>
            <Text mb="lg">{incident.description || 'No description provided.'}</Text>

            <Text fw={600} mb="sm">Confidence Score</Text>
            <Group gap="md" mb="lg">
              <Box style={{ flex: 1 }}>
                <Progress
                  value={incident.confidence_score * 100}
                  size="xl"
                  color={
                    incident.confidence_score >= 0.8 ? 'red' :
                    incident.confidence_score >= 0.6 ? 'orange' :
                    incident.confidence_score >= 0.4 ? 'yellow' : 'blue'
                  }
                  striped
                  animated
                />
              </Box>
              <Text fw={700} size="xl" c={
                incident.confidence_score >= 0.8 ? 'red' :
                incident.confidence_score >= 0.6 ? 'orange' : 'blue'
              }>
                {formatConfidence(incident.confidence_score)}
              </Text>
            </Group>

            <Grid>
              {incident.duration !== null && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Duration</Text>
                  <Text fw={600}>{formatDuration(incident.duration)}</Text>
                </Grid.Col>
              )}
              {incident.crowd_size !== null && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Crowd Size</Text>
                  <Text fw={600}>{incident.crowd_size} people</Text>
                </Grid.Col>
              )}
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Detected At</Text>
                <Text fw={600}>{formatDate(incident.detected_at)}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" c="dimmed">Updated At</Text>
                <Text fw={600}>{formatDate(incident.updated_at)}</Text>
              </Grid.Col>
              {incident.verified_at && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Verified At</Text>
                  <Text fw={600}>{formatDate(incident.verified_at)}</Text>
                </Grid.Col>
              )}
              {incident.responded_at && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Responded At</Text>
                  <Text fw={600}>{formatDate(incident.responded_at)}</Text>
                </Grid.Col>
              )}
              {incident.resolved_at && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Resolved At</Text>
                  <Text fw={600}>{formatDate(incident.resolved_at)}</Text>
                </Grid.Col>
              )}
              {incident.dispatched_at && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Dispatched At</Text>
                  <Text fw={600}>{formatDate(incident.dispatched_at)}</Text>
                </Grid.Col>
              )}
              {incident.archived_at && (
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">Archived At</Text>
                  <Text fw={600}>{formatDate(incident.archived_at)}</Text>
                </Grid.Col>
              )}
              {incident.review_notes && (
                <Grid.Col span={12}>
                  <Text size="sm" c="dimmed">Review Notes</Text>
                  <Text fw={600}>{incident.review_notes}</Text>
                </Grid.Col>
              )}
            </Grid>
          </Card>

          <Card withBorder padding="lg" radius="md" mb="md">
            <Text fw={600} mb="md">Status Timeline</Text>
            <Timeline active={timelineEvents.filter((e) => e.active).length - 1} bulletSize={24} lineWidth={2}>
              {timelineEvents.map((event, index) => (
                <Timeline.Item
                  key={event.title}
                  title={event.title}
                  color={event.color}
                  bullet={
                    <ThemeIcon size={22} color={event.color} variant={event.active ? 'filled' : 'outline'}>
                      {event.title === 'Detected' ? <TriangleAlert size={12} /> :
                       event.title === 'Verified' ? <Check size={12} /> :
                       event.title === 'Responding' ? <ArrowRight size={12} /> :
                       <Check size={12} />}
                    </ThemeIcon>
                  }
                >
                  <Text size="sm">{event.description}</Text>
                  {event.time && (
                    <Text size="xs" c="dimmed" mt={4}>{formatDate(event.time)}</Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          {(incident.evidence_image) && (
            <Card withBorder padding="lg" radius="md" mb="md">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Evidence</Text>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPhoto size={14} />}
                  onClick={() => setEvidenceModal(true)}
                >
                  View Full Image
                </Button>
              </Group>
              <Image
                src={incident.evidence_image}
                alt="Evidence"
                radius="md"
                style={{ maxHeight: 400, cursor: 'pointer' }}
                onClick={() => setEvidenceModal(true)}
              />
            </Card>
          )}

          {actionableRecs.length > 0 && (
            <Card withBorder padding="lg" radius="md" mb="md">
              <Text fw={600} mb="md">Recommendations ({actionableRecs.length})</Text>
              <Stack gap="sm">
                {actionableRecs.map((rec) => (
                  <Paper key={rec.id} p="sm" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          variant="filled"
                          style={{ backgroundColor: PRIORITY_COLORS[rec.priority] || '#888' }}
                        >
                          {rec.priority}
                        </Badge>
                        <Badge size="sm" variant="light" color="grape">
                          {rec.responder_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge size="sm" variant="outline">
                          {rec.suggested_action.replace(/_/g, ' ')}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Confidence: {formatConfidence(rec.confidence_score)}
                      </Text>
                    </Group>
                    <Text size="sm">{rec.explanation || rec.reasoning}</Text>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {camera && (
            <Card withBorder padding="lg" radius="md" mb="md">
              <Text fw={600} mb="md">Camera Information</Text>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Name</Text>
                  <Text size="sm" fw={500}>{camera.name}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Status</Text>
                  <Badge
                    size="sm"
                    color={camera.status === 'Online' ? 'green' : camera.status === 'Offline' ? 'gray' : 'red'}
                    variant="dot"
                  >
                    {camera.status}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Location</Text>
                  <Text size="sm" fw={500}>{camera.location_name || 'N/A'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Stream Type</Text>
                  <Badge size="sm" variant="light">{camera.stream_type}</Badge>
                </Group>
                {camera.zone_name && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Zone</Text>
                    <Text size="sm" fw={500}>{camera.zone_name}</Text>
                  </Group>
                )}
                <Button
                  variant="light"
                  size="xs"
                  fullWidth
                  mt="sm"
                  onClick={() => navigate(`/cameras?camera=${incident.camera}`)}
                >
                  View Camera
                </Button>
              </Stack>
            </Card>
          )}

          {(incident.location_lat && incident.location_lng) && (
            <Card withBorder padding="lg" radius="md" mb="md">
              <Text fw={600} mb="md">Location</Text>
              <Group gap="xs" mb="xs">
                <MapPin size={16} color="#666" />
                <Text size="sm">Geographic Coordinates</Text>
              </Group>
              <Paper p="sm" withBorder>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">Latitude</Text>
                  <Text size="sm" fw={500} ff="monospace">{incident.location_lat.toFixed(6)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Longitude</Text>
                  <Text size="sm" fw={500} ff="monospace">{incident.location_lng.toFixed(6)}</Text>
                </Group>
              </Paper>
              <Text size="xs" c="dimmed" mt="xs">
                <MapPin size={12} style={{ marginRight: 4 }} />
                {incident.location_lat.toFixed(4)}, {incident.location_lng.toFixed(4)}
              </Text>
            </Card>
          )}

          <Card withBorder padding="lg" radius="md" mb="md">
            <Text fw={600} mb="md">Quick Actions</Text>
            <Stack gap="sm">
              {Array.isArray(emergencyContacts) && emergencyContacts.length > 0 && (
                <>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">Emergency Calls</Text>
                  {emergencyContacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="filled"
                      color="red"
                      fullWidth
                      leftSection={<Phone size={14} />}
                      onClick={() => {
                        navigator.clipboard.writeText(contact.phone_number);
                        window.location.href = `tel:${contact.phone_number}`;
                        notifications.show({ title: 'Calling', message: `Dialing ${contact.phone_number}`, color: 'blue' });
                      }}
                    >{contact.name} — {contact.phone_number}</Button>
                  ))}
                </>
              )}
              {incident.status !== 'Resolved' && (
                <Button
                  variant="light"
                  color="blue"
                  fullWidth
                  leftSection={<RefreshCcw size={14} />}
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['incident', incidentId] })}
                >
                  Refresh Data
                </Button>
              )}
              <Button
                variant="light"
                color="grape"
                fullWidth
                leftSection={<ListChecks size={14} />}
                onClick={() => navigate(`/recommendations?incident=${incident.id}`)}
              >
                View All Recommendations
              </Button>
              {incident.status === 'Verified' && (
                <Button
                  variant="filled"
                  color="red"
                  fullWidth
                  leftSection={<ArrowRight size={14} />}
                  onClick={() => navigate('/dispatch')}
                >
                  Dispatch Responders
                </Button>
              )}
              <Button
                variant="light"
                color="yellow"
                fullWidth
                leftSection={<ListChecks size={14} />}
                onClick={() => navigate(`/dispatch?incident=${incident.id}`)}
              >
                View Dispatch Status ({incident.dispatch_count || 0})
              </Button>
              <Button
                variant="light"
                color="gray"
                fullWidth
                leftSection={<ArrowRight size={14} />}
                onClick={() => navigate('/incidents')}
              >
                All Incidents
              </Button>
            </Stack>
          </Card>

          {recommendations && recommendations.length > 0 && (
            <Card withBorder padding="lg" radius="md">
              <Text fw={600} mb="md">All Recommendations ({recommendations.length})</Text>
              <Stack gap="xs">
                {recommendations.map((rec) => (
                  <Paper key={rec.id} p="xs" withBorder>
                    <Group justify="space-between" mb={4}>
                      <Badge
                        size="sm"
                        variant="filled"
                        style={{ backgroundColor: PRIORITY_COLORS[rec.priority] || '#888' }}
                      >
                        {rec.priority}
                      </Badge>
                      <Badge
                        size="sm"
                        color={rec.is_accepted === true ? 'green' : rec.is_accepted === false ? 'red' : 'yellow'}
                        variant="dot"
                      >
                        {rec.is_accepted === true ? 'Accepted' : rec.is_accepted === false ? 'Rejected' : 'Pending'}
                      </Badge>
                    </Group>
                    <Text size="xs" lineClamp={2}>{rec.explanation || rec.reasoning}</Text>
                    <Text size="xs" c="dimmed" mt={2}>{rec.responder_type.replace(/_/g, ' ')}</Text>
                  </Paper>
                ))}
              </Stack>
            </Card>
          )}
        </Grid.Col>
      </Grid>

      <Modal
        opened={evidenceModal}
        onClose={() => setEvidenceModal(false)}
        title="Evidence Image"
        size="xl"
      >
        {incident?.evidence_image && (
          <Image
            src={incident.evidence_image}
            alt="Evidence"
            fit="contain"
            style={{ maxHeight: '80vh' }}
          />
        )}
      </Modal>
    </Box>
  );
}
