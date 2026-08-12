import { Paper, Group, Stack, Text, Box, Progress, rem, useMantineTheme } from '@mantine/core';
import { Flame, Car, ChevronRight } from 'lucide-react';
import { Incident } from '../../../shared/types/index';

interface IncidentCardProps {
    incident: Incident;
    onClick?: (incident: Incident) => void;
}

export const IncidentCard = ({ incident, onClick }: IncidentCardProps) => {
    const theme = useMantineTheme();

    const isFire = incident.incident_type === 'Fire';
    const color = isFire ? 'red' : 'orange';
    const Icon = isFire ? Flame : Car;

    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            onClick={() => onClick?.(incident)}
            style={{
                cursor: 'pointer',
                borderLeft: `${rem(5)} solid var(--mantine-color-${color}-6)`,
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
                        <Box>
                            <Text fw={700} size="lg" style={{ lineHeight: 1.2 }}>
                                {isFire ? 'Fire Incident' : 'Vehicular Accident'}
                            </Text>
                            <Text size="sm" c="dimmed">
                                INC-2026-{incident.id.toString().padStart(6, '0')}
                            </Text>
                        </Box>
                        <Text size="xs" c="dimmed" fw={500} mt={4}>
                            {isFire ? '12 hrs ago' : '1 min ago'}
                        </Text>
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
                                <ChevronRight size={20} color={theme.colors.gray[5]} strokeWidth={3} />
                            </Group>
                        </Group>
                    </Box>
                </Stack>
            </Group>
        </Paper>
    );
};