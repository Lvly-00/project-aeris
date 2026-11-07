import {
  Box,
  Container,
  Group,
  Paper,
  Skeleton,
  Stack,
  rem,
} from '@mantine/core';
import { CARD_PADDING } from './profileTheme';

export default function ProfileSkeleton() {
  return (
    <Container
      size="xs"
      py={{ base: 'md', sm: 'lg' }}
      px={0}
      aria-busy="true"
      aria-label="Loading your profile"
    >
      <Stack gap="md">
        <Box>
          <Skeleton h={rem(30)} w={rem(122)} radius="sm" />
          <Skeleton h={rem(13)} w="72%" radius="sm" mt={10} />
        </Box>

        <Paper withBorder radius="lg" p={{ base: 'lg', sm: 'xl' }}>
          <Stack align="center" gap={0}>
            <Skeleton h={94} w={94} circle />
            <Skeleton h={rem(18)} w={rem(148)} radius="sm" mt="md" />
            <Skeleton h={rem(20)} w={rem(86)} radius="xl" mt={10} />
          </Stack>
        </Paper>

        {[0, 1].map((card) => (
          <Paper key={card} withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
            <Box px={CARD_PADDING} pt="lg" pb="md">
              <Skeleton h={rem(14)} w={rem(92)} radius="sm" />
              <Skeleton h={rem(11)} w="58%" radius="sm" mt={8} />
            </Box>

            {[0, 1, 2].map((row) => (
              <Group
                key={row}
                justify="space-between"
                wrap="nowrap"
                px={CARD_PADDING}
                py="sm"
                gap="sm"
              >
                <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton h={rem(10)} w={rem(54)} radius="sm" />
                  <Skeleton h={rem(12)} w="62%" radius="sm" />
                </Stack>
                <Skeleton h={rem(36)} w={rem(76)} radius="sm" />
              </Group>
            ))}
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
