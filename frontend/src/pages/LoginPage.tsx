import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Box,
  Group,
  Checkbox,
  Anchor,
  Image,
  Center,
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { ShieldCheck, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      remember: false,
    },
    validate: {
      username: (v) => (!v ? 'Username is required' : null),
      password: (v) => (!v ? 'Password is required' : null),
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError('');
    try {
      await login(values.username, values.password);
      navigate('/cameras');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        height: '100vh',
        width: '100vw',
        // Update the URL below to your actual background image path
        backgroundImage: `url('/loginBG.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '10%', // Offset to the left like the image
      }}
    >
      <Paper
        radius={24}
        p={40}
        withBorder
        shadow="xl"
        style={{
          width: '100%',
          maxWidth: rem(480),
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
        }}
      >
        <Stack gap="xl">
          {/* LOGO AREA */}
          <Center flex={1} style={{ flexDirection: 'column' }}>
            <Image 
                src="/icon.png" // Update with your Aeris logo path
                alt="Aeris Logo" 
                w={180} 
                mb="md" 
            />
            <Text ta="center" c="dimmed" fz="sm" fw={500} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              Sign in to access the AI-Assisted Barangay CCTV Incident Monitoring & Decision Support System.
            </Text>
          </Center>

          {error && (
            <Alert icon={<Info size={16} />} color="red" variant="light" radius="md">
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                size="md"
                placeholder="Username / Email"
                radius="md"
                {...form.getInputProps('username')}
                styles={{ input: { height: rem(54) } }}
              />

              <PasswordInput
                size="md"
                placeholder="Password"
                radius="md"
                {...form.getInputProps('password')}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? <EyeOff size={18} /> : <Eye size={18} />
                }
                styles={{ input: { height: rem(54) } }}
              />

              <Group justify="space-between">
                <Checkbox 
                    label="Remember Me" 
                    size="xs" 
                    color="#FF6B00" 
                    {...form.getInputProps('remember', { type: 'checkbox' })}
                />
                <Anchor href="#" size="xs" fw={600} c="#FF6B00">
                  Forgot Password?
                </Anchor>
              </Group>

              <Button
                type="submit"
                fullWidth
                size="md"
                h={54}
                radius="md"
                mt="md"
                loading={loading}
                color="#FF6B00"
                style={{ fontSize: rem(16), fontWeight: 700 }}
              >
                Log In
              </Button>
            </Stack>
          </form>

          {/* SECURITY FOOTER */}
          <Box
            p="sm"
            style={{
              backgroundColor: '#FFF0E6',
              borderRadius: rem(12),
              border: '1px solid #FFE0CC',
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <ShieldCheck size={18} color="#FF6B00" />
              <Text fz={11} fw={500} c="#994400">
                Your information is encrypted and securely protected.
              </Text>
            </Group>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}