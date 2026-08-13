import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Container,
    Paper,
    Text,
    Title,
    Group,
    Stack,
    ActionIcon,
    Divider,
    Box,
    Center,
    Loader,
    Badge,
    rem,
    useMantineTheme,
    useMantineColorScheme,
} from '@mantine/core';
import {
    ChevronLeft,
    MapPin,
    Flame,
    Car,
    CloudFog,
    ShieldAlert,
    Hash,
    Clock,
    Activity,
    AlignLeft,
    Gauge,
    Camera,
    LucideIcon,
} from 'lucide-react';
import { dispatchMessagesAPI } from '../../../shared/services/api';
import { formatDate, formatConfidence } from '../../../shared/utils/helpers';
import { SEVERITY_COLORS, STATUS_COLORS } from '../../../shared/utils/constants';
import type { DispatchMessage, IncidentType } from '../../../shared/types';

interface DetailRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    iconColor?: string;
}

// Sub-component for the detail items at the bottom
const DetailRow = ({ icon: Icon, label, value, iconColor }: DetailRowProps) => {
    const theme = useMantineTheme();
    return (
        <Group wrap="nowrap" align="center" py="md">
            <Box
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: rem(40),
                }}
            >
                <Icon
                    size={32}
                    color={iconColor || theme.colors.orange[6]}
                    strokeWidth={1.5}
                />
            </Box>
            <Stack gap={0}>
                <Text fw={700} size="md">
                    {label}
                </Text>
                <Text c="dimmed" size="md">
                    {value}
                </Text>
            </Stack>
        </Group>
    );
};

function getIncidentIcon(type: IncidentType) {
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

function formatIncidentId(id: number): string {
    return `INC-2026-${String(id).padStart(6, '0')}`;
}

export default function DispatchMessagePage() {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const messageId = Number(id);

    const { data, isLoading } = useQuery({
        queryKey: ['dispatch-message', messageId],
        queryFn: () => dispatchMessagesAPI.get(messageId),
        enabled: !!messageId,
    });

    const message: DispatchMessage | undefined = data?.data;

    const markReadMutation = useMutation({
        mutationFn: () => dispatchMessagesAPI.markRead(messageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dispatch-messages'] });
            queryClient.invalidateQueries({ queryKey: ['dispatch-message', messageId] });
        },
    });

    useEffect(() => {
        if (message && !message.is_read) {
            markReadMutation.mutate();
        }
    }, [message?.id, message?.is_read]);

    if (isLoading || !message) {
        return (
            <Container size="sm" py="xl">
                <Center py="xl">
                    <Loader color="orange" size="lg" />
                </Center>
            </Container>
        );
    }

    const incident = message.incident_data;
    const IncidentTypeIcon = getIncidentIcon(incident.incident_type);

    return (
        <Container size="sm" py="md">
            {/* Navigation Header */}
            <Stack gap="xs" mb="lg">
                <Group justify="space-between" align="center">
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        onClick={() => navigate('/pwa/tanod/messages')}
                    >
                        <ChevronLeft size={24} />
                    </ActionIcon>
                    <Title order={3} style={{ flex: 1, textAlign: 'center', marginRight: rem(40) }}>
                        Dispatch Message
                    </Title>
                </Group>
                <Divider />
                <Text ta="center" c="dimmed" size="sm" fw={500} mt="xs">
                    {formatDate(message.created_at)}
                </Text>
            </Stack>

            {/* Main Dispatch Content Card */}
            <Paper
                p="xl"
                radius="lg"
                mb="xl"
                style={{
                    backgroundColor: colorScheme === 'dark'
                        ? theme.colors.dark[6]
                        : '#FFF5F2',
                    border: colorScheme === 'dark' ? `1px solid ${theme.colors.dark[4]}` : 'none',
                }}
            >
                <Group mb="xl">
                    <Paper
                        withBorder
                        p={8}
                        radius="md"
                        style={{
                            backgroundColor: colorScheme === 'dark' ? theme.colors.dark[8] : 'white',
                        }}
                    >
                        <IncidentTypeIcon
                            size={32}
                            color={theme.colors.orange[6]}
                            fill={theme.colors.orange[6]}
                        />
                    </Paper>
                    <Stack gap={2}>
                        <Title order={2} fw={700} style={{ letterSpacing: rem(1) }}>
                            {message.title.toUpperCase()}
                        </Title>
                        <Badge color="orange" variant="light" size="sm">
                            {incident.incident_type.replace(/_/g, ' ')} · {incident.severity}
                        </Badge>
                    </Stack>
                </Group>

                <Stack gap="lg">
                    <Text size="lg" lh={1.5} fw={400}>
                        {message.body}
                    </Text>
                </Stack>
            </Paper>

            {/* Details Section */}
            <Stack gap={0}>
                <Divider />
                <DetailRow
                    icon={MapPin}
                    label="Location"
                    value={incident.zone_name || incident.camera_name || 'Unknown location'}
                />

                <Divider />
                <DetailRow
                    icon={IncidentTypeIcon}
                    label="Incident Type"
                    value={incident.incident_type.replace(/_/g, ' ')}
                />

                <Divider />
                <DetailRow
                    icon={ShieldAlert}
                    label="Severity"
                    value={incident.severity}
                    iconColor={SEVERITY_COLORS[incident.severity] || theme.colors.orange[6]}
                />

                <Divider />
                <DetailRow
                    icon={Hash}
                    label="Incident No."
                    value={formatIncidentId(incident.id)}
                />

                <Divider />
                <DetailRow
                    icon={Activity}
                    label="Status"
                    value={incident.status.replace(/_/g, ' ')}
                    iconColor={STATUS_COLORS[incident.status] || theme.colors.orange[6]}
                />

                <Divider />
                <DetailRow
                    icon={Clock}
                    label="Reported Time"
                    value={formatDate(incident.detected_at)}
                />

                <Divider />
                <DetailRow
                    icon={Camera}
                    label="Camera"
                    value={incident.camera_name || 'N/A'}
                />

                <Divider />
                <DetailRow
                    icon={Gauge}
                    label="Confidence"
                    value={formatConfidence(incident.confidence_score)}
                />

                <Divider />
                <DetailRow
                    icon={AlignLeft}
                    label="Description"
                    value={incident.description || 'N/A'}
                />
            </Stack>
        </Container>
    );
}
