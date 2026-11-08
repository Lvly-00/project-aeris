import { PasswordInput, Stack, TextInput } from '@mantine/core';
import { Envelope, Lock } from '@boxicons/react';

import { ModalFieldLabel } from '../../modals/ModalFieldLabel';
import { useModalAccent } from '../../modals/modalTheme';

interface ChangeEmailFieldsProps {
  newEmail: string;
  password: string;
  errors: Record<string, string>;
  onNewEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

/** The new address and the password that authorises the change. */
export function ChangeEmailFields({
  newEmail,
  password,
  errors,
  onNewEmailChange,
  onPasswordChange,
}: ChangeEmailFieldsProps) {
  const { accent } = useModalAccent();

  return (
    <Stack gap="md">
      <TextInput
        label={<ModalFieldLabel required>New email address</ModalFieldLabel>}
        placeholder="name@example.com"
        value={newEmail}
        onChange={(event) => onNewEmailChange(event.currentTarget.value)}
        error={errors.new_email}
        radius="md"
        size="md"
        type="email"
        autoComplete="email"
        inputMode="email"
        leftSection={<Envelope width={17} height={17} color={accent} />}
      />

      <PasswordInput
        label={<ModalFieldLabel required>Current password</ModalFieldLabel>}
        placeholder="Enter your password to confirm"
        value={password}
        onChange={(event) => onPasswordChange(event.currentTarget.value)}
        error={errors.password}
        radius="md"
        size="md"
        autoComplete="current-password"
        leftSection={<Lock width={17} height={17} color={accent} />}
      />
    </Stack>
  );
}
