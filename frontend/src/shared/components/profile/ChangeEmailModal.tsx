import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Text, Group, Box, Title, ActionIcon
} from '@mantine/core';
import { Envelope, X, Lock } from '@boxicons/react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import SuccessModal from '../status/SuccessModal';
import VerificationCodeModal from '../VerificationCodeModal';

const ORANGE = '#FF5722';

interface ChangeEmailModalProps {
  opened: boolean;
  onClose: () => void;
  currentEmail: string;
  onEmailChanged?: () => void;
}

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
    if (!newEmail) { setErrors({ new_email: 'New email address is required.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setErrors({ new_email: 'Enter a valid email address.' }); return; }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) { setErrors({ new_email: 'New email must be different.' }); return; }
    if (!password) { setErrors({ password: 'Current password is required.' }); return; }

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
      if (data?.new_email) setErrors({ new_email: Array.isArray(data.new_email) ? data.new_email[0] : data.new_email });
      else if (data?.password) setErrors({ password: Array.isArray(data.password) ? data.password[0] : data.password });
      else setErrors({ new_email: data?.detail || 'Unable to update email.' });
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
        title="Verify email address"
        subtitle="Input a new email address to continue."
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

      <Modal
        opened={opened && verified}
        onClose={handleClose}
        withCloseButton={false}
        centered
        radius="lg"
        size="md"
        padding="xl"
      >
        {/* Custom Header */}
        <Group
          justify="space-between"
          align="flex-start"
          mb="xl"
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
                Update your email
              </Title>

              <Text
                fz="sm"
                c="dimmed"
                style={{
                  overflowWrap: 'break-word',
                }}
              >
                Enter your new email address and current password.
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

        <hr style={{ border: '0.5px solid #eee', marginBottom: '25px' }} />

        <Stack gap="lg">
          <TextInput
            label={<Text size="sm" fw={600} mb={5}>New Email Address <span style={{ color: 'red' }}>*</span></Text>}
            placeholder="Enter new email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
            error={errors.new_email}
            radius="md" size="md"
            leftSection={<Envelope width={18} height={18} color="#888" />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <PasswordInput
            label={<Text size="sm" fw={600} mb={5}>Current Password <span style={{ color: 'red' }}>*</span></Text>}
            placeholder="Enter password to confirm"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            error={errors.password}
            radius="md" size="md"
            leftSection={<Lock width={18} height={18} color="#888" />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <Group grow mt="lg">
            <Button variant="outline"
              color="gray"
              radius="md"
              size="md"
              h={48}
              onClick={handleClose}
              styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333' } }}>
              Cancel
            </Button>
            <Button bg={ORANGE}
              radius="md"
              size="md"
              h={48}
              loading={loading}
              styles={{ root: { backgroundColor: ORANGE } }}
              onClick={handleConfirm}>
              Update Email
            </Button>
          </Group>
        </Stack>
      </Modal>

      <SuccessModal
        opened={successOpened}
        onClose={() => setSuccessOpened(false)}
        onAction={() => setSuccessOpened(false)}
        title="Email Change"
        subtitle="Successfully!"
        message="Your email address has been successfully updated."
      />
    </>
  );
}