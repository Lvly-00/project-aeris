import { useState } from 'react';
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
import { ShieldCheck, Info, Eye, EyeOff } from 'lucide-react';
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

  // Session expired after token refresh failure (interceptor adds ?expired=1)
  const sessionExpired = searchParams.get('expired') === '1';

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      remember: false,
    },
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

      navigate('/desktop/cameras', { replace: true });
    } catch (err: any) {
      setError(mapLoginError(err));
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
        <Stack gap="xl">
          {/* LOGO AREA */}
          <Center flex={1} style={{ flexDirection: 'column' }}>
            <Image
              src="/icon.png"
              alt="Aeris Logo"
              w={180}
              mb="md"
            />

            <Text ta="center" c="dimmed" fz="sm" fw={500} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              AI-Assisted Barangay CCTV Incident Monitoring & Decision Support System.
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
                  input: { height: rem(54) },
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
                  reveal ? <EyeOff size={18} /> : <Eye size={18} />
                }
                styles={{
                  input: { height: rem(54) },
                  ...labelStyles,
                }}
              />

              <Group justify="space-between">
                <Checkbox
                  label="Remember Me"
                  size="xs"
                  color={ORANGE}
                  {...form.getInputProps('remember', { type: 'checkbox' })}
                />
                <Anchor
                  href="#"
                  size="xs"
                  fw={600}
                  c={ORANGE}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password?app=desktop');
                  }}
                >
                  Forgot Password?
                </Anchor>
              </Group>

              <Button
                type="submit"
                fullWidth
                size="md"
                h={54}
                radius="md"
                mt="md"
                loading={loading}
                color={ORANGE}
                style={{ fontSize: rem(16), fontWeight: 700 }}
              >
                Log In
              </Button>

              {(error || sessionExpired) && (
                <Alert
                  icon={<Info size={16} />}
                  color={sessionExpired && !error ? 'orange' : 'red'}
                  variant="light"
                  radius="md"
                >
                  {error || AUTH_MESSAGES.SESSION_EXPIRED}
                </Alert>
              )}
            </Stack>
          </form>

          {/* SECURITY FOOTER */}
          <Box
            p="sm"
            style={{
              backgroundColor: '#FFF0E6',
              borderRadius: rem(12),
              border: '1px solid #FFE0CC',
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <ShieldCheck size={18} color={ORANGE} />
              <Text fz={11} fw={500} c="#994400">
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
