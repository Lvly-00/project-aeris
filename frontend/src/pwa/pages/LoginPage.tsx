import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ShieldCheck, Info, Eye, EyeOff, Download } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';
import { AUTH_MESSAGES, mapLoginError } from '../../shared/utils/authErrors';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [installed, setInstalled] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(display-mode: standalone)').matches
    );
    const [showHint, setShowHint] = useState(false);
    const { login, verify2FALogin } = useAuth();
    const [twoFAOpen, setTwoFAOpen] = useState(false);
    const [twoFAEmail, setTwoFAEmail] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Session expired after token refresh failure (interceptor adds ?expired=1)
    const sessionExpired = searchParams.get('expired') === '1';

    useEffect(() => {
        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        const onInstalled = () => setInstalled(true);
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleDownloadApp = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice?.outcome === 'accepted') setInstalled(true);
            setInstallPrompt(null);
        } else {
            setShowHint(true);
        }
    };

    const form = useForm({
        initialValues: { email: '', password: '', remember: false },
        validate: {
            email: (v: string) =>
                !v || !v.trim() ? AUTH_MESSAGES.MISSING_EMAIL : null,
            password: (v: string) =>
                !v ? AUTH_MESSAGES.MISSING_PASSWORD : null,
        },
    });

    const handleSubmit = async (values: any) => {
        setLoading(true);
        setError('');

        try {
            const result = await login(values);

            if (result?.requires_2fa) {
                setTwoFAEmail(result.email || values.email);
                setRememberMe(values.remember);
                setTwoFAOpen(true);
                setLoading(false);
                return;
            }

            navigate('/pwa/dashboard', {
                replace: true,
            });
        } catch (err: any) {
            setError(mapLoginError(err));
        } finally {
            setLoading(false);
        }
    };

    const PRIMARY_ORANGE = '#FF5A05';

    const labelStyles = {
        label: {
            color: PRIMARY_ORANGE,
            fontWeight: 600,
            fontSize: rem(13),
            marginBottom: rem(4),
        },
    };

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
                    overflowY: 'auto',
                }}
            >
                <Stack h="100%" gap="xs">
                    {/* TOP SECTION: Logo and Description */}
                    <Stack align="center" gap="xs" pt="md">
                        <Image
                            src="/icon.png"
                            alt="Aeris Logo"
                            w={{ base: 120, xs: 150 }}
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

                    {/* MIDDLE SECTION: The Form — vertically centred */}
                    <Center style={{ flex: 1 }}>
                        <Box w="100%">
                            <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: '100%' }}>
                                <Stack gap="sm">
                                    <TextInput
                                        label="Email"
                                        placeholder="you@barangay.local"
                                        radius="md"
                                        size="md"
                                        withAsterisk={false}
                                        {...form.getInputProps('email')}
                                        styles={{
                                            input: { height: rem(50) },
                                            ...labelStyles,
                                        }}
                                    />

                                    <PasswordInput
                                        label="Password"
                                        placeholder="Enter your password"
                                        radius="md"
                                        size="md"
                                        withAsterisk={false}
                                        {...form.getInputProps('password')}
                                        visibilityToggleIcon={({ reveal }) =>
                                            reveal ? <EyeOff size={18} /> : <Eye size={18} />
                                        }
                                        styles={{
                                            input: { height: rem(50) },
                                            ...labelStyles,
                                        }}
                                    />

                                    <Group justify="space-between">
                                        <Checkbox
                                            label="Remember Me"
                                            size="xs"
                                            color={PRIMARY_ORANGE}
                                            {...form.getInputProps('remember', { type: 'checkbox' })}
                                        />
                                        <Anchor
                                            href="#"
                                            size="xs"
                                            fw={600}
                                            c={PRIMARY_ORANGE}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigate('/forgot-password?app=pwa');
                                            }}
                                        >
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
                                        loading={loading}
                                        bg={PRIMARY_ORANGE}
                                        style={{ fontWeight: 700 }}
                                    >
                                        Log In
                                    </Button>

                                    {(error || sessionExpired) && (
                                        <Alert icon={<Info size={14} />} color={sessionExpired && !error ? 'orange' : 'red'} p="xs">
                                            {error || AUTH_MESSAGES.SESSION_EXPIRED}
                                        </Alert>
                                    )}

                                    {!installed && (
                                        <Button
                                            fullWidth
                                            size="md"
                                            h={44}
                                            radius="md"
                                            variant="light"
                                            color={PRIMARY_ORANGE}
                                            leftSection={<Download size={18} />}
                                            onClick={handleDownloadApp}
                                            style={{ fontWeight: 600 }}
                                        >
                                            Download App
                                        </Button>
                                    )}

                                    {showHint && !installed && (
                                        <Text fz={11} c="dimmed" ta="center">
                                            Open your browser menu and choose{' '}
                                            <b>&quot;Add to Home Screen&quot;</b> /{' '}
                                            <b>&quot;Install app&quot;</b> to install AERIS.
                                        </Text>
                                    )}
                                </Stack>
                            </form>
                        </Box>
                    </Center>

                    {/* BOTTOM SECTION: Security Box */}
                    <Box
                        p="sm"
                        style={{
                            borderRadius: rem(12),
                            border: '1px solid #eee',
                            backgroundColor: '#fff',
                            marginBottom: rem(10), // Small buffer from bottom edge
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

            <VerificationCodeModal
                opened={twoFAOpen}
                onClose={() => { setTwoFAOpen(false); setTwoFAEmail(''); }}
                email={twoFAEmail}
                onSendCode={async () => {
                    // Code was already sent by the login endpoint — no need to send again.
                    // But the modal expects this to exist. We use the login endpoint
                    // to re-trigger if needed. For now, just resolve.
                }}
                onVerify={async (code) => {
                    await verify2FALogin(twoFAEmail, code, rememberMe);
                }}
                onVerified={() => navigate('/pwa/dashboard', { replace: true })}
                title="Two-Factor Authentication"
                subtitle="Your identity has been verified. You may now continue."
                verifyLabel="Continue to Dashboard"
            />
        </Box>
    );
}
