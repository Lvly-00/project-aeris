import { Box, Container, Group, SimpleGrid, Skeleton, Stack, rem } from '@mantine/core';

/**
 * Painted while the stored session boots, so reopening the app shows the
 * shell it is about to render instead of a lone spinner on a blank page.
 * The header, card grid and tab bar match the real AppShell proportions.
 */
export function PwaShellSkeleton() {
  return (
    <Box
      aria-busy="true"
      aria-label="Loading AERIS"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Box
        px="md"
        style={{
          height: 70,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group w="100%" justify="space-between" align="center">
          <Skeleton h={35} w={rem(104)} radius="sm" />
          <Skeleton h={rem(28)} w={rem(28)} circle />
        </Group>
      </Box>

      <Box px="md" py="sm" style={{ flex: 1 }}>
        <Container size="sm" px={0}>
          <Stack gap="md">
            <Skeleton h={rem(96)} radius="lg" />

            <SimpleGrid cols={2} spacing="md">
              {[0, 1, 2, 3].map((card) => (
                <Skeleton key={card} h={rem(118)} radius="lg" />
              ))}
            </SimpleGrid>

            <Stack gap="sm">
              {[0, 1].map((row) => (
                <Skeleton key={row} h={rem(76)} radius="lg" />
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box
        px="xs"
        py="xs"
        style={{
          height: 85,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        {[0, 1, 2, 3].map((tab) => (
          <Stack key={tab} gap={6} align="center" justify="center">
            <Skeleton h={rem(24)} w={rem(24)} circle />
            <Skeleton h={rem(9)} w={rem(36)} radius="xl" />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
