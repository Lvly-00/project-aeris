import { useState } from 'react';
import { Container, Title, Text, Group, Stack, Loader, Center, rem, Select, Alert, ActionIcon, Menu } from '@mantine/core';
import { Filter, MoreVertical, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Incident } from '../../../shared/types/index';
import { IncidentCard } from '../../components/commons/IncidentCard';
import { incidentsAPI } from '../../../shared/services/api';

type StatusFilter = 'all' | 'Resolved' | 'Dismissed';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Closed' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Dismissed', label: 'Dismissed' },
];

export default function HistoryPage() {
    const navigate = useNavigate();

    const [filter, setFilter] = useState<StatusFilter>('all');

    const { data: incidents = [], isLoading: loading, isError, refetch } = useQuery({
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

    return (
        <Container size="sm" py="lg">
            {/* Page Header */}
            <Stack mb="lg" gap={4}>
                <Group align="center" gap={6}>
                    <History size={26} color="var(--mantine-color-dimmed)" />
                    <Title order={1} fz={rem(38)} fw={700} style={{ letterSpacing: rem(-1) }}>
                        History
                    </Title>
                </Group>
                <Text c="dimmed" fz="md" fw={400}>
                    Resolved and dismissed incidents.
                </Text>
            </Stack>

            {/* Control Bar */}
            <Group justify="space-between" mb="lg">
                <Select
                    size="sm"
                    radius="sm"
                    value={filter}
                    onChange={(value) => setFilter((value as StatusFilter) || 'all')}
                    data={FILTER_OPTIONS}
                    leftSection={<Filter size={16} />}
                    w={180}
                    allowDeselect={false}
                />
                <ActionIcon
                    variant="transparent"
                    color="gray"
                    size="lg"
                    onClick={() => refetch()}
                    title="Refresh history"
                >
                    <MoreVertical size={24} />
                </ActionIcon>
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
                    <Alert variant="light" color="gray" radius="md" title="No History">
                        <Text size="sm" c="dimmed">
                            No {filter === 'all' ? '' : filter.toLowerCase() + ' '}incidents yet. Incidents
                            move here once they are marked as Resolved or Dismissed.
                        </Text>
                    </Alert>
                ) : (
                    visibleIncidents.map((incident) => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            onClick={(item) => navigate(`/pwa/admin/incidents/${item.id}`)}
                        />
                    ))
                )}
            </Stack>
        </Container>
    );
}