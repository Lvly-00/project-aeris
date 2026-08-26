import { useState } from 'react';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Text, Group, Divider,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SuccessModal from '../status/SuccessModal';

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ opened, onClose }: ChangePasswordModalProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successOpened, setSuccessOpened] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!currentPassword) {
      setErrors({ current_password: 'Current password is required.' });
      return;
    }
    if (!newPassword) {
      setErrors({ new_password: 'New password is required.' });
      return;
    }
    if (newPassword.length < 8) {
      setErrors({ new_password: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirm_password: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      handleClose();
      setSuccessOpened(true);
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        const fieldErrors: Record<string, string> = {};
        if (data.current_password) fieldErrors.current_password = Array.isArray(data.current_password) ? data.current_password[0] : data.current_password;
        if (data.new_password) fieldErrors.new_password = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
        if (data.confirm_password) fieldErrors.confirm_password = Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password;
        if (data.non_field_errors) fieldErrors.current_password = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        if (Object.keys(fieldErrors).length === 0) {
          fieldErrors.current_password = 'Unable to update your profile. Please try again.';
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ current_password: 'Unable to update your profile. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = async () => {
    setSuccessOpened(false);
    await logout();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Change Password"
        centered
        radius={16}
        size={480}
        overlayProps={{ blur: 4, opacity: 0.4 }}
      >
        <Stack gap="md">
          <TextInput
            label="Current Password"
            placeholder="Enter your current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
            error={errors.current_password}
            required
          />

          <TextInput
            label="New Password"
            placeholder="Enter a new password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            error={errors.new_password}
            required
          />

          <TextInput
            label="Confirm New Password"
            placeholder="Re-enter your new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            error={errors.confirm_password}
            required
          />

          <Divider />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button color="orange" loading={loading} onClick={handleSubmit}>
              Update Password
            </Button>
          </Group>
        </Stack>
      </Modal>

      <SuccessModal
        opened={successOpened}
        onClose={handleSuccessClose}
        onAction={handleSuccessClose}
        title="Change Password"
        subtitle="Successfully!"
        message="Your password has been changed. You will be logged out for security."
        actionLabel="Back to Log In"
      />
    </>
  );
}
