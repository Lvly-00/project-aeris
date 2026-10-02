import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Text,
  Stack,
  Loader,
  Center,
  rem,
  Menu,
  ActionIcon,
  Modal,
  Button,
  Group,
  Box,
  Checkbox,
} from '@mantine/core';
import { AlertCircle, DotsVerticalRounded, Filter, Trash } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import type { CameraIncidentRow } from '../../../shared/types/index';
import { CameraIncidentCard } from '../../components/commons/CameraIncidentCard';
import { incidentsAPI } from '../../../shared/services/api';

/*
 * AdminLayout pins a 70px header and an 85px footer, both fixed, so the page
 * has to live in the band between them. The list used to size itself with a
 * hardcoded calc(100vh - 240px): on a phone `vh` is the *large* viewport, so
 * the list grew past the band and its lower cards rendered underneath the
 * bottom nav. `100dvh` tracks the real viewport as the browser chrome hides,
 * and AppShell publishes its own header/footer offsets, so the band stays
 * correct if either shell height is ever changed. The numbers are only
 * fallbacks for a page rendered outside an AppShell.
 */
const VIEWPORT_BAND =
  'calc(100dvh - var(--app-shell-header-offset, 70px) - var(--app-shell-footer-offset, 85px))';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(number | null)[]>([]);
  const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  /*
   * The list is grouped by camera: one row per camera that currently has an
   * open incident, pointing at that incident. Operators think in cameras, not
   * in individual detections — the detections themselves are listed on the
   * incident detail screen.
   */
  const sortLatestFirst = useCallback((rows: CameraIncidentRow[]) => {
    return [...rows].sort(
      (a, b) =>
        new Date(b.incident.detected_at).getTime() -
        new Date(a.incident.detected_at).getTime()
    );
  }, []);

  /*
   * Selection may include the placeholder row (id `null`) that holds incidents
   * whose camera was deleted, so it can't always be phrased as "camera".
   */
  const describeSelection = (ids: (number | null)[]) => {
    const unassigned = ids.filter((id) => id === null).length;
    const cameras = ids.length - unassigned;

    if (cameras === 0) return 'unassigned cameras';
    if (unassigned === 0) return `${cameras} camera${cameras === 1 ? '' : 's'}`;

    return `${cameras} camera${cameras === 1 ? '' : 's'} and ${unassigned} unassigned`;
  };

  /*
   * Kept fresh the same way the old list was:
   *   1. refetch on mount (navigating back from the detail page)
   *   2. 10s polling safety net
   *   3. WebSocket events invalidate this key instantly
   */
  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['incidents', 'by-camera'],
    queryFn: async () => {
      const res = await incidentsAPI.byCamera();
      const data: CameraIncidentRow[] = res.data.results || res.data;
      return sortLatestFirst(data);
    },
    refetchInterval: 10000,
  });

  /*
   * Selection is tracked by camera id: a row *is* a camera, and a camera can
   * hold several open incidents (each simulate press opens its own). Deleting
   * the row therefore clears the whole camera, otherwise the older batches
   * survive and reappear on the next refresh.
   */
  const cameraIds = rows.map((r) => r.camera);

  const allSelected =
    cameraIds.length > 0 && selectedIds.length === cameraIds.length;

  const someSelected =
    selectedIds.length > 0 &&
    selectedIds.length < cameraIds.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : cameraIds);
  };

  const toggleSelect = (id: number | null) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  /*
   * Delete the open incidents behind the selected cameras
   */
  const handleDeleteSelected = async () => {
    const cameraIdList = selectedIds;

    setDeletePending(true);

    try {
      const res = await incidentsAPI.deleteByCameras(cameraIdList);
      const deleted = res.data?.deleted ?? 0;

      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      // Counts on the dashboard just moved.
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      exitSelectMode();
      setDeleteSelectedModal(false);

      notifications.show({
        title: 'Deleted',
        message: `${deleted} incident${
          deleted === 1 ? '' : 's'
        } removed from ${describeSelection(cameraIdList)}`,
        color: 'red',
      });
    } catch (error) {
      console.error(
        '[INCIDENTS] Delete selected failed:',
        error
      );

      notifications.show({
        title: 'Error',
        message: 'Failed to delete selected incidents',
        color: 'red',
      });
    } finally {
      setDeletePending(false);
    }
  };

  /*
   * Real-time incident updates are delivered by the single shared WebSocket
   * (App-level useWebSocket). It invalidates ['incidents'] and
   * ['incident-history'] on incident_created / incident_update, so the list
   * below refetches instantly — no per-page socket needed.
   */

  return (
    <Container
      size="sm"
      py="lg"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: VIEWPORT_BAND,
        overflow: 'hidden',
      }}
    >
      {/* Page Header */}
      <Stack mb="lg" gap={4} style={{ flexShrink: 0 }}>
        <Title
          order={1}
          fz={rem(38)}
          fw={700}
          style={{
            letterSpacing: rem(-1),
          }}
        >
          Incidents
        </Title>

        <Text c="dimmed">
          Monitor active incidents by camera.
        </Text>
      </Stack>

      {/* Control Bar */}
      <Group justify="space-between" mb="lg" style={{ flexShrink: 0 }}>
        {selectMode ? (
          <Checkbox
            label="Select all"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleSelectAll}
            radius="sm"
          />
        ) : (
          <Button
            variant="outline"
            color="gray"
            leftSection={<Filter  width={ 18 } height={ 18 } />}
            radius="sm"
          >
            Filter
          </Button>
        )}

        {selectMode ? (
          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={exitSelectMode}
            >
              Cancel
            </Button>

            <Button
              color="red"
              leftSection={<Trash  width={ 16 } height={ 16 } />}
              disabled={selectedIds.length === 0}
              onClick={() => setDeleteSelectedModal(true)}
            >
              Delete ({selectedIds.length})
            </Button>
          </Group>
        ) : (
          <Menu
            shadow="md"
            width={200}
            position="bottom-end"
          >
            <Menu.Target>
              <ActionIcon
                variant="transparent"
                color="gray"
                size="lg"
              >
                <DotsVerticalRounded  width={24} height={24} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>
                Global Actions
              </Menu.Label>

              <Menu.Item
                color="red"
                leftSection={<Trash  width={ 16 } height={ 16 } />}
                disabled={rows.length === 0}
                onClick={() => setSelectMode(true)}
              >
                Delete Incidents
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      {/* Scrollable Incident List */}
      <Stack
        gap="md"
        style={{
          // Takes whatever is left in the band and scrolls internally, so the
          // list can never extend past the fixed footer.
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: rem(6),
        }}
      >
        {loading ? (
          <Center py="xl">
            <Loader
              variant="dots"
              color="blue"
            />
          </Center>
        ) : rows.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">
              No active incidents. Cameras with detections will appear here.
            </Text>
          </Center>
        ) : (
          rows.map((row) => (
            <Group
              key={row.camera}
              wrap="nowrap"
              align="center"
              gap="xs"
            >
              {/* Selection Checkbox */}
              {selectMode && (
                <Checkbox
                  checked={selectedIds.includes(row.camera)}
                  onChange={() => toggleSelect(row.camera)}
                  radius="sm"
                  aria-label={`Select incidents for ${row.camera_name}`}
                />
              )}

              {/* Camera Incident Card */}
              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <CameraIncidentCard
                  row={row}
                  onClick={() => navigate(`/pwa/admin/incidents/${row.incident.id}`)}
                />
              </Box>
            </Group>
          ))
        )}
      </Stack>

      {/* Delete Selected Confirmation */}
      <Modal
        opened={deleteSelectedModal}
        onClose={() =>
          setDeleteSelectedModal(false)
        }
        title="Confirm Delete"
        centered
      >
        <Stack
          align="center"
          gap="md"
          py="md"
        >
          <AlertCircle
             width={48} height={48}
            color="var(--mantine-color-red-6)"
          />

          <Text ta="center">
            Delete all open incidents for{' '}
            <b>{selectedIds.length}</b> selected{' '}
            {describeSelection(selectedIds)}? This clears every
            active incident on {selectedIds.length > 1 ? 'them' : 'it'},
            including any older ones not shown in the list, and cannot
            be undone.
          </Text>

          <Group grow w="100%">
            <Button
              variant="outline"
              color="gray"
              onClick={() =>
                setDeleteSelectedModal(false)
              }
            >
              Cancel
            </Button>

            <Button
              color="red"
              loading={deletePending}
              onClick={handleDeleteSelected}
            >
              Yes, Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}