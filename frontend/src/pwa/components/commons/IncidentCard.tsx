import { useState } from 'react';
import { Paper, Group, Stack, Text, Box, Progress, Badge, rem, useMantineTheme } from '@mantine/core';
import { Car, ChevronRight, Cloud, Flame } from '@boxicons/react';
import { Incident } from '../../../shared/types/index';
import { STATUS_COLORS, STATUS_BADGE_COLORS, STATUS_LABELS, SEVERITY_COLORS } from '../../../shared/utils/constants';
import { formatRelativeTime } from '../../../shared/utils/helpers';

interface IncidentCardProps {
    incident: Incident;
    onClick?: (incident: Incident) => void;
    /** Highlights the card while it is picked for a bulk action. */
    selected?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
    Fire: 'Fire Incident',
    Smoke: 'Smoke Detected',
    Vehicle_Accident: 'Vehicular Accident',
};

const TYPE_ICON: Record<string, any> = {
    Fire: Flame,
    Smoke: Cloud,
    Vehicle_Accident: Car,
};

export const IncidentCard = ({ incident, onClick, selected = false }: IncidentCardProps) => {
    const theme = useMantineTheme();
    const [hovered, setHovered] = useState(false);

    const Icon = TYPE_ICON[incident.incident_type] || Car;
    const color = incident.incident_type === 'Fire' ? 'red' : 'orange';
    const accentColor = STATUS_COLORS[incident.status] || SEVERITY_COLORS[incident.severity] || '#fa5252';

    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            onClick={() => onClick?.(incident)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                overflow: 'hidden',
                backgroundColor: selected
                    ? 'var(--mantine-color-orange-light)'
                    : 'var(--mantine-color-body)',
                borderColor: selected
                    ? 'var(--mantine-color-orange-4)'
                    : hovered && onClick
                        ? 'var(--mantine-color-gray-4)'
                        : undefined,
                borderLeft: `${rem(4)} solid ${accentColor}`,
                boxShadow: hovered && onClick && !selected ? 'var(--mantine-shadow-sm)' : 'none',
                transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
            }}
        >
            <Group align="flex-start" wrap="nowrap" gap="md">
                {/* Icon Container */}
                <Box
                    style={{
                        borderRadius: theme.radius.md,
                        backgroundColor: `var(--mantine-color-${color}-light)`,
                        color: `var(--mantine-color-${color}-6)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: rem(64),
                        height: rem(88),
                        flexShrink: 0,
                    }}
                >
                    <Icon size={34} fill="currentColor" />
                </Box>

                {/* Content Section */}
                <Stack gap={rem(2)} style={{ flex: 1, minWidth: 0 }}>
                    {/* Header Row: Title & Badge */}
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                        <Text fw={700} size="md" lh={1.25}>
                            {TYPE_LABEL[incident.incident_type] || incident.incident_type?.replace(/_/g, ' ')}
                        </Text>

                        <Badge
                            variant="outline"
                            color={STATUS_BADGE_COLORS[incident.status] || 'red'}
                            radius="xl"
                            size="sm"
                            styles={{
                                root: { borderWidth: rem(1), textTransform: 'capitalize' },
                                label: { fontWeight: 700 },
                            }}
                        >
                            {STATUS_LABELS[incident.status] || incident.status}
                        </Badge>
                    </Group>

                    {/* Incident ID & Relative Time */}
                    {/* <Text size="xs" c="dimmed" mt={2}>
                        INC-2026-{String(incident.id).padStart(6, '0')}
                    </Text> */}
                    <Text size="sm" c="dimmed">
                        {formatRelativeTime(incident.detected_at)}
                    </Text>

                    {/* AI Confidence Section */}
                    <Box mt={rem(8)}>
                        <Text size="sm" c="dimmed" fw={500} mb={rem(4)}>
                            AI Confidence
                        </Text>
                        <Group gap="xs" align="center" wrap="nowrap">
                            <Progress
                                color={color}
                                value={incident.confidence_score * 100}
                                size="sm"
                                radius="xl"
                                style={{ flex: 1 }}
                            />
                            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                                <Text fw={700} size="md">
                                    {Math.round(incident.confidence_score * 100)}%
                                </Text>
                                {onClick && (
                                    <ChevronRight
                                        width={20}
                                        height={20}
                                        color={theme.colors.gray[5]}
                                        strokeWidth={2.5}
                                    />
                                )}
                            </Group>
                        </Group>
                    </Box>
                </Stack>
            </Group>
        </Paper>
    );
};
