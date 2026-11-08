import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import {
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  Stack,
  Text,
  Title,
  rem,
} from '@mantine/core';
import { Envelope } from '@boxicons/react';
import { authAPI } from '../services/api';
import { VerificationCodeForm } from '../components/verification/VerificationCodeForm';
import {
  CODE_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  maskEmail,
} from '../components/verification/verificationMeta';

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

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(CODE_TTL_SECONDS);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (expirySeconds <= 0 && resendTimer <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((s) => (s <= 0 ? 0 : s - 1));
      setResendTimer((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds, resendTimer]);

  const handleResend = async () => {
    if (resendTimer > 0 || !email || resending) return;
    setError('');
    setResending(true);
    try {
      await authAPI.requestPasswordReset(email);
      setCode('');
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      setExpirySeconds(CODE_TTL_SECONDS);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Could not resend the code. Please try again.'
      );
      setResendTimer(0);
    } finally {
      setResending(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    if (code.length < 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyPasswordResetCode(email, code);
      navigate(`/reset-password?app=${app}`, { state: { email, code } });
    } catch (err: any) {
      if (expirySeconds <= 0) {
        setError('This code has expired. Request a new one.');
      } else {
        setError(
          err?.response?.data?.detail ?? 'Invalid or expired verification code.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    // Direct access without going through step 1
    return <Navigate to={`/forgot-password?app=${app}`} replace />;
  }

  const isPwa = app === 'pwa';
  const expired = expirySeconds <= 0;

  const panel = (
    <Stack align="center" gap="md" w="100%">
      <Box
        aria-hidden
        style={{
          width: isPwa ? rem(56) : rem(64),
          height: isPwa ? rem(56) : rem(64),
          borderRadius: rem(16),
          backgroundColor: 'var(--mantine-color-orange-light)',
          color: 'var(--mantine-color-orange-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Envelope width={isPwa ? 24 : 28} height={isPwa ? 24 : 28} />
      </Box>

      <Stack gap={6} align="center">
        <Title
          order={3}
          fz={{ base: rem(20), sm: rem(22) }}
          fw={700}
          ta="center"
          lh={1.25}
        >
          Enter your code
        </Title>
        <Text fz={rem(13.5)} c="dimmed" ta="center" lh={1.5} maw={rem(320)}>
          We sent a 6-digit code to{' '}
          <Text component="span" fz={rem(13.5)} fw={700} c="var(--mantine-color-text)">
            {maskEmail(email)}
          </Text>
          .
        </Text>
      </Stack>

      <Box w="100%" mt={4}>
        <VerificationCodeForm
          code={code}
          onCodeChange={setCode}
          error={error}
          verifying={loading}
          resending={resending}
          countdown={expirySeconds}
          resendTimer={resendTimer}
          onResend={handleResend}
          resendable
        />
      </Box>

      <Button
        fullWidth
        h={46}
        radius="md"
        color="orange"
        fz={rem(15)}
        fw={700}
        loading={loading}
        disabled={code.length < 6 || expired}
        onClick={handleVerifyCode}
      >
        Continue
      </Button>

      <Anchor
        component="button"
        type="button"
        onClick={() => navigate(`/${app}/login`, { replace: true })}
        c="dimmed"
        fz={rem(13)}
        fw={600}
        underline="never"
      >
        Back to sign in
      </Anchor>
    </Stack>
  );

  if (isPwa) {
    return (
      <Box
        style={{
          minHeight: '100dvh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Box
          style={{
            height: '22dvh',
            minHeight: rem(132),
            backgroundImage: `url('/loginBG.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        />

        <Paper
          radius="24px 24px 0 0"
          p="lg"
          style={{
            flex: 1,
            marginTop: rem(-24),
            zIndex: 1,
            backgroundColor: 'var(--mantine-color-body)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <Center style={{ minHeight: '100%', width: '100%' }}>
            <Box w="100%" maw={rem(380)}>
              {panel}
            </Box>
          </Center>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100dvh',
        width: '100%',
        backgroundImage: `url('/BACKGROUND.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: rem(16),
      }}
    >
      <Paper
        radius={20}
        p={{ base: 'lg', sm: 36 }}
        withBorder
        shadow="lg"
        style={{
          width: '100%',
          maxWidth: rem(440),
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        {panel}
      </Paper>
    </Box>
  );
}
