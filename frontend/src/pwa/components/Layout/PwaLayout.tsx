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
    Avatar
} from '@mantine/core';
// Import Lucide Icons
import {
    Bell,
    Home,
    ShieldAlert,
    ClipboardList,
    User
} from 'lucide-react';

const navData = [
    { icon: Home, label: 'Dashboard', active: false },
    { icon: ShieldAlert, label: 'Incidents', active: true },
    { icon: ClipboardList, label: 'History', active: false },
    { icon: User, label: 'Profile', active: false, isAvatar: true },
];

export function PwaLayout() {
    const activeColor = '#FF6B00'; // Brand Orange
    const inactiveColor = '#8E8E93'; // iOS Style Gray

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
                        {/* Logo Placeholder */}
                        <Image
                            src="https://placehold.co/120x40/white/orange?text=AERIS"
                            alt="Logo"
                            h={35}
                            w="auto"
                        />

                        {/* Notification Bell */}
                        <ActionIcon variant="transparent" color="dark" size="lg">
                            <Bell size={28} strokeWidth={1.5} />
                        </ActionIcon>
                    </Group>
                </Container>
            </AppShell.Header>

            {/* MAIN CONTENT */}
            <AppShell.Main bg="#fff">
                {/* Your incident list logic goes here */}
            </AppShell.Main>

            {/* BOTTOM NAVIGATION */}
            <AppShell.Footer p="xs" style={{ borderTop: '1px solid #F2F2F7' }}>
                <Group justify="space-around" align="center" h="100%">
                    {navData.map((item) => (
                        <UnstyledButton key={item.label} style={{ flex: 1 }}>
                            <Stack gap={4} align="center">
                                {item.isAvatar ? (
                                    /* Using Avatar for Profile to match the screenshot */
                                    <Avatar
                                        src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png"
                                        size={26}
                                        radius="xl"
                                    />
                                ) : (
                                    <item.icon
                                        size={24}
                                        strokeWidth={item.active ? 2.5 : 1.5}
                                        color={item.active ? activeColor : inactiveColor}
                                    />
                                )}

                                <Text
                                    size="xs"
                                    fw={item.active ? 700 : 500}
                                    style={{
                                        color: item.active ? activeColor : inactiveColor,
                                        fontSize: rem(11)
                                    }}
                                >
                                    {item.label}
                                </Text>
                            </Stack>
                        </UnstyledButton>
                    ))}
                </Group>
            </AppShell.Footer>
        </AppShell>
    );
}