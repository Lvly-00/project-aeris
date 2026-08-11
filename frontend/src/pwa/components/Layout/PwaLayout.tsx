import { useState, useEffect } from 'react';
import {
    AppShell,
    Group,
    ActionIcon,
    Text,
    Stack,
    UnstyledButton,
    Container,
    rem,
    Image,
    Avatar,
    Indicator,
} from '@mantine/core';
import {
    Bell,
    Home,
    ShieldAlert,
    ClipboardList,
    User,
} from 'lucide-react';
import {
    Outlet,
    useNavigate,
    useLocation,
} from 'react-router-dom';
import {
    authAPI,
    notificationsAPI,
} from '../../../shared/services/api';

const navData = [
    {
        icon: Home,
        label: 'Dashboard',
        path: '/pwa/dashboard',
    },
    {
        icon: ShieldAlert,
        label: 'Incidents',
        path: '/pwa/incidents',
    },
    {
        icon: ClipboardList,
        label: 'History',
        path: '/pwa/history',
    },
    {
        icon: User,
        label: 'Profile',
        path: '/pwa/profile',
        isAvatar: true,
    },
];

export function PwaLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const activeColor = '#FF6B00';
    const inactiveColor = '#8E8E93';

    const isProfilePage =
        location.pathname === '/pwa/profile' ||
        location.pathname.startsWith('/pwa/profile/');

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
                        borderBottom: 'none',
                        backgroundColor: '#FFFFFF',
                    }}
                >
                    <Container h="100%" fluid>
                        <Group h="100%" justify="space-between" align="center">
                            <Image
                                src="/icon.png"
                                alt="AERIS Logo"
                                h={35}
                                w="auto"
                            />

                            <Indicator
                                disabled={unreadCount === 0}
                                label={unreadCount}
                                size={16}
                                color="red"
                                offset={4}
                            >
                                <ActionIcon
                                    variant="transparent"
                                    color="dark"
                                    size="lg"
                                    onClick={() => navigate('/pwa/notifications')}
                                    aria-label="Notifications"
                                >
                                    <Bell size={28} strokeWidth={1.5} />
                                </ActionIcon>
                            </Indicator>
                        </Group>
                    </Container>
                </AppShell.Header>
            )}

            <AppShell.Main
                bg="#F8F9FA"
                style={{ minHeight: '100dvh' }}
            >
                <Outlet />
            </AppShell.Main>

            <AppShell.Footer
                p="xs"
                style={{
                    borderTop: '1px solid #F2F2F7',
                    backgroundColor: '#FFFFFF',
                }}
            >
                <Group
                    justify="space-around"
                    align="center"
                    h="100%"
                    gap={0}
                >
                    {navData.map((item) => {
                        const isActive =
                            location.pathname === item.path ||
                            location.pathname.startsWith(`${item.path}/`);

                        return (
                            <UnstyledButton
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: rem(12),
                                }}
                                aria-label={item.label}
                            >
                                <Stack gap={4} align="center" justify="center">
                                    {item.isAvatar ? (
                                        <Avatar
                                            src={user?.profile_picture || undefined}
                                            size={28}
                                            radius="xl"
                                            alt={user?.username || 'User'}
                                            color={isActive ? 'orange' : 'gray'}
                                            style={{
                                                border: isActive
                                                    ? `2px solid ${activeColor}`
                                                    : '1px solid #DDD',
                                                transition: 'border 0.2s ease',
                                            }}
                                        >
                                            {user?.username?.charAt(0).toUpperCase() || (
                                                <User size={16} />
                                            )}
                                        </Avatar>
                                    ) : (
                                        <item.icon
                                            size={24}
                                            strokeWidth={isActive ? 2.5 : 1.5}
                                            color={isActive ? activeColor : inactiveColor}
                                        />
                                    )}

                                    <Text
                                        size="xs"
                                        fw={isActive ? 700 : 500}
                                        style={{
                                            color: isActive ? activeColor : inactiveColor,
                                            fontSize: rem(11),
                                            transition: 'color 0.2s ease',
                                        }}
                                    >
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