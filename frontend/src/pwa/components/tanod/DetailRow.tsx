import type { ComponentType } from 'react';
import { Box, Group, Stack, Text, rem, useMantineTheme } from '@mantine/core';
import type { BoxIconProps } from '@boxicons/react';

interface DetailRowProps {
  icon: ComponentType<BoxIconProps>;
  label: string;
  value: string;
  iconColor?: string;
}

/** One labelled fact in the tanod dispatch sheet. */
export function DetailRow({ icon: Icon, label, value, iconColor }: DetailRowProps) {
  const theme = useMantineTheme();

  return (
    <Group wrap="nowrap" align="center" py="md">
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: rem(40),
        }}
      >
        <Icon
          width={32}
          height={32}
          color={iconColor || theme.colors.orange[6]}
          strokeWidth={1.5}
        />
      </Box>

      <Stack gap={0}>
        <Text fw={700} size="md">
          {label}
        </Text>
        <Text c="dimmed" size="md">
          {value}
        </Text>
      </Stack>
    </Group>
  );
}
