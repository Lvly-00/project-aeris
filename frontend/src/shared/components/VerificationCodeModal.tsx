import { useState, useEffect, useRef } from 'react';
import {
  Modal, Stack, Text, Group, Button, Divider, PinInput, Alert, Box, Title, rem, Anchor, ActionIcon, Center
} from '@mantine/core';
import { Envelope, InfoCircle, Check, X, AlertCircle } from '@boxicons/react';

const ORANGE = '#FF6B00';
const CODE_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 55;

export interface VerificationCodeModalProps {
  opened: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
  onSendCode: () => Promise<void>;
  onVerify: (code: string) => Promise<void>;
  title?: string;
  subtitle?: string;
  verifyLabel?: string;
  cancelLabel?: string;
  /**
   * When set (ms), the modal automatically calls `onVerified()` that long
   * after verification succeeds — used to auto-redirect to the next step.
   * Disabled by default (0).
   */
  autoRedirectMs?: number;
}

export default function VerificationCodeModal({
  opened,
  onClose,
  onVerified,
  email,
  onSendCode,
  onVerify,
  title = 'Verification code sent',
  subtitle,
  verifyLabel = 'Continue',
  cancelLabel = 'Cancel',
  autoRedirectMs = 0,
}: VerificationCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(CODE_TTL_SECONDS);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  // Auto-redirect to the next step after successful verification.
  useEffect(() => {
    if (!verified || autoRedirectMs <= 0) return;
    const id = setTimeout(() => onVerifiedRef.current(), autoRedirectMs);
    redirectTimerRef.current = id;
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [verified, autoRedirectMs]);

  const formatClock = (totalSeconds: number) => {
    const m = Math.floor(Math.max(totalSeconds, 0) / 60).toString().padStart(2, '0');
    const s = (Math.max(totalSeconds, 0) % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const maskEmail = (val: string) => {
    if (!val) return '';
    const [name, domain] = val.split('@');
    return `${name.substring(0, 2)}${'*'.repeat(8)}@${domain}`;
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(CODE_TTL_SECONDS);
    setResendTimer(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      setResendTimer((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
  };

  useEffect(() => {
    if (!opened) return;
    setCode('');
    setError('');
    setLoading(false);
    setVerified(false);

    (async () => {
      setSending(true);
      try {
        await onSendCode();
        startCountdown();
      } catch {
        setError('We could not send the verification code. Please try again.');
      } finally {
        setSending(false);
      }
    })();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [opened]);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setCode('');
    try {
      await onSendCode();
      startCountdown();
    } catch {
      setError('We could not send the verification code. Please try again.');
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await onVerify(code);
      setVerified(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton={false}
      centered
      radius={15}
      size={440}
      padding={35}
    >
      <Stack align="center" gap="md">
        {/* Close Button Top Right */}
        <Box style={{ position: 'absolute', top: 20, right: 20 }}>
          <ActionIcon variant="transparent" color="gray" onClick={handleClose}>
            <X width={24} height={24} />
          </ActionIcon>
        </Box>

        {/* Dynamic Icon Header */}
        <Box
          bg={verified ? "var(--mantine-color-green-light)" : "var(--mantine-color-orange-light)"}
          style={{
            borderRadius: '50%',
            width: rem(80),
            height: rem(80),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {verified ? (
            <Check width={40} height={40} color="var(--mantine-color-green-6)" />
          ) : (
            <Envelope width={40} height={40} color={ORANGE} strokeWidth={1} />
          )}
        </Box>

        <Title order={3} fw={700} ta="center">
          {verified ? 'Verification Successful' : title}
        </Title>

        {sending ? (
          <Text size="sm" c="dimmed" ta="center">Sending verification code...</Text>
        ) : verified ? (
          <Text ta="center" c="dimmed" fz="sm">
            {subtitle ?? 'Your identity has been successfully verified. You may now continue.'}
          </Text>
        ) : (
          <Text ta="center" c="dimmed" fz="sm">
            A 6-digit verification code has been sent to{' '}
            <Text component="span" fw={700} c="var(--mantine-color-text)">
              {maskEmail(email)}
            </Text>
          </Text>
        )}

        {!verified && !sending && (
          <>
            <PinInput
              length={6}
              size="md"
              type="number"
              value={code}
              onChange={setCode}
              disabled={loading}
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

            <Text fz="xs" c="dimmed">
              Code expires in{' '}
              <Text span c={countdown > 0 ? 'red' : 'dimmed'} fw={600}>
                {formatClock(countdown)}
              </Text>
            </Text>

            <Text fz="sm" c="dimmed">
              Didn't receive the code?{' '}
              <Anchor
                component="button"
                c={resendTimer > 0 ? 'dimmed' : ORANGE}
                fw={600}
                disabled={resendTimer > 0}
                onClick={handleResend}
              >
                Resend code {resendTimer > 0 && `(${resendTimer}s)`}
              </Anchor>
            </Text>

            <Divider w="100%" my="xs" color="var(--mantine-color-default-border)" />

            <Alert
              variant="light"
              color={error ? 'red' : 'orange'}
              radius="md"
              w="100%"
              icon={error ? <AlertCircle width={20} /> : <InfoCircle width={20} />}
              styles={{
                message: { fontSize: rem(13), lineHeight: 1.4 },
              }}
            >
              {error || 'Please check your inbox and spam folder for the verification code.'}
            </Alert>
          </>
        )}

        <Group w="100%" gap="sm" grow>
          {!verified && (
            <Button
              variant="subtle"
              h={54}
              radius="md"
              color="gray"
              fw={600}
              onClick={handleClose}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
          )}

          <Button
            h={54}
            radius="md"
            color={ORANGE}
            loading={loading}
            onClick={verified ? onVerified : handleVerify}
            disabled={!verified && countdown <= 0}
            style={{ fontSize: rem(16), fontWeight: 700 }}
          >
            {verified ? 'Continue' : verifyLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}