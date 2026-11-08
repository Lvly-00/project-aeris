import {
  Box,
  Center,
  Container,
  Divider,
  Group,
  Paper,
  Skeleton,
  Stack,
  rem,
} from '@mantine/core';

/** Loading state for the restored header, evidence frame and message card. */
export function MessageDetailSkeleton() {
  return (
    <Container size="sm" py="md" px={0} aria-busy="true" aria-label="Loading dispatch message">
      <Stack gap="xs" mb="lg">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Skeleton h={rem(30)} w={rem(30)} radius="sm" />
          <Skeleton h={rem(20)} w="40%" radius="xl" />
          <Box w={rem(30)} />
        </Group>

        <Divider />

        <Center mt="xs">
          <Skeleton h={rem(12)} w={rem(160)} radius="xl" />
        </Center>
      </Stack>

      <Skeleton h="auto" mb="md" style={{ aspectRatio: '16 / 9' }} radius="md" />

      <Paper p="xl" radius="lg" bg="var(--mantine-color-orange-light)">
        <Stack gap={rem(8)} mb="lg">
          <Skeleton h={rem(24)} w="80%" radius="sm" />
          <Skeleton h={rem(18)} w={rem(120)} radius="sm" />
        </Stack>

        <Stack gap="sm">
          <Skeleton h={rem(14)} w="100%" radius="xl" />
          <Skeleton h={rem(14)} w="92%" radius="xl" />
          <Skeleton h={rem(14)} w="60%" radius="xl" />
        </Stack>
      </Paper>
    </Container>
  );
}
