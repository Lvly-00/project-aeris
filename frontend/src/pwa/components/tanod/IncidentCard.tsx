import React from 'react';
import {
    Paper,
    Text,
    Group,
    Stack,
    Badge,
    Indicator,
    Box,
    rem,
    useMantineTheme,
    useMantineColorScheme
} from '@mantine/core';
import { LucideIcon } from 'lucide-react';

interface IncidentCardProps {
    title: string;
    incidentId: string;
    description: string;
    time: string;
    isNew: boolean;
    icon: LucideIcon;
    unread?: boolean;
    onClick?: () => void; // Added for navigation
}

export const IncidentCard = ({
    title,
    incidentId,
    description,
    time,
    isNew,
    icon: Icon,
    unread = true,
    onClick,
}: IncidentCardProps) => {
    const theme = useMantineTheme();
    // In Mantine v7, colorScheme is accessed via this hook
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Indicator
            disabled={!unread}
            color="orange"
            offset={12}
            position="top-left"
            size={12}
            withBorder
            processing={isNew} // Adds a subtle pulse animation if the item is new
            zIndex={2}
        >
            <Paper
                withBorder
                p="md"
                radius="md"
                shadow="xs"
                onClick={onClick}
                style={{
                    transition: 'all 0.2s ease',
                    cursor: onClick ? 'pointer' : 'default',
                    backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-white)',
                }}
                // Inline hover effect for PWA feel
                onMouseEnter={(e) => {
                    if (onClick) e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    if (onClick) e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <Group align="flex-start" wrap="nowrap">
                    {/* Icon Container */}
                    <Box
                        style={{
                            backgroundColor: isDark
                                ? 'var(--mantine-color-dark-7)'
                                : 'var(--mantine-color-orange-0)',
                            padding: rem(16),
                            borderRadius: theme.radius.md,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0, // Prevents the icon box from squishing on long text
                        }}
                    >
                        <Icon size={32} color="var(--mantine-color-orange-6)" strokeWidth={2.5} />
                    </Box>

                    {/* Content Area */}
                    <Stack gap={4} style={{ flex: 1, overflow: 'hidden' }}>
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={0} style={{ overflow: 'hidden' }}>
                                <Text fw={700} size="lg" lh={1.2} truncate>
                                    {title}
                                </Text>
                                <Text size="sm" c="dimmed" fw={500}>
                                    {incidentId}
                                </Text>
                            </Stack>

                            <Stack align="flex-end" gap={6} style={{ flexShrink: 0 }}>
                                <Text size="xs" fw={600} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                    {time}
                                </Text>
                                {isNew && (
                                    <Badge color="orange" variant="filled" radius="sm" size="sm">
                                        NEW
                                    </Badge>
                                )}
                            </Stack>
                        </Group>

                        <Text
                            size="sm"
                            mt={8}
                            c={isDark ? 'gray.4' : 'gray.7'}
                            lineClamp={2} // Keeps the UI consistent even with long descriptions
                        >
                            {description}
                        </Text>
                    </Stack>
                </Group>
            </Paper>
        </Indicator>
    );
};