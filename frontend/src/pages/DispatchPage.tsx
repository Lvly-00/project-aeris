import { useState, useEffect } from 'react';
import {
  Container, Paper, Title, Tabs, Group, Badge, Text, Card,
  Table, Select, Button, Modal, Textarea, Stack, ActionIcon,
  Menu, Alert, Divider, Timeline,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  Siren, PhoneCall, MapPin, Check, X, RefreshCw,
  Clock, UserCheck, Navigation, Eye, Circle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchAPI, incidentsAPI } from '../services/api';
import type { Dispatch, Dispatcher, Incident, IncidentTimelineEntry } from '../types';
import {
  DISPATCH_STATUS_COLORS, PRIORITY_COLORS, STATUS_COLORS,
  DISPATCH_STATUSES, INCIDENT_TYPES,
} from '../utils/constants';

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<string | null>('dispatches');
  const [dispatchModal, setDispatchModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [selectedDispatcher, setSelectedDispatcher] = useState<number | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [statusModal, setStatusModal] = useState<{ dispatch: Dispatch; open: boolean }>({ dispatch: null as any, open: false });
  const [newStatus, setNewStatus] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: dispatches, isLoading: loadingD } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatchAPI.listDispatches().then(r => r.data.results),
    refetchInterval: 10000,
  });

  const { data: dispatchers } = useQuery({
    queryKey: ['dispatchers'],
    queryFn: () => dispatchAPI.listDispatchers().then(r => r.data.results),
  });

  const { data: pendingIncidents } = useQuery({
    queryKey: ['incidents-pending'],
    queryFn: () => incidentsAPI.list({ status: 'Verified' }).then(r => r.data.results),
  });

  const { data: allIncidents } = useQuery({
    queryKey: ['incidents-all-dispatch'],
    queryFn: () => incidentsAPI.list({ page_size: 200 }).then(r => r.data.results),
  });

  const createDispatch = useMutation({
    mutationFn: () => dispatchAPI.createDispatch({
      incident: selectedIncident,
      dispatcher: selectedDispatcher,
      notes: dispatchNotes,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dispatches'] }); setDispatchModal(false); setDispatchNotes(''); setSelectedDispatcher(null); },
  });

  const updateStatus = useMutation({
    mutationFn: () => dispatchAPI.updateDispatchStatus(statusModal.dispatch.id, newStatus),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dispatches'] }); setStatusModal({ dispatch: null as any, open: false }); },
  });

  const getStatusBadge = (status: string) => (
    <Badge color={DISPATCH_STATUS_COLORS[status] || 'gray'} size="sm" variant="light">
      {status.replace(/_/g, ' ')}
    </Badge>
  );

  const getIncidentById = (id: number) => allIncidents?.find((i: Incident) => i.id === id);

  return (
    <Container fluid p="md">
      <Group mb="lg">
        <Siren size={28} />
        <Title order={2}>Dispatch Management</Title>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="dispatches" leftSection={<Siren size={16} />}>Active Dispatches</Tabs.Tab>
          <Tabs.Tab value="new" leftSection={<Circle size={16} />}>New Dispatch</Tabs.Tab>
          <Tabs.Tab value="dispatchers" leftSection={<UserCheck size={16} />}>Dispatchers</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dispatches">
          <Paper p="md" withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Incident</Table.Th>
                  <Table.Th>Dispatcher</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Timeline</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(dispatches || []).map((d: Dispatch) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{d.incident_type.replace(/_/g, ' ')}</Text>
                      <Text size="xs" c="dimmed">#{d.incident}</Text>
                    </Table.Td>
                    <Table.Td>{d.dispatcher_name}</Table.Td>
                    <Table.Td><Badge size="sm" variant="light">{d.dispatcher_type.replace(/_/g, ' ')}</Badge></Table.Td>
                    <Table.Td>{getStatusBadge(d.status)}</Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        {d.accepted_at && <Text size="xs" c="green">Accepted</Text>}
                        {d.en_route_at && <Text size="xs" c="blue">En Route</Text>}
                        {d.on_scene_at && <Text size="xs" c="violet">On Scene</Text>}
                        {d.completed_at && <Text size="xs" c="dimmed">Completed</Text>}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="light"
                          onClick={() => { setStatusModal({ dispatch: d, open: true }); setNewStatus(d.status); }}>
                          Update
                        </Button>
                        <Button size="xs" variant="light" color="red"
                          onClick={() => dispatchAPI.cancelDispatch(d.id).then(() => queryClient.invalidateQueries({ queryKey: ['dispatches'] }))}>
                          Cancel
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {(!dispatches || dispatches.length === 0) && (
                  <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="xl">No active dispatches</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="new">
          <Paper p="md" withBorder>
            <Title order={4} mb="md">Create New Dispatch</Title>
            {(!pendingIncidents || pendingIncidents.length === 0) ? (
              <Alert color="yellow" title="No Incidents Ready">No verified incidents waiting for dispatch.</Alert>
            ) : (
              <Stack>
                <Select
                  label="Select Incident"
                  placeholder="Choose a verified incident"
                  data={(pendingIncidents || []).map((i: Incident) => ({
                    value: String(i.id),
                    label: `#${i.id} - ${i.incident_type.replace(/_/g, ' ')} (${i.severity}) - ${i.camera_name || ''}`,
                  }))}
                  onChange={(v) => setSelectedIncident(v ? Number(v) : null)}
                />
                <Select
                  label="Select Dispatcher"
                  placeholder="Choose available dispatcher"
                  data={(dispatchers || []).filter((d: Dispatcher) => d.status === 'Available' && d.is_active).map((d: Dispatcher) => ({
                    value: String(d.id),
                    label: `${d.full_name} (${d.dispatcher_type.replace(/_/g, ' ')})`,
                  }))}
                  onChange={(v) => setSelectedDispatcher(v ? Number(v) : null)}
                />
                <Textarea label="Dispatch Notes" placeholder="Instructions for the dispatcher..."
                  value={dispatchNotes} onChange={(e) => setDispatchNotes(e.currentTarget.value)} />
                <Button leftSection={<Siren size={16} />}
                  disabled={!selectedIncident || !selectedDispatcher}
                  onClick={() => createDispatch.mutate()} loading={createDispatch.isPending}>
                  Dispatch
                </Button>
              </Stack>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="dispatchers">
          <Paper p="md" withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Zone</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(dispatchers || []).map((d: Dispatcher) => (
                  <Table.Tr key={d.id}>
                    <Table.Td><Text fw={500}>{d.full_name}</Text></Table.Td>
                    <Table.Td><Badge size="sm" variant="light">{d.dispatcher_type.replace(/_/g, ' ')}</Badge></Table.Td>
                    <Table.Td>
                      <Badge color={d.status === 'Available' ? 'green' : d.status === 'Unavailable' ? 'gray' : 'blue'} size="sm">
                        {d.status.replace(/_/g, ' ')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{d.phone_number || '-'}</Table.Td>
                    <Table.Td>{d.zone || '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={statusModal.open} onClose={() => setStatusModal({ dispatch: null as any, open: false })} title="Update Dispatch Status">
        <Stack>
          <Select
            label="New Status"
            data={DISPATCH_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
            value={newStatus}
            onChange={(v) => setNewStatus(v || '')}
          />
          <Group>
            <Button onClick={() => updateStatus.mutate()} loading={updateStatus.isPending}>Update</Button>
            <Button variant="light" onClick={() => setStatusModal({ dispatch: null as any, open: false })}>Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
