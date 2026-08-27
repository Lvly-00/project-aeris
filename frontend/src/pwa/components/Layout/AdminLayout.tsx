import { useState, useEffect } from 'react';
import {
    AppShell, Group, ActionIcon, Text, Stack, UnstyledButton,
    Container, rem, Image, Avatar, Indicator, useMantineTheme
} from '@mantine/core';
import { Bell, Clipboard, Home, ShieldAlt, User } from '@boxicons/react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authAPI, notificationsAPI } from '../../../shared/services/api';
import { NotificationsModal } from '../NotificationsModal';

const navData = [
    { icon: Home, label: 'Dashboard', path: '/pwa/admin/dashboard' },
    { icon: ShieldAlt, label: 'Incidents', path: '/pwa/admin/incidents' },
    { icon: Clipboard, label: 'History', path: '/pwa/admin/history' },
    { icon: User, label: 'Profile', path: '/pwa/admin/profile', isAvatar: true },
];

export function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useMantineTheme();

    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);

    // Use theme colors instead of hardcoded hex
    const activeColor = 'var(--mantine-color-orange-filled)';
    const inactiveColor = 'var(--mantine-color-dimmed)';

    const isProfilePage = location.pathname === '/pwa/profile' || location.pathname.startsWith('/pwa/profile/');

    useEffect(() => {
        const fetchShellData = async () => {
            try {
                const [profileRes, unreadRes] = await Promise.all([
                    authAPI.getProfile(),
                    notificationsAPI.unreadCount(),
                ]);
                setUser(profileRes.data);
                setUnreadCount(unreadRes.data?.unread_count ?? 0);
            } catch (err) {
                console.error('PWA shell data fetch failed:', err);
            }
        };
        fetchShellData();
    }, []);

    /*
     * Keep the header unread badge live: bump the count as
     * notification_new events arrive over the WebSocket.
     */
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsProtocol}://${window.location.host}/ws/incidents/?token=${token}`;

        const ws = new WebSocket(wsUrl);
        let disposed = false;

        ws.onopen = () => {
            if (disposed) {
                ws.close();
                return;
            }
        };

        ws.onmessage = (event) => {
            try {
                if (disposed) return;

                const data = JSON.parse(event.data);

                if (data.action === 'notification_new') {
                    setUnreadCount((prev) => prev + 1);
                }
            } catch {
                /* ignore */
            }
        };

        ws.onerror = () => {
            /* silent */
        };

        ws.onclose = () => {
            /* silent */
        };

        return () => {
            disposed = true;

            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
            }
        };
    }, []);

    return (
        <AppShell
            header={{ height: isProfilePage ? 0 : 70 }}
            footer={{ height: 85 }}
            padding="md"
        >
            {!isProfilePage && (
                <AppShell.Header
                    style={{
                        borderBottom: '1px solid var(--mantine-color-default-border)',
                        backgroundColor: 'var(--mantine-color-body)',
                    }}
                >
                    <Container h="100%" fluid>
                        <Group h="100%" justify="space-between" align="center">
                            <Image src="/icon.png" alt="logo" h={35} w="auto" />
                            <Indicator disabled={unreadCount === 0} label={unreadCount} size={16} color="red" offset={4}>
                                <ActionIcon
                                    variant="transparent"
                                    color="gray"
                                    size="lg"
                                    onClick={() => setNotifOpen(true)}
                                >
                                    <Bell  width={28} height={28} strokeWidth={1.5} />
                                </ActionIcon>
                            </Indicator>
                        </Group>
                    </Container>
                </AppShell.Header>
            )}

            <AppShell.Main bg="var(--mantine-color-body)" style={{ minHeight: '100dvh' }}>
                <Outlet />
            </AppShell.Main>

            <AppShell.Footer
                p="xs"
                style={{
                    borderTop: '1px solid var(--mantine-color-default-border)',
                    backgroundColor: 'var(--mantine-color-body)',
                }}
            >
                <Group justify="space-around" align="center" h="100%" gap={0}>
                    {navData.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <UnstyledButton
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Stack gap={4} align="center" justify="center">
                                    {item.isAvatar ? (
                                        <Avatar
                                            src={user?.profile_picture || undefined}
                                            size={28}
                                            radius="xl"
                                            style={{
                                                border: isActive ? `2px solid ${activeColor}` : '1px solid var(--mantine-color-default-border)',
                                            }}
                                        >
                                            {user?.first_name?.charAt(0).toUpperCase() || <User  width={16} height={16} />}
                                        </Avatar>
                                    ) : (
                                        <item.icon width={24} height={24} strokeWidth={isActive ? 2.5 : 1.5} color={isActive ? 'var(--mantine-color-orange-filled)' : 'var(--mantine-color-dimmed)'} />
                                    )}
                                    <Text size="xs" fw={isActive ? 700 : 500} c={isActive ? 'orange' : 'dimmed'} style={{ fontSize: rem(11) }}>
                                        {item.label}
                                    </Text>
                                </Stack>
                            </UnstyledButton>
                        );
                    })}
                </Group>
            </AppShell.Footer>

            <NotificationsModal
                opened={notifOpen}
                onClose={() => setNotifOpen(false)}
                onUnreadChange={setUnreadCount}
            />
        </AppShell>
    );
}