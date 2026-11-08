import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Envelope } from '@boxicons/react';

import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SuccessModal from '../status/SuccessModal';
import VerificationCodeModal from '../VerificationCodeModal';
import { AppModal } from '../modals/AppModal';
import { ModalHeader } from '../modals/ModalHeader';
import { ModalFooter } from '../modals/ModalFooter';
import { ChangeEmailFields } from './changeEmail/ChangeEmailFields';

interface ChangeEmailModalProps {
  opened: boolean;
  onClose: () => void;
  currentEmail: string;
  onEmailChanged?: () => void;
}

/**
 * Two steps in one flow: verify the current inbox, then collect the new
 * address. The form lives in ./changeEmail, the code step is shared.
 */
export default function ChangeEmailModal({
  opened,
  onClose,
  currentEmail,
  onEmailChanged,
}: ChangeEmailModalProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [verified, setVerified] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successOpened, setSuccessOpened] = useState(false);

  useEffect(() => {
    if (opened) {
      setVerified(false);
      setNewEmail('');
      setPassword('');
      setErrors({});
      setSuccessOpened(false);
    }
  }, [opened]);

  const handleClose = () => {
    setVerified(false);
    setNewEmail('');
    setPassword('');
    setErrors({});
    onClose();
  };

  const handleConfirm = async () => {
    setErrors({});
    if (!newEmail) {
      setErrors({ new_email: 'New email address is required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setErrors({ new_email: 'Enter a valid email address.' });
      return;
    }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setErrors({ new_email: 'New email must be different.' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Current password is required.' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.confirmEmailChange(newEmail, password);
      handleClose();
      setSuccessOpened(true);
      onEmailChanged?.();
      setTimeout(() => {
        logout();
        navigate('/pwa/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.new_email) {
        setErrors({
          new_email: Array.isArray(data.new_email) ? data.new_email[0] : data.new_email,
        });
      } else if (data?.password) {
        setErrors({
          password: Array.isArray(data.password) ? data.password[0] : data.password,
        });
      } else {
        setErrors({ new_email: data?.detail || 'Unable to update email.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <VerificationCodeModal
        opened={opened && !verified}
        onClose={handleClose}
        onVerified={() => setVerified(true)}
        email={currentEmail}
        title="Verify your email"
        subtitle="Code confirmed. Enter your new email address next."
        verifyLabel="Continue"
        cancelLabel="Cancel"
        autoRedirectMs={3000}
        onSendCode={async () => {
          await authAPI.initiateEmailChange();
        }}
        onVerify={async (code) => {
          await authAPI.verifyEmailChange(code);
        }}
      />

      <AppModal
        opened={opened && verified}
        onClose={handleClose}
        size="md"
        label="Update your email"
        header={
          <ModalHeader
            title="Update your email"
            description="Enter the new address and confirm it with your password."
            icon={<Envelope width={20} height={20} />}
            onClose={handleClose}
          />
        }
        footer={
          <ModalFooter
            onCancel={handleClose}
            cancelDisabled={loading}
            confirmLabel="Update email"
            confirmLoading={loading}
            onConfirm={handleConfirm}
          />
        }
      >
        <ChangeEmailFields
          newEmail={newEmail}
          password={password}
          errors={errors}
          onNewEmailChange={setNewEmail}
          onPasswordChange={setPassword}
        />
      </AppModal>

      <SuccessModal
        opened={successOpened}
        onClose={() => setSuccessOpened(false)}
        onAction={() => setSuccessOpened(false)}
        title="Email change"
        subtitle="Email updated"
        message="Your email address has been updated. Sign in again with the new address."
        actionLabel="Continue"
      />
    </>
  );
}
