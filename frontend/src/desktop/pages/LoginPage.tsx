import { useState, useEffect } from 'react';
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
import { CheckShield, Eye, EyeSlash, InfoCircle } from '@boxicons/react';
import { useAuth } from '../../shared/hooks/useAuth';
import { AUTH_MESSAGES, mapLoginError } from '../../shared/utils/authErrors';
import VerificationCodeModal from '../../shared/components/VerificationCodeModal';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, verify2FALogin } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [throttleSeconds, setThrottleSeconds] = useState(0);

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

  // Session expired after token refresh failure (interceptor adds ?expired=1)
  const sessionExpired = searchParams.get('expired') === '1';

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      remember: false,
    },
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

      navigate('/desktop/cameras', { replace: true });
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
      }
    } finally {
      setLoading(false);
    }
  };

  const ORANGE = '#FF6B00';

  const labelStyles = {
    label: {
      color: ORANGE,
      fontWeight: 600,
      fontSize: rem(13),
      marginBottom: rem(4),
    },
  };

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
        radius={15}
        px={40}
        py={52}
        withBorder
        shadow="xl"
        style={{
          width: '100%',
          maxWidth: rem(480),
          minHeight: rem(660),
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Stack gap="xl" justify="center" style={{ flex: 1 }}>
          {/* LOGO AREA */}
          <Center flex={1} style={{ flexDirection: 'column' }}>
            <Image
              src="/icon.png"
              alt="Aeris Logo"
              w={180}
              mb="md"
            />

            <Text ta="center" c="dimmed" fz="sm" fw={500} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              AI-Assisted Emergency Response and Incident Surveillance System.
            </Text>
          </Center>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="you@barangay.local"
                size="md"
                radius="md"
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
                size="md"
                radius="md"
                withAsterisk={false}
                {...form.getInputProps('password')}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? <EyeSlash width={18} height={18} /> : <Eye width={18} height={18} />
                }
                styles={{
                  input: { height: rem(50) },
                  ...labelStyles,
                }}
              />

              <Group justify="space-between">
                <Checkbox
                  label="Remember Me"
                  // size="xl"
                  color={ORANGE}
                  {...form.getInputProps('remember', { type: 'checkbox' })}
                />
                <Anchor
                  href="#"
                  size="sm"
                  fw={500}
                  c={ORANGE}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password?app=desktop');
                  }}
                >
                  Forgot Password?
                </Anchor>
              </Group>

              {(error || sessionExpired) && (
                <Alert
                  icon={<InfoCircle width={16} height={16} />}
                  color={sessionExpired && !error ? 'orange' : 'red'}
                  variant="light"
                  radius="md"
                >
                  {error || AUTH_MESSAGES.SESSION_EXPIRED}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                size="md"
                h={54}
                radius="md"
                mt="md"
                loading={loading}
                disabled={throttleSeconds > 0}
                color="#FA5401"
                style={{ fontSize: rem(16), fontWeight: 700 }}
              >
                {throttleSeconds > 0 ? `Retry in ${throttleSeconds}s` : 'Log In'}
              </Button>


            </Stack>
          </form>

        </Stack>
      </Paper>

      <VerificationCodeModal
        opened={twoFAOpen}
        onClose={() => { setTwoFAOpen(false); setTwoFAEmail(''); }}
        email={twoFAEmail}
        onSendCode={async () => {
          // Code was already sent by the login endpoint.
        }}
        onVerify={async (code) => {
          await verify2FALogin(twoFAEmail, code, rememberMe);
        }}
        onVerified={() => navigate('/desktop/cameras', { replace: true })}
        title="Two-Factor Authentication"
        subtitle="Your identity has been verified. You may now continue."
        verifyLabel="Continue to Dashboard"
      />
    </Box>
  );
}
