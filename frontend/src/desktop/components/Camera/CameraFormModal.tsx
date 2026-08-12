import {
  Modal, Stack, TextInput, Select, Group, Button,
  Text, FileButton, Box, useMantineTheme
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { FolderOpen } from 'lucide-react';

interface CameraFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  initialValues?: any;
  loading?: boolean;
}

export function CameraFormModal({ opened, onClose, onSubmit, initialValues, loading }: CameraFormModalProps) {
  const theme = useMantineTheme();

  const form = useForm({
    initialValues: {
      name: '',
      rtsp_url: '',
      stream_type: 'RTSP',
      location_name: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Camera name is required' : null),
      rtsp_url: (value) => (value.length < 1 ? 'Source is required' : null),
    },
  });

  useEffect(() => {
    if (initialValues) {
      form.setValues(initialValues);
    } else {
      form.reset();
    }
  }, [initialValues, opened]);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      form.setFieldValue('rtsp_url', file.name);
    }
  };

  // Theme-aware styles for inputs
  const inputStyles = {
    label: {
      fontWeight: 700,
      marginBottom: 8,
      fontSize: '14px',
      color: 'var(--mantine-color-text)'
    },
    input: {
      borderRadius: '8px',
      height: '45px',
      fontSize: '14px',
      backgroundColor: 'var(--mantine-color-body)',
      borderColor: 'var(--mantine-color-default-border)'
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          {initialValues ? "Edit Camera" : "Add Camera"}
        </Text>
      }
      centered
      size="lg"
      padding="xl"
      radius="md"
      styles={{
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          marginBottom: '20px',
          paddingBottom: '15px'
        },
        content: {
          backgroundColor: 'var(--mantine-color-body)',
        }
      }}
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="lg">
          <TextInput
            label="Camera Name *"
            placeholder="Enter Camera Name"
            {...form.getInputProps('name')}
            styles={inputStyles}
          />

          <Box>
            <Text fw={700} size="sm" mb={8} c="var(--mantine-color-text)">
              Source URL / Path *
            </Text>

            {form.values.stream_type === 'MP4' && (
              <Text fw={600} c="dimmed" mb={4} size="xs">
                Local file path for testing
              </Text>
            )}

            <Group gap="xs" align="flex-start" wrap="nowrap">
              <TextInput
                placeholder={form.values.stream_type === 'MP4' ? "Select a file..." : "rtsp://..."}
                {...form.getInputProps('rtsp_url')}
                styles={{
                  root: { flex: 1 },
                  input: inputStyles.input
                }}
              />

              {form.values.stream_type === 'MP4' && (
                <FileButton onChange={handleFileSelect} accept="video/mp4">
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      color="gray"
                      style={{ height: '45px', borderColor: 'var(--mantine-color-default-border)' }}
                      leftSection={<FolderOpen size={18} />}
                    >
                      Locate File
                    </Button>
                  )}
                </FileButton>
              )}
            </Group>
          </Box>

          <Select
            label="Stream Type"
            placeholder="Select type"
            data={[
              { value: 'RTSP', label: 'RTSP Stream' },
              { value: 'HTTP', label: 'HTTP Stream' },
              { value: 'MP4', label: 'MP4 Video File (Testing)' },
              { value: 'EMBED', label: 'Embedded Web Page' }
            ]}
            {...form.getInputProps('stream_type')}
            styles={inputStyles}
          />

          <TextInput
            label="Location Name"
            placeholder="e.g., Barangay Hall Entrance"
            {...form.getInputProps('location_name')}
            styles={inputStyles}
          />

          <Group justify="flex-end" mt="xl" gap="md">
            <Button
              variant="subtle"
              color="gray"
              onClick={onClose}
              px="xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="orange"
              px="xl"
              loading={loading}
              fw={700}
            >
              {initialValues ? "Update Camera" : "Add Camera"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}