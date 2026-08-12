import { useState, useEffect } from 'react';
import {
    AppShell, Group, ActionIcon, Text, Stack, UnstyledButton,
    Container, rem, Image, Avatar, Indicator, useMantineTheme
} from '@mantine/core';
import { Bell, Home, ShieldAlert, ClipboardList, User } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authAPI, notificationsAPI } from '../../../shared/services/api';

const navData = [
    { icon: Home, label: 'Dashboard', path: '/pwa/dashboard' },
    { icon: ShieldAlert, label: 'Incidents', path: '/pwa/incidents' },
    { icon: ClipboardList, label: 'History', path: '/pwa/history' },
    { icon: User, label: 'Profile', path: '/pwa/profile', isAvatar: true },
];

export function PwaLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useMantineTheme();

    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

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
                                    onClick={() => navigate('/pwa/notifications')}
                                >
                                    <Bell size={28} strokeWidth={1.5} />
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
                                            {user?.username?.charAt(0).toUpperCase() || <User size={16} />}
                                        </Avatar>
                                    ) : (
                                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} color={isActive ? 'var(--mantine-color-orange-filled)' : 'var(--mantine-color-dimmed)'} />
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
        </AppShell>
    );
}