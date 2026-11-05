import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Text,
  Stack,
  Badge,
  ThemeIcon,
  rem,
  Menu,
  ActionIcon,
  Button,
  Group,
  Box,
  Checkbox,
  Paper,
} from '@mantine/core';
import { DotsVerticalRounded, Trash, Siren } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import { Incident } from '../../../shared/types/index';
import { IncidentCard } from '../../components/commons/IncidentCard';
import { IncidentCardSkeletonList } from '../../components/commons/IncidentCardSkeleton';
import { DeleteConfirmModal } from '../../components/commons/DeleteConfirmModal';
import { incidentsAPI } from '../../../shared/services/api';

const VIEWPORT_BAND =
  'calc(100dvh - var(--app-shell-header-offset, 70px) - var(--app-shell-footer-offset, 85px))';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

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
   * Active incidents, kept fresh three ways:
   *   1. refetch on mount (navigating back from the detail page)
   *   2. 10s polling safety net
   *   3. WebSocket events invalidate this key instantly
   */
  const { data: incidents = [], isLoading: loading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await incidentsAPI.list({
        status__in: 'Detected,Verified,Dispatched',
        ordering: '-detected_at',
      });

      const data: Incident[] = res.data.results || res.data;

      // One card per incident, even if the API ever repeats a row.
      const seen = new Set<number>();
      const unique = data.filter((incident) =>
        seen.has(incident.id) ? false : (seen.add(incident.id), true)
      );

      return sortLatestFirst(unique);
    },
    refetchInterval: 10000,
  });

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

  /* Names for the delete confirmation list, in selection order. */
  const selectedNames = selectedIds.map(
    (id) => `INC-2026-${String(id).padStart(6, '0')}`
  );

  /*
   * Delete selected incidents
   */
  const handleDeleteSelected = async () => {
    const ids = selectedIds;

    setDeletePending(true);

    try {
      await Promise.all(ids.map((id) => incidentsAPI.delete(id)));

      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      exitSelectMode();
      setDeleteSelectedModal(false);

      notifications.show({
        title: 'Deleted',
        message: `${ids.length} incident${ids.length === 1 ? '' : 's'} removed successfully`,
        color: 'red',
      });
    } catch (error) {
      console.error('[INCIDENTS] Delete selected failed:', error);

      notifications.show({
        title: 'Error',
        message: 'Failed to delete selected incidents',
        color: 'red',
      });
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <Container
      size="sm"
      px={0}
      py="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: VIEWPORT_BAND,
        overflow: 'hidden',
      }}
    >
      {/* Page Header */}
      <Stack mb="lg" gap={4} style={{ flexShrink: 0 }}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Title
            order={1}
            fz={rem(32)}
            fw={700}
            style={{
              letterSpacing: rem(-1),
            }}
          >
            Incidents
          </Title>

          {!selectMode && (
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
                {/* <Menu.Label>
                  Global Actions
                </Menu.Label> */}

                <Menu.Item
                  color="red"
                  leftSection={<Trash  width={ 16 } height={ 16 } />}
                  disabled={incidents.length === 0}
                  onClick={() => setSelectMode(true)}
                >
                  Delete Incidents
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        <Group gap={8} wrap="nowrap" align="center">
          <Text c="dimmed">
            Monitor and manage active incidents.
          </Text>

          {/* {!loading && incidents.length > 0 && (
            <Badge
              size="sm"
              variant="light"
              color="orange"
              radius="sm"
              tt="none"
              styles={{ label: { fontWeight: 700 } }}
            >
              {incidents.length} active
            </Badge>
          )} */}
        </Group>
      </Stack>

      {/* Control Bar (selection mode only) */}
      {selectMode && (
        <Paper
          // withBorder
          radius="md"
          // px="xs"
          py={rem(6)}
          mb="md"
          // bg="var(--mantine-color-gray-light)"
          style={{ flexShrink: 0 }}
        >
          <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
            <Checkbox
              label={`Select all (${incidents.length})`}
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleSelectAll}
              radius="sm"
              styles={{ label: { fontWeight: 600 } }}
            />

            <Group gap="xs" wrap="nowrap">
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
          </Group>
        </Paper>
      )}

      {/* Scrollable Incident List */}
      <Stack
        gap="md"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: rem(6),
        }}
      >
        {loading ? (
          <IncidentCardSkeletonList />
        ) : incidents.length === 0 ? (
          <Paper
            withBorder
            p="xl"
            py={rem(72)}
            ta="center"
            radius="md"
            bg="var(--mantine-color-body)"
          >
            <Stack align="center" gap="sm">
              <ThemeIcon size={rem(64)} radius="xl" variant="light" color="orange">
                <Siren width={30} height={30} />
              </ThemeIcon>

              <Text fw={700}>All clear</Text>

              <Text size="sm" c="dimmed" maw={260}>
                No active incidents right now. New detections will appear here
                automatically.
              </Text>
            </Stack>
          </Paper>
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
                  selected={selectMode && selectedIds.includes(incident.id)}
                  onClick={(item) =>
                    selectMode
                      ? toggleSelect(item.id)
                      : navigate(`/pwa/admin/incidents/${item.id}`)
                  }
                />
              </Box>
            </Group>
          ))
        )}
      </Stack>

      {/* Delete Selected Confirmation */}
      <DeleteConfirmModal
        opened={deleteSelectedModal}
        onClose={() => setDeleteSelectedModal(false)}
        onConfirm={handleDeleteSelected}
        loading={deletePending}
        title={
          selectedIds.length === 1 ? 'Delete Incident' : 'Delete Incidents'
        }
        description={
          selectedIds.length === 1 ? (
            <>
              Are you sure you want to delete incident{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {selectedNames[0]}
              </Text>
              ? This action cannot be undone.
            </>
          ) : (
            <>
              Delete{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {selectedIds.length} selected incidents
              </Text>
              ? This action cannot be undone.
            </>
          )
        }
        items={selectedNames}
        noun="Incident"
        listTitle="Incidents to be deleted"
        confirmLabel={`Delete (${selectedIds.length})`}
      />
    </Container>
  );
}