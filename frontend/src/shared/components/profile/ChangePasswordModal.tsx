import { useState } from 'react';
import { Lock } from '@boxicons/react';

import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { validatePassword } from '../../utils/password';
import SuccessModal from '../status/SuccessModal';
import { AppModal } from '../modals/AppModal';
import { ModalHeader } from '../modals/ModalHeader';
import { ModalFooter } from '../modals/ModalFooter';
import { ChangePasswordFields } from './changePassword/ChangePasswordFields';

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
}

/** Validates and submits the password change; the fields live in ./changePassword. */
export default function ChangePasswordModal({ opened, onClose }: ChangePasswordModalProps) {
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
        if (data.current_password) {
          fieldErrors.current_password = Array.isArray(data.current_password)
            ? data.current_password[0]
            : data.current_password;
        }
        if (data.new_password) {
          fieldErrors.new_password = Array.isArray(data.new_password)
            ? data.new_password[0]
            : data.new_password;
        }
        if (data.confirm_password) {
          fieldErrors.confirm_password = Array.isArray(data.confirm_password)
            ? data.confirm_password[0]
            : data.confirm_password;
        }
        if (data.non_field_errors) {
          fieldErrors.current_password = Array.isArray(data.non_field_errors)
            ? data.non_field_errors[0]
            : data.non_field_errors;
        }
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
      <AppModal
        opened={opened}
        onClose={handleClose}
        size="md"
        label="Update your password"
        header={
          <ModalHeader
            title="Update your password"
            description="Enter your current password, then choose a new one."
            icon={<Lock width={20} height={20} />}
            onClose={handleClose}
          />
        }
        footer={
          <ModalFooter
            onCancel={handleClose}
            cancelDisabled={loading}
            confirmLabel="Update password"
            confirmLoading={loading}
            onConfirm={handleSubmit}
          />
        }
      >
        <ChangePasswordFields
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          errors={errors}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
        />
      </AppModal>

      <SuccessModal
        opened={successOpened}
        onClose={handleSuccessClose}
        onAction={handleSuccessClose}
        title="Change password"
        subtitle="Password updated"
        message="Your password has been changed. You will be logged out for security."
        actionLabel="Back to log in"
      />
    </>
  );
}
