import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import {
    Paper,
    Title,
    Text,
    Button,
    Alert,
    Stack,
    Box,
    Anchor,
    Image,
    Center,
    PinInput,
    Divider,
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AlertCircle, Envelope, InfoCircle } from '@boxicons/react';
import { authAPI } from '../services/api';

const ORANGE = '#FF6B00';
const CODE_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 55;

/**
 * Step 2 of the forgot-password flow — 6-digit verification code entry.
 * Standalone page shared by PWA & Desktop (`?app=` decides the return login).
 * Requires `state.email` from ForgotPasswordPage; redirects back otherwise.
 */
export default function VerificationCodePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const app = searchParams.get('app') === 'pwa' ? 'pwa' : 'desktop';
    const email = (location.state as { email?: string } | null)?.email ?? '';

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [expirySeconds, setExpirySeconds] = useState(CODE_TTL_SECONDS);
    const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);

    useEffect(() => {
        if (expirySeconds <= 0) return;
        const interval = setInterval(() => setExpirySeconds((s) => s - 1), 1000);
        return () => clearInterval(interval);
    }, [expirySeconds]);

    // Resend cooldown
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => setResendTimer((s) => s - 1), 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const form = useForm({
        initialValues: { code: '' },
    });

    const handleResend = async () => {
        if (resendTimer > 0 || !email) return;
        setError('');
        try {
            await authAPI.requestPasswordReset(email);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not resend the code. Please try again.');
            return;
        }
        setResendTimer(RESEND_COOLDOWN_SECONDS);
        setExpirySeconds(CODE_TTL_SECONDS);
    };

    const handleVerifyCode = async () => {
        setError('');
        if (!form.values.code || form.values.code.length < 6) {
            setError('Please enter the 6-digit verification code.');
            return;
        }
        setLoading(true);
        try {
            await authAPI.verifyPasswordResetCode(email, form.values.code);
            navigate(`/reset-password?app=${app}`, {
                state: { email, code: form.values.code },
            });
        } catch (err: any) {
            if (expirySeconds <= 0) {
                setError('This code has expired. Please request a new one.');
            } else {
                setError(
                    err?.response?.data?.detail ??
                    'Invalid or expired verification code.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper to mask email: mi********@gmail.com
    const maskEmail = (value: string) => {
        if (!value) return '';
        const [name, domain] = value.split('@');
        return `${name.substring(0, 2)}${'*'.repeat(10)}@${domain}`;
    };

    const formatClock = (totalSeconds: number) => {
        const m = Math.floor(Math.max(totalSeconds, 0) / 60)
            .toString()
            .padStart(2, '0');
        const s = Math.max(totalSeconds, 0) % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!email) {
        // Direct access without going through step 1
        return <Navigate to={`/forgot-password?app=${app}`} replace />;
    }

    const isPwa = app === 'pwa';

    const cardContent = (
        <Stack align="center" gap="md" w="100%" justify="center">

            {/* Header Icon */}
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
                Verification code sent
            </Title>
            <Text ta="center" c="dimmed" fz="sm" px={10}>
                A 6-digit verification code has been sent to{" "}
                <Text component="span" fz="sm" fw={700} c="var(--mantine-color-text)">
                    {maskEmail(email)}
                </Text>
            </Text>

            <PinInput
                length={6}
                size="md"
                type="number"
                placeholder=""
                value={form.values.code}
                onChange={(val) => {
                    const digits = val.replace(/\D/g, '').slice(0, 6);
                    form.setFieldValue('code', digits);
                }}
                styles={{
                    input: {
                        width: isPwa ? rem(42) : rem(46),
                        height: isPwa ? rem(46) : rem(48),
                        fontSize: rem(18),
                        fontWeight: 700,
                        borderRadius: rem(8),
                        '&:focus': { borderColor: ORANGE },
                    },
                }}
            />

            <Text fz="xs" c="dimmed">
                Code expires in{' '}
                <Text span c={expirySeconds > 0 ? 'red' : 'dimmed'} fz="sm" fw={600}>
                    {formatClock(expirySeconds)}
                </Text>
            </Text>

            <Text fz="sm" c="dimmed" >
                Didn't receive the code?{' '}
                <Anchor
                    component="button"
                    c={resendTimer > 0 ? 'dimmed' : ORANGE}
                    fz="sm"
                    fw={600}
                    disabled={resendTimer > 0}
                    onClick={handleResend}
                >
                    Resend code {resendTimer > 0 && `(${resendTimer}s)`}
                </Anchor>
            </Text>

            <Divider w="100%" my="sm" color="var(--mantine-color-default-border)" />

            <Alert
                variant="light"
                color={error ? 'red' : 'orange'}
                radius="md"
                p="md"
                w="100%"
                styles={{
                    root: {
                        backgroundColor: error ? 'var(--mantine-color-red-light)' : 'var(--mantine-color-orange-light)',
                        border: 'none',
                    },
                    message: { color: 'var(--mantine-color-dimmed)', fontSize: rem(13), lineHeight: 1.4 },
                }}
                icon={
                    error ? (
                        <AlertCircle width={24} height={24} color="red" />
                    ) : (
                        <InfoCircle width={24} height={24} color={ORANGE} />
                    )
                }
            >
                {error ||
                    'Please check your inbox and spam folder for the verification code.'}
            </Alert>

            <Button
                fullWidth
                h={54}
                mt="sm"
                radius="md"
                color="#FA5401"
                onClick={handleVerifyCode}
                loading={loading}
                style={{ fontSize: rem(16), fontWeight: 700 }}
            >
                Continue
            </Button>

            <Anchor
                component="button"
                type="button"
                onClick={() => navigate(`/${app}/login`, { replace: true })}
                c={ORANGE}
                fz="sm"
                fw={600}
            >
                Back to Log in
            </Anchor>
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
        </>
    );
}
