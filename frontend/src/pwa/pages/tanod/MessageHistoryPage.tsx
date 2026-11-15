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
} from '@mantine/core';
import { Filter, History } from '@boxicons/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { dispatchMessagesAPI } from '../../../shared/services/api';
import type { DispatchMessage } from '../../../shared/types';
import type { IncidentType } from '../../../shared/types';
import { DispatchMessageCard } from '../../components/tanod/messages/DispatchMessageCard';

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

/**
 * Wraps DispatchMessageCard in a Link that passes `from: 'history'` state so
 * MessageDetailsPage knows to return here instead of to the messages list.
 */
function HistoryMessageCard({ message }: { message: DispatchMessage }) {
    return (
        <Link
            to={`/tanod/messages/${message.id}`}
            state={{ from: 'history' }}
            style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            aria-label={`Open message: ${message.title}`}
        >
            {/* Pass onSelect=undefined so the card renders its inner body without
                its own Link wrapper — we provide the link above. */}
            <DispatchMessageCard message={message} linkless />
        </Link>
    );
}

export default function MessageHistoryPage() {
    const [filter, setFilter] = useState<TypeFilter>('all');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['dispatch-message-history'],
        queryFn: async () => {
            const res = await dispatchMessagesAPI.list({ incident__status: 'Resolved' });
            const rows: DispatchMessage[] = res.data?.results ?? res.data ?? [];
            return rows;
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: 15000,
    });

    const messages = useMemo<DispatchMessage[]>(() => {
        if (!data) return [];

        const seen = new Set<number>();
        return data
            .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
    }, [data]);

    const visible = useMemo<DispatchMessage[]>(() => {
        if (filter === 'all') return messages;
        return messages.filter(
            (m) => m.incident_data?.incident_type === filter
        );
    }, [messages, filter]);

    return (
        <Container size="sm" py="lg" px={0}>
            {/* Page Header */}
            <Stack mb="lg" gap={4}>
                <Title order={1} fz={rem(32)} fw={700} style={{ letterSpacing: rem(-1) }}>
                    History
                </Title>
                <Text c="dimmed" fz="md" fw={400}>
                    Messages from resolved incidents.
                </Text>
            </Stack>

            {/* Filter Bar */}
            <Group mb="lg">
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
                        <HistoryMessageCard key={message.id} message={message} />
                    ))
                )}
            </Stack>
        </Container>
    );
}
