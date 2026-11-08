import { Stack, TextInput } from '@mantine/core';
import { User } from '@boxicons/react';

import { ModalFieldLabel } from '../../modals/ModalFieldLabel';
import { useModalAccent } from '../../modals/modalTheme';

interface EditNameFieldsProps {
  firstName: string;
  lastName: string;
  errors: Record<string, string>;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

/** The two fields of the name form, sharing one label and icon treatment. */
export function EditNameFields({
  firstName,
  lastName,
  errors,
  onFirstNameChange,
  onLastNameChange,
}: EditNameFieldsProps) {
  const { accent } = useModalAccent();

  return (
    <Stack gap="md">
      <TextInput
        label={<ModalFieldLabel required>First name</ModalFieldLabel>}
        placeholder="Enter first name"
        value={firstName}
        onChange={(event) => onFirstNameChange(event.currentTarget.value)}
        error={errors.first_name}
        radius="md"
        size="md"
        autoComplete="given-name"
        leftSection={<User width={17} height={17} color={accent} />}
      />

      <TextInput
        label={<ModalFieldLabel required>Last name</ModalFieldLabel>}
        placeholder="Enter last name"
        value={lastName}
        onChange={(event) => onLastNameChange(event.currentTarget.value)}
        error={errors.last_name}
        radius="md"
        size="md"
        autoComplete="family-name"
        leftSection={<User width={17} height={17} color={accent} />}
      />
    </Stack>
  );
}
