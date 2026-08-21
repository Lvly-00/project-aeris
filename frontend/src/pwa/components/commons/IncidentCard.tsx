import { Paper, Group, Stack, Text, Box, Progress, Badge, rem, useMantineTheme } from '@mantine/core';
import { Flame, Car, CloudFog, ChevronRight } from 'lucide-react';
import { Incident } from '../../../shared/types/index';
import { STATUS_COLORS, SEVERITY_COLORS } from '../../../shared/utils/constants';
import { formatRelativeTime } from '../../../shared/utils/helpers';

interface IncidentCardProps {
    incident: Incident;
    onClick?: (incident: Incident) => void;
}

const SEVERITY_BADGE: Record<string, string> = {
    Low: 'gray',
    Medium: 'yellow',
    High: 'orange',
    Critical: 'red',
};

const STATUS_BADGE: Record<string, string> = {
    Detected: 'red',
    Verified: 'orange',
    Dispatched: 'blue',
    Resolved: 'green',
    Dismissed: 'gray',
};

const STATUS_LABEL: Record<string, string> = {
    Detected: 'Detected',
    Verified: 'Verified',
    Dispatched: 'Dispatched',
    Resolved: 'Resolved',
    Dismissed: 'Dismissed',
};

const TYPE_LABEL: Record<string, string> = {
    Fire: 'Fire Incident',
    Smoke: 'Smoke Detected',
    Vehicle_Accident: 'Vehicular Accident',
};

const TYPE_ICON: Record<string, any> = {
    Fire: Flame,
    Smoke: CloudFog,
    Vehicle_Accident: Car,
};

export const IncidentCard = ({ incident, onClick }: IncidentCardProps) => {
    const theme = useMantineTheme();

    const Icon = TYPE_ICON[incident.incident_type] || Car;
    const color = incident.incident_type === 'Fire' ? 'red' : 'orange';
    const accentColor = STATUS_COLORS[incident.status] || SEVERITY_COLORS[incident.severity] || '#888';

    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            onClick={() => onClick?.(incident)}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                borderLeft: `${rem(5)} solid ${accentColor}`,
            }}
        >
            <Group align="flex-start" wrap="nowrap" gap="md">
                {/* Icon Container */}
                <Box
                    p="sm"
                    style={{
                        borderRadius: theme.radius.md,
                        backgroundColor: `var(--mantine-color-${color}-light)`,
                        color: `var(--mantine-color-${color}-6)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: rem(45),
                        height: rem(65),
                    }}
                >
                    <Icon size={40} fill="currentColor" strokeWidth={1.5} />
                </Box>

                {/* Info Section */}
                <Stack gap={0} style={{ flex: 1 }}>
                    <Group justify="space-between" align="flex-start">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text fw={700} size="lg" style={{ lineHeight: 1.2 }}>
                                {TYPE_LABEL[incident.incident_type] || incident.incident_type?.replace(/_/g, ' ')}
                            </Text>
                            <Text size="sm" c="dimmed">
                                INC-2026-{String(incident.id).padStart(6, '0')}
                            </Text>
                        </Box>
                        <Text size="xs" c="dimmed" fw={500} mt={2} style={{ whiteSpace: 'nowrap' }}>
                            {formatRelativeTime(incident.detected_at)}
                        </Text>
                    </Group>

                    <Group gap={6} mt={8}>
                        <Badge
                            size="sm"
                            variant="light"
                            color={STATUS_BADGE[incident.status] || 'gray'}
                            styles={{ label: { fontWeight: 700 } }}
                        >
                            {STATUS_LABEL[incident.status] || incident.status}
                        </Badge>
                        <Badge
                            size="sm"
                            variant="filled"
                            color={SEVERITY_BADGE[incident.severity] || 'gray'}
                        >
                            {incident.severity}
                        </Badge>
                        {incident.camera_name && (
                            <Text size="xs" c="dimmed" style={{ marginLeft: 'auto' }} truncate>
                                {incident.camera_name}
                            </Text>
                        )}
                    </Group>

                    {/* AI Confidence Section */}
                    <Box mt="md">
                        <Text size="xs" c="dimmed" fw={500} mb={4}>
                            AI Confidence
                        </Text>
                        <Group gap="md">
                            <Progress
                                color={color}
                                value={incident.confidence_score * 100}
                                size="sm"
                                radius="xl"
                                style={{ flex: 1 }}
                            />
                            <Group gap={8} wrap="nowrap">
                                <Text fw={700} size="md">
                                    {Math.round(incident.confidence_score * 100)}%
                                </Text>
                                {onClick && <ChevronRight size={20} color={theme.colors.gray[5]} strokeWidth={3} />}
                            </Group>
                        </Group>
                    </Box>
                </Stack>
            </Group>
        </Paper>
    );
};