import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Title, Text, Stack, Group, ActionIcon, Box } from '@mantine/core';
import { Flame, Car, Users, MoreVertical } from 'lucide-react';
import { IncidentCard } from '../../components/tanod/IncidentCard';

const MOCK_DATA = [
    {
        id: '123', // Added a simple ID for the URL
        title: 'House Fire Reported',
        incidentId: 'INC-2026-000123',
        description: 'A house fire has been reported at Barangay San Isidro.',
        time: '9:32AM',
        isNew: true,
        icon: Flame,
    },
    {
        id: '122',
        title: 'Vehicular Accident',
        incidentId: 'INC-2026-000122',
        description: 'A vehicular accident has been reported at Barangay San Isidro.',
        time: '8:10AM',
        isNew: true,
        icon: Car,
    },
    {
        id: '121',
        title: 'Gulo/Disturbance',
        incidentId: 'INC-2026-000121',
        description: 'A gulo or disturbance has been reported at Barangay San Isidro.',
        time: 'Yesterday',
        isNew: true,
        icon: Users,
    },
];

export default function MessagesPage() {
    const navigate = useNavigate();

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
            <Stack gap="md">
                {MOCK_DATA.map((incident) => (
                    <IncidentCard
                        key={incident.incidentId}
                        {...incident}
                        // Trigger navigation when the card is clicked
                        onClick={() => navigate(`/pwa/tanod/messages/${incident.id}`)}
                    />
                ))}
            </Stack>
        </Container>
    );
}