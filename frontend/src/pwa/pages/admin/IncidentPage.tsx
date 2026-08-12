import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  MoreVertical,
  Trash2,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';

import { Incident } from '../../../shared/types/index';
import { IncidentCard } from '../../components/commons/IncidentCard';
import { incidentsAPI } from '../../../shared/services/api';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);

  /*
   * Selection helpers
   */
  const allSelected =
    incidents.length > 0 &&
    selectedIds.length === incidents.length;

  const someSelected =
    selectedIds.length > 0 &&
    selectedIds.length < incidents.length;

  const toggleSelectAll = () => {
    setSelectedIds(
      allSelected ? [] : incidents.map((i) => i.id)
    );
  };

  const toggleSelect = (id: number) => {
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
   * Always keep newest incidents first.
   */
  const sortLatestFirst = useCallback((items: Incident[]) => {
    return [...items].sort(
      (a, b) =>
        new Date(b.detected_at).getTime() -
        new Date(a.detected_at).getTime()
    );
  }, []);

  /*
   * Fetch incidents from API
   */
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);

      const res = await incidentsAPI.list({
        status__in: 'Detected,Pending_Verification,Verified,Dispatched,Responding',
        ordering: '-detected_at',
      });

      const data = res.data.results || res.data;

      setIncidents(sortLatestFirst(data));
    } catch (error) {
      console.error('[INCIDENTS] Failed to fetch:', error);

      notifications.show({
        title: 'Error',
        message: 'Failed to load incidents',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [sortLatestFirst]);

  /*
   * Delete selected incidents
   */
  const handleDeleteSelected = async () => {
    const ids = selectedIds;

    try {
      await Promise.all(
        ids.map((id) => incidentsAPI.delete(id))
      );

      setIncidents((prev) =>
        prev.filter(
          (incident) => !ids.includes(incident.id)
        )
      );

      exitSelectMode();
      setDeleteSelectedModal(false);

      notifications.show({
        title: 'Deleted',
        message: `${ids.length} incident${
          ids.length > 1 ? 's' : ''
        } removed successfully`,
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
    }
  };

  /*
   * Initial API fetch
   */
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  /*
   * Incident WebSocket
   */
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.warn(
        '[WS] No access token. WebSocket not started.'
      );
      return;
    }

    /*
     * WebSocket backend location.
     *
     * Go through the Vite dev proxy (/ws) so the socket
     * reaches Django regardless of the host in use.
     */
    const wsProtocol =
      window.location.protocol === 'https:'
        ? 'wss'
        : 'ws';

    const wsUrl =
      `${wsProtocol}://${window.location.host}/ws/incidents/?token=${token}`;

    console.log(
      '[WS] Connecting to incident socket...'
    );

    const ws = new WebSocket(wsUrl);

    /*
     * StrictMode mounts effects twice in dev. Track
     * disposal so a stale socket is closed silently
     * instead of logging a browser error.
     */
    let disposed = false;

    ws.onopen = () => {
      if (disposed) {
        ws.close();
        return;
      }

      console.log(
        '[WS] Incident socket connected'
      );
    };

    ws.onmessage = (event) => {
      try {
        if (disposed) return;

        const data = JSON.parse(event.data);

        console.log('[WS] Incident event:', data);

        /*
         * New incident
         */
        if (data.action === 'incident_created') {
          setIncidents((prev) => {
            /*
             * Prevent duplicate incident
             */
            const exists = prev.some(
              (incident) =>
                incident.id === data.payload.id
            );

            if (exists) {
              return prev;
            }

            /*
             * Add new incident and keep newest first
             */
            return sortLatestFirst([
              data.payload,
              ...prev,
            ]);
          });
        }

        /*
         * Existing incident updated
         */
        else if (data.action === 'incident_update') {
          setIncidents((prev) => {
            /*
             * Resolved/dismissed incidents leave the
             * active list and go to the History page.
             */
            if (
              data.payload.status === 'Resolved' ||
              data.payload.status === 'Dismissed'
            ) {
              return sortLatestFirst(
                prev.filter(
                  (incident) =>
                    incident.id !== data.payload.id
                )
              );
            }

            const updated = prev.map((incident) =>
              incident.id === data.payload.id
                ? data.payload
                : incident
            );

            return sortLatestFirst(updated);
          });
        }
      } catch (error) {
        console.error(
          '[WS] Invalid WebSocket message:',
          error
        );
      }
    };

    ws.onerror = (error) => {
      if (disposed) return;

      console.error(
        '[WS] Incident socket error:',
        error
      );
    };

    ws.onclose = (event) => {
      if (disposed) return;

      console.log(
        '[WS] Incident socket closed:',
        event.code,
        event.reason
      );
    };

    /*
     * Cleanup
     */
    return () => {
      console.log(
        '[WS] Cleaning up incident socket'
      );

      disposed = true;

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else {
        /*
         * Socket still connecting (e.g. StrictMode
         * double-mount). Don't close() a CONNECTING
         * socket (that logs a browser error). Keep
         * onopen attached so the socket closes itself
         * once the handshake completes; silence the
         * other handlers.
         */
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
      }
    };
  }, [sortLatestFirst]);

  return (
    <Container size="sm" py="lg">
      {/* Page Header */}
      <Stack mb="lg" gap={4}>
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
          Monitor and manage detected incidents.
        </Text>
      </Stack>

      {/* Control Bar */}
      <Group justify="space-between" mb="lg">
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
            leftSection={<Filter size={18} />}
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
              leftSection={<Trash2 size={16} />}
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
                <MoreVertical size={24} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>
                Global Actions
              </Menu.Label>

              <Menu.Item
                color="red"
                leftSection={<Trash2 size={16} />}
                disabled={incidents.length === 0}
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
          maxHeight: 'calc(100vh - 240px)',
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
        ) : incidents.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">
              No incidents found.
            </Text>
          </Center>
        ) : (
          incidents.map((incident) => (
            <Group
              key={incident.id}
              wrap="nowrap"
              align="center"
              gap="xs"
            >
              {/* Selection Checkbox */}
              {selectMode && (
                <Checkbox
                  checked={selectedIds.includes(incident.id)}
                  onChange={() => toggleSelect(incident.id)}
                  radius="sm"
                  aria-label={`Select incident ${incident.id}`}
                />
              )}

              {/* Incident Card */}
              <Box
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <IncidentCard
                  incident={incident}
                  onClick={(item) => navigate(`/pwa/admin/incidents/${item.id}`)}
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
          <AlertTriangle
            size={48}
            color="var(--mantine-color-red-6)"
          />

          <Text ta="center">
            Are you sure you want to delete{' '}
            <b>{selectedIds.length}</b> selected{' '}
            incident
            {selectedIds.length > 1 ? 's' : ''}? This
            action cannot be undone.
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