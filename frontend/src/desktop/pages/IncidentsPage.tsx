import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table, Badge, Card, Grid, Group, Text, Button, Progress,
  Select, TextInput, Pagination, Stack, Box,
  Title, Paper, ActionIcon, Menu, Tooltip, Modal,
  Image, LoadingOverlay,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  TriangleAlert, Eye, Check, Car, Users,
  Flame, Droplets, Trash2, Package, CloudFog,
  Search, Filter, ArrowUpDown, Image as IconPhoto,
  RefreshCcw, ArrowRight, MapPin, Clock,
} from 'lucide-react';
import { incidentsAPI } from '../../shared/services/api';
import { formatDate, formatRelativeTime, formatConfidence } from '../../shared/utils/helpers';
import { INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES, INCIDENT_COLORS, SEVERITY_COLORS, STATUS_COLORS } from '../../shared/utils/constants';
import type { Incident } from '../../shared/types';

const PAGE_SIZE = 15;

const SORT_OPTIONS = [
  { value: '-detected_at', label: 'Newest First' },
  { value: 'detected_at', label: 'Oldest First' },
  { value: '-confidence_score', label: 'Highest Confidence' },
  { value: 'confidence_score', label: 'Lowest Confidence' },
  { value: '-severity', label: 'Severity (High to Low)' },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Detected: ['Pending_Verification', 'Dismissed'],
  Pending_Verification: ['Verified', 'Dismissed', 'False_Positive'],
  Verified: ['Dispatched', 'Dismissed'],
  Dispatched: ['Responding'],
  Responding: ['Resolved'],
  Resolved: ['Archived'],
  Archived: [],
  Dismissed: [],
  False_Positive: [],
};

function IncidentTypeIcon({ type }: { type: string }) {
  const iconProps = { size: 16 };
  const icons: Record<string, JSX.Element> = {
    Fire: <Flame {...iconProps} />,
    Smoke: <CloudFog {...iconProps} />,
    Vehicle_Accident: <Car {...iconProps} />,
  };
  return icons[type] || <TriangleAlert {...iconProps} />;
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState<string | null>(searchParams.get('type') || null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(searchParams.get('severity') || null);
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams.get('status') || null);
  const [sortBy, setSortBy] = useState<string | null>(searchParams.get('sort') || '-detected_at');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [evidenceModal, setEvidenceModal] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [count, setCount] = useState(0);

  const queryFilters: Record<string, any> = {
    page,
    page_size: PAGE_SIZE,
    ordering: sortBy || '-detected_at',
  };
  if (search) queryFilters.search = search;
  if (typeFilter) queryFilters.incident_type = typeFilter;
  if (severityFilter) queryFilters.severity = severityFilter;
  if (statusFilter) queryFilters.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', queryFilters],
    queryFn: async () => {
      const res = await incidentsAPI.list(queryFilters);
      return res.data;
    },
    refetchInterval: 15000,
  });

  const incidents: Incident[] = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      incidentsAPI.statusTransition(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      notifications.show({ title: 'Status Updated', message: 'Incident status changed successfully', color: 'green' });
      setStatusLoading(null);
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to update status', color: 'red' });
      setStatusLoading(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => incidentsAPI.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      notifications.show({ title: 'Deleted', message: 'All incidents deleted successfully', color: 'green' });
      setDeleteAllModal(false);
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to delete incidents', color: 'red' });
      setDeleteAllModal(false);
    },
  });

  function handleDeleteAll() {
    if (data) setCount(data.count || 0);
    setDeleteAllModal(true);
  }

  function confirmDeleteAll() {
    deleteMutation.mutate();
  }

  function handleStatusTransition(incident: Incident, newStatus: string) {
    setStatusLoading(incident.id);
    statusMutation.mutate({ id: incident.id, status: newStatus });
  }

  function applyFilters() {
    setPage(1);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (severityFilter) params.severity = severityFilter;
    if (statusFilter) params.status = statusFilter;
    if (sortBy) params.sort = sortBy;
    setSearchParams(params);
  }

  function resetFilters() {
    setSearch('');
    setTypeFilter(null);
    setSeverityFilter(null);
    setStatusFilter(null);
    setSortBy('-detected_at');
    setPage(1);
    setSearchParams({});
  }

  function getSeverityBadge(severity: string) {
    const colorMap: Record<string, string> = {
      Low: 'gray',
      Medium: 'yellow',
      High: 'orange',
      Critical: 'red',
    };
    return (
      <Badge
        color={colorMap[severity] || 'gray'}
        variant="filled"
        size="sm"
        style={{
          backgroundColor: SEVERITY_COLORS[severity],
        }}
      >
        {severity}
      </Badge>
    );
  }

  function getStatusBadge(status: string) {
    const variant = status === 'Resolved' ? 'filled' : 'light';
    return (
      <Badge
        color={STATUS_COLORS[status] || 'gray'}
        variant={variant}
        size="sm"
      >
        {status}
      </Badge>
    );
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <Title order={3}>Incidents</Title>
        <Group gap="xs">
          <Button
            variant="light"
            color="red"
            leftSection={<Trash2 size={16} />}
            onClick={handleDeleteAll}
          >
            Delete All
          </Button>
          <Button
            variant="light"
            leftSection={<RefreshCcw size={16} />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['incidents'] })}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      <Card withBorder padding="md" radius="md" mb="md">
        <Grid align="flex-end">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <TextInput
              label="Search"
              placeholder="Search incidents..."
              leftSection={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Type"
              placeholder="All types"
              clearable
              data={INCIDENT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Severity"
              placeholder="All severities"
              clearable
              data={SEVERITY_LEVELS.map((s) => ({ value: s, label: s }))}
              value={severityFilter}
              onChange={setSeverityFilter}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Status"
              placeholder="All statuses"
              clearable
              data={INCIDENT_STATUSES.map((s) => ({ value: s, label: s }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Sort by"
              data={SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 1 }}>
            <Group gap="xs">
              <Button size="sm" onClick={applyFilters}>Filter</Button>
              <Button size="sm" variant="subtle" color="gray" onClick={resetFilters}>Reset</Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Box pos="relative">
          <LoadingOverlay visible={isLoading} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 60 }}>ID</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Camera</Table.Th>
                <Table.Th>Confidence</Table.Th>
                <Table.Th>Detected At</Table.Th>
                <Table.Th style={{ width: 100 }}>Evidence</Table.Th>
                <Table.Th style={{ width: 160 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {incidents.length > 0 ? incidents.map((incident) => (
                <Table.Tr
                  key={incident.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <Table.Td>
                    <Text size="sm" fw={600}>#{incident.id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <IncidentTypeIcon type={incident.incident_type} />
                      <Badge
                        color={INCIDENT_COLORS[incident.incident_type] || 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {incident.incident_type.replace(/_/g, ' ')}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>{getSeverityBadge(incident.severity)}</Table.Td>
                  <Table.Td>{getStatusBadge(incident.status)}</Table.Td>
                  <Table.Td>
                    <Text size="sm">{incident.camera_name || `Camera #${incident.camera}`}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" style={{ minWidth: 120 }}>
                      <Progress
                        value={incident.confidence_score * 100}
                        size="sm"
                        color={
                          incident.confidence_score >= 0.8 ? 'red' :
                          incident.confidence_score >= 0.6 ? 'orange' :
                          incident.confidence_score >= 0.4 ? 'yellow' : 'blue'
                        }
                        style={{ flex: 1 }}
                      />
                      <Text size="xs" fw={500} style={{ minWidth: 44, textAlign: 'right' }}>
                        {formatConfidence(incident.confidence_score)}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={formatDate(incident.detected_at)}>
                      <Text size="sm">{formatRelativeTime(incident.detected_at)}</Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    {incident.evidence_image ? (
                      <Tooltip label="View evidence">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => setEvidenceModal(incident.evidence_image!)}
                        >
                          <IconPhoto size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Text size="xs" c="dimmed">None</Text>
                    )}
                  </Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap="xs">
                      <Tooltip label="View details">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => navigate(`/incidents/${incident.id}`)}
                        >
                          <Eye size={14} />
                        </ActionIcon>
                      </Tooltip>
                      {STATUS_TRANSITIONS[incident.status]?.map((nextStatus) => (
                        <Tooltip key={nextStatus} label={`Mark as ${nextStatus.replace(/_/g, ' ')}`}>
                          <Button
                            size="compact-xs"
                            color={
                              nextStatus === 'Verified' ? 'orange' :
                              nextStatus === 'Dispatched' ? 'grape' :
                              nextStatus === 'Responding' ? 'blue' :
                              nextStatus === 'Pending_Verification' ? 'yellow' :
                              nextStatus === 'Archived' ? 'gray' :
                              nextStatus === 'Dismissed' ? 'red' : 'green'
                            }
                            loading={statusLoading === incident.id}
                            onClick={() => handleStatusTransition(incident, nextStatus)}
                            rightSection={<ArrowRight size={12} />}
                          >
                            {nextStatus.replace(/_/g, ' ')}
                          </Button>
                        </Tooltip>
                      ))}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )) : (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Stack align="center" py="xl">
                      <TriangleAlert size={32} color="#666" />
                      <Text c="dimmed">No incidents found</Text>
                      {(search || typeFilter || severityFilter || statusFilter) && (
                        <Button variant="subtle" size="xs" onClick={resetFilters}>
                          Clear filters
                        </Button>
                      )}
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination
              total={totalPages}
              value={page}
              onChange={(p) => {
                setPage(p);
                setSearchParams((prev) => {
                  prev.set('page', String(p));
                  return prev;
                });
              }}
            />
            <Text size="sm" c="dimmed">
              {totalCount} total incidents
            </Text>
          </Group>
        )}
      </Card>

      <Modal
        opened={!!evidenceModal}
        onClose={() => setEvidenceModal(null)}
        title="Evidence Image"
        size="lg"
      >
        {evidenceModal && (
          <Image
            src={evidenceModal}
            alt="Evidence"
            fit="contain"
            style={{ maxHeight: '70vh' }}
          />
        )}
      </Modal>

      <Modal
        opened={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        title="Delete All Incidents"
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to delete all {count} incidents? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setDeleteAllModal(false)}>Cancel</Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={confirmDeleteAll}
            >
              Delete All
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
