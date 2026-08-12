import { useEffect, useState, useCallback } from 'react';
import { Container, Title, Text, Button, Group, Stack, Loader, Center, rem, Select, Alert, ActionIcon, Menu } from '@mantine/core';
import { Filter, MoreVertical, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

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

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [loading, setLoading] = useState(true);

    /*
     * Always keep newest closed incidents first.
     */
    const sortLatestFirst = useCallback((items: Incident[]) => {
        return [...items].sort(
            (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
        );
    }, []);

    /*
     * History contains incidents that are finished: resolved or dismissed.
     */
    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);

            const res = await incidentsAPI.list({
                status__in: 'Resolved,Dismissed',
                ordering: '-detected_at',
            });

            const data = res.data.results || res.data;

            setIncidents(sortLatestFirst(data));
        } catch (error) {
            console.error('[HISTORY] Failed to fetch:', error);

            notifications.show({
                title: 'Error',
                message: 'Failed to load incident history',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [sortLatestFirst]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

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
                    onClick={() => fetchHistory()}
                    title="Refresh history"
                >
                    <MoreVertical size={24} />
                </ActionIcon>
            </Group>

            {/* Results List */}
            <Stack gap="md">
                {loading ? (
                    <Center py="xl"><Loader variant="dots" color="blue" /></Center>
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
                            onClick={(item) => navigate(`/pwa/incidents/${item.id}`)}
                        />
                    ))
                )}
            </Stack>
        </Container>
    );
}