import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, Text, Button, Stack, Group } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { CameraSlash, Phone, Plus } from '@boxicons/react';

import { SimulateIncidentBtn } from '../components/Camera/SimulateIncidentBtn';
import { camerasAPI, contactsAPI } from '../../shared/services/api';
import { PageHeader } from '../components/Layout/PageHeader';
import { CameraToolbar } from '../components/Camera/CameraToolbar';
import { CameraGrid } from '../components/Camera/CameraGrid';
import { FullscreenGridWall } from '../components/Camera/FullscreenGridWall';
import { CameraFormModal } from '../components/Camera/CameraFormModal';
import { SingleDeleteCameraModal, MassDeleteCamerasModal } from '../components/Camera/CameraDeleteModals';
// import { IncidentAlertModal } from '../../components/Camera/IncidentAlertModal'; 
import type { IncidentDetectedData } from '../components/Camera/DetectionOverlay';

export default function CameraMonitoringPage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track browser fullscreen so the page can swap to the monitoring wall.
  useEffect(() => {
    const handle = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
  }, []);
  const [layout, setLayout] = useState<'cctv-2x2' | 'cctv-3x3' | 'cctv-4x4'>(
    () => {
      const saved = localStorage.getItem('camera-layout');
      return saved === 'cctv-2x2' || saved === 'cctv-3x3' || saved === 'cctv-4x4' ? saved : 'cctv-2x2';
    }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<any>(null);
  const [incidentAlert, setIncidentAlert] = useState<IncidentDetectedData | null>(null);
  // Deleting a camera takes its incidents with it, so it now needs a
  // confirmation step instead of firing on a single click.
  const [cameraPendingDelete, setCameraPendingDelete] = useState<any>(null);
  // Mass delete: pick cameras on the grid, then confirm from a floating bar.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [massDeleteConfirm, setMassDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Keep the picked set honest: a camera deleted elsewhere (or by this page)
  // must not stay in the picker.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const live = new Set(cameras.map((c: any) => c.id));
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [cameras]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => camerasAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCameraPendingDelete(null);
      notifications.show({ title: 'Deleted', message: 'Camera removed successfully', color: 'red' });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to delete camera',
        color: 'red',
      });
    },
  });

  // Mass delete — one call, same cascade as a single camera delete.
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => camerasAPI.bulkDelete(ids),
    onSuccess: (_res, ids) => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectMode(false);
      setSelectedIds([]);
      notifications.show({
        title: 'Deleted',
        message: `${ids.length} camera${ids.length === 1 ? '' : 's'} removed`,
        color: 'red',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to delete cameras',
        color: 'red',
      });
    },
  });

  const handleFormSubmit = async (values: any) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingCamera) {
        await camerasAPI.update(editingCamera.id, values);
        notifications.show({ title: 'Success', message: 'Camera updated', color: 'green' });
      } else {
        await camerasAPI.create(values);
        notifications.show({ title: 'Success', message: 'Camera added', color: 'green' });
      }
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setModalOpen(false);
      setEditingCamera(null);
    } catch (error: any) {
      const data = error.response?.data;
      const message =
        data?.name?.[0] ||
        data?.stream_url?.[0] ||
        data?.stream_type?.[0] ||
        data?.detail ||
        'Operation failed';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncidentDetected = useCallback((data: IncidentDetectedData) => {
    setIncidentAlert(data);
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  return (
    <Box
      p={isFullscreen ? 0 : 'md'}
      ref={gridRef}
      style={isFullscreen ? { height: '100vh' } : undefined}
    >
      {isFullscreen ? (
        /* Fullscreen monitoring wall: nothing but the camera cards */
        <FullscreenGridWall
          cameras={cameras}
          layout={layout}
          onExit={() => document.exitFullscreen()}
          onIncidentDetected={handleIncidentDetected}
          onFullscreen={setFullscreenCamera}
          onEdit={(cam) => { setEditingCamera(cam); setModalOpen(true); }}
          onDelete={(id) => setCameraPendingDelete(cameras.find((c: any) => c.id === id) ?? { id })}
        />
      ) : (
        <>
          {/* 1. Brand Header */}
          <PageHeader
            title="CCTV CAMERAS"
            subtitle="All camera feeds are live and recording."
            actions={
              <Group>
                <SimulateIncidentBtn cameras={cameras} />
                <Button
                  bg="#ff5700"
                  leftSection={<Plus width={20} height={20} strokeWidth={3} />}
                  onClick={() => { setEditingCamera(null); setModalOpen(true); }}
                >
                  Add Camera
                </Button>
              </Group>
            }
          />

          {/* 2. Toolbar (Count & Layout Selector) */}
          <CameraToolbar
            count={cameras.length}
            layout={layout}
            onLayoutChange={(val) => setLayout(val as any)}
            onFullscreen={() => {
              // Fullscreen just this page (toolbar + camera grid), hiding the
              // sidebar and nav so the grid gets the whole screen.
              const el = gridRef.current;
              if (!el) return;
              if (document.fullscreenElement) document.exitFullscreen();
              else el.requestFullscreen();
            }}
            onStartSelect={() => { setSelectMode(true); setSelectedIds([]); }}
            selectMode={selectMode}
            selectedCount={selectedIds.length}
            onSelectAll={() => setSelectedIds(cameras.map((c: any) => c.id))}
            onDeselectAll={() => setSelectedIds([])}
            onCancelSelect={() => { setSelectMode(false); setSelectedIds([]); }}
            onDeleteSelected={() => setMassDeleteConfirm(true)}
            bulkDeleting={bulkDeleteMutation.isPending}
          />

          {/* 3. Main View Area */}
          {cameras.length === 0 && !isLoading ? (
            <Paper p={220} ta="center"  radius="md" bg="var(--mantine-color-body)">
              <Stack align="center" gap="sm">
                <CameraSlash width={48} height={48} color="#adb5bd" />
                <Text fw={400} c="dimmed">No cameras found.</Text>
                <Button variant="light" onClick={() => setModalOpen(true)}>Add your first camera</Button>
              </Stack>
            </Paper>
          ) : (
            <CameraGrid
              cameras={cameras}
              layout={layout}
              onIncidentDetected={handleIncidentDetected}
              onFullscreen={setFullscreenCamera}
              onEdit={(cam) => { setEditingCamera(cam); setModalOpen(true); }}
              onDelete={(id) => setCameraPendingDelete(cameras.find((c: any) => c.id === id) ?? { id })}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
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
        loading={submitting}
        cameras={cameras}
        editingId={editingCamera?.id}
      />

      {/* Incident Detection Alert Pop-up */}
      {/* <IncidentAlertModal 
        incident={incidentAlert} 
        onClose={() => setIncidentAlert(null)} 
      /> */}

      <SingleDeleteCameraModal
        camera={cameraPendingDelete}
        onClose={() => setCameraPendingDelete(null)}
        onConfirm={() => {
          if (cameraPendingDelete) {
            const id = cameraPendingDelete.id;
            setCameraPendingDelete(null);
            deleteMutation.mutate(id);
          }
        }}
        loading={deleteMutation.isPending}
      />

      <MassDeleteCamerasModal
        opened={massDeleteConfirm}
        cameras={cameras}
        selectedIds={selectedIds}
        onClose={() => setMassDeleteConfirm(false)}
        onConfirm={() => {
          const ids = selectedIds;
          setMassDeleteConfirm(false);
          bulkDeleteMutation.mutate(ids);
        }}
        loading={bulkDeleteMutation.isPending}
      />
    </Box>
  );
}