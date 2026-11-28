import { Alert, Anchor, Box, Divider, Group, PinInput, Stack, Text, rem } from '@mantine/core';
import { AlertCircle, InfoCircle } from '@boxicons/react';

import { formatClock } from './verificationMeta';
import { useModalAccent } from '../modals/modalTheme';

interface VerificationCodeFormProps {
  code: string;
  onCodeChange: (value: string) => void;
  error: string;
  /** A verification request is in flight. */
  verifying: boolean;
  /** A new code is being requested. */
  resending: boolean;
  countdown: number;
  resendTimer: number;
  onResend: () => void;
  /** Login flows cannot resend without the password again. */
  resendable: boolean;
}

/**
 * The code entry itself: six slots, the expiry clock, the resend line, and the
 * hint band — everything a person needs while waiting on an email, and nothing
 * else competing with the action below it.
 */
export function VerificationCodeForm({
  code,
  onCodeChange,
  error,
  verifying,
  resending,
  countdown,
  resendTimer,
  onResend,
  resendable,
}: VerificationCodeFormProps) {
  const { isDark, accent } = useModalAccent();
  const expired = countdown <= 0;
  const waiting = resendTimer > 0;
  /* Urgency reads red in both schemes; dark mode needs the lighter step. */
  const timerColor = isDark ? 'var(--mantine-color-red-4)' : 'var(--mantine-color-red-6)';

  return (
    <Stack gap="md" align="center">
      <PinInput
        length={6}
        type="number"
        oneTimeCode
        placeholder=""
        gap={rem(8)}
        value={code}
        onChange={onCodeChange}
        disabled={verifying}
        aria-label="Six-digit verification code"
        aria-describedby="verification-help"
        styles={{
          root: { width: '100%', justifyContent: 'center' },
          /* Each slot is a wrapper around its input, so the fluid sizing sits
             here: six digits must fit a 320px phone without clipping. */
          pinInput: {
            flex: '1 1 0',
            minWidth: 0,
            width: 'auto',
            maxWidth: rem(54),
          },
          input: {
            width: '100%',
            height: rem(54),
            fontSize: rem(20),
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            borderRadius: rem(12),
            borderColor: expired ? 'var(--mantine-color-default-border)' : undefined,
            backgroundColor: expired ? 'var(--mantine-color-default)' : undefined,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            '&:focus': {
              borderColor: accent,
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--mantine-color-orange-6) 22%, transparent)',
            },
          },
        }}
      />

      <Text fz={rem(13)} c="dimmed" ta="center" lh={1.45}>
        {expired ? (
          'This code has expired'
        ) : (
          <>
            Code expires in{' '}
            <Text
              component="span"
              fz={rem(13)}
              fw={700}
              c={timerColor}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatClock(countdown)}
            </Text>
          </>
        )}
      </Text>

      {resendable && (
        <Group gap={4} justify="center" wrap="wrap">
          <Text fz={rem(13)} c="dimmed" ta="center">
            Didn&rsquo;t receive the code?
          </Text>

          <Anchor
            component="button"
            type="button"
            onClick={onResend}
            disabled={waiting || verifying}
            underline="never"
            fz={rem(13)}
            fw={700}
            c="var(--mantine-color-text)"
            aria-label={
              waiting
                ? `Resend code available in ${resendTimer} seconds`
                : 'Resend verification code'
            }
            style={{
              padding: 0,
              border: 0,
              background: 'none',
              font: 'inherit',
              opacity: waiting || verifying ? 0.55 : 1,
              cursor: waiting || verifying ? 'not-allowed' : 'pointer',
            }}
          >
            {resending ? 'Sending…' : waiting ? `Resend code (${resendTimer}s)` : 'Resend code'}
          </Anchor>
        </Group>
      )}

      <Divider w="100%" color="var(--mantine-color-default-border)" />

      {error ? (
        <Alert
          id="verification-help"
          variant="light"
          color="red"
          radius="md"
          w="100%"
          icon={<AlertCircle width={18} height={18} />}
          aria-live="polite"
          styles={{ message: { fontSize: rem(13), lineHeight: 1.5 } }}
        >
          {error}
        </Alert>
      ) : (
        <Box
          id="verification-help"
          w="100%"
          role="note"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: rem(10),
            padding: `${rem(14)} ${rem(16)}`,
            borderRadius: rem(10),
            backgroundColor: 'var(--mantine-color-orange-light)',
          }}
        >
          <InfoCircle
            width={18}
            height={18}
            aria-hidden
            color={accent}
            style={{ flexShrink: 0, marginTop: rem(1) }}
          />
          <Text fz={rem(13)} lh={1.55} c="var(--mantine-color-text)">
            Please check your inbox and spam folder for the verification code.
          </Text>
        </Box>
      )}
    </Stack>
  );
}
