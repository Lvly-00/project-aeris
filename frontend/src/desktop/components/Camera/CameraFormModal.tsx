import { Modal, Stack, TextInput, Select, Group, Button, Text, FileButton } from '@mantine/core';
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

  // Handle local file selection for MP4 testing
  const handleFileSelect = (file: File | null) => {
    if (file) {
      // In a real Electron app, you'd get the full path. 
      // For web/testing, we'll use the file name or create an object URL.
      form.setFieldValue('rtsp_url', file.name);
      
      // If your backend/player needs the actual data:
      // const url = URL.createObjectURL(file);
      // form.setFieldValue('rtsp_url', url);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="lg" style={{ color: '#000' }}>{initialValues ? "Edit Camera" : "Add Camera"}</Text>}
      centered
      size="lg"
      padding="xl"
      radius="md"
      styles={{
        header: { borderBottom: '1px solid #e9ecef', marginBottom: '20px', paddingBottom: '15px' },
        close: { color: '#adb5bd', zoom: 1.5 }
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
            <Text fw={700} size="sm" mb={8}>Source URL / Path *</Text>
            {form.values.stream_type === 'MP4' && (
               <Text fw={600} color="#868e96" mb={4} size="xs">Local file path for testing</Text>
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
                      height={45} 
                      style={{ border: '1px solid #adb5bd', height: '45px' }}
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
            <Button variant="outline" color="gray" onClick={onClose} px="xl" style={{ borderColor: '#adb5bd', color: '#495057' }}>
              Cancel
            </Button>
            <Button type="submit" bg="#ff5700" px="xl" loading={loading} fw={700}>
              {initialValues ? "Update Camera" : "Add Camera"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

const inputStyles = {
  label: { fontWeight: 700, marginBottom: 8, fontSize: '14px', color: '#000' },
  input: { borderRadius: '8px', height: '45px', border: '1px solid #adb5bd', fontSize: '14px' }
};

// Simple Box import needed for the layout
import { Box } from '@mantine/core';