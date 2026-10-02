import { Paper, Text, RingProgress, Center, Stack, Group, ColorSwatch, useMantineTheme } from '@mantine/core';
import type { DashboardTally } from '../../../shared/types';

/** Keep the dashboard rings consistent with the incident type badges. */
export const TYPE_COLORS: Record<string, string> = {
    Fire: '#e60000',
    Smoke: '#ff8c00',
    Vehicle_Accident: '#f5c518',
};

export const TYPE_LABELS: Record<string, string> = {
    Fire: 'Fire',
    Smoke: 'Smoke',
    Vehicle_Accident: 'Vehicle Accident',
};

interface Props {
    /** Incident counts per type, highest first, straight from the API. */
    byType: DashboardTally[];
    loading?: boolean;
}

export const IncidentSummary = ({ byType, loading = false }: Props) => {
    const theme = useMantineTheme();

    const shown = byType.filter((row) => row.count > 0);
    const total = shown.reduce((sum, row) => sum + row.count, 0);

    const sections = shown.map((row) => ({
        value: total > 0 ? (row.count / total) * 100 : 0,
        color: TYPE_COLORS[row.name] || theme.colors.gray[5],
        tooltip: `${TYPE_LABELS[row.name] || row.name}: ${row.count}`,
    }));

    /*
     * RingProgress needs the slices to add up to exactly 100. Dividing by the
     * total leaves float drift, so the smallest slice absorbs the rounding
     * error instead of letting the ring render with a visible gap.
     */
    if (sections.length > 0) {
        const sum = sections.reduce((acc, s) => acc + s.value, 0);
        const smallest = sections.reduce((min, s) => (s.value < min.value ? s : min), sections[0]);
        smallest.value = Math.max(0, smallest.value + (100 - sum));
    }

    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            h="100%"
            bg="var(--mantine-color-body)"
        >
            <Stack gap="md" align="center">
                <Text ta="center" fw={700} fz="sm" tt="uppercase" c="dimmed">
                    Incident Summary
                </Text>

                {loading ? (
                    <Center h={200}>
                        <Text c="dimmed" size="sm">
                            Loading…
                        </Text>
                    </Center>
                ) : total === 0 ? (
                    <Center h={200}>
                        <Text c="dimmed" size="sm" ta="center">
                            No incidents recorded yet.
                        </Text>
                    </Center>
                ) : (
                    <>
                        <Center>
                            <RingProgress
                                size={200}
                                thickness={20}
                                roundCaps
                                sections={sections}
                                label={
                                    <Text fw={800} ta="center" size="32px" c="var(--mantine-color-text)">
                                        {total}
                                    </Text>
                                }
                            />
                        </Center>

                        <Stack gap="xs" w="100%" px="lg">
                            {shown.map((row) => (
                                <Group key={row.name} justify="space-between" wrap="nowrap">
                                    <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                                        <ColorSwatch
                                            color={TYPE_COLORS[row.name] || theme.colors.gray[5]}
                                            size={10}
                                            radius="sm"
                                        />
                                        <Text size="xs" fw={600} c="dimmed" truncate>
                                            {TYPE_LABELS[row.name] || row.name}
                                        </Text>
                                    </Group>
                                    <Text size="xs" fw={700} c="var(--mantine-color-text)">
                                        {row.count}
                                    </Text>
                                </Group>
                            ))}
                        </Stack>
                    </>
                )}

                <Text ta="center" size="xs" c="dimmed" fw={600} px="md" style={{ lineHeight: 1.5 }}>
                    Based on recorded and verified incident reports.
                </Text>
            </Stack>
        </Paper>
    );
};