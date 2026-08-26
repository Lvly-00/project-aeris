import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import {
    Paper,
    Title,
    Text,
    PasswordInput,
    Button,
    Alert,
    Stack,
    Box,
    Anchor,
    Image,
    Center,
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Info, Eye, EyeOff, KeyRound } from 'lucide-react';
import { authAPI } from '../services/api';
import { AUTH_MESSAGES } from '../utils/authErrors';
import SuccessModal from '../components/status/SuccessModal';

const ORANGE = '#FF6B00';

/**
 * Step 3 of the forgot-password flow — set a new password.
 * Standalone page shared by PWA & Desktop (`?app=` decides the return login).
 * Requires `state.email` (+ optional code) from VerificationCodePage.
 */
export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const app = searchParams.get('app') === 'pwa' ? 'pwa' : 'desktop';
    const state = (location.state ?? {}) as { email?: string; code?: string };
    const email = state.email ?? '';
    const code = state.code ?? '';

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successOpened, setSuccessOpened] = useState(false);

    const labelStyles = {
        label: {
            color: ORANGE,
            fontWeight: 600,
            fontSize: rem(13),
            marginBottom: rem(4),
        },
    };

    const form = useForm({
        initialValues: { password: '', confirmPassword: '' },
        validate: {
            password: (v: string) => (!v ? AUTH_MESSAGES.MISSING_PASSWORD : null),
            confirmPassword: (v: string, values: { password: string }) =>
                v !== values.password ? 'Passwords do not match.' : null,
        },
    });

    const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
        setLoading(true);
        setError('');
        try {
            await authAPI.confirmPasswordReset(email, code, values.password);
            setSuccessOpened(true);
        } catch (err: any) {
            const data = err?.response?.data;
            const passwordError = Array.isArray(data?.password)
                ? String(data.password[0])
                : typeof data?.password === 'string'
                    ? data.password
                    : undefined;
            setError(
                passwordError ??
                    data?.detail ??
                    AUTH_MESSAGES.SERVICE_UNAVAILABLE
            );
        } finally {
            setLoading(false);
        }
    };

    const backToLogin = () => navigate(`/${app}/login`, { replace: true });

    if (!email || !code) {
        // Direct access without completing steps 1–2
        return <Navigate to={`/forgot-password?app=${app}`} replace />;
    }

    return (
        <Box
            style={{
                height: '100vh',
                width: '100vw',
                backgroundImage: `url('/BACKGROUND.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Paper
                radius={24}
                p={40}
                withBorder
                shadow="xl"
                style={{
                    width: '100%',
                    maxWidth: rem(480),
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                }}
            >
                <Stack align="center" gap="md">
                    <Center w="100%" style={{ flexDirection: 'column' }}>
                        <Image src="/icon.png" alt="Aeris Logo" w={140} mb="sm" />
                    </Center>

                    {/* Header Icon */}
                    <Box
                        bg="#E8FDF0"
                        style={{
                            borderRadius: '50%',
                            width: rem(80),
                            height: rem(80),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <KeyRound size={38} color="#00C853" strokeWidth={2.5} />
                    </Box>

                    <Title order={3} fw={800} ta="center">
                        Reset your Password
                    </Title>

                    <Text ta="center" c="dimmed" fz="sm" px={20}>
                        Enter your new password and confirm it to reset your password.
                    </Text>

                    {error && (
                        <Alert icon={<Info size={16} />} color="red" variant="light" radius="md">
                            {error}
                        </Alert>
                    )}

                    <form style={{ width: '100%' }} onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <PasswordInput
                                label="Password *"
                                placeholder="Enter Password"
                                radius="md"
                                visibilityToggleIcon={({ reveal }) =>
                                    reveal ? <EyeOff size={18} /> : <Eye size={18} />
                                }
                                {...form.getInputProps('password')}
                                styles={{
                                    input: { height: rem(50) },
                                    ...labelStyles,
                                }}
                            />

                            <PasswordInput
                                label="Confirm Password *"
                                placeholder="Confirm Password"
                                radius="md"
                                visibilityToggleIcon={({ reveal }) =>
                                    reveal ? <EyeOff size={18} /> : <Eye size={18} />
                                }
                                {...form.getInputProps('confirmPassword')}
                                styles={{
                                    input: { height: rem(50) },
                                    ...labelStyles,
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                h={54}
                                mt="md"
                                radius="md"
                                color={ORANGE}
                                loading={loading}
                                style={{ fontSize: rem(16), fontWeight: 700 }}
                            >
                                Reset Password
                            </Button>

                            <Anchor
                                component="button"
                                type="button"
                                onClick={backToLogin}
                                c={ORANGE}
                                fz="sm"
                                fw={600}
                                ta="center"
                            >
                                Back to Log in
                            </Anchor>
                        </Stack>
                    </form>
                </Stack>
            </Paper>

            <SuccessModal
                opened={successOpened}
                onClose={() => setSuccessOpened(false)}
                onAction={backToLogin}
                title="Change Password"
                subtitle="Successfully!"
                message="Your password has been successfully changed. The new password is now active on your account."
            />
        </Box>
    );
}
