import { useState, useEffect, useRef } from 'react';
import {
  Modal, Stack, Text, Button, Group, Divider, PinInput, Alert, Center, Image, Box, rem,
} from '@mantine/core';
import { Info, Mail } from 'lucide-react';

const ORANGE = '#FF6B00';
const CODE_TTL_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 55;

export interface VerificationCodeModalProps {
  opened: boolean;
  onClose: () => void;
  /** Called when the code is successfully verified. */
  onVerified: () => void;
  /** Masked or partial email to display in the modal. */
  email: string;
  /** Called when the modal opens to send the code. Must resolve when sent. */
  onSendCode: () => Promise<void>;
  /** Called to verify the entered code. Must reject on failure. */
  onVerify: (code: string) => Promise<void>;
  /** Modal title. Defaults to "Verification Code Sent". */
  title?: string;
  /** Instruction text below the title. */
  subtitle?: string;
  /** Button label on the verify step. Defaults to "Continue". */
  verifyLabel?: string;
}

/**
 * Reusable verification-code modal — shared by 2FA, email change, and any
 * future flow that needs a 6-digit-code entry step inside a modal.
 *
 * Lifecycle:
 * 1. Modal opens → onSendCode() fires → "sending" state
 * 2. Code sent → PinInput + countdown + resend
 * 3. User enters code → onVerify(code) fires
 * 4. onVerify resolves → onVerified() called
 */
export default function VerificationCodeModal({
  opened,
  onClose,
  onVerified,
  email,
  onSendCode,
  onVerify,
  title = 'Verification Code Sent',
  subtitle,
  verifyLabel = 'Continue',
}: VerificationCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(CODE_TTL_SECONDS);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatClock = (totalSeconds: number) => {
    const m = Math.floor(Math.max(totalSeconds, 0) / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.max(totalSeconds, 0) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maskedEmail = (value: string) => {
    if (!value) return '';
    const [name, domain] = value.split('@');
    if (!domain) return value;
    return `${name.substring(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(CODE_TTL_SECONDS);
    setResendTimer(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // Auto-send code when modal opens
  useEffect(() => {
    if (!opened) return;

    // Reset state
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
      setError('Enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await onVerify(code);
      setVerified(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (countdown <= 0) {
        setError('This verification code has expired. Request a new code to continue.');
      } else {
        setError('The verification code is invalid. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on close
  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const handleVerifiedDone = () => {
    onVerified();
    handleClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={verified ? 'Verification Successful' : title}
      centered
      radius={16}
      size={480}
      overlayProps={{ blur: 4, opacity: 0.4 }}
    >
      {/* Verified success state */}
      {verified ? (
        <Stack align="center" gap="md">
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
          <Text ta="center" fw={700} fz="sm">
            Verification successful. You may now continue.
          </Text>
          <Text ta="center" c="dimmed" fz="sm">
            {subtitle ?? 'Your identity has been verified.'}
          </Text>
          <Button
            fullWidth
            h={54}
            radius="md"
            color={ORANGE}
            style={{ fontSize: rem(16), fontWeight: 700 }}
            onClick={handleVerifiedDone}
          >
            {verifyLabel}
          </Button>
        </Stack>
      ) : (
        <Stack align="center" gap="md">
          {/* Sending state */}
          {sending ? (
            <Text size="sm" c="dimmed" ta="center">
              Sending verification code to {maskedEmail(email)}...
            </Text>
          ) : (
            <>
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

              <Text ta="center" fw={700} fz="sm">
                A 6-digit verification code has been sent to{' '}
                {maskedEmail(email)}
              </Text>

              <Text ta="center" c="dimmed" fz="xs">
                Please check your inbox and spam folder for the verification code.
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
                value={code}
                onChange={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
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
                <Text span c={countdown > 0 ? 'red' : 'dimmed'} fw={600}>
                  {formatClock(countdown)}
                </Text>
              </Text>

              <Text fz="sm" c="dimmed" mt="sm">
                Didn't receive the code?{' '}
                <Text
                  component="button"
                  c={resendTimer > 0 ? 'dimmed' : ORANGE}
                  fw={700}
                  disabled={resendTimer > 0}
                  onClick={handleResend}
                  style={{ background: 'none', border: 'none', cursor: resendTimer > 0 ? 'default' : 'pointer', padding: 0 }}
                >
                  Resend code {resendTimer > 0 && `(${resendTimer}s)`}
                </Text>
              </Text>

              <Divider w="100%" my="lg" color="#EEEEEE" />

              <Group justify="flex-end" w="100%">
                <Button variant="default" onClick={handleClose}>
                  Back to Login
                </Button>
                <Button
                  color={ORANGE}
                  loading={loading}
                  onClick={handleVerify}
                  disabled={countdown <= 0}
                >
                  {verifyLabel}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      )}
    </Modal>
  );
}
