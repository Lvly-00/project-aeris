import React, { useState } from 'react';
import {
    Title,
    Text,
    Button,
    Group,
    Stack,
    TextInput,
    Table,
    Badge,
    Avatar,
    ActionIcon,
    Tabs,
    Paper,
    Box,
    Menu,
    rem,
} from '@mantine/core';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    LayoutGrid,
    ChevronDown,
} from 'lucide-react';

// Mock Data
const users = [
    { id: 1, name: 'Julian S. Mercer', role: 'Admin', username: 'juandelacruz', zone: '-', status: 'Active', image: '' },
    { id: 2, name: 'Gimmy Me More', role: 'CCTV Operator', username: 'gimmymemore', zone: 'All Zones', status: 'Active', image: '' },
    { id: 3, name: 'Michael Dela Cruz', role: 'Admin', username: 'michaeldelacruz', zone: 'Zone 1 (South Area)', status: 'Active', image: '' },
    { id: 4, name: 'Sia Gutierrez', role: 'Admin', username: 'sia gutierrez', zone: 'Zone 2 (North Area)', status: 'Inactive', image: '' },
];

export default function UserManagement() {
    const [activeTab, setActiveTab] = useState<string | null>('all-users');

    return (
        <Stack gap="xl">
            {/* HEADER SECTION */}
            <Group justify="space-between" align="flex-start">
                <Box>
                    <Title order={2} fw={800} style={{ letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                        User Management
                    </Title>
                    <Text c="dimmed" fz="sm">
                        Create, manage, and organize user accounts and access permissions.
                    </Text>
                </Box>
                <Button
                    leftSection={<Plus size={18} />}
                    color="#FF6B00"
                    radius="md"
                    size="md"
                    h={42}
                >
                    ADD NEW USER
                </Button>
            </Group>

            {/* TABS & FILTERS */}
            <Paper radius="md" p={0} withBorder bg="white">
                <Tabs value={activeTab} onChange={setActiveTab} variant="outline" styles={{
                    tab: {
                        padding: '16px 24px',
                        fontWeight: 600,
                        fontSize: rem(14),
                        borderBottomWidth: 3,
                        '&[data-active]': {
                            color: '#FF6B00',
                            borderColor: '#FF6B00',
                        }
                    },
                    list: { paddingInline: 12 }
                }}>
                    <Tabs.List>
                        <Tabs.Tab value="all-users">All Users</Tabs.Tab>
                        <Tabs.Tab value="admins">Admins</Tabs.Tab>
                        <Tabs.Tab value="operators">Operators</Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                {/* SEARCH AND ACTION BAR */}
                <Group p="md" justify="space-between">
                    <TextInput
                        placeholder="Search users..."
                        leftSection={<Search size={16} color="var(--mantine-color-gray-5)" />}
                        style={{ flex: 1, maxWidth: 400 }}
                        radius="md"
                    />
                    <Group gap="xs">
                        <Button
                            variant="default"
                            leftSection={<Filter size={16} />}
                            rightSection={<ChevronDown size={14} />}
                            radius="md"
                        >
                            Filter
                        </Button>
                        <ActionIcon variant="default" size="lg" radius="md">
                            <LayoutGrid size={18} />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* TABLE */}
                <Table verticalSpacing="md" horizontalSpacing="md">
                    <Table.Thead bg="var(--mantine-color-gray-0)">
                        <Table.Tr>
                            <Table.Th c="dimmed" fw={600} fz="xs" tt="uppercase">Name</Table.Th>
                            <Table.Th c="dimmed" fw={600} fz="xs" tt="uppercase">Username</Table.Th>
                            <Table.Th c="dimmed" fw={600} fz="xs" tt="uppercase">Assigned Zone</Table.Th>
                            <Table.Th c="dimmed" fw={600} fz="xs" tt="uppercase">Status</Table.Th>
                            <Table.Th c="dimmed" fw={600} fz="xs" tt="uppercase" ta="right">Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {users.map((user) => (
                            <Table.Tr key={user.id}>
                                <Table.Td>
                                    <Group gap="sm">
                                        <Avatar src={user.image} radius="xl" size="md" color="orange">
                                            {user.name.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Text fz="sm" fw={600}>{user.name}</Text>
                                            <Text fz="xs" c="dimmed">{user.role}</Text>
                                        </Box>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Text fz="sm" c="dimmed">{user.username}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text fz="sm" c="dimmed">{user.zone}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge
                                        variant="outline"
                                        color={user.status === 'Active' ? 'green' : 'gray'}
                                        radius="sm"
                                        styles={{ root: { textTransform: 'capitalize' } }}
                                    >
                                        {user.status}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Group gap={4} justify="flex-end">
                                        <ActionIcon variant="subtle" color="gray">
                                            <Edit2 size={16} />
                                        </ActionIcon>
                                        <Menu position="bottom-end" withinPortal>
                                            <Menu.Target>
                                                <ActionIcon variant="subtle" color="gray">
                                                    <MoreVertical size={16} />
                                                </ActionIcon>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Item>View Profile</Menu.Item>
                                                <Menu.Item>Reset Password</Menu.Item>
                                                <Menu.Item color="red">Delete User</Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Paper>
        </Stack>
    );
}