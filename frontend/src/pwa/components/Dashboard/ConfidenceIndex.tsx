import { Paper, Text, RingProgress, Center, Stack, Group } from '@mantine/core';
import type { VerdictCounts } from '../../../shared/types';

interface Props {
    /** Operator verdicts across every retained detection. */
    verdicts?: VerdictCounts;
    loading?: boolean;
}

const NO_VERDICTS: VerdictCounts = { pending: 0, true: 0, false: 0 };

/**
 * Precision: of the detections an operator has actually reviewed, how many
 * were real. Unreviewed detections are excluded rather than counted as misses,
 * so a fresh system reads as "nothing reviewed yet" instead of 0%.
 */
export const ConfidenceIndex = ({ verdicts = NO_VERDICTS, loading = false }: Props) => {
    const reviewed = verdicts.true + verdicts.false;
    const precision = reviewed > 0 ? (verdicts.true / reviewed) * 100 : null;

    return (
        <Paper withBorder p="md" radius="md" h="100%" bg="var(--mantine-color-body)">
            <Stack gap="md" align="center">
                <Text ta="center" fw={700} size="sm" tt="uppercase" c="dimmed">
                    Confidence Index
                </Text>

                {loading ? (
                    <Center h={180}>
                        <Text c="dimmed" size="sm">
                            Loading…
                        </Text>
                    </Center>
                ) : (
                    <>
                        <Center>
                            <RingProgress
                                size={180}
                                thickness={20}
                                roundCaps
                                sections={
                                    precision === null
                                        ? []
                                        : [{ value: precision, color: 'orange' }]
                                }
                                label={
                                    <Text fw={800} ta="center" size="24px">
                                        {precision === null ? '—' : `${Math.round(precision)}%`}
                                    </Text>
                                }
                            />
                        </Center>

                        <Stack gap="xs" w="100%" px="lg">
                            <Group justify="space-between">
                                <Text size="xs" fw={600} c="dimmed">
                                    Confirmed real
                                </Text>
                                <Text size="xs" fw={700} c="green">
                                    {verdicts.true}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="xs" fw={600} c="dimmed">
                                    False positives
                                </Text>
                                <Text size="xs" fw={700} c="red">
                                    {verdicts.false}
                                </Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="xs" fw={600} c="dimmed">
                                    Awaiting review
                                </Text>
                                <Text size="xs" fw={700} c="dimmed">
                                    {verdicts.pending}
                                </Text>
                            </Group>
                        </Stack>
                    </>
                )}

                <Text ta="center" size="xs" c="dimmed" fw={600} px="md" style={{ lineHeight: 1.5 }}>
                    {reviewed === 0
                        ? 'Review detections to calculate this.'
                        : `Based on ${reviewed} reviewed detection${reviewed === 1 ? '' : 's'}.`}
                </Text>
            </Stack>
        </Paper>
    );
};