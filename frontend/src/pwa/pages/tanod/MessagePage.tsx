import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Container, Title, Text, Stack, Group, ActionIcon, Box, Center, Loader } from '@mantine/core';
import { MoreVertical, Flame, Car, CloudFog, Inbox } from 'lucide-react';
import { IncidentCard } from '../../components/tanod/IncidentCard';
import { dispatchMessagesAPI } from '../../../shared/services/api';
import { formatRelativeTime } from '../../../shared/utils/helpers';
import type { DispatchMessage, IncidentType } from '../../../shared/types';

function formatIncidentId(id: number): string {
    return `INC-2026-${String(id).padStart(6, '0')}`;
}

function getMessageIcon(type: IncidentType) {
    switch (type) {
        case 'Fire':
            return Flame;
        case 'Smoke':
            return CloudFog;
        case 'Vehicle_Accident':
            return Car;
        default:
            return Flame;
    }
}

export default function MessagesPage() {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['dispatch-messages'],
        queryFn: () => dispatchMessagesAPI.list(),
    });

    const messages: DispatchMessage[] = data?.data?.results ?? data?.data ?? [];

    return (
        <Container size="sm" py="xl">
            {/* Header Section */}
            <Group justify="space-between" align="flex-start" mb="xl">
                <Box>
                    <Title order={1} fw={900} style={{ fontSize: '2.5rem' }}>
                        Messages
                    </Title>
                    <Text c="dimmed" fw={500} size="lg">
                        Stay updated on the latest incidents.
                    </Text>
                </Box>

                <ActionIcon variant="default" size="lg" radius="md">
                    <MoreVertical size={20} />
                </ActionIcon>
            </Group>

            {/* List Section */}
            {isLoading ? (
                <Center py="xl">
                    <Loader color="orange" size="lg" />
                </Center>
            ) : messages.length === 0 ? (
                <Center py="xl">
                    <Stack align="center" gap="sm">
                        <Inbox size={48} color="var(--mantine-color-gray-5)" />
                        <Text c="dimmed" fw={500}>
                            No dispatch messages yet.
                        </Text>
                    </Stack>
                </Center>
            ) : (
                <Stack gap="md">
                    {messages.map((message) => (
                        <IncidentCard
                            key={message.id}
                            title={message.title}
                            incidentId={formatIncidentId(message.incident_data.id)}
                            description={message.body}
                            time={formatRelativeTime(message.created_at)}
                            isNew={!message.is_read}
                            unread={!message.is_read}
                            icon={getMessageIcon(message.incident_data.incident_type)}
                            onClick={() => navigate(`/pwa/tanod/messages/${message.id}`)}
                        />
                    ))}
                </Stack>
            )}
        </Container>
    );
}
