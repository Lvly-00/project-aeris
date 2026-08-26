import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Text, Group, Divider, PinInput, Alert,
} from '@mantine/core';
import { Info } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SuccessModal from '../status/SuccessModal';

interface ChangeEmailModalProps {
  opened: boolean;
  onClose: () => void;
  currentEmail: string;
  onEmailChanged?: () => void;
}

export default function ChangeEmailModal({
  opened,
  onClose,
  currentEmail,
  onEmailChanged,
}: ChangeEmailModalProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [step, setStep] = useState<'sending' | 'verify' | 'details'>('sending');
  const [code, setCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successOpened, setSuccessOpened] = useState(false);

  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maskedEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(300);
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

  // Auto-send code when modal opens
  useEffect(() => {
    if (!opened) return;
    setStep('sending');
    setCode('');
    setNewEmail('');
    setPassword('');
    setErrors({});
    setSuccessOpened(false);

    (async () => {
      try {
        await authAPI.initiateEmailChange();
        setStep('verify');
        startCountdown();
      } catch {
        setErrors({ code: 'Failed to send verification code. Please try again.' });
        setStep('verify');
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [opened]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  // Step 2: verify code
  const handleVerify = async () => {
    setErrors({});
    if (!code || code.length !== 6) {
      setErrors({ code: 'Enter the 6-digit verification code.' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyEmailChange(code);
      if (timerRef.current) clearInterval(timerRef.current);
      setStep('details');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrors({ code: detail || 'Invalid or expired verification code.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: apply change
  const handleConfirm = async () => {
    setErrors({});

    if (!newEmail) {
      setErrors({ new_email: 'New email address is required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setErrors({ new_email: 'Enter a valid email address.' });
      return;
    }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setErrors({ new_email: 'New email must be different from current email.' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Current password is required.' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.confirmEmailChange(newEmail, password);
      handleClose();
      setSuccessOpened(true);
      onEmailChanged?.();
      // Force logout after email change — tokens are blacklisted server-side.
      setTimeout(() => {
        logout();
        navigate('/pwa/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.new_email) {
        setErrors({ new_email: Array.isArray(data.new_email) ? data.new_email[0] : data.new_email });
      } else if (data?.password) {
        setErrors({ password: Array.isArray(data.password) ? data.password[0] : data.password });
      } else {
        setErrors({ new_email: data?.detail || 'Unable to update email. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    sending: 'Change Email Address',
    verify: 'Verify Your Identity',
    details: 'Set New Email Address',
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={titles[step]}
        centered
        radius={16}
        size={480}
        overlayProps={{ blur: 4, opacity: 0.4 }}
      >
        {/* Step 1: sending (loading state while API call fires) */}
        {step === 'sending' && (
          <Stack gap="md" align="center" py="md">
            <Text size="sm" c="dimmed" ta="center">
              Sending verification code to {maskedEmail(currentEmail)}...
            </Text>
          </Stack>
        )}

        {/* Step 2: verify code */}
        {step === 'verify' && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              A 6-digit verification code has been sent to{' '}
              <Text span fw={700}>{maskedEmail(currentEmail)}</Text>.
              {countdown > 0 && (
                <Text component="span" fw={700} c="orange" ml={4}>
                  {formatTime(countdown)}
                </Text>
              )}
            </Text>

            <Group justify="center">
              <PinInput
                length={6}
                value={code}
                onChange={(val) => setCode(val.replace(/\D/g, '').slice(0, 6))}
                size="lg"
                type="number"
                error={!!errors.code}
              />
            </Group>
            {errors.code && (
              <Alert icon={<Info size={14} />} color="red" variant="light" radius="md">
                {errors.code}
              </Alert>
            )}

            <Divider />

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button color="orange" loading={loading} onClick={handleVerify} disabled={countdown === 0}>
                Verify Code
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 3: new email + password */}
        {step === 'details' && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Identity verified. Enter your new email address and current password to finalize the change.
            </Text>

            <TextInput
              label="New Email Address"
              placeholder="Enter your new email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.currentTarget.value)}
              error={errors.new_email}
              required
            />

            <PasswordInput
              label="Current Password"
              placeholder="Enter your current password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              error={errors.password}
              required
            />

            <Divider />

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button color="orange" loading={loading} onClick={handleConfirm}>
                Update Email
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <SuccessModal
        opened={successOpened}
        onClose={() => setSuccessOpened(false)}
        onAction={() => setSuccessOpened(false)}
        title="Email Change"
        subtitle="Successfully!"
        message="Your email address has been successfully updated."
      />
    </>
  );
}
