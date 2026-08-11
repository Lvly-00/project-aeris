import { useState, useCallback, useEffect } from 'react';
import { Box, SimpleGrid, Paper, Text, Button, Stack } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { Plus, Camera, Phone } from 'lucide-react';

import { camerasAPI, contactsAPI } from '../../shared/services/api';
import { PageHeader } from '../components/Layout/PageHeader'; // Assuming this path
import { CameraToolbar } from '../components/Camera/CameraToolbar';
import { CameraCard } from '../components/Camera/CameraCard';
import { CameraGrid } from '../components/Camera/CameraGrid';
import { CameraFormModal } from '../components/Camera/CameraFormModal';
// import { IncidentAlertModal } from '../../components/Camera/IncidentAlertModal'; 
import type { IncidentDetectedData } from '../components/Camera/DetectionOverlay';

export default function CameraMonitoringPage() {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<'grid' | 'cctv-2x2' | 'cctv-3x3' | 'cctv-4x4'>(
    () => (localStorage.getItem('camera-layout') as any) || 'grid'
  );
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<any>(null);
  const [incidentAlert, setIncidentAlert] = useState<IncidentDetectedData | null>(null);

  // Sync layout to local storage
  useEffect(() => {
    localStorage.setItem('camera-layout', layout);
  }, [layout]);

  // Data Fetching
  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const res = await camerasAPI.list();
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => camerasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      notifications.show({ title: 'Deleted', message: 'Camera removed successfully', color: 'red' });
    },
  });

  const handleFormSubmit = async (values: any) => {
    try {
      if (editingCamera) {
        await camerasAPI.update(editingCamera.id, values);
        notifications.show({ title: 'Success', message: 'Camera updated', color: 'green' });
      } else {
        await camerasAPI.create(values);
        notifications.show({ title: 'Success', message: 'Camera added', color: 'green' });
      }
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setModalOpen(false);
      setEditingCamera(null);
    } catch (error: any) {
      notifications.show({ 
        title: 'Error', 
        message: error.response?.data?.detail || 'Operation failed', 
        color: 'red' 
      });
    }
  };

  const handleIncidentDetected = useCallback((data: IncidentDetectedData) => {
    setIncidentAlert(data);
  }, []);

  return (
    <Box p="md">
      {/* 1. Brand Header */}
      <PageHeader 
        title="CCTV CAMERAS"
        subtitle="Pumili ng alinmang kamera upang masuri ang kasalukuyang pangyayari."
        actions={
          <Button 
            bg="#ff5700" // The specific orange from your image
            size="md"
            leftSection={<Plus size={20} strokeWidth={3} />}
            onClick={() => { setEditingCamera(null); setModalOpen(true); }}
            style={{ fontWeight: 700 }}
          >
            Add Camera
          </Button>
        }
      />

      {/* 2. Toolbar (Count & Layout Selector) */}
      <CameraToolbar 
        count={cameras.length} 
        layout={layout} 
        onLayoutChange={(val) => setLayout(val as any)} 
      />

      {/* 3. Main View Area */}
      {cameras.length === 0 && !isLoading ? (
        <Paper p={50} ta="center" withBorder radius="md" bg="gray.0">
          <Stack align="center" gap="xs">
            <Camera size={48} color="#adb5bd" />
            <Text fw={600} c="dimmed">No cameras found.</Text>
            <Button variant="light" onClick={() => setModalOpen(true)}>Add your first camera</Button>
          </Stack>
        </Paper>
      ) : (
        <>
          {layout === 'grid' ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {cameras.map((camera: any) => (
                <CameraCard 
                  key={camera.id}
                  camera={camera}
                  onFullscreen={setFullscreenCamera}
                  onEdit={(cam) => { setEditingCamera(cam); setModalOpen(true); }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </SimpleGrid>
          ) : (
            <CameraGrid 
              cameras={cameras} 
              layout={layout}
              onIncidentDetected={handleIncidentDetected}
              onFullscreen={setFullscreenCamera}
              onEdit={(cam) => { setEditingCamera(cam); setModalOpen(true); }}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </>
      )}

      {/* 4. Modals */}
      <CameraFormModal 
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCamera(null); }}
        onSubmit={handleFormSubmit}
        initialValues={editingCamera}
        loading={deleteMutation.isPending}
      />

      {/* Incident Detection Alert Pop-up */}
      {/* <IncidentAlertModal 
        incident={incidentAlert} 
        onClose={() => setIncidentAlert(null)} 
      /> */}
    </Box>
  );
}