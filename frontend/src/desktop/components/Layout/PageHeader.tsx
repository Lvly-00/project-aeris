import { Group, Stack, Title, Text, Box, Divider } from '@mantine/core';
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box mb="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
        <Stack gap={4}>
          <Title order={2} style={{ textTransform: 'uppercase', fontSize: '1.25rem', fontWeight: 700 }}>
            {title}
          </Title>
          {subtitle && (
            <Text size="sm" c="dimmed" fw={400}>
              {subtitle}
            </Text>
          )}
        </Stack>
        {actions && <Box pt={4}>{actions}</Box>}
      </Group>
      <Divider color="#e9ecef" />
    </Box>
  );
}