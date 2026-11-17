import { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Modal, Stack, Text, ThemeIcon, rem } from '@mantine/core';
import { Check, Envelope } from '@boxicons/react';

import { VerificationCodeForm } from './verification/VerificationCodeForm';
import { VerificationCodeSending } from './verification/VerificationCodeSending';
import { VerificationCodeSuccess } from './verification/VerificationCodeSuccess';
import {
  CODE_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  maskEmail,
} from './verification/verificationMeta';

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
  /**
   * The code was already sent before the modal opened (the login endpoint
   * sends it), so opening must not request another one.
   */
  codeSentOnOpen?: boolean;
  /** Hide the resend control when the app cannot send another code. */
  resendable?: boolean;
}

/**
 * Owns the code request, the countdown and the verification call. The sheet is
 * one centered column — icon disc, heading, the address, the slots, the action
 * and a quiet way back — so it reads the same on a desktop window and a phone.
 */
export default function VerificationCodeModal({
  opened,
  onClose,
  onVerified,
  email,
  onSendCode,
  onVerify,
  title = 'Verify email address',
  subtitle,
  verifyLabel = 'Continue',
  cancelLabel = 'Cancel',
  autoRedirectMs = 0,
  codeSentOnOpen = false,
  resendable = true,
}: VerificationCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(!codeSentOnOpen);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(CODE_TTL_SECONDS);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  /* Auto-redirect to the next step after successful verification. */
  useEffect(() => {
    if (!verified || autoRedirectMs <= 0) return;
    const id = setTimeout(() => onVerifiedRef.current(), autoRedirectMs);
    redirectTimerRef.current = id;
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [verified, autoRedirectMs]);

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
    setResending(false);
    setVerified(false);

    if (codeSentOnOpen) {
      /* The code is already in the inbox: just run its clock. */
      setSending(false);
      startCountdown();
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    setSending(true);
    (async () => {
      try {
        await onSendCode();
        startCountdown();
      } catch {
        setError('We could not send the verification code. Please try again.');
        /* Nothing is in the inbox yet: no clock to run, and no cooldown to
           wait out before the person retries. */
        setCountdown(0);
        setResendTimer(0);
      } finally {
        setSending(false);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // The code is requested once per open, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      await onSendCode();
      setCode('');
      startCountdown();
    } catch {
      setError('We could not send a new code. Please try again.');
      setResendTimer(0);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (!code || code.length < 6) {
      setError('Enter the 6-digit verification code.');
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
    if (loading) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    onClose();
  };

  const maskedEmail = maskEmail(email);
  const heading = verified ? 'Verification successful' : sending ? 'Sending your code' : title;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      size="md"
      radius="lg"
      padding={0}
      withCloseButton={false}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      aria-label={heading}
      zIndex={1100}
      yOffset="1rem"
      xOffset="0.75rem"
      overlayProps={{ color: '#000', backgroundOpacity: 0.72 }}
      styles={{
        content: {
          overflow: 'hidden',
          maxWidth: `min(${rem(440)}, calc(100vw - 1.5rem))`,
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Stack align="center" gap={0} p={{ base: 'lg', sm: 'xl' }}>
        <ThemeIcon size={96} radius="50%" variant="light" color="orange">
          {verified ? (
            <Check width={42} height={42} color="var(--mantine-color-orange-6)" />
          ) : (
            <Envelope width={42} height={42} color="var(--mantine-color-orange-6)" />
          )}
        </ThemeIcon>

        <Text component="h2" fz={{ base: rem(22), sm: rem(26) }} fw={700} ta="center" lh={1.25} mt="lg">
          {heading}
        </Text>

        {sending || !verified ? (
          <Stack gap={2} align="center" mt={10}>
            <Text fz={rem(14)} c="dimmed" ta="center" lh={1.6}>
              {sending
                ? 'Sending a 6-digit verification code to'
                : 'A 6-digit verification code has been sent to'}
            </Text>
            <Text fz={rem(14)} fw={700} ta="center" lh={1.6} c="var(--mantine-color-text)">
              {maskedEmail}
            </Text>
          </Stack>
        ) : null}

        <Box w="100%" mt="lg">
          {sending ? (
            <VerificationCodeSending />
          ) : verified ? (
            <VerificationCodeSuccess message={subtitle} />
          ) : (
            <VerificationCodeForm
              code={code}
              onCodeChange={setCode}
              error={error}
              verifying={loading}
              resending={resending}
              countdown={countdown}
              resendTimer={resendTimer}
              onResend={handleResend}
              resendable={resendable}
            />
          )}
        </Box>

        <Group grow gap="sm" mt="xl" w="100%" wrap="nowrap">
          <Button
            variant="default"
            h={48}
            radius="md"
            fw={600}
            onClick={handleClose}
            disabled={loading}
            styles={{
              root: {
                borderColor: 'var(--mantine-color-default-border)',
                color: 'var(--mantine-color-text)',
                fontSize: rem(15),
              },
            }}
          >
            {cancelLabel}
          </Button>

          <Button
            h={48}
            radius="md"
            color="orange"
            fw={700}
            style={{ fontSize: rem(16) }}
            loading={loading}
            disabled={!verified && (sending || countdown <= 0 || code.length < 6)}
            onClick={verified ? onVerified : handleVerify}
          >
            {verified ? 'Continue' : verifyLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
