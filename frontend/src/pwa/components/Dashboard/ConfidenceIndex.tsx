import { Paper, Text, RingProgress, Center, Stack } from '@mantine/core';

export const ConfidenceIndex = () => {
  return (
    <Paper withBorder p="xl" radius="md" h="100%">
      <Text ta="center" fw={700} size="sm" tt="uppercase" mb="xl">
        Confidence Index
      </Text>
      <Center mb="xl">
        <RingProgress
          size={180}
          thickness={20}
          sections={[
            { value: 40, color: '#ff8c00' },
            { value: 20, color: '#e60000' },
          ]}
          label={
            <Text fw={700} ta="center" size="xl">
              60%
            </Text>
          }
        />
      </Center>
      <Text ta="center" size="xs" c="dimmed" fw={700} px="md">
        Based on recorded and verified incident reports.
      </Text>
    </Paper>
  );
};