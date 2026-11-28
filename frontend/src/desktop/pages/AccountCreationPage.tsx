import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Stack, Button, Paper, Tabs, Text, TextInput, Group,
    Table, ScrollArea, Avatar, Box, Badge, ActionIcon, Menu,
    Pagination, Center, useMantineTheme, Checkbox, Modal, Container, Tooltip
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DotsVerticalRounded, Eye, Pencil, Plus, RefreshCw, Search, Trash } from '@boxicons/react';
import { PageHeader } from '../components/Layout/PageHeader';
import { SkeletonTableRows } from '../components/common/SkeletonTableRows';
import { authAPI } from '../../shared/services/api';
import { resolveMediaUrl } from '../../shared/utils/mediaUrl';
import { UserFormModal } from '../components/common/UserFormModal';
import { DeleteUserModal } from '../components/common/DeleteUserModal';

/** Translate a raw Axios error from any account operation into a human-readable string. */
function extractAccountError(error: any, fallback = 'Operation failed.'): string {
    const data = error?.response?.data;
    if (!data) return fallback;

    // Field-level serializer errors
    if (data.email) return Array.isArray(data.email) ? data.email[0] : data.email;
    if (data.password) return Array.isArray(data.password) ? data.password[0] : data.password;
    if (data.password2) return Array.isArray(data.password2) ? data.password2[0] : data.password2;
    if (data.first_name) return Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
    if (data.last_name) return Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
    if (data.role) return Array.isArray(data.role) ? data.role[0] : data.role;
    if (data.non_field_errors)
        return Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;

    // View-level error key
    if (data.error) return data.error;

    // DRF default detail key
    if (data.detail) return data.detail;

    return fallback;
}

/** Extract field-level errors from the backend response for display inside the form. */
export function extractFieldErrors(error: any): Record<string, string> {
    const data = error?.response?.data;
    if (!data || typeof data !== 'object') return {};

    const FIELD_KEYS = ['email', 'password', 'password2', 'first_name', 'last_name', 'role'];
    const fieldErrors: Record<string, string> = {};

    for (const key of FIELD_KEYS) {
        if (data[key]) {
            fieldErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
        }
    }

    return fieldErrors;
}

const AUTO_REFRESH_INTERVAL_MS = 30_000; // 30 seconds

export default function UserManagement() {
    const theme = useMantineTheme();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('all-users');
    const [searchQuery, setSearchQuery] = useState('');
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 10;

    const [formOpened, setFormOpened] = useState(false);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isViewing, setIsViewing] = useState(false);
    const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

    // Manual refresh loading state (separate from mutation loading)
    const [refreshing, setRefreshing] = useState(false);
    // Guard against concurrent refresh requests
    const refreshInProgress = useRef(false);

    // Mass delete selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkDeleteOpened, setBulkDeleteOpened] = useState(false);

    const { data: users = [], isLoading: loadingData } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const usersRes = await authAPI.getUsers();
            return Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [];
        },
        // Automatic background refresh every 30 seconds.
        // React Query skips the refetch if another fetch is already in-flight,
        // preventing duplicate/overlapping requests.
        refetchInterval: AUTO_REFRESH_INTERVAL_MS,
        // Keep stale data visible while a background refetch is running.
        staleTime: 10_000,
        // Also refresh when the user returns to the tab.
        refetchOnWindowFocus: true,
    });

    useEffect(() => { setActivePage(1); }, [searchQuery, activeTab]);

    /**
     * Invalidates the 'users' query and clears the selection.
     * React Query deduplicates concurrent invalidations, so calling this
     * during an already-running fetch is safe.
     */
    const refreshUsers = () => {
        setSelectedIds([]);
        return queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    /** Manual refresh — triggered by the refresh button. */
    const handleManualRefresh = async () => {
        if (refreshInProgress.current) return;
        refreshInProgress.current = true;
        setRefreshing(true);
        try {
            await queryClient.refetchQueries({ queryKey: ['users'] });
            notifications.show({
                title: 'Refreshed',
                message: 'Account list is up to date.',
                color: 'green',
            });
        } catch {
            notifications.show({
                title: 'Refresh Failed',
                message: 'Could not load the latest account data. The current list is still displayed.',
                color: 'red',
            });
        } finally {
            setRefreshing(false);
            refreshInProgress.current = false;
        }
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

    const handleCreateOrUpdate = async (values: any): Promise<Record<string, string> | void> => {
        setLoading(true);
        setFormFieldErrors({});
        try {
            if (selectedUser) {
                await authAPI.updateUser(selectedUser.id, values);
                notifications.show({
                    title: 'User Updated',
                    message: `${values.first_name || values.email}'s account has been updated.`,
                    color: 'green',
                });
            } else {
                await authAPI.register(values);
                notifications.show({
                    title: 'User Created',
                    message: `Account for ${values.first_name || values.email} has been created.`,
                    color: 'green',
                });
            }
            setFormOpened(false);
            refreshUsers();
        } catch (error: any) {
            const fieldErrors = extractFieldErrors(error);
            if (Object.keys(fieldErrors).length > 0) {
                // Surface field errors inside the form
                setFormFieldErrors(fieldErrors);
                return fieldErrors;
            }

            // Non-field errors go to a notification
            const message = extractAccountError(
                error,
                selectedUser ? 'Failed to update account.' : 'Failed to create account.'
            );
            notifications.show({
                title: selectedUser ? 'Update Failed' : 'Create Failed',
                message,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await authAPI.deleteUser(selectedUser.id);
            setDeleteOpened(false);
            notifications.show({
                title: 'User Deleted',
                message: `${selectedUser?.full_name || selectedUser?.email} has been removed.`,
                color: 'red',
            });
            refreshUsers();
        } catch (error: any) {
            const message = extractAccountError(error, 'Failed to delete account.');
            notifications.show({
                title: 'Delete Failed',
                message,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled(
                selectedIds.map((id) => authAPI.deleteUser(id))
            );
            const failed = results.filter((r) => r.status === 'rejected').length;
            const succeeded = results.length - failed;

            if (failed > 0 && failed === results.length) {
                notifications.show({
                    title: 'Bulk Delete Failed',
                    message: 'None of the selected accounts could be deleted. Please check permissions.',
                    color: 'red',
                });
                return;
            }

            setBulkDeleteOpened(false);
            refreshUsers();

            if (failed > 0) {
                notifications.show({
                    title: 'Partial Delete',
                    message: `${succeeded} account${succeeded !== 1 ? 's' : ''} deleted. ${failed} could not be removed.`,
                    color: 'orange',
                });
            } else {
                notifications.show({
                    title: 'Users Deleted',
                    message: `${succeeded} account${succeeded !== 1 ? 's' : ''} removed successfully.`,
                    color: 'red',
                });
            }
        } catch (error: any) {
            const message = extractAccountError(error, 'Bulk delete failed.');
            notifications.show({
                title: 'Bulk Delete Failed',
                message,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid p="sm" style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
        <Stack gap="xl">
            <PageHeader
                title="User Management"
                subtitle="Manage user accounts and role assignments."
                actions={
                    <Group gap="sm">
                        <Tooltip label="Refresh account list" position="bottom" withArrow>
                            <ActionIcon
                                variant="default"
                                size="lg"
                                radius="md"
                                aria-label="Refresh account list"
                                loading={refreshing}
                                disabled={refreshing}
                                onClick={handleManualRefresh}
                                style={{ width: 40, height: 40 }}
                            >
                                <RefreshCw width={18} height={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Button
                            leftSection={<Plus width={18} height={18} />}
                            color="orange"
                            radius="md"
                            h={40}
                            onClick={() => { setSelectedUser(null); setFormFieldErrors({}); setIsViewing(false); setFormOpened(true); }}
                        >
                            ADD NEW USER
                        </Button>
                    </Group>
                }
            />

            <UserFormModal
                opened={formOpened}
                onClose={() => { setFormOpened(false); setFormFieldErrors({}); }}
                onSubmit={handleCreateOrUpdate}
                initialValues={selectedUser}
                loading={loading}
                isEdit={!!selectedUser && !isViewing}
                isView={!!selectedUser && isViewing}
                onEdit={() => setIsViewing(false)}
                serverFieldErrors={formFieldErrors}
            />

            <DeleteUserModal
                opened={deleteOpened} onClose={() => setDeleteOpened(false)}
                onConfirm={handleDelete} userName={selectedUser?.full_name || selectedUser?.email || ''}
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
                            {loadingData ? (
                                <SkeletonTableRows columns={[44, 280, 260, 180, 110]} rows={8} />
                            ) : paginatedUsers.length > 0 ? (
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
                                            <Text size="xs" fw={700} c="orange" style={{ textTransform: 'uppercase' }}>{user.role_display || user.role}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ width: 110 }}>
                                            <Group justify="flex-end" gap={4}>
                                                <Menu position="bottom-end" withinPortal>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle" color="gray"><DotsVerticalRounded width={24} height={24} /></ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Item leftSection={<Eye width={18} height={18} />} onClick={() => { setSelectedUser(user); setIsViewing(true); setFormOpened(true); }}>
                                                            View User
                                                        </Menu.Item>
                                                        <Menu.Item leftSection={<Pencil width={18} height={18} />} onClick={() => { setSelectedUser(user); setFormFieldErrors({}); setIsViewing(false); setFormOpened(true); }}>
                                                            Edit User
                                                        </Menu.Item>
                                                        <Menu.Item leftSection={<Trash width={18} height={18} />} onClick={() => { setSelectedUser(user); setDeleteOpened(true); }} color="red">
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
