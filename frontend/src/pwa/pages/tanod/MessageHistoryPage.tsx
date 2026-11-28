import { useMemo, useState } from 'react';
import {
    Container,
    Title,
    Text,
    Group,
    Stack,
    rem,
    Select,
    Alert,
    Paper,
    Skeleton,
    Checkbox,
    Button,
    Box,
    ActionIcon,
    Menu,
} from '@mantine/core';
import { DotsVerticalRounded, Filter, History, Trash } from '@boxicons/react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

import { dispatchMessagesAPI } from '../../../shared/services/api';
import type { DispatchMessage, IncidentType } from '../../../shared/types';
import { DispatchMessageCard } from '../../components/tanod/messages/DispatchMessageCard';
import { DeleteConfirmModal } from '../../components/commons/DeleteConfirmModal';

type TypeFilter = 'all' | IncidentType;

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'Fire', label: 'Fire' },
    { value: 'Smoke', label: 'Smoke' },
    { value: 'Vehicle_Accident', label: 'Vehicular Accident' },
];

function HistorySkeletonList() {
    return (
        <Stack gap="md">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={rem(100)} radius="md" />
            ))}
        </Stack>
    );
}

function HistoryMessageCard({ message }: { message: DispatchMessage }) {
    return (
        <Link
            to={`/tanod/messages/${message.id}`}
            state={{ from: 'history' }}
            style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            aria-label={`Open message: ${message.title}`}
        >
            <DispatchMessageCard message={message} linkless />
        </Link>
    );
}

export default function MessageHistoryPage() {
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<TypeFilter>('all');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['dispatch-messages'],
        queryFn: () => dispatchMessagesAPI.list(),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: 15000,
    });

    const messages = useMemo<DispatchMessage[]>(() => {
        const rows: DispatchMessage[] = data?.data?.results ?? data?.data ?? [];

        const seen = new Set<number>();
        return rows
            .filter((m) => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                const status = m.incident_data?.status;
                return status === 'Resolved' || status === 'Dismissed';
            })
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
    }, [data]);

    const visible = useMemo<DispatchMessage[]>(() => {
        if (filter === 'all') return messages;
        return messages.filter((m) => m.incident_data?.incident_type === filter);
    }, [messages, filter]);

    const allSelected = visible.length > 0 && selectedIds.length === visible.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < visible.length;

    const toggleSelectAll = () =>
        setSelectedIds(allSelected ? [] : visible.map((m) => m.id));

    const toggleSelect = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds([]);
    };

    const selectedMessages = visible.filter((m) => selectedIds.includes(m.id));

    const handleDeleteSelected = async () => {
        const ids = selectedIds;
        setDeleting(true);
        try {
            await Promise.all(ids.map((id) => dispatchMessagesAPI.delete(id)));
            queryClient.invalidateQueries({ queryKey: ['dispatch-messages'] });
            exitSelectMode();
            setDeleteOpened(false);
            notifications.show({
                title: 'Deleted',
                message: `${ids.length} message${ids.length === 1 ? '' : 's'} removed from history`,
                color: 'red',
            });
        } catch (error) {
            console.error('[HISTORY] Delete selected failed:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete selected messages',
                color: 'red',
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Container size="sm" py="lg" px={0}>
            {/* Page Header */}
            <Stack mb="lg" gap={4}>
                <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                    <Title order={1} fz={rem(32)} fw={700} style={{ letterSpacing: rem(-1) }}>
                        History
                    </Title>

                    {!selectMode && (
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="transparent" color="gray" size="lg" aria-label="History actions">
                                    <DotsVerticalRounded width={24} height={24} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    color="red"
                                    leftSection={<Trash width={16} height={16} />}
                                    disabled={visible.length === 0}
                                    onClick={() => setSelectMode(true)}
                                >
                                    Delete Messages
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    )}
                </Group>
                <Text c="dimmed" fz="md" fw={400}>
                    Messages from resolved incidents.
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
                        onChange={(value) => setFilter((value as TypeFilter) || 'all')}
                        data={FILTER_OPTIONS}
                        leftSection={<Filter width={16} height={16} />}
                        w={200}
                        allowDeselect={false}
                    />
                )}

                {selectMode && (
                    <Group gap="xs">
                        <Button variant="subtle" color="gray" onClick={exitSelectMode}>
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            leftSection={<Trash width={16} height={16} />}
                            disabled={selectedIds.length === 0}
                            onClick={() => setDeleteOpened(true)}
                        >
                            Delete ({selectedIds.length})
                        </Button>
                    </Group>
                )}
            </Group>

            {/* Results */}
            <Stack gap="md">
                {isLoading ? (
                    <HistorySkeletonList />
                ) : isError ? (
                    <Alert variant="light" color="red" radius="md" title="Error">
                        <Text size="sm" c="dimmed">Failed to load message history.</Text>
                    </Alert>
                ) : visible.length === 0 ? (
                    <Paper p="xl" py={80} ta="center" radius="md" bg="var(--mantine-color-body)">
                        <Stack align="center" gap="sm">
                            <History width={48} height={48} color="#adb5bd" />
                            <Text fw={400} c="dimmed">
                                No{filter !== 'all'
                                    ? ` ${FILTER_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase()}`
                                    : ''} history found.
                            </Text>
                        </Stack>
                    </Paper>
                ) : (
                    visible.map((message) => (
                        <Group key={message.id} wrap="nowrap" align="center" gap="xs">
                            {selectMode && (
                                <Checkbox
                                    checked={selectedIds.includes(message.id)}
                                    onChange={() => toggleSelect(message.id)}
                                    radius="sm"
                                    aria-label={`Select message: ${message.title}`}
                                />
                            )}
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                {selectMode ? (
                                    <DispatchMessageCard
                                        message={message}
                                        onSelect={() => toggleSelect(message.id)}
                                        selected={selectedIds.includes(message.id)}
                                    />
                                ) : (
                                    <HistoryMessageCard message={message} />
                                )}
                            </Box>
                        </Group>
                    ))
                )}
            </Stack>

            <DeleteConfirmModal
                opened={deleteOpened}
                onClose={() => setDeleteOpened(false)}
                onConfirm={handleDeleteSelected}
                loading={deleting}
                title={selectedIds.length === 1 ? 'Delete Message' : 'Delete Messages'}
                description={
                    selectedIds.length === 1 ? (
                        <>
                            Are you sure you want to delete{' '}
                            <Text span fw={600} c="var(--mantine-color-text)">
                                {selectedMessages[0]?.title ?? 'this message'}
                            </Text>
                            ? This action cannot be undone.
                        </>
                    ) : (
                        <>
                            Delete{' '}
                            <Text span fw={600} c="var(--mantine-color-text)">
                                {selectedIds.length} selected messages
                            </Text>
                            ? This action cannot be undone.
                        </>
                    )
                }
                items={selectedMessages.map((m) => m.title)}
                noun="Message"
                listTitle="Messages to be deleted"
                confirmLabel={`Delete (${selectedIds.length})`}
            />
        </Container>
    );
}
