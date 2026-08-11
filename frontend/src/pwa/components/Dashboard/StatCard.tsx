import { Paper, Text, Group, ThemeIcon, Stack } from '@mantine/core';
import { ReactNode } from 'react';

interface StatCardProps {
    label: string;
    value: string;
    description: string;
    icon: ReactNode;
}

export const StatCard = ({ label, value, description, icon }: StatCardProps) => {
    return (
        <Paper withBorder p="sm" radius="md" bg="white">
            <Stack gap="md">

                {/* Icon + Statistic */}
                <Group
                    justify="center"
                    align="center"
                    wrap="nowrap"
                    gap="md"
                >
                    <ThemeIcon
                        size={30}
                        radius="xl"
                        variant="light"
                        color="orange.1"
                    >
                        {icon}
                    </ThemeIcon>

                    <Stack gap={4}>
                        <Text
                            fz={12}
                            fw={600}
                            c="dimmed"
                            tt="uppercase"
                        >
                            {label}
                        </Text>

                        <Text
                            fz={30}
                            fw={700}
                            style={{ lineHeight: 1 }}
                        >
                            {value}
                        </Text>
                    </Stack>
                </Group>

                {/* Description */}
                <Text
                    size="sm"
                    c="dimmed"
                    fw={400}
                    ta="center"
                    maw={250}
                    mx="auto"
                >
                    {description}
                </Text>

            </Stack>
        </Paper>
    );
};