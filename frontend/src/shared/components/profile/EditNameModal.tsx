import { useState, useEffect } from 'react';
import {
  Modal, Stack, TextInput, Button, Group, Text, Box, Title, ActionIcon, Divider
} from '@mantine/core';
import { Lock, User, X } from '@boxicons/react';

import { authAPI } from '../../services/api';

const ORANGE = '#FF6B00';

interface EditNameModalProps {
  opened: boolean;
  onClose: () => void;
  user: { first_name: string; last_name: string };
  onUpdated?: (updatedUser: any) => void;
}

export default function EditNameModal({
  opened,
  onClose,
  user,
  onUpdated,
}: EditNameModalProps) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setErrors({});
    }
  }, [opened, user.first_name, user.last_name]);

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
      withCloseButton={false} // Custom close button in header
      centered
      radius="lg"
      size="md"
      padding="xl"
    >
      {/* Custom Header Section */}

      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
          <Box
            bg={ORANGE}
            p={10}
            style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <User width={28} height={28} style={{ color: 'white', display: 'block' }} />
          </Box>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>Edit Name</Title>
            <Text c="dimmed" fz="sm" fw={400} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              Enter a new first name and last name.
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
          <X width={24} height={24} />
        </ActionIcon>
      </Group>
      <Divider my="lg" />

      <Stack gap="lg">
        <TextInput
          label={
            <Text size="sm" fw={700} mb={5}>
              First Name <span style={{ color: 'red' }}>*</span>
            </Text>
          }
          placeholder="Enter first name"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
          error={errors.first_name}
          radius="md"
          size="md"
          leftSection={<User width={18} height={18} style={{ color: '#888' }} />}
          styles={{ input: { border: '1.5px solid #E0E0E0' } }}
        />

        <TextInput
          label={
            <Text size="sm" fw={700} mb={5}>
              Last Name <span style={{ color: 'red' }}>*</span>
            </Text>
          }
          placeholder="Enter last name"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
          error={errors.last_name}
          radius="md"
          size="md"
          leftSection={<User width={18} height={18} style={{ color: '#888' }} />}
          styles={{ input: { border: '1.5px solid #E0E0E0' } }}
        />

        {/* Footer Actions */}
        <Group grow mt="lg">
          <Button
            variant="outline"
            color="gray"
            radius="md"
            size="md"
            h={48}
            onClick={handleClose}
            styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333' } }}
          >
            Cancel
          </Button>
          <Button
            bg="#FF5722"
            radius="md"
            size="md"
            h={48}
            onClick={handleSubmit}
            loading={loading}
            styles={{ root: { backgroundColor: '#FF5722' } }}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}