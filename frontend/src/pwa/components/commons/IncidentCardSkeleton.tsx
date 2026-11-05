import { Group, Paper, Skeleton, Stack, rem } from '@mantine/core';

/**
 * Card-shaped placeholder that mirrors IncidentCard's geometry, so the list
 * keeps its height and rhythm while the first page of incidents loads.
 */
export const IncidentCardSkeleton = () => (
    <Paper
        withBorder
        p="md"
        radius="md"
        bg="var(--mantine-color-body)"
        style={{ borderLeft: `${rem(4)} solid var(--mantine-color-default-border)` }}
    >
        <Group align="flex-start" wrap="nowrap" gap="md">
            <Skeleton h={rem(88)} w={rem(64)} radius="md" />

            <Stack gap={rem(6)} style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Skeleton h={rem(16)} w="45%" radius="xl" />
                    <Skeleton h={rem(22)} w={rem(80)} radius="xl" />
                </Group>
                <Skeleton h={rem(12)} w="30%" radius="xl" />
                <Skeleton h={rem(10)} w="100%" radius="xl" mt={rem(12)} />
            </Stack>
        </Group>
    </Paper>
);

export const IncidentCardSkeletonList = ({ count = 3 }: { count?: number }) => (
    <Stack gap="md" aria-busy="true" aria-label="Loading incidents">
        {Array.from({ length: count }, (_, index) => (
            <IncidentCardSkeleton key={index} />
        ))}
    </Stack>
);
