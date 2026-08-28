import { useState } from 'react';
import {
  Modal, Stack, PasswordInput, Button, Text, Group, Box, Title, ActionIcon, Divider
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SuccessModal from '../status/SuccessModal';
import { Envelope, X, Lock } from '@boxicons/react';
import PasswordRequirements from '../PasswordRequirements';
import { validatePassword } from '../../utils/password';


const ORANGE = '#FF5722';

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
    if (currentPassword === newPassword) {
      setErrors({ new_password: 'New password must be different from current password.' });
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrors({ new_password: passwordError });
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
        withCloseButton={false} // Use custom header close button
        centered
        radius="lg"
        size="md"
        padding="xl"
      >
        {/* Custom Header Section */}
        <Group
          justify="space-between"
          align="flex-start"
          mb="lg"
          wrap="nowrap"
        >
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              bg={ORANGE}
              p={10}
              style={{
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Envelope width={28} height={28} style={{ color: 'white' }} />
            </Box>

            <Box style={{ minWidth: 0, flex: 1 }}>
              <Title
                order={3}
                fw={700}
                style={{
                  overflowWrap: 'break-word',
                }}
              >
                Update your password
              </Title>

              <Text
                fz="sm"
                c="dimmed"
                style={{
                  overflowWrap: 'break-word',
                }}
              >
                Enter your current password and new password.
              </Text>
            </Box>
          </Box>

          <ActionIcon
            variant="transparent"
            color="gray"
            onClick={handleClose}
            style={{
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            <X width={24} height={24} />
          </ActionIcon>
        </Group>


        <Divider my="lg" />

        <Stack gap="lg">
          <PasswordInput
            label={
              <Text size="sm" fw={600} mb={5}>
                Current Password <span style={{ color: 'red' }}>*</span>
              </Text>
            }
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
            error={errors.current_password}
            radius="md"
            size="md"
            leftSection={<Lock width={18} height={18} style={{ color: '#888' }} />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <PasswordInput
            label={
              <Text size="sm" fw={600} mb={5}>
                New Password <span style={{ color: 'red' }}>*</span>
              </Text>
            }
            placeholder="Enter a new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            error={errors.new_password}
            radius="md"
            size="md"
            leftSection={<Lock width={18} height={18} style={{ color: '#888' }} />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <PasswordRequirements password={newPassword} />

          <PasswordInput
            label={
              <Text size="sm" fw={600} mb={5}>
                Confirm New Password <span style={{ color: 'red' }}>*</span>
              </Text>
            }
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            error={errors.confirm_password}
            radius="md"
            size="md"
            leftSection={<Lock width={18} height={18} style={{ color: '#888' }} />}
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
              bg={ORANGE}
              radius="md"
              size="md"
              h={48}
              onClick={handleSubmit}
              loading={loading}
              styles={{ root: { backgroundColor: ORANGE } }}
            >
              Update Password
            </Button>
          </Group>
        </Stack>
      </Modal >

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