import { Box, PasswordInput, Stack } from '@mantine/core';
import { Lock } from '@boxicons/react';

import PasswordRequirements from '../../PasswordRequirements';
import { ModalFieldLabel } from '../../modals/ModalFieldLabel';
import { useModalAccent } from '../../modals/modalTheme';

interface ChangePasswordFieldsProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  errors: Record<string, string>;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

/**
 * One column, three fields: at phone width a two-column password row squeezes
 * both inputs until the labels wrap, so the fields stack and stay readable.
 */
export function ChangePasswordFields({
  currentPassword,
  newPassword,
  confirmPassword,
  errors,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
}: ChangePasswordFieldsProps) {
  const { accent } = useModalAccent();

  return (
    <Stack gap="md">
      <PasswordInput
        label={<ModalFieldLabel required>Current password</ModalFieldLabel>}
        placeholder="Enter your current password"
        value={currentPassword}
        onChange={(event) => onCurrentPasswordChange(event.currentTarget.value)}
        error={errors.current_password}
        radius="md"
        size="md"
        autoComplete="current-password"
        leftSection={<Lock width={17} height={17} color={accent} />}
      />

      <Box>
        <PasswordInput
          label={<ModalFieldLabel required>New password</ModalFieldLabel>}
          placeholder="Enter a new password"
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.currentTarget.value)}
          error={errors.new_password}
          radius="md"
          size="md"
          autoComplete="new-password"
          leftSection={<Lock width={17} height={17} color={accent} />}
        />

        <Box mt="xs">
          <PasswordRequirements password={newPassword} />
        </Box>
      </Box>

      <PasswordInput
        label={<ModalFieldLabel required>Confirm new password</ModalFieldLabel>}
        placeholder="Re-enter your new password"
        value={confirmPassword}
        onChange={(event) => onConfirmPasswordChange(event.currentTarget.value)}
        error={errors.confirm_password}
        radius="md"
        size="md"
        autoComplete="new-password"
        leftSection={<Lock width={17} height={17} color={accent} />}
      />
    </Stack>
  );
}
