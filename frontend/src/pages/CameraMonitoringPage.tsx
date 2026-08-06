import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card, Text, Group, Badge, Button, Modal, TextInput, Select,
  NumberInput, ActionIcon, SimpleGrid, Title, Stack, Box, Menu,
  Paper, LoadingOverlay, Switch, SegmentedControl,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
  Camera, Plus, Trash2, Pencil, Maximize, Image, RefreshCcw,
  MoreVertical, MapPin, Video, LayoutGrid, Phone, PhoneCall, Copy, Monitor,
} from 'lucide-react';

import { camerasAPI, zonesAPI, incidentsAPI, contactsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/helpers';
import type { EmergencyContact } from '../types';

import { CameraFeed } from '../components/Camera/CameraFeed';
import { CameraGrid } from '../components/Camera/CameraGrid';
import { RTSPCameraFeed } from '../components/Camera/RTSPCameraFeed';
import { RtspCanvas } from '../components/Camera/RTSPCameraFeed';
import { FpsOverlay, useFps } from '../components/Camera/FpsOverlay';
import { DetectionOverlay } from '../components/Camera/DetectionOverlay';
import type { IncidentDetectedData } from '../components/Camera/DetectionOverlay';

// ── FullscreenVideo ───────────────────────────────────────────────────────────
// Kept in this file — only used by the fullscreen modal, not reused elsewhere.

function FullscreenVideo({ camera, onIncidentDetected }: {
  camera: any;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const retryRef = useRef(0);
  const { fps, tick } = useFps();

  const baseUrl = (window as any).electronAPI?.isDesktop
    ? (window as any).electronAPI.getAiUrl()
    : '/ai';

  const buildStreamUrl = () => {
    if (camera.stream_type === 'RTSP') return '';
    const token = localStorage.getItem('access_token');
    return `/api/cameras/${camera.id}/stream/?token=${encodeURIComponent(token || '')}`;
  };

  useEffect(() => {
    setStreamUrl(buildStreamUrl());
    retryRef.current = 0;
    setHasError(false);
  }, [camera.id]);

  const handleError = () => {
    if (retryRef.current < 2) {
      retryRef.current += 1;
      setTimeout(() => setStreamUrl(buildStreamUrl()), 1000 * retryRef.current);
    } else {
      setHasError(true);
    }
  };

  if (camera.stream_type === 'EMBED') {
    return (
      <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe src={camera.rtsp_url} style={{ width: '100%', height: '80vh', border: 'none' }}
          sandbox="allow-scripts allow-same-origin allow-popups" allowFullScreen title={camera.name} />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box ta="center">
        <Video size={64} color="#444" />
        <Text size="lg" c="dimmed" mt="md">Stream unavailable</Text>
      </Box>
    );
  }

  if (camera.stream_type === 'RTSP') {
    return (
      <Box style={{ position: 'relative', width: '100%', height: '80vh', backgroundColor: '#000', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        <RtspCanvas canvasRef={canvasRef} cameraId={camera.id} baseUrl={baseUrl} onFrame={tick} />
        <FpsOverlay fps={fps} />
        <DetectionOverlay videoRef={{ current: null }} cameraId={camera.id} streamType={camera.stream_type}
          source={camera.rtsp_url} cameraName={camera.name} onIncidentDetected={onIncidentDetected} />
      </Box>
    );
  }

  return (
    <Box style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video ref={videoRef} key={streamUrl} src={streamUrl} autoPlay loop muted playsInline controls
        style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} onError={handleError} />
      <FpsOverlay fps={fps} />
      <DetectionOverlay videoRef={videoRef} cameraId={camera.id} streamType={camera.stream_type}
        cameraName={camera.name} onIncidentDetected={onIncidentDetected} />
    </Box>
  );
}

// ── CameraMonitoringPage ──────────────────────────────────────────────────────

export default function CameraMonitoringPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullscreenCamera, setFullscreenCamera] = useState<any>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [layout, setLayout] = useState<'grid' | 'cctv-2x2' | 'cctv-3x3' | 'cctv-4x4'>(
    () => (localStorage.getItem('camera-layout') as any) || 'grid',
  );
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [incidentAlert, setIncidentAlert] = useState<IncidentDetectedData | null>(null);

  const handleIncidentDetected = useCallback((data: IncidentDetectedData) => {
    setIncidentAlert(data);
  }, []);

  const closeIncidentAlert = useCallback(() => {
    setIncidentAlert((prev) => {
      if (prev?.evidenceUrl) URL.revokeObjectURL(prev.evidenceUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (incidentAlert?.evidenceUrl) URL.revokeObjectURL(incidentAlert.evidenceUrl);
    };
  }, []);

  useEffect(() => { localStorage.setItem('camera-layout', layout); }, [layout]);

  const cameraParam = searchParams.get('camera');

  const { data: cameras, isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const res = await camerasAPI.list();
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (cameraParam && cameras) {
      const cam = (Array.isArray(cameras) ? cameras : []).find((c: any) => String(c.id) === cameraParam);
      if (cam) setFullscreenCamera(cam);
    }
  }, [cameraParam, cameras]);

  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => { const res = await zonesAPI.list(); return res.data.results || res.data; },
  });

  const { data: emergencyContacts } = useQuery({
    queryKey: ['emergency-contacts-all'],
    queryFn: async () => {
      const res = await contactsAPI.list();
      return (res.data.results || res.data) as EmergencyContact[];
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => camerasAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      notifications.show({ title: 'Success', message: 'Camera added successfully', color: 'green' });
      setAddModalOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to add camera', color: 'red' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => camerasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      notifications.show({ title: 'Success', message: 'Camera deleted', color: 'green' });
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: (id: number) => camerasAPI.snapshot(id),
    onSuccess: () => notifications.show({ title: 'Snapshot', message: 'Snapshot captured', color: 'blue' }),
  });

  const form = useForm<{
    name: string; rtsp_url: string; stream_type: string; location_name: string;
    latitude: number; longitude: number; zone: number | null; is_active: boolean;
  }>({
    initialValues: { name: '', rtsp_url: '', stream_type: 'RTSP', location_name: '', latitude: 0, longitude: 0, zone: null, is_active: true },
    validate: {
      name: (v) => (!v ? 'Name is required' : null),
      rtsp_url: (v) => (!v ? 'URL is required' : null),
    },
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { Online: 'green', Offline: 'gray', Error: 'red' };
    return <Badge color={colors[status] || 'gray'} variant="dot" size="sm">{status}</Badge>;
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={3}>CCTV Camera Monitoring</Title>
        <Group>
          <Button variant="subtle" color="red" leftSection={<Phone size={16} />}
            onClick={() => setEmergencyModalOpen(true)}>Emergency</Button>
          <SegmentedControl value={layout} onChange={(v) => setLayout(v as any)}
            data={[
              { label: <Group gap={4} wrap="nowrap"><LayoutGrid size={14} /><span>Grid</span></Group>, value: 'grid' },
              { label: <Group gap={4} wrap="nowrap"><Monitor size={14} /><span>2x2</span></Group>, value: 'cctv-2x2' },
              { label: <Group gap={4} wrap="nowrap"><Monitor size={14} /><span>3x3</span></Group>, value: 'cctv-3x3' },
              { label: <Group gap={4} wrap="nowrap"><Monitor size={14} /><span>4x4</span></Group>, value: 'cctv-4x4' },
            ]} size="sm" />
          <Button leftSection={<Plus size={16} />} onClick={() => { form.reset(); setAddModalOpen(true); }}>Add Camera</Button>
        </Group>
      </Group>

      {layout === 'grid' ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
            {Array.isArray(cameras) && cameras.map((camera: any) => (
              <Card key={camera.id} withBorder padding="0" radius="md" style={{ overflow: 'hidden' }}>
                <Box pos="relative" style={{ height: 200, backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <LoadingOverlay visible={false} />
                  <CameraFeed camera={camera} onIncidentDetected={handleIncidentDetected} />
                  <Box pos="absolute" top={8} left={8}>{statusBadge(camera.status)}</Box>
                  <Box pos="absolute" bottom={8} left={8}>
                    <Badge size="sm" variant="filled" color="dark">{camera.stream_type}</Badge>
                  </Box>
                  <Box pos="absolute" top={8} right={8}>
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon variant="filled" color="dark" size="sm"><MoreVertical size={14} /></ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Maximize size={14} />} onClick={() => setFullscreenCamera(camera)}>Fullscreen</Menu.Item>
                        <Menu.Item leftSection={<Image size={14} />} onClick={() => snapshotMutation.mutate(camera.id)}>Snapshot</Menu.Item>
                        <Menu.Item leftSection={<Pencil size={14} />} onClick={() => { setEditingCamera(camera); form.setValues(camera); setAddModalOpen(true); }}>Edit</Menu.Item>
                        <Menu.Item leftSection={<RefreshCcw size={14} />}>Reconnect</Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={() => deleteMutation.mutate(camera.id)}>Delete</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Box>
                </Box>
                <Box p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm" lineClamp={1}>{camera.name}</Text>
                  </Group>
                  {camera.location_name && (
                    <Group gap="xs" mb="xs">
                      <MapPin size={12} color="#666" />
                      <Text size="xs" c="dimmed" lineClamp={1}>{camera.location_name}</Text>
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">Last seen: {camera.last_seen ? formatRelativeTime(camera.last_seen) : 'Never'}</Text>
                </Box>
              </Card>
            ))}
          </SimpleGrid>
          {(!cameras || (Array.isArray(cameras) && cameras.length === 0)) && (
            <Paper p="xl" ta="center" withBorder>
              <Camera size={48} color="#444" />
              <Text mt="md" size="lg" fw={500}>No Cameras Added</Text>
              <Text size="sm" c="dimmed" mb="md">Add your first camera to start monitoring</Text>
              <Button leftSection={<Plus size={16} />} onClick={() => { form.reset(); setAddModalOpen(true); }}>Add Camera</Button>
            </Paper>
          )}
        </>
      ) : (
        <CameraGrid cameras={cameras} layout={layout} onIncidentDetected={handleIncidentDetected}
          onFullscreen={setFullscreenCamera}
          onEdit={(cam) => { setEditingCamera(cam); form.setValues(cam); setAddModalOpen(true); }}
          onDelete={(id) => deleteMutation.mutate(id)} />
      )}

      {/* Add / Edit Camera Modal */}
      <Modal opened={addModalOpen} onClose={() => { setAddModalOpen(false); setEditingCamera(null); }}
        title={editingCamera ? 'Edit Camera' : 'Add Camera'} size="lg">
        <form onSubmit={form.onSubmit((values) => {
          if (editingCamera) {
            camerasAPI.update(editingCamera.id, values).then(() => {
              queryClient.invalidateQueries({ queryKey: ['cameras'] });
              notifications.show({ title: 'Success', message: 'Camera updated', color: 'green' });
              setAddModalOpen(false); setEditingCamera(null);
            }).catch(() => notifications.show({ title: 'Error', message: 'Update failed', color: 'red' }));
          } else { addMutation.mutate(values); }
        })}>
          <Stack>
            <TextInput label="Camera Name" required {...form.getInputProps('name')} />
            <TextInput label="Stream URL" required {...form.getInputProps('rtsp_url')}
              placeholder={form.values.stream_type === 'HTTP' ? 'http://example.com/video.mp4' : form.values.stream_type === 'EMBED' ? 'https://www.skylinewebcams.com/...' : 'rtsp://...'} />
            <Select label="Stream Type"
              data={[{ value: 'RTSP', label: 'RTSP Stream' }, { value: 'HTTP', label: 'HTTP Stream' }, { value: 'MP4', label: 'MP4 Video File' }, { value: 'EMBED', label: 'Embedded Web Page' }]}
              {...form.getInputProps('stream_type')} />
            <TextInput label="Location Name" {...form.getInputProps('location_name')} placeholder="e.g., Barangay Hall Entrance" />
            <Group grow>
              <NumberInput label="Latitude" {...form.getInputProps('latitude')} decimalScale={6} />
              <NumberInput label="Longitude" {...form.getInputProps('longitude')} decimalScale={6} />
            </Group>
            <Select label="Barangay Zone"
              data={Array.isArray(zones) ? zones.map((z: any) => ({ value: String(z.id), label: z.name })) : []}
              placeholder="Select zone" clearable {...form.getInputProps('zone')}
              value={form.values.zone?.toString()}
              onChange={(v) => form.setFieldValue('zone', v ? Number(v) : null)} />
            <Switch label="Active" {...form.getInputProps('is_active', { type: 'checkbox' })} />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => { setAddModalOpen(false); setEditingCamera(null); }}>Cancel</Button>
              <Button type="submit" loading={addMutation.isPending}>{editingCamera ? 'Update' : 'Add'} Camera</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Fullscreen single-camera modal */}
      <Modal opened={!!fullscreenCamera} onClose={() => setFullscreenCamera(null)}
        title={fullscreenCamera?.name} size="100%" styles={{ body: { padding: 0 } }}>
        {fullscreenCamera && (
          <Box style={{ height: '80vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Box style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
              <FullscreenVideo camera={fullscreenCamera} onIncidentDetected={handleIncidentDetected} />
            </Box>
          </Box>
        )}
      </Modal>

      {/* Incident alert modal */}
      <Modal opened={!!incidentAlert} onClose={closeIncidentAlert}
        title={incidentAlert ? `${incidentAlert.incidentType} Detected on ${incidentAlert.cameraName}` : ''} size="lg">
        {incidentAlert && (
          <Stack>
            <Group>
              <Badge size="lg" color="red">{incidentAlert.incidentType}</Badge>
              <Badge size="lg" color={incidentAlert.confidence >= 0.9 ? 'red' : incidentAlert.confidence >= 0.7 ? 'orange' : 'yellow'}>
                {(incidentAlert.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </Group>
            {incidentAlert.evidenceUrl && (
              <Box style={{ backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
                <img src={incidentAlert.evidenceUrl} alt={`${incidentAlert.incidentType} evidence`}
                  style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
              </Box>
            )}
            <Group justify="flex-end">
              <Button variant="light" onClick={closeIncidentAlert}>Close</Button>
              <Button onClick={() => navigate('/incidents')}>View All Incidents</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Emergency contacts modal */}
      <Modal opened={emergencyModalOpen} onClose={() => setEmergencyModalOpen(false)} title="Emergency Contacts" size="lg">
        <Stack>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Tap a number to call</Text>
            <Button size="sm" variant="light" color="red" leftSection={<Plus size={14} />}
              onClick={() => navigate('/settings?tab=contacts')}>Manage Contacts</Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {Array.isArray(emergencyContacts) && emergencyContacts.filter((c: any) => c.is_active).map((contact: any) => (
              <Card key={contact.id} withBorder padding="md" radius="md">
                <Group gap="xs" mb="xs">
                  <PhoneCall size={18} color="#e74c3c" />
                  <Text fw={600} size="sm">{contact.name}</Text>
                </Group>
                <Badge size="sm" variant="light" color="red" mb="sm">{contact.incident_type.replace(/_/g, ' ')}</Badge>
                <Text size="xl" fw={700} ff="monospace" mb="sm" ta="center"
                  style={{ cursor: 'pointer', userSelect: 'all' }}
                  onClick={() => { navigator.clipboard.writeText(contact.phone_number); notifications.show({ title: 'Copied', message: `${contact.phone_number} — paste into Phone Link to call`, color: 'blue', autoClose: 5000 }); }}>
                  {contact.phone_number}
                </Text>
                <Group grow>
                  <Button variant="filled" color="red" size="lg" leftSection={<Phone size={16} />}
                    onClick={() => {
                      const num = contact.phone_number;
                      navigator.clipboard.writeText(num);
                      window.location.href = `tel:${num}`;
                      notifications.show({ title: 'Number Copied!', message: `Opening Phone Link... ${num}`, color: 'blue', autoClose: 6000 });
                    }}>Call Now</Button>
                  <Button variant="light" color="gray" size="lg" leftSection={<Copy size={16} />}
                    onClick={() => { navigator.clipboard.writeText(contact.phone_number); notifications.show({ title: 'Copied', message: `${contact.phone_number} copied to clipboard`, color: 'green' }); }}>Copy</Button>
                </Group>
              </Card>
            ))}
            {(!emergencyContacts || emergencyContacts.length === 0) && (
              <Paper p="xl" ta="center" withBorder style={{ gridColumn: '1 / -1' }}>
                <Phone size={48} color="#444" />
                <Text mt="md" size="sm" c="dimmed">No emergency contacts configured</Text>
                <Button variant="light" color="red" mt="sm" onClick={() => navigate('/settings?tab=contacts')}>Go to Settings to add</Button>
              </Paper>
            )}
          </SimpleGrid>
        </Stack>
      </Modal>
    </Box>
  );
}
