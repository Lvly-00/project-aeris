import { Paper, Text, RingProgress, Center, Stack, Group, ColorSwatch } from '@mantine/core';

const legendData = [
    { label: 'Fire', color: '#e60000', count: 6 },
    { label: 'Vehicle Accident', color: '#ff8c00', count: 3 },
];

export const IncidentSummary = () => {
    return (
        <Paper withBorder p="md" radius="md" h="100%" bg="white">
            <Stack gap="md" align="center">
                {/* --- Header --- */}
                <Text ta="center" fw={700} fz="sm" tt="uppercase" c="dark.3">
                    Incident Summary
                </Text>

                {/* --- The Chart --- */}
                <Center>
                    <RingProgress
                        size={200}
                        thickness={20}
                        roundCaps
                        sections={[
                            { value: 40, color: '#ff8c00', tooltip: 'Vehicle Accident' },
                            { value: 20, color: '#e60000', tooltip: 'Fire' },
                        ]}
                        label={
                            <Text fw={800} ta="center" size="32px" c="dark.4">
                                60%
                            </Text>
                        }
                    />
                </Center>

                {/* --- Legend Section with Values --- */}
                <Stack gap="xs" w="100%" px="lg">
                    {legendData.map((item) => (
                        <Group key={item.label} justify="space-between" wrap="nowrap">
                            <Group gap={8}>
                                <ColorSwatch color={item.color} size={10} radius="sm" />
                                <Text size="xs" fw={600} c="dimmed">
                                    {item.label}
                                </Text>
                            </Group>
                            <Text size="xs" fw={700} c="dark.4">
                                {item.count}
                            </Text>
                        </Group>
                    ))}
                </Stack>

                {/* --- Footer Text --- */}
                <Text ta="center" size="xs" c="dimmed" fw={600} px="md" style={{ lineHeight: 1.5 }}>
                    Based on recorded and verified incident reports.
                </Text>
            </Stack>
        </Paper>
    );
};