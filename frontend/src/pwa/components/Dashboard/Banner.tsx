import { Paper, Title, Text, Box } from '@mantine/core';
import type { User } from '../../../shared/types';

interface Props {
    /** Signed-in user, so the greeting is not a placeholder. */
    user?: User | null;
}

export const Banner = ({ user }: Props) => {
    const name =
        user?.first_name?.trim() ||
        user?.last_name?.trim() ||
        user?.email?.split('@')[0] ||
        'System Admin';

    return (
        <Paper
            p="xl"
            radius="md"
            pos="relative"
        >
            <Box
                component="img"
                src="/Banner.png"
                pos="absolute"
                right={0}
                top={0}
                h="100%"
                w="100%"
                // style={{ objectFit: 'cover', opacity: 0.3, mixBlendMode: 'overlay' }}
            />
            <Box pos="relative" style={{ zIndex: 1, maxWidth: '95%' }}>
                <Title order={1} c="white" fw={800} fz={{ base: 24, sm: 32 }}>
                    Welcome, <br /> {name}
                </Title>
                <Text c="white" mt="md" fz="sm" opacity={0.9} fw={500}>
                    Control user access, CCTV camera settings, AI detection, incident
                    monitoring, and system preferences from your dashboard.
                </Text>
            </Box>
        </Paper>
    );
};