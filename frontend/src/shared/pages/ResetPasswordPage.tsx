import { useState, useEffect } from 'react';
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
import { Eye, EyeSlash, InfoCircle, Key, Check } from '@boxicons/react';
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

    // Auto-redirect to the login page 3s after the success modal is shown.
    useEffect(() => {
        if (!successOpened) return;
        const timer = setTimeout(backToLogin, 3000);
        return () => clearTimeout(timer);
    }, [successOpened, backToLogin]);

    if (!email || !code) {
        // Direct access without completing steps 1–2
        return <Navigate to={`/forgot-password?app=${app}`} replace />;
    }

    const isPwa = app === 'pwa';

    const cardContent = (
        <Stack align="center" gap="md" justify="center">
            {/* Header Icon */}
            <Box
                bg="#fdf2e8"
                style={{
                    borderRadius: '50%',
                    width: isPwa ? rem(72) : rem(86),
                    height: isPwa ? rem(72) : rem(86),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Key width={isPwa ? 32 : 38} height={isPwa ? 32 : 38} color="#FA5401" strokeWidth={2} />
            </Box>

            <Title order={3} fw={700} ta="center">
                Reset your Password
            </Title>

            <Text ta="center" c="dimmed" fz="sm" px={20}>
                Enter your new password and confirm it to reset your password.
            </Text>


            <form style={{ width: '100%' }} onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <PasswordInput
                        label="Password *"
                        placeholder="Enter Password"
                        radius="md"
                        visibilityToggleIcon={({ reveal }) =>
                            reveal ? <EyeSlash width={18} height={18} /> : <Eye width={18} height={18} />
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
                            reveal ? <EyeSlash width={18} height={18} /> : <Eye width={18} height={18} />
                        }
                        {...form.getInputProps('confirmPassword')}
                        styles={{
                            input: { height: rem(50) },
                            ...labelStyles,
                        }}
                    />

                    {error && (
                        <Alert icon={<InfoCircle width={16} height={16} />} color="red" variant="light" radius="md">
                            {error}
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        h={54}
                        mt="md"
                        radius="md"
                        color="#FA5401"
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
    );

    return (
        <>
            {isPwa ? (
                /* PWA mobile bottom-sheet format (matches PWA Login) */
                <Box
                    style={{
                        height: '100dvh',
                        width: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f8f9fa',
                    }}
                >
                    <Box
                        style={{
                            height: '28%',
                            backgroundImage: `url('/loginBG.png')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0,
                        }}
                    />
                    <Paper
                        radius="32px 32px 0 0"
                        p="xl"
                        style={{
                            flex: 1,
                            marginTop: rem(-40),
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 1,
                            overflowY: 'auto',
                        }}
                    >
                        <Stack align="center" gap="sm" pt="md" style={{ flex: 1 }}>

                            <Center style={{ flex: 1, width: '100%' }}>
                                <Box w="100%">{cardContent}</Box>
                            </Center>
                        </Stack>
                    </Paper>
                </Box>
            ) : (
                /* Desktop centered card format */
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
                        radius={15}
                        px={40}
                        py={52}
                        withBorder
                        shadow="xl"
                        style={{
                            width: '100%',
                            maxWidth: rem(480),
                            height: rem(660),
                            minHeight: rem(660),
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        }}
                    >
                        {cardContent}
                    </Paper>
                </Box>
            )}

            <SuccessModal
                opened={successOpened}
                onClose={() => setSuccessOpened(false)}
                onAction={backToLogin}
                title="Change Password"
                subtitle="Successfully!"
                message="Your password has been successfully changed. The new password is now active on your account."
                actionLabel="Continue"
                buttonColor={ORANGE}
                icon={<Check size="lg" color="#00C853" strokeWidth={1.5} />}
            />
        </>
    );
}
