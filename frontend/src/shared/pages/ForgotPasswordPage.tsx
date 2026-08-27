import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    Paper,
    Title,
    Text,
    TextInput,
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
import { Envelope, InfoCircle, MailOpen } from '@boxicons/react';
import { authAPI } from '../services/api';
import { AUTH_MESSAGES } from '../utils/authErrors';
import SuccessModal from '../components/status/SuccessModal';

const ORANGE = '#FF6B00';

/**
 * Step 1 of the forgot-password flow (FR-LG-003 / NFR-LG-003).
 * Standalone page reachable from BOTH the PWA and Desktop login screens.
 * `?app=pwa|desktop` controls which login screen the user returns to.
 */
export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const app = searchParams.get('app') === 'pwa' ? 'pwa' : 'desktop';
    const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successOpened, setSuccessOpened] = useState(false);
    const [sentEmail, setSentEmail] = useState('');

    const labelStyles = {
        label: {
            color: ORANGE,
            fontWeight: 600,
            fontSize: rem(13),
            marginBottom: rem(4),
        },
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const form = useForm({
        initialValues: { email: prefillEmail },
        validate: {
            email: (v: string) => {
                if (!v || !v.trim()) return AUTH_MESSAGES.MISSING_EMAIL;
                if (!emailRegex.test(v.trim())) return 'Please enter a valid email address.';
                return null;
            },
        },
    });

    const handleSubmit = async (values: { email: string }) => {
        setLoading(true);
        setError('');
        try {
            await authAPI.requestPasswordReset(values.email.trim());
            setSentEmail(values.email.trim());
            setSuccessOpened(true);
        } catch (err: any) {
            // No registered account (backend returns 404 with a clear message).
            setError(err?.response?.data?.detail || AUTH_MESSAGES.RESET_FAILED);
        } finally {
            setLoading(false);
        }
    };

    const backToLogin = () => navigate(`/${app}/login`, { replace: true });

    // Auto-redirect to the verification-code page 3s after the success modal
    // is shown (a code was successfully sent to a registered account).
    useEffect(() => {
        if (!successOpened || !sentEmail) return;
        const timer = setTimeout(() => {
            navigate(`/verification-code?app=${app}`, { state: { email: sentEmail } });
        }, 3000);
        return () => clearTimeout(timer);
    }, [successOpened, sentEmail, navigate, app]);

    const isPwa = app === 'pwa';

    const cardContent = (
        <Stack align="center" gap="lg" justify="center">
            {/* Orange Icon Circle */}
            <Box
                bg="var(--mantine-color-orange-light)"
                style={{
                    borderRadius: '50%',
                    width: isPwa ? rem(72) : rem(86),
                    height: isPwa ? rem(72) : rem(86),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Envelope size="lg" color="#FA5401" strokeWidth={1} />
            </Box>

            <Title order={3} fw={700} ta="center">
                Forgot Password?
            </Title>

            <Text ta="center" c="dimmed" fz="sm" px={20}>
                Enter your email address and we'll send you a verification code to reset
                your password.
            </Text>

            <form style={{ width: '100%' }} onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md" align="center">
                    <TextInput
                        label="Email *"
                        placeholder="admin@gmail.com"
                        radius="md"
                        {...form.getInputProps('email')}
                        styles={{
                            root: { width: '100%' },
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
                        Verify
                    </Button>

                    <Anchor
                        component="button"
                        type="button"
                        onClick={backToLogin}
                        c={ORANGE}
                        fz="sm"
                        fw={600}
                        mt="sm"
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
                        backgroundColor: 'var(--mantine-color-body)',
                    }}
                >
                    <Box
                        style={{
                            height: '25%',
                            backgroundImage: `url('/loginBG.png')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0,
                        }}
                    />
                    <Paper
                        radius="32px 32px 0 0"
                        p="md"
                        style={{
                            flex: 1,
                            marginTop: rem(-32),
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 1,
                            overflow: 'hidden',
                        }}
                    >
                        <Stack align="center" gap="xs" pt="sm" style={{ flex: 1 }}>
                          
                            <Center style={{ flex: 1, width: '100%', minHeight: 0 }}>
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
                            backgroundColor: 'var(--mantine-color-body)',
                        }}
                    >
                        {cardContent}
                    </Paper>
                </Box>
            )}

            <SuccessModal
                opened={successOpened}
                onClose={() => setSuccessOpened(false)}
                onAction={() => navigate(`/verification-code?app=${app}`, { state: { email: sentEmail } })}
                actionLabel="Continue"
                buttonColor={ORANGE}
                title="Check your email"
                message={AUTH_MESSAGES.RESET_SENT}
                icon={<MailOpen size="lg" color="#00C853" strokeWidth={1} />}
            />
        </>
    );
}
