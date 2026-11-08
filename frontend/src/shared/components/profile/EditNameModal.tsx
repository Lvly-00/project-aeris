import { useEffect, useState } from 'react';
import { User } from '@boxicons/react';

import { authAPI } from '../../services/api';
import { AppModal } from '../modals/AppModal';
import { ModalHeader } from '../modals/ModalHeader';
import { ModalFooter } from '../modals/ModalFooter';
import { EditNameFields } from './editName/EditNameFields';

interface EditNameModalProps {
  opened: boolean;
  onClose: () => void;
  user: { first_name: string; last_name: string };
  onUpdated?: (updatedUser: any) => void;
}

/** Reads and saves the user's name; the fields live in ./editName. */
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
        if (data.first_name) {
          fieldErrors.first_name = Array.isArray(data.first_name)
            ? data.first_name[0]
            : data.first_name;
        }
        if (data.last_name) {
          fieldErrors.last_name = Array.isArray(data.last_name)
            ? data.last_name[0]
            : data.last_name;
        }
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
    <AppModal
      opened={opened}
      onClose={handleClose}
      size="md"
      label="Edit name"
      header={
        <ModalHeader
          title="Edit name"
          description="Update the name shown on your account."
          icon={<User width={20} height={20} />}
          onClose={handleClose}
        />
      }
      footer={
        <ModalFooter
          onCancel={handleClose}
          cancelDisabled={loading}
          confirmLabel="Save changes"
          confirmLoading={loading}
          onConfirm={handleSubmit}
        />
      }
    >
      <EditNameFields
        firstName={firstName}
        lastName={lastName}
        errors={errors}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
      />
    </AppModal>
  );
}
