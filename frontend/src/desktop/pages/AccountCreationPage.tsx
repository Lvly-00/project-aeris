import React, { useState, useEffect, useMemo } from 'react';
import {
    Stack, Button, Paper, Tabs, Text, TextInput, Group,
    Table, ScrollArea, Avatar, Box, Badge, ActionIcon, Menu,
    Pagination, Center, useMantineTheme, Checkbox, Modal, Container
} from '@mantine/core';
import { DotsVerticalRounded, Plus, Search, Trash } from '@boxicons/react';
import { PageHeader } from '../components/Layout/PageHeader';
import { authAPI } from '../../shared/services/api';
import { resolveMediaUrl } from '../../shared/utils/mediaUrl';
import { UserFormModal } from '../components/common/UserFormModal';
import { DeleteUserModal } from '../components/common/DeleteUserModal';

export default function UserManagement() {
    const theme = useMantineTheme();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('all-users');
    const [searchQuery, setSearchQuery] = useState('');
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 10;

    const [formOpened, setFormOpened] = useState(false);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isViewing, setIsViewing] = useState(false);

    // Mass delete selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkDeleteOpened, setBulkDeleteOpened] = useState(false);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { setActivePage(1); }, [searchQuery, activeTab]);

    const loadData = async () => {
        try {
            const usersRes = await authAPI.getUsers();
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || []);
            setSelectedIds([]);
        } catch (error) { console.error(error); }
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesTab = activeTab === 'all-users' || user.role === activeTab;
            const searchLower = searchQuery.toLowerCase();
            return matchesTab && (
                (user.full_name || '').toLowerCase().includes(searchLower) ||
                (user.email || '').toLowerCase().includes(searchLower)
            );
        });
    }, [users, activeTab, searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

    // Selection helpers (operate on the whole filtered list, not just the page)
    const allSelected = filteredUsers.length > 0 && selectedIds.length === filteredUsers.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < filteredUsers.length;

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : filteredUsers.map((u) => u.id));
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleCreateOrUpdate = async (values: any) => {
        setLoading(true);
        try {
            if (selectedUser) await authAPI.updateUser(selectedUser.id, values);
            else await authAPI.register(values);
            setFormOpened(false);
            loadData();
        } catch (error: any) { console.error(error); }
        finally { setLoading(false); }
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

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled(
                selectedIds.map((id) => authAPI.deleteUser(id))
            );
            const failed = results.filter((r) => r.status === 'rejected').length;

            if (failed > 0 && failed === selectedIds.length) {
                console.error('[USER MGMT] All bulk deletes failed');
                return;
            }

            setBulkDeleteOpened(false);
            loadData();
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    return (
        <Container fluid p="md" style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
        <Stack gap="xl">
            <PageHeader
                title="User Management"
                subtitle="Manage user accounts and role assignments."
                actions={
                    <Button
                        leftSection={<Plus width={18} height={18} />}
                        color="orange"
                        radius="md"
                        h={40}
                        onClick={() => { setSelectedUser(null); setIsViewing(false); setFormOpened(true); }}
                    >
                        ADD NEW USER
                    </Button>
                }
            />

            <UserFormModal
                opened={formOpened} onClose={() => setFormOpened(false)}
                onSubmit={handleCreateOrUpdate} initialValues={selectedUser}
                loading={loading} isEdit={!!selectedUser && !isViewing} isView={!!selectedUser && isViewing}
                onEdit={() => setIsViewing(false)}
            />

            <DeleteUserModal
                opened={deleteOpened} onClose={() => setDeleteOpened(false)}
                onConfirm={handleDelete} userName={selectedUser?.email || ''}
                loading={loading}
            />

            <Modal opened={bulkDeleteOpened} onClose={() => setBulkDeleteOpened(false)} title="Confirm Mass Delete" centered size="sm">
                <Text size="sm" mb="lg">
                    Are you sure you want to delete <b>{selectedIds.length}</b> selected user{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone and will disable their access immediately.
                </Text>
                <Group justify="flex-end" gap="sm">
                    <Button variant="default" onClick={() => setBulkDeleteOpened(false)} disabled={loading}>Cancel</Button>
                    <Button color="red" onClick={handleBulkDelete} loading={loading}>Delete Selected</Button>
                </Group>
            </Modal>

            <Paper radius="md" withBorder bg="var(--mantine-color-body)" shadow="sm" style={{ overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={setActiveTab}
                    variant="unstyled"
                >
                    <Tabs.List
                        style={{
                            borderBottom: `1px solid ${theme.colors.gray[3]}`,
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            paddingTop: '6px',
                            gap: '38px',
                        }}
                    >
                        {/* ALL USERS */}
                        <Tabs.Tab
                            value="all-users"
                            style={{
                                position: 'relative',
                                padding: '17px 14px 15px',
                                fontWeight: 600,
                                fontSize: '16px',
                                color:
                                    activeTab === 'all-users'
                                        ? theme.colors.orange[6]
                                        : theme.colors.gray[6],
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                transition: 'color 150ms ease',
                            }}
                        >
                            All Users

                            {activeTab === 'all-users' && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: '-1px',
                                        height: '2px',
                                        backgroundColor: theme.colors.orange[6],
                                    }}
                                />
                            )}
                        </Tabs.Tab>

                        {/* ADMINS */}
                        <Tabs.Tab
                            value="CCTV Chief"
                            style={{
                                position: 'relative',
                                padding: '17px 14px 15px',
                                fontWeight: 600,
                                fontSize: '16px',
                                color:
                                    activeTab === 'CCTV Chief'
                                        ? theme.colors.orange[6]
                                        : theme.colors.gray[6],
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                transition: 'color 150ms ease',
                            }}
                        >
                            CCTV Chiefs

                            {activeTab === 'CCTV Chief' && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: '-1px',
                                        height: '2px',
                                        backgroundColor: theme.colors.orange[6],
                                    }}
                                />
                            )}
                        </Tabs.Tab>

                        {/* OPERATORS */}
                        <Tabs.Tab
                            value="CCTV Operator"
                            style={{
                                position: 'relative',
                                padding: '17px 14px 15px',
                                fontWeight: 600,
                                fontSize: '16px',
                                color:
                                    activeTab === 'CCTV Operator'
                                        ? theme.colors.orange[6]
                                        : theme.colors.gray[6],
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                transition: 'color 150ms ease',
                            }}
                        >
                            CCTV Operators

                            {activeTab === 'CCTV Operator' && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: '-1px',
                                        height: '2px',
                                        backgroundColor: theme.colors.orange[6],
                                    }}
                                />
                            )}
                        </Tabs.Tab>

                        {/* TANODS */}
                        <Tabs.Tab
                            value="Barangay Tanod"
                            style={{
                                position: 'relative',
                                padding: '17px 14px 15px',
                                fontWeight: 600,
                                fontSize: '16px',
                                color:
                                    activeTab === 'Barangay Tanod'
                                        ? theme.colors.orange[6]
                                        : theme.colors.gray[6],
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: 0,
                                transition: 'color 150ms ease',
                            }}
                        >
                            Barangay Tanods

                            {activeTab === 'Barangay Tanod' && (
                                <Box
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: '-1px',
                                        height: '2px',
                                        backgroundColor: theme.colors.orange[6],
                                    }}
                                />
                            )}
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                <Group
                    p="md"
                    justify="space-between"
                    gap="md"
                    wrap="wrap"
                    style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                    <TextInput
                        placeholder="Search by name or email..."
                        leftSection={<Search width={16} height={16} />}
                        style={{ flex: 1, maxWidth: 400 }}
                        radius="md"
                        size='md'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                    {selectedIds.length > 0 && (
                        <Button
                            color="red"
                            variant="light"
                            radius="md"
                            leftSection={<Trash width={18} height={18} />}
                            onClick={() => setBulkDeleteOpened(true)}
                        >
                            Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                </Group>

                <ScrollArea>
                    <Table
                        verticalSpacing="md"
                        horizontalSpacing="md"
                        highlightOnHover
                        style={{ tableLayout: 'fixed', minWidth: 880 }}
                    >
                        <Table.Thead bg="var(--mantine-color-default-hover)">
                            <Table.Tr>
                                <Table.Th style={{ width: 44 }}>
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={toggleSelectAll}
                                        radius="sm"
                                        aria-label="Select all users"
                                    />
                                </Table.Th>
                                <Table.Th c="dimmed" style={{ width: 280 }}>NAME</Table.Th>
                                <Table.Th c="dimmed" style={{ width: 260 }}>EMAIL</Table.Th>
                                <Table.Th c="dimmed" ta="center" style={{ width: 180 }}>ROLE</Table.Th>
                                <Table.Th c="dimmed" ta="right" style={{ width: 110 }}>ACTIONS</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <Table.Tr key={user.id}>
                                        <Table.Td style={{ width: 44 }}>
                                            <Checkbox
                                                checked={selectedIds.includes(user.id)}
                                                onChange={() => toggleSelect(user.id)}
                                                radius="sm"
                                                aria-label={`Select ${user.full_name || user.email}`}
                                            />
                                        </Table.Td>
                                        <Table.Td style={{ width: 280, maxWidth: 280 }}>
                                            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                                                <Avatar
                                                    src={resolveMediaUrl(user.profile_picture)}
                                                    color="orange"
                                                    radius="xl"
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Box style={{ minWidth: 0 }}>
                                                    <Text fz="md" fw={600} lineClamp={1}>{user.full_name || user.email}</Text>
                                                </Box>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td style={{ width: 260, maxWidth: 260 }}>
                                            <Text fz="md" lineClamp={1}>{user.email}</Text>
                                        </Table.Td>
                                        <Table.Td ta="center" style={{ width: 180 }}>
                                            <Badge variant="light" color="orange" radius="xl" size="md" tt="capitalize" style={{ width: 150, height: 30, justifyContent: 'center', fontSize: 13.5 }}>{user.role_display || user.role}</Badge>
                                        </Table.Td>
                                        <Table.Td style={{ width: 110 }}>
                                            <Group justify="flex-end" gap={4}>
                                                <Menu position="bottom-end" withinPortal>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle" color="gray"><DotsVerticalRounded width={24} height={24} /></ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Item onClick={() => { setSelectedUser(user); setIsViewing(true); setFormOpened(true); }}>
                                                            View User
                                                        </Menu.Item>
                                                        <Menu.Item onClick={() => { setSelectedUser(user); setIsViewing(false); setFormOpened(true); }} color="blue">
                                                            Edit User
                                                        </Menu.Item>
                                                        <Menu.Item onClick={() => { setSelectedUser(user); setDeleteOpened(true); }} color="red">
                                                            Delete User
                                                        </Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr><Table.Td colSpan={5}><Center py="xl"><Text c="dimmed">No users found.</Text></Center></Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                <Box p="md" bg="var(--mantine-color-default-hover)" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">Showing <b>{paginatedUsers.length}</b> of <b>{filteredUsers.length}</b></Text>
                        {totalPages > 1 && (
                            <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="orange" size="sm" />
                        )}
                    </Group>
                </Box>
            </Paper>
        </Stack>
        </Container>
    );
}