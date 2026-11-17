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
    Loader,
    rem,
    UnstyledButton,
    useComputedColorScheme
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { ArrowToBottom, ChevronRight, Eye, EyeSlash, InfoCircle } from '@boxicons/react';
import { useAuth } from '../../shared/hooks/useAuth';
import { AUTH_MESSAGES, mapLoginError } from '../../shared/utils/authErrors';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isDark = useComputedColorScheme('light') === 'dark';
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // signingIn=true shows the full-page branded overlay while navigation fires.
    const [signingIn, setSigningIn] = useState(false);
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
    const [throttleSeconds, setThrottleSeconds] = useState(0);

    // Session expired after token refresh failure (interceptor adds ?expired=1)
    const sessionExpired = searchParams.get('expired') === '1';

    // Countdown for rate-limit (429) cooldown while the login button is disabled.
    useEffect(() => {
        if (throttleSeconds <= 0) return;
        const id = setInterval(() => {
            setThrottleSeconds((s) => {
                if (s <= 1) {
                    clearInterval(id);
                    setError('');
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [throttleSeconds]);

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

    // Detect iOS Safari — it never fires beforeinstallprompt
    const isIos = typeof window !== 'undefined' &&
        /iphone|ipad|ipod/i.test(navigator.userAgent) &&
        !(window as any).MSStream;
    const isInStandaloneMode = typeof window !== 'undefined' &&
        window.matchMedia('(display-mode: standalone)').matches;

    // On iOS, auto-show the install guide unless the user dismissed it before
    // or they've already installed (running in standalone mode).
    const [showIosDrawer, setShowIosDrawer] = useState(() => {
        if (typeof window === 'undefined') return false;
        if (window.matchMedia('(display-mode: standalone)').matches) return false;
        if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) return false;
        return localStorage.getItem('aeris-ios-prompt-dismissed') !== '1';
    });

    const dismissIosDrawer = () => {
        localStorage.setItem('aeris-ios-prompt-dismissed', '1');
        setShowIosDrawer(false);
    };

    const handleDownloadApp = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice?.outcome === 'accepted') setInstalled(true);
            setInstallPrompt(null);
        } else if (isIos && !isInStandaloneMode) {
            // Show the iOS drawer if dismissed earlier
            localStorage.removeItem('aeris-ios-prompt-dismissed');
            setShowIosDrawer(true);
        } else {
            setShowHint(true);
        }
    };

    const form = useForm({
        initialValues: { email: '', password: '', remember: false },
        validate: {
            email: (v: string) => {
                if (!v || !v.trim()) return AUTH_MESSAGES.MISSING_EMAIL;
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
                    return AUTH_MESSAGES.INVALID_EMAIL;
                }
                return null;
            },
            password: (v: string) =>
                !v ? AUTH_MESSAGES.MISSING_PASSWORD : null,
        },
    });

    const handleSubmit = async (values: any) => {
        setLoading(true);
        setError('');
        form.clearFieldError('email');
        form.clearFieldError('password');

        try {
            const result = await login(values);

            if (result?.requires_2fa) {
                setTwoFAEmail(result.email || values.email);
                setRememberMe(values.remember);
                setTwoFAOpen(true);
                setLoading(false);
                return;
            }

            setSigningIn(true);
            navigate('/', {
                replace: true,
            });
        } catch (err: any) {
            const mapped = mapLoginError(err);
            if (mapped.fieldError) {
                form.setFieldError(mapped.fieldError.field, mapped.fieldError.message);
            }
            if (mapped.bannerError) {
                setError(mapped.bannerError);
            }
            if (mapped.throttleSeconds) {
                setThrottleSeconds(mapped.throttleSeconds);
            } else if (throttleSeconds <= 0) {
                setError(mapped.bannerError || '');
            }
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
                backgroundColor: 'var(--mantine-color-body)',
            }}
        >
            {/* TOP BACKGROUND SECTION (approx 28% of screen) */}
            <Box
                style={{
                    height: '28%',
                    backgroundImage: `url('${isDark ? '/Dark-loginBG.png' : '/loginBG.png'}')`,
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
                            AI-Assisted Emergency Response and Incident Surveillance System.
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
                                            reveal ? <EyeSlash  width={18} height={18} /> : <Eye  width={18} height={18} />
                                        }
                                        styles={{
                                            input: { height: rem(50) },
                                            ...labelStyles,
                                        }}
                                    />

                                    <Group justify="space-between">
                                        <Checkbox
                                            label="Remember Me"
                                            // size="xs"
                                            color={PRIMARY_ORANGE}
                                            {...form.getInputProps('remember', { type: 'checkbox' })}
                                        />
                                        <Anchor
                                            href="#"
                                            size="sm"
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

                                    {(error || sessionExpired) && (
                                        <Alert icon={<InfoCircle  width={ 14 } height={ 14 } />} color={sessionExpired && !error ? 'orange' : 'red'} p="xs">
                                            {error || AUTH_MESSAGES.SESSION_EXPIRED}
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        fullWidth
                                        size="md"
                                        h={52}
                                        radius="md"
                                        mt="xs"
                                        loading={loading}
                                        disabled={throttleSeconds > 0}
                                        color="#FA5401"
                                        style={{ fontWeight: 700 }}
                                    >
                                        {throttleSeconds > 0 ? `Retry in ${throttleSeconds}s` : 'Log In'}
                                    </Button>



                                    {!installed && (
                                        <UnstyledButton
                                            onClick={handleDownloadApp}
                                            w="100%"
                                            style={{
                                                display: 'block',
                                                border: `1px solid ${PRIMARY_ORANGE}`,
                                                borderRadius: rem(16),
                                                padding: rem(16),
                                                backgroundColor: 'var(--mantine-color-body)',
                                                transition: 'background-color 150ms ease, transform 150ms ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--mantine-color-default-hover)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--mantine-color-body)';
                                            }}
                                        >
                                            <Group justify="space-between" align="center" wrap="nowrap">

                                                {/* Download Icon */}
                                                <Box
                                                    w={40}
                                                    h={40}
                                                    style={{
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: 'var(--mantine-color-orange-light)',
                                                        borderRadius: rem(18),
                                                    }}
                                                >
                                                    <ArrowToBottom
                                                         width={20} height={20}
                                                        strokeWidth={2.5}
                                                        color={PRIMARY_ORANGE}
                                                    />
                                                </Box>

                                                {/* Text */}
                                                <Stack
                                                    gap={2}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Text
                                                        fw={700}
                                                        fz={{ base: 16, sm: 18 }}
                                                        c={PRIMARY_ORANGE}
                                                        lh={1.2}
                                                    >
                                                        Download AERIS App
                                                    </Text>

                                                    <Text
                                                        fz={{ base: 12, sm: 14 }}
                                                        c="var(--mantine-color-dimmed)"
                                                        lh={1.3}
                                                    >
                                                        Access AERIS from your mobile device.
                                                    </Text>
                                                </Stack>

                                                {/* Arrow */}
                                                <ChevronRight
                                                     width={22} height={22}
                                                    strokeWidth={2.5}
                                                    color={PRIMARY_ORANGE}
                                                    style={{
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            </Group>
                                        </UnstyledButton>
                                    )}

                                    {showHint && !installed && !isIos && (
                                        <Text fz={11} c="dimmed" ta="center">
                                            Open your browser menu and tap{' '}
                                            <Text span fw={700}>"Add to Home Screen"</Text>
                                            {' '}or{' '}
                                            <Text span fw={700}>"Install app"</Text>
                                            {' '}to install AERIS.
                                        </Text>
                                    )}
                                </Stack>
                            </form>
                        </Box>
                    </Center>

                    {/* BOTTOM SECTION: Security Box */}

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
            onVerified={() => { setSigningIn(true); navigate('/', { replace: true }); }}
                title="Verify it's you"
                subtitle="You're verified. Opening your dashboard."
                verifyLabel="Continue to dashboard"
                cancelLabel="Back to Log in"
                codeSentOnOpen
                resendable={false}
            />

            {/* ── iOS "Add to Home Screen" bottom drawer ───────────────────── */}
            {showIosDrawer && (
                <Box
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                    }}
                >
                    {/* Dimmed backdrop — tap to dismiss */}
                    <Box
                        onClick={dismissIosDrawer}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                        }}
                    />

                    {/* Drawer panel */}
                    <Box
                        style={{
                            position: 'relative',
                            backgroundColor: 'var(--mantine-color-body)',
                            borderRadius: '20px 20px 0 0',
                            padding: `${rem(24)} ${rem(20)} calc(${rem(28)} + env(safe-area-inset-bottom))`,
                            boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
                        }}
                    >
                        {/* Drag handle */}
                        <Box
                            style={{
                                width: rem(40),
                                height: rem(4),
                                borderRadius: rem(2),
                                backgroundColor: 'var(--mantine-color-gray-4)',
                                margin: `0 auto ${rem(20)}`,
                            }}
                        />

                        {/* Header */}
                        <Stack gap="xs" align="center" mb="md">
                            <Box
                                style={{
                                    width: rem(56),
                                    height: rem(56),
                                    borderRadius: rem(14),
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                <img src="/icons/icon-180.png" alt="AERIS" width={56} height={56} style={{ display: 'block' }} />
                            </Box>
                            <Text fw={700} fz={18} ta="center">Install AERIS</Text>
                            <Text fz={13} c="dimmed" ta="center" lh={1.4}>
                                Add to your Home Screen for quick access — works offline too.
                            </Text>
                        </Stack>

                        {/* Steps */}
                        <Stack gap="sm" mb="lg">
                            {/* Step 1 */}
                            <Box
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: rem(12),
                                    padding: `${rem(12)} ${rem(14)}`,
                                    backgroundColor: 'var(--mantine-color-orange-light)',
                                    borderRadius: rem(12),
                                }}
                            >
                                <Box
                                    style={{
                                        minWidth: rem(28),
                                        height: rem(28),
                                        borderRadius: '50%',
                                        backgroundColor: PRIMARY_ORANGE,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: rem(13),
                                    }}
                                >
                                    1
                                </Box>
                                <Stack gap={2}>
                                    <Text fz={13} fw={600}>Tap the Share button</Text>
                                    <Text fz={12} c="dimmed" lh={1.4}>
                                        Tap{' '}
                                        <Text span fw={700} c={PRIMARY_ORANGE}>
                                            {/* iOS share icon in Unicode */}
                                            ⎙ Share
                                        </Text>
                                        {' '}at the bottom of your Safari screen
                                    </Text>
                                </Stack>
                            </Box>

                            {/* Step 2 */}
                            <Box
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: rem(12),
                                    padding: `${rem(12)} ${rem(14)}`,
                                    backgroundColor: 'var(--mantine-color-orange-light)',
                                    borderRadius: rem(12),
                                }}
                            >
                                <Box
                                    style={{
                                        minWidth: rem(28),
                                        height: rem(28),
                                        borderRadius: '50%',
                                        backgroundColor: PRIMARY_ORANGE,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: rem(13),
                                    }}
                                >
                                    2
                                </Box>
                                <Stack gap={2}>
                                    <Text fz={13} fw={600}>Tap "Add to Home Screen"</Text>
                                    <Text fz={12} c="dimmed" lh={1.4}>
                                        Scroll down in the share menu and tap{' '}
                                        <Text span fw={700} c={PRIMARY_ORANGE}>"Add to Home Screen"</Text>
                                    </Text>
                                </Stack>
                            </Box>

                            {/* Step 3 */}
                            <Box
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: rem(12),
                                    padding: `${rem(12)} ${rem(14)}`,
                                    backgroundColor: 'var(--mantine-color-orange-light)',
                                    borderRadius: rem(12),
                                }}
                            >
                                <Box
                                    style={{
                                        minWidth: rem(28),
                                        height: rem(28),
                                        borderRadius: '50%',
                                        backgroundColor: PRIMARY_ORANGE,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: rem(13),
                                    }}
                                >
                                    3
                                </Box>
                                <Stack gap={2}>
                                    <Text fz={13} fw={600}>Tap "Add"</Text>
                                    <Text fz={12} c="dimmed" lh={1.4}>
                                        AERIS will appear on your Home Screen like a native app
                                    </Text>
                                </Stack>
                            </Box>
                        </Stack>

                        {/* Dismiss button */}
                        <Button
                            fullWidth
                            variant="default"
                            radius="md"
                            size="md"
                            onClick={dismissIosDrawer}
                        >
                            Maybe later
                        </Button>
                    </Box>
                </Box>
            )}

            {/* ── Facebook-style full-page signing-in overlay ───────────── */}
            {signingIn && (
                <Box
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: rem(24),
                        backgroundColor: 'var(--mantine-color-body)',
                        animation: 'aeris-fade-in 180ms ease forwards',
                    }}
                >
                    <style>{`
                        @keyframes aeris-fade-in {
                            from { opacity: 0; }
                            to   { opacity: 1; }
                        }
                    `}</style>
                    <Image src="/icon.png" alt="Aeris" w={96} />
                    <Loader color="#FA5401" size="md" />
                    <Text c="dimmed" fz="sm" fw={500}>Signing you in…</Text>
                </Box>
            )}
        </Box>
    );
}
