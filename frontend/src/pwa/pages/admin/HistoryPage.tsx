import { useState } from 'react';
import { Container, Title, Text, Group, Stack, Loader, Center, rem, Select, Alert, ActionIcon, Menu, Checkbox, Button, Box, Paper } from '@mantine/core';
import { DotsVerticalRounded, Filter, Trash, History } from '@boxicons/react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { Incident } from '../../../shared/types/index';
import { IncidentCard } from '../../components/commons/IncidentCard';
import { DeleteConfirmModal } from '../../components/commons/DeleteConfirmModal';
import { incidentsAPI } from '../../../shared/services/api';

type StatusFilter = 'all' | 'Resolved' | 'Dismissed';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Closed' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Dismissed', label: 'Dismissed' },
];

export default function HistoryPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<StatusFilter>('all');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);
    const [deletePending, setDeletePending] = useState(false);

    const { data: incidents = [], isLoading: loading, isError } = useQuery({
        queryKey: ['incident-history'],
        queryFn: async () => {
            const res = await incidentsAPI.list({
                status__in: 'Resolved,Dismissed',
                ordering: '-detected_at',
            });

            const data: Incident[] = res.data.results || res.data;

            /*
             * Always keep newest closed incidents first.
             */
            const closingTime = (i: Incident) =>
                i.resolved_at || i.dismissed_at || i.created_at;
            return [...data].sort(
                (a, b) =>
                    new Date(closingTime(b)).getTime() -
                    new Date(closingTime(a)).getTime()
            );
        },
        /*
         * The WebSocket invalidates this key the moment any incident
         * changes status; polling is just a safety net.
         */
        refetchInterval: 15000,
    });

    const visibleIncidents = incidents.filter((incident) =>
        filter === 'all' ? true : incident.status === filter
    );

    const allSelected =
        visibleIncidents.length > 0 && selectedIds.length === visibleIncidents.length;

    const someSelected =
        selectedIds.length > 0 && selectedIds.length < visibleIncidents.length;

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : visibleIncidents.map((i) => i.id));
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
     * Delete the selected closed incidents. There is no bulk endpoint for
     * history, so the ids are removed one by one.
     */
    const handleDeleteSelected = async () => {
        const ids = selectedIds;
        setDeletePending(true);

        try {
            await Promise.all(ids.map((id) => incidentsAPI.delete(id)));

            queryClient.invalidateQueries({ queryKey: ['incident-history'] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            // Counts on the dashboard just moved.
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

            exitSelectMode();
            setDeleteSelectedModal(false);

            notifications.show({
                title: 'Deleted',
                message: `${ids.length} incident${ids.length === 1 ? '' : 's'} removed from history`,
                color: 'red',
            });
        } catch (error) {
            console.error('[HISTORY] Delete selected failed:', error);

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
        <Container size="sm" py="lg">
            {/* Page Header */}
            <Stack mb="lg" gap={4}>
                <Title order={1} fz={rem(38)} fw={700} style={{ letterSpacing: rem(-1) }}>
                    History
                </Title>
                <Text c="dimmed" fz="md" fw={400}>
                    Resolved and dismissed incidents.
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
                    <Select
                        size="sm"
                        radius="sm"
                        value={filter}
                        onChange={(value) => setFilter((value as StatusFilter) || 'all')}
                        data={FILTER_OPTIONS}
                        leftSection={<Filter  width={16} height={16} />}
                        w={180}
                        allowDeselect={false}
                    />
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
                                disabled={visibleIncidents.length === 0}
                                onClick={() => setSelectMode(true)}
                            >
                                Delete Incidents
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
            </Group>

            {/* Results List */}
            <Stack gap="md">
                {loading ? (
                    <Center py="xl"><Loader variant="dots" color="blue" /></Center>
                ) : isError ? (
                    <Alert variant="light" color="red" radius="md" title="Error">
                        <Text size="sm" c="dimmed">Failed to load incident history.</Text>
                    </Alert>
                ) : visibleIncidents.length === 0 ? (
                    <Paper p="xl" py={80} ta="center" radius="md" bg="var(--mantine-color-body)">
                        <Stack align="center" gap="sm">
                            <History width={48} height={48} color="#adb5bd" />
                            <Text fw={400} c="dimmed">
                                No {filter === 'all' ? '' : filter.toLowerCase() + ' '}history found.
                            </Text>
                        </Stack>
                    </Paper>
                ) : (
                    visibleIncidents.map((incident) => (
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
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                <IncidentCard
                                    incident={incident}
                                    onClick={
                                        selectMode
                                            ? undefined
                                            : (item) => navigate(`/pwa/admin/incidents/${item.id}`)
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
                title={selectedIds.length === 1 ? 'Delete Incident' : 'Delete Incidents'}
                description={
                    selectedIds.length === 1 ? (
                        <>
                            Are you sure you want to delete{' '}
                            <Text span fw={600} c="var(--mantine-color-text)">
                                {selectedNames[0]}
                            </Text>
                            ? This action cannot be undone.
                        </>
                    ) : (
                        <>
                            Are you sure you want to delete the selected{' '}
                            <Text span fw={600} c="var(--mantine-color-text)">
                                {selectedIds.length} incidents
                            </Text>{' '}
                            from history? This action cannot be undone.
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
