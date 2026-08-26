import { useState } from 'react';
import {
  Modal, Stack, TextInput, Button, Group, Divider, Text,
} from '@mantine/core';
import { authAPI } from '../../services/api';

interface EditProfileModalProps {
  opened: boolean;
  onClose: () => void;
  user: { first_name: string; last_name: string };
  onUpdated?: (updatedUser: any) => void;
}

export default function EditProfileModal({
  opened,
  onClose,
  user,
  onUpdated,
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!firstName.trim()) {
      setErrors({ first_name: 'This field is required.' });
      return;
    }
    if (!lastName.trim()) {
      setErrors({ last_name: 'This field is required.' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      onUpdated?.(res.data);
      handleClose();
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        const fieldErrors: Record<string, string> = {};
        if (data.first_name) fieldErrors.first_name = Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
        if (data.last_name) fieldErrors.last_name = Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
        if (Object.keys(fieldErrors).length === 0) {
          fieldErrors.first_name = 'Unable to update your profile. Please try again.';
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ first_name: 'Unable to update your profile. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Edit Profile"
      centered
      radius={16}
      size={480}
      overlayProps={{ blur: 4, opacity: 0.4 }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Update your name. Role and account status cannot be changed here.
        </Text>

        <TextInput
          label="First Name"
          placeholder="Enter first name"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
          error={errors.first_name}
          required
        />

        <TextInput
          label="Last Name"
          placeholder="Enter last name"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
          error={errors.last_name}
          required
        />

        <Divider />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="orange" loading={loading} onClick={handleSubmit}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
