import { Paper, Title, Text, Box } from '@mantine/core';

export const Banner = () => {
    return (
        <Paper
            p="xl"
            radius="md"
            pos="relative"
        >
            <Box
                component="img"
                src="/Banner.png" // Replace with your actual image
                pos="absolute"
                right={0}
                top={0}
                h="100%"
                w="100%"
                // style={{ objectFit: 'cover', opacity: 0.3, mixBlendMode: 'overlay' }}
            />
            <Box pos="relative" style={{ zIndex: 1, maxWidth: '95%' }}>
                <Title order={1} c="white" fw={800} fz={{ base: 24, sm: 32 }}>
                    Welcome, <br /> System Admin
                </Title>
                <Text c="white" mt="md" fz="sm" opacity={0.9} fw={500}>
                    Control user access, CCTV camera settings, AI detection, incident
                    monitoring, and system preferences from your dashboard.
                </Text>
            </Box>
        </Paper>
    );
};