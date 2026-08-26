import { useState } from 'react';
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
import { Info, Mail } from 'lucide-react';
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

    const form = useForm({
        initialValues: { email: prefillEmail },
        validate: {
            email: (v: string) => (!v || !v.trim() ? AUTH_MESSAGES.MISSING_EMAIL : null),
        },
    });

    // Identical response whether or not the account exists (NFR-LG-009)
    const handleSubmit = async (values: { email: string }) => {
        setLoading(true);
        setError('');
        try {
            await authAPI.requestPasswordReset(values.email.trim());
        } catch {
            // Intentionally swallow errors — never reveal account existence
        } finally {
            setSentEmail(values.email.trim());
            setSuccessOpened(true);
            setLoading(false);
        }
    };

    const backToLogin = () => navigate(`/${app}/login`, { replace: true });

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
                <Stack align="center" gap="lg">
                    {/* Green Icon Circle */}
                    <Box
                        bg="#E8FDF0"
                        style={{
                            borderRadius: '50%',
                            width: rem(86),
                            height: rem(86),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Mail size={42} color="#00C853" strokeWidth={2.5} />
                    </Box>

                    <Title order={3} fw={800} ta="center">
                        Forgot password?
                    </Title>

                    <Text ta="center" c="dimmed" fz="sm" px={20}>
                        Enter your email address and we'll send you a verification code to reset
                        your password.
                    </Text>

                    {error && (
                        <Alert icon={<Info size={16} />} color="red" variant="light" radius="md">
                            {error}
                        </Alert>
                    )}

                    <form style={{ width: '100%' }} onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md" align="center">
                            <TextInput
                                label="Email *"
                                placeholder="Enter Email"
                                radius="md"
                                {...form.getInputProps('email')}
                                styles={{
                                    root: { width: '100%' },
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
            </Paper>

            <SuccessModal
                opened={successOpened}
                onClose={() => setSuccessOpened(false)}
                onAction={() => navigate(`/verification-code?app=${app}`, { state: { email: sentEmail } })}
                actionLabel="Continue"
                buttonColor={ORANGE}
                title="Check your email"
                message={AUTH_MESSAGES.RESET_SENT}
                icon={<Mail size={110} color="#00C853" strokeWidth={1.8} />}
            />
        </Box>
    );
}
