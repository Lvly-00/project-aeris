import { Box, Card, Container, Group, Skeleton, Stack, rem } from '@mantine/core';

/** Mirrors the real page's block order so nothing shifts when the data lands. */
export const IncidentDetailSkeleton = () => (
  <Container size="sm" py="md" pb="xl" aria-busy="true" aria-label="Loading incident">
    <Group gap="sm" wrap="nowrap" mb="md">
      <Skeleton h={rem(36)} w={rem(36)} radius="md" />
      <Stack gap={rem(8)} style={{ flex: 1, minWidth: 0 }}>
        <Skeleton h={rem(20)} w="55%" radius="xl" />
        <Skeleton h={rem(12)} w="40%" radius="xl" />
      </Stack>
      <Skeleton h={rem(26)} w={rem(86)} radius="sm" />
    </Group>

    <Skeleton h={rem(196)} radius={rem(16)} mb="md" />

    <Card withBorder radius="lg" p={0} mb="md">
      {[0, 1, 2, 3].map((field) => (
        <Box key={field} px="md" py="sm">
          <Group gap="md" wrap="nowrap">
            <Skeleton h={rem(12)} w={rem(92)} radius="xl" />
            <Skeleton h={rem(14)} w="45%" radius="xl" />
          </Group>
        </Box>
      ))}
    </Card>

    <Card withBorder radius="lg" p="md">
      <Skeleton h={rem(14)} w="35%" radius="xl" mb="md" />
      <Stack gap="sm">
        {[0, 1, 2].map((step) => (
          <Group key={step} gap="md" wrap="nowrap">
            <Skeleton h={rem(22)} w={rem(22)} circle />
            <Skeleton h={rem(12)} w={`${58 - step * 8}%`} radius="xl" />
          </Group>
        ))}
      </Stack>
    </Card>
  </Container>
);
