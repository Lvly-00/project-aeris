import React, { useState, useEffect } from 'react';
import { AppShell, Group, ActionIcon, Text, Stack, UnstyledButton, Container, rem, Image, Avatar, Indicator } from '@mantine/core';
import { Bell, Home, ShieldAlert, ClipboardList, User } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authAPI, notificationsAPI } from '../../../shared/services/api'; // Adjust path to your api file

const navData = [
    { icon: Home, label: 'Dashboard', path: '/pwa/dashboard' },
    { icon: ShieldAlert, label: 'Incidents', path: '/pwa/incidents' },
    { icon: ClipboardList, label: 'History', path: '/pwa/history' },
    { icon: User, label: 'Profile', path: '/pwa/profile', isAvatar: true },
];

export function PwaLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const activeColor = '#FF6B00';
    const inactiveColor = '#8E8E93';

    // Fetch Global Data for the Shell
    useEffect(() => {
        const fetchShellData = async () => {
            try {
                const [profileRes, unreadRes] = await Promise.all([
                    authAPI.getProfile(),
                    notificationsAPI.unreadCount()
                ]);
                setUser(profileRes.data);
                setUnreadCount(unreadRes.data.unread_count || 0);
            } catch (err) {
                console.error("Shell data fetch failed", err);
            }
        };
        fetchShellData();
    }, []);

    return (
        <AppShell
            header={{ height: 70 }}
            footer={{ height: 85 }}
            padding="md"
        >
            {/* HEADER */}
            <AppShell.Header style={{ borderBottom: 'none' }}>
                <Container h="100%" fluid>
                    <Group h="100%" justify="space-between" align="center">
                        <Image src="/icon.png" alt="Logo" h={35} w="auto" />

                        <Indicator disabled={unreadCount === 0} label={unreadCount} size={16} color="red">
                            <ActionIcon
                                variant="transparent"
                                color="dark"
                                size="lg"
                                onClick={() => navigate('/pwa/notifications')}
                            >
                                <Bell size={28} strokeWidth={1.5} />
                            </ActionIcon>
                        </Indicator>
                    </Group>
                </Container>
            </AppShell.Header>

            {/* MAIN CONTENT - Renders the child route components */}
            <AppShell.Main bg="#F8F9FA">
                <Outlet />
            </AppShell.Main>

            {/* BOTTOM NAVIGATION */}
            <AppShell.Footer p="xs" style={{ borderTop: '1px solid #F2F2F7' }}>
                <Group justify="space-around" align="center" h="100%">

                    {navData.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);

                        return (
                            <UnstyledButton
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                style={{ flex: 1 }}
                            >
                                <Stack gap={4} align="center">
                                    {item.isAvatar ? (
                                        <Avatar
                                            src={user?.profile_picture ||  null}
                                            size={26}
                                            radius="xl"
                                            alt={user?.username || 'User'}
                                            color={isActive ? 'orange' : 'gray'}
                                            style={{
                                                border: isActive ? `2px solid ${activeColor}` : '1px solid #ddd',
                                                transition: 'border 0.2s ease'
                                            }}
                                        >
                                            {user?.username?.charAt(0).toUpperCase() || <User size={16} />}
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
                                            fontSize: rem(11)
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