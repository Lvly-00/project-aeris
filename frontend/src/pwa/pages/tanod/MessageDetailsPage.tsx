import React from 'react';
import {
    Container,
    Paper,
    Text,
    Title,
    Group,
    Stack,
    ActionIcon,
    Divider,
    Box,
    rem,
    useMantineTheme,
} from '@mantine/core';
import {
    ChevronLeft,
    Flame,
    MapPin,
    UserSquare2,
    LucideIcon
} from 'lucide-react';

interface DetailRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    iconColor?: string;
}

// Sub-component for the detail items at the bottom
const DetailRow = ({ icon: Icon, label, value, iconColor }: DetailRowProps) => {
    const theme = useMantineTheme();
    return (
        <Group wrap="nowrap" align="center" py="md">
            <Box
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: rem(40)
                }}
            >
                <Icon
                    size={32}
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
};

export default function DispatchMessagePage() {
    const theme = useMantineTheme();

    return (
        <Container size="sm" py="md">
            {/* Navigation Header */}
            <Stack gap="xs" mb="lg">
                <Group justify="space-between" align="center">
                    <ActionIcon variant="subtle" color="gray" size="lg">
                        <ChevronLeft size={24} />
                    </ActionIcon>
                    <Title order={3} style={{ flex: 1, textAlign: 'center', marginRight: rem(40) }}>
                        Dispatch Message
                    </Title>
                </Group>
                <Divider />
                <Text ta="center" c="dimmed" size="sm" fw={500} mt="xs">
                    9:32 AM | May 25, 2026
                </Text>
            </Stack>

            {/* Main Dispatch Content Card */}
            <Paper
                p="xl"
                radius="lg"
                mb="xl"
                style={{
                    backgroundColor: theme.colorScheme === 'dark'
                        ? theme.colors.dark[6]
                        : '#FFF5F2', // Custom light peach/orange background
                    border: theme.colorScheme === 'dark' ? `1px solid ${theme.colors.dark[4]}` : 'none'
                }}
            >
                <Group mb="xl">
                    <Paper
                        withBorder
                        p={8}
                        radius="md"
                        style={{
                            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : 'white'
                        }}
                    >
                        <Flame size={32} color={theme.colors.orange[6]} fill={theme.colors.orange[6]} />
                    </Paper>
                    <Title order={2} fw={700} style={{ letterSpacing: rem(1) }}>
                        AERIS DISPATCH
                    </Title>
                </Group>

                <Stack gap="lg">
                    <Text size="lg" lh={1.5} fw={400}>
                        A house <Text component="span" c="orange.6" fw={700}>fire</Text> has been reported at Barangay San Isidro.
                    </Text>

                    <Text size="lg" lh={1.5} fw={400}>
                        All available Barangay Tanods are ordered to proceed immediately to the Barangay Hall for briefing and to respond to the incident.
                    </Text>
                </Stack>
            </Paper>

            {/* Details Section */}
            <Stack gap={0}>
                <Divider />
                <DetailRow
                    icon={MapPin}
                    label="Location"
                    value="Barangay San Isidro"
                />

                <Divider />
                <DetailRow
                    icon={Flame}
                    label="Incident Type"
                    value="Fire"
                />

                <Divider />
                <DetailRow
                    icon={UserSquare2}
                    label="Incident No."
                    value="INC-2026-000123"
                />
            </Stack>
        </Container>
    );
}