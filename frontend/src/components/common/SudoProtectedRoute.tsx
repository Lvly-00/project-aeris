import { useState } from 'react';
import { Modal, PasswordInput, Button, Stack, Text, Group } from '@mantine/core';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export function SudoProtectedRoute({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [opened, setOpened] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.verifyPassword(password);
      setVerified(true);
      setOpened(false);
    } catch (err) {
      setError('Incorrect password. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  if (verified) return <>{children}</>;

  return (
    <Modal 
      opened={opened} 
      onClose={() => navigate(-1)} 
      title="Security Verification" 
      centered 
      closeOnClickOutside={false}
    >
      <Stack>
        <Text size="sm">Sensitive Area: Please re-enter your password to continue.</Text>
        <PasswordInput
          label="Confirm Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          error={error}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => navigate(-1)}>Cancel</Button>
          <Button color="orange" onClick={handleVerify} loading={loading}>Verify</Button>
        </Group>
      </Stack>
    </Modal>
  );
}