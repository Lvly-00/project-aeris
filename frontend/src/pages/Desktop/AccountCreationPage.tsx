import React, { useState, useEffect, useMemo } from 'react';
import { 
    Stack, Button, Paper, Tabs, Text, rem, TextInput, Group, 
    Table, ScrollArea, Avatar, Box, Badge, ActionIcon, Menu, 
    Pagination, Center 
} from '@mantine/core';
import { Plus, Search, Edit2, MoreVertical } from 'lucide-react';
import { PageHeader } from '../../components/Layout/PageHeader';
import { authAPI, zonesAPI } from '../../services/api';
import { UserFormModal } from '../../components/common/UserFormModal';
import { DeleteUserModal } from '../../components/common/DeleteUserModal';

export default function UserManagement() {
    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [zones, setZones] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Filter & Pagination State
    const [activeTab, setActiveTab] = useState<string | null>('all-users');
    const [searchQuery, setSearchQuery] = useState('');
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 10;

    // Modal State
    const [formOpened, setFormOpened] = useState(false);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    useEffect(() => { loadData(); }, []);

    // Reset pagination when searching or switching tabs
    useEffect(() => {
        setActivePage(1);
    }, [searchQuery, activeTab]);

    const loadData = async () => {
        try {
            const [usersRes, zonesRes] = await Promise.all([authAPI.getUsers(), zonesAPI.list()]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []);
            setZones((Array.isArray(zonesRes.data) ? zonesRes.data : zonesRes.data.results || [])
                .map((z: any) => ({ value: String(z.id), label: z.name })));
        } catch (error) { console.error(error); }
    };

    // SEARCH & FILTER LOGIC
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesTab = activeTab === 'all-users' || user.role === activeTab;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = 
                user.username.toLowerCase().includes(searchLower) ||
                (user.full_name || '').toLowerCase().includes(searchLower) ||
                (user.email || '').toLowerCase().includes(searchLower);
            
            return matchesTab && matchesSearch;
        });
    }, [users, activeTab, searchQuery]);

    // PAGINATION LOGIC
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (activePage - 1) * itemsPerPage,
        activePage * itemsPerPage
    );

    const handleCreateOrUpdate = async (values: any) => {
        setLoading(true);
        try {
            if (selectedUser) {
                await authAPI.updateUser(selectedUser.id, values);
            } else {
                await authAPI.register(values);
            }
            setFormOpened(false);
            loadData();
        } catch (error: any) {
            console.error(error);
        } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await authAPI.deleteUser(selectedUser.id);
            setDeleteOpened(false);
            loadData();
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    return (
        <Stack gap="xl">
            <PageHeader
                title="User Management"
                subtitle="Manage user roles and zone assignments."
                actions={
                    <Button 
                        leftSection={<Plus size={18} />} 
                        color="#FF6B00" 
                        radius="md" 
                        onClick={() => { setSelectedUser(null); setFormOpened(true); }}
                    >
                        ADD NEW USER
                    </Button>
                }
            />

            <UserFormModal
                opened={formOpened}
                onClose={() => setFormOpened(false)}
                onSubmit={handleCreateOrUpdate}
                initialValues={selectedUser}
                zones={zones}
                loading={loading}
                isEdit={!!selectedUser}
            />

            <DeleteUserModal
                opened={deleteOpened}
                onClose={() => setDeleteOpened(false)}
                onConfirm={handleDelete}
                userName={selectedUser?.username || ''}
                loading={loading}
            />

            <Paper radius="md" withBorder bg="white" shadow="xs">
                <Tabs value={activeTab} onChange={setActiveTab} variant="outline" styles={tabStyles}>
                    <Tabs.List>
                        <Tabs.Tab value="all-users">All Users</Tabs.Tab>
                        <Tabs.Tab value="Admin">Admins</Tabs.Tab>
                        <Tabs.Tab value="Operator">Operators</Tabs.Tab>
                        <Tabs.Tab value="Tanod">Tanods</Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                <Group p="md">
                    <TextInput 
                        placeholder="Search by name, username or email..." 
                        leftSection={<Search size={16} />} 
                        style={{ flex: 1, maxWidth: 400 }} 
                        radius="md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                </Group>

                <ScrollArea>
                    <Table verticalSpacing="md" horizontalSpacing="md">
                        <Table.Thead bg="gray.0">
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Username</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th ta="right">Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <Table.Tr key={user.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar color="orange" radius="xl">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Text fz="sm" fw={600}>{user.full_name || user.username}</Text>
                                                    <Text fz="xs" c="dimmed">{user.email || 'No email'}</Text>
                                                </Box>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td><Text fz="sm">{user.username}</Text></Table.Td>
                                        <Table.Td><Badge variant="light" color="blue">{user.role_display || user.role}</Badge></Table.Td>
                                        <Table.Td>
                                            <Badge color={user.is_active ? 'green' : 'gray'} variant="dot">
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group justify="flex-end" gap={4}>
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="gray"
                                                    onClick={() => { setSelectedUser(user); setFormOpened(true); }}
                                                >
                                                    <Edit2 size={16} />
                                                </ActionIcon>
                                                <Menu position="bottom-end" withinPortal>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle" color="gray"><MoreVertical size={16} /></ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Item 
                                                            onClick={() => { setSelectedUser(user); setDeleteOpened(true); }} 
                                                            color="red"
                                                        >
                                                            Delete User
                                                        </Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Center py="xl">
                                            <Text c="dimmed">No users found matching your criteria.</Text>
                                        </Center>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                {/* PAGINATION UI */}
                {totalPages > 1 && (
                    <Group justify="center" py="md" style={{ borderTop: '1px solid #eee' }}>
                        <Pagination 
                            total={totalPages} 
                            value={activePage} 
                            onChange={setActivePage} 
                            color="#FF6B00" 
                            radius="md" 
                            withEdges
                        />
                    </Group>
                )}
            </Paper>
        </Stack>
    );
}

const tabStyles = {
    tab: {
        padding: '16px 24px',
        fontWeight: 600,
        '&[data-active="true"]': { color: '#FF6B00', borderColor: '#FF6B00' }
    }
};