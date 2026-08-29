import { useEffect, useRef, useState } from 'react';
import { Box, Group, Text, Stack, Progress } from '@mantine/core';
import {
  getPasswordChecks, getPasswordStrength, PasswordStrength,
} from '../utils/password';

interface PasswordRequirementsProps {
  password: string;
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  Weak: 'red',
  Fair: 'yellow',
  Strong: 'green',
};

const HIDE_DELAY_MS = 3000;

/**
 * Live password-strength meter + requirement checklist (FR-PP-005).
 * Visible only while typing; hides 3s after the user stops.
 * Reused by password reset, change password, and account creation.
 */
export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!password) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [password]);

  if (!visible) return null;

  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(password);
  const met = checks.filter((c) => c.ok).length;
  const color = password ? STRENGTH_COLORS[strength] : 'gray';
  const barValue = password ? (met / checks.length) * 100 : 0;

  return (
    <Box w="100%">
      <Group justify="space-between" align="center" mb={4}>
        <Text fz={11} fw={600} c="dimmed">
          Password strength
        </Text>
        <Text fz={11} fw={700} c={color} tt="uppercase">
          {strength}
        </Text>
      </Group>

      <Progress value={barValue} color={color} size={5} radius="md" aria-label="Password strength" />

      <Stack gap={3} mt={8}>
        {checks.map((check) => (
          <Group key={check.label} gap={6} wrap="nowrap">
            <Text fz={11} fw={700} c={check.ok ? 'green' : 'red'} w={12} ta="center">
              {check.ok ? '✓' : '✕'}
            </Text>
            <Text fz={11} fw={500} c={check.ok ? 'var(--mantine-color-text)' : 'dimmed'}>
              {check.label}
            </Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}