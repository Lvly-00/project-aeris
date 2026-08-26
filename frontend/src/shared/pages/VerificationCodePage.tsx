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
import { Info, Mail } from 'lucide-react';
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
        try {
            await authAPI.requestPasswordReset(email);
        } catch {
            // Intentionally swallow errors — never reveal account existence
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
                <Stack align="center" gap="md" w="100%">
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
                        <Mail size={38} color="#00C853" strokeWidth={2.5} />
                    </Box>

                    <Title order={3} fw={800} ta="center">
                        Verification code sent
                    </Title>
                    <Text ta="center" c="dimmed" fz="sm" px={10}>
                        A 6-digit verification code has been sent to your registered email
                        address.
                    </Text>

                    <Text fw={700} fz="sm" mb="xs">
                        {maskEmail(email)}
                    </Text>

                    {error && (
                        <Alert icon={<Info size={16} />} color="red" variant="light" radius="md">
                            {error}
                        </Alert>
                    )}

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
                                width: rem(46),
                                height: rem(48),
                                fontSize: rem(18),
                                fontWeight: 700,
                                borderRadius: rem(8),
                                '&:focus': { borderColor: ORANGE },
                            },
                        }}
                    />

                    <Text fz="xs" c="dimmed" mt={5}>
                        Code expires in{' '}
                        <Text span c={expirySeconds > 0 ? 'red' : 'dimmed'} fw={600}>
                            {formatClock(expirySeconds)}
                        </Text>
                    </Text>

                    <Text fz="sm" c="dimmed" mt="sm">
                        Didn't receive the code?{' '}
                        <Anchor
                            component="button"
                            c={resendTimer > 0 ? 'dimmed' : ORANGE}
                            fw={700}
                            disabled={resendTimer > 0}
                            onClick={handleResend}
                        >
                            Resend code {resendTimer > 0 && `(${resendTimer}s)`}
                        </Anchor>
                    </Text>

                    <Divider w="100%" my="lg" color="#EEEEEE" />

                    <Alert
                        variant="light"
                        color="orange"
                        radius="md"
                        p="md"
                        styles={{
                            root: { backgroundColor: '#FFF5F0', border: 'none' },
                            message: { color: '#666', fontSize: rem(13), lineHeight: 1.4 },
                        }}
                        icon={<Info size={24} color={ORANGE} />}
                    >
                        Please check your inbox and spam folder for the verification code.
                    </Alert>

                    <Button
                        fullWidth
                        h={54}
                        mt="md"
                        radius="md"
                        color={ORANGE}
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
            </Paper>
        </Box>
    );
}
