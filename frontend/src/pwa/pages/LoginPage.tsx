import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Paper,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Alert,
    Stack,
    Box,
    Group,
    Checkbox,
    Anchor,
    Image,
    Center,
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { ShieldCheck, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

export default function LoginPage() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const form = useForm({
        initialValues: { email: '', password: '', remember: false },
        validate: {
            email: (v: string) => (!v ? 'Required' : /^\S+@\S+$/.test(v) ? null : 'Invalid email'),
            password: (v: string) => (!v ? 'Required' : null),
        },
    });

    const handleSubmit = async (values: any) => {
        setLoading(true);
        setError('');

        try {
            await login(values);

            navigate('/pwa/dashboard', {
                replace: true,
            });
        } catch (err: any) {
            setError(
                err.response?.data?.detail ||
                'Invalid credentials. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const PRIMARY_ORANGE = '#FF5A05';

    return (
        <Box
            style={{
                height: '100dvh', // Use Dynamic Viewport Height to prevent mobile scroll
                width: '100%',
                overflow: 'hidden', // Disable scrolling
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f8f9fa',
            }}
        >
            {/* TOP BACKGROUND SECTION (approx 28% of screen) */}
            <Box
                style={{
                    height: '28%',
                    backgroundImage: `url('/loginBG.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                }}
            />

            {/* WHITE CONTENT AREA */}
            <Paper
                radius="32px 32px 0 0"
                p="xl"
                style={{
                    flex: 1, // Takes up all remaining space
                    marginTop: rem(-40),
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1,
                }}
            >
                <Stack justify="space-between" h="100%" gap="xs">

                    {/* TOP SECTION: Logo and Description */}
                    <Stack align="center" gap="xs">
                        <Image
                            src="/icon.png"
                            alt="Aeris Logo"
                            w={{ base: 140, xs: 180 }} 
                            fit="contain"
                        />
                        <Text
                            ta="center"
                            c="dimmed"
                            fz={rem(13)}
                            lh={1.4}
                            style={{ maxWidth: '90%' }}
                        >
                            Sign in to access the AI-Assisted Barangay CCTV Incident Monitoring & Decision Support System.
                        </Text>
                    </Stack>

                    {/* MIDDLE SECTION: The Form */}
                    <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: '100%' }}>
                        <Stack gap="sm">
                            {error && (
                                <Alert icon={<Info size={14} />} color="red" p="xs">
                                    {error}
                                </Alert>
                            )}

                            <TextInput
                                placeholder="Email"
                                radius="md"
                                size="md"
                                {...form.getInputProps('email')}
                                styles={{ input: { height: rem(50) } }}
                            />

                            <PasswordInput
                                placeholder="Password"
                                radius="md"
                                size="md"
                                {...form.getInputProps('password')}
                                visibilityToggleIcon={({ reveal }) =>
                                    reveal ? <EyeOff size={18} /> : <Eye size={18} />
                                }
                                styles={{ input: { height: rem(50) } }}
                            />

                            <Group justify="space-between">
                                <Checkbox
                                    label="Remember Me"
                                    size="xs"
                                    color={PRIMARY_ORANGE}
                                    {...form.getInputProps('remember', { type: 'checkbox' })}
                                />
                                <Anchor href="#" size="xs" fw={600} c={PRIMARY_ORANGE}>
                                    Forgot Password?
                                </Anchor>
                            </Group>

                            <Button
                                type="submit"
                                fullWidth
                                size="md"
                                h={52}
                                radius="md"
                                mt="xs"
                                bg={PRIMARY_ORANGE}
                                style={{ fontWeight: 700 }}
                            >
                                Log In
                            </Button>
                        </Stack>
                    </form>

                    {/* BOTTOM SECTION: Security Box */}
                    <Box
                        p="sm"
                        style={{
                            borderRadius: rem(12),
                            border: '1px solid #eee',
                            backgroundColor: '#fff',
                            marginBottom: rem(10) // Small buffer from bottom edge
                        }}
                    >
                        <Group gap="xs" wrap="nowrap" align="center" justify="center">
                            <ShieldCheck size={18} color={PRIMARY_ORANGE} strokeWidth={2} />
                            <Text fz={11} fw={600} c="dark.3" ta="center">
                                Your information is encrypted and securely protected.
                            </Text>
                        </Group>
                    </Box>

                </Stack>
            </Paper>
        </Box>
    );
}