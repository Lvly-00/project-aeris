import {
  Modal, Stack, TextInput, Select, Group, Button,
  Text, FileButton, Box, Title, ActionIcon
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { Broadcast, Camera, FolderOpen, GlobeAlt, Video, X } from '@boxicons/react';

const ORANGE = '#FF6B00';
const SUBMIT = '#FF5722';

interface CameraFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  initialValues?: any;
  loading?: boolean;
}

export function CameraFormModal({ opened, onClose, onSubmit, initialValues, loading }: CameraFormModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      stream_url: '',
      stream_type: 'RTSP',
      location_name: '',
    },
    validate: {
      name: (value: string) => (value.length < 1 ? 'Camera name is required' : null),
      stream_url: (value: string) => (value.length < 1 ? 'Source is required' : null),
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
      form.setFieldValue('stream_url', file.name);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false} // Custom close button in header
      centered
      radius="lg"
      size="compact-lg"
      padding="xl"
    >
      {/* Custom Header Section */}
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Group align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
          <Box
            bg={ORANGE}
            p={10}
            style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Camera width={28} height={28} style={{ color: 'white', display: 'block' }} />
          </Box>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} fw={700}>{initialValues ? 'Edit Camera' : 'Add Camera'}</Title>
            <Text c="dimmed" fz="sm" fw={400} style={{ maxWidth: 300, lineHeight: 1.4 }}>
              {initialValues
                ? 'Update the camera details and stream settings.'
                : 'Enter the camera details and stream settings.'}
            </Text>
          </Stack>
        </Group>
        <ActionIcon variant="transparent" color="gray" onClick={onClose} aria-label="Close">
          <X width={24} height={24} />
        </ActionIcon>
      </Group>
      <hr style={{ border: '0.5px solid #eee', marginBottom: '25px' }} />

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="lg">
          <TextInput
            label={
              <Text size="sm" fw={700} mb={5}>
                Camera Name <span style={{ color: 'red' }}>*</span>
              </Text>
            }
            placeholder="Enter Camera Name"
            {...form.getInputProps('name')}
            radius="md"
            size="md"
            leftSection={<Camera width={18} height={18} style={{ color: '#888' }} />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <Box>
            <Text size="sm" fw={700} mb={5}>
              Source URL / Path <span style={{ color: 'red' }}>*</span>
            </Text>

            {form.values.stream_type === 'MP4' && (
              <Text fw={600} c="dimmed" mb={4} size="xs">
                Local file path for testing
              </Text>
            )}

            <Group gap="xs" align="flex-start" wrap="nowrap">
              <TextInput
                placeholder={form.values.stream_type === 'MP4' ? "Select a file..." : "rtsp://..."}
                {...form.getInputProps('stream_url')}
                radius="md"
                size="md"
                leftSection={<Broadcast width={18} height={18} style={{ color: '#888' }} />}
                styles={{ root: { flex: 1 }, input: { border: '1.5px solid #E0E0E0' } }}
              />

              {form.values.stream_type === 'MP4' && (
                <FileButton onChange={handleFileSelect} accept="video/mp4">
                  {(props) => (
                    <Button
                      {...props}
                      variant="outline"
                      color="gray"
                      h={42}
                      radius="md"
                      leftSection={<FolderOpen width={18} height={18} />}
                      styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333', flexShrink: 0 } }}
                    >
                      Locate File
                    </Button>
                  )}
                </FileButton>
              )}
            </Group>
          </Box>

          <Select
            label={
              <Text size="sm" fw={700} mb={5}>
                Stream Type <span style={{ color: 'red' }}>*</span>
              </Text>
            }
            placeholder="Select type"
            data={[
              { value: 'RTSP', label: 'RTSP Stream' },
              { value: 'HTTP', label: 'HTTP Stream' },
              { value: 'MP4', label: 'MP4 Video File (Testing)' },
              { value: 'EMBED', label: 'Embedded Web Page' }
            ]}
            {...form.getInputProps('stream_type')}
            radius="md"
            size="md"
            leftSection={<Video width={18} height={18} style={{ color: '#888' }} />}
            styles={{ input: { border: '1.5px solid #E0E0E0' } }}
          />

          <TextInput
            label={
              <Text size="sm" fw={700} mb={5}>
                Location Name
              </Text>
            }
            placeholder="e.g., Barangay Hall Entrance"
            {...form.getInputProps('location_name')}
            radius="md"
            size="md"
            leftSection={<GlobeAlt width={18} height={18} style={{ color: '#888' }} />}
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
              onClick={onClose}
              styles={{ root: { border: '1.5px solid #E0E0E0', color: '#333' } }}
            >
              Cancel
            </Button>
            <Button
              bg={SUBMIT}
              radius="md"
              size="md"
              h={48}
              type="submit"
              loading={loading}
              styles={{ root: { backgroundColor: SUBMIT } }}
            >
              {initialValues ? 'Update Camera' : 'Add Camera'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}