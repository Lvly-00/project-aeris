import { Box, Group, Paper, Skeleton, Stack, rem } from '@mantine/core';

const COLUMNS: Record<string, number> = {
    'cctv-2x2': 2,
    'cctv-3x3': 3,
    'cctv-4x4': 4,
};

interface CameraGridSkeletonProps {
    /** Mirrors the toolbar's selected layout so the wall does not resize. */
    layout?: string;
}

/**
 * The monitoring wall's own loading state: empty 16:9 frames in the exact grid
 * the operator chose, so switching from loading to live feeds does not move
 * anything around.
 */
export const CameraGridSkeleton = ({ layout = 'cctv-2x2' }: CameraGridSkeletonProps) => {
    const cols = COLUMNS[layout] ?? 2;

    return (
        <Box
            aria-busy="true"
            aria-label="Loading cameras"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: '16px',
                padding: '16px',
            }}
        >
            {Array.from({ length: cols * cols }, (_, index) => (
                <Paper
                    key={index}
                    radius="md"
                    style={{
                        overflow: 'hidden',
                        border: '1px solid var(--mantine-color-default-border)',
                        background: 'var(--mantine-color-body)',
                    }}
                >
                    <Box
                        style={{
                            position: 'relative',
                            width: '100%',
                            paddingTop: '56.25%',
                            backgroundColor: 'var(--mantine-color-default-hover)',
                        }}
                    >
                        <Box pos="absolute" top={12} left={12}>
                            <Skeleton h={rem(22)} w={rem(88)} radius="sm" />
                        </Box>
                    </Box>

                    <Group justify="space-between" p="md" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                            <Skeleton h={rem(24)} w={rem(24)} radius="sm" />
                            <Stack gap={4}>
                                <Skeleton h={rem(12)} w={rem(120)} radius="xl" />
                                <Skeleton h={rem(9)} w={rem(90)} radius="xl" />
                            </Stack>
                        </Group>
                        <Skeleton h={rem(12)} w={rem(52)} radius="xl" />
                    </Group>
                </Paper>
            ))}
        </Box>
    );
};
