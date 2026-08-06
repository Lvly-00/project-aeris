import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Center,
  Group,
} from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { TriangleAlert, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (v: string) => (!v ? 'Username is required' : null),
      password: (v: string) => (!v ? 'Password is required' : null),
    },
  });

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await login(values.username, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors.join(', '));
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Center mb="lg">
        <Group gap="xs">
          <TriangleAlert size={40} color="#FF4444" />
          <div>
            <Title order={2} ta="center">
              Aeris
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Incident Detection & Decision Support System
            </Text>
          </div>
        </Group>
      </Center>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Text size="lg" fw={500} mb="md">
          Sign In
        </Text>

        {error && (
          <Alert variant="filled" color="red" title="Login Failed" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Username"
              placeholder="Enter your username"
              required
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              required
              {...form.getInputProps('password')}
            />
            <Button type="submit" fullWidth loading={loading} leftSection={<LogIn size={16} />}>
              Sign In
            </Button>
          </Stack>
        </form>
      </Paper>

      <Text c="dimmed" size="xs" ta="center" mt="md">
        Authorized personnel only. All access is monitored.
      </Text>
    </Container>
  );
}
