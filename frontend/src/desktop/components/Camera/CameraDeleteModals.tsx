
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Box,
  ActionIcon,
  ThemeIcon,
  Divider,
  Badge,
  Paper,
} from '@mantine/core';
import { X, Trash } from '@boxicons/react';

// ── Single camera delete confirm ────────────────────────────────────────────

interface SingleDeleteCameraModalProps {
  camera: any;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function SingleDeleteCameraModal({
  camera,
  onClose,
  onConfirm,
  loading,
}: SingleDeleteCameraModalProps) {
  const cameraName = camera?.name ?? `Camera ${camera?.id}`;

  return (
    <Modal
      opened={camera !== null}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={false}
      padding={0}
      radius="md"
      zIndex={1100}
      overlayProps={{
        backgroundOpacity: 0.6,
        blur: 3,
      }}
      styles={{
        content: {
          overflow: 'hidden',
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Stack gap={0}>
        {/* Close Button */}
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
          }}
        >
          <X size="sm" />
        </ActionIcon>

        {/* Header */}
        <Stack align="center" gap={12} px={32} pt={30} pb={24}>
          <ThemeIcon
            size={72}
            radius="50%"
            variant="light"
            color="red"
            style={{
              backgroundColor: 'var(--mantine-color-red-light)',
            }}
          >
            <Trash
              size="lg"
              color="var(--mantine-color-red-6)"
            />
          </ThemeIcon>

          <Stack align="center" gap={6}>
            <Text
              fw={700}
              size="xl"
              ta="center"
              c="var(--mantine-color-text)"
            >
              Delete CCTV Camera
            </Text>

            <Text
              size="sm"
              c="dimmed"
              ta="center"
              maw={300}
              lh={1.5}
            >
              Are you sure you want to delete{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {cameraName}
              </Text>
              ? This action cannot be undone.
            </Text>
          </Stack>
        </Stack>


        {/* Footer */}
        <Box px={32} pt={8} pb={28}>
          <Group grow gap={12}>
            <Button
              variant="default"
              size="md"
              radius="md"
              disabled={loading}
              onClick={onClose}
              styles={{
                root: {
                  borderColor: 'var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-text)',
                  fontWeight: 600,
                },
              }}
            >
              Cancel
            </Button>

            <Button
              color="red"
              size="md"
              radius="md"
              loading={loading}
              onClick={onConfirm}
              styles={{
                root: {
                  backgroundColor: 'var(--mantine-color-red-6)',
                  fontWeight: 600,
                },
              }}
            >
              Delete Camera
            </Button>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}

// ── Mass delete confirm (lists the cameras that will be removed) ────────────

interface MassDeleteCamerasModalProps {
  opened: boolean;
  cameras: any[];
  selectedIds: number[];
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function MassDeleteCamerasModal({
  opened,
  cameras,
  selectedIds,
  onClose,
  onConfirm,
  loading,
}: MassDeleteCamerasModalProps) {
  const count = selectedIds.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={false}
      padding={0}
      radius="md"
      zIndex={1100}
      overlayProps={{
        backgroundOpacity: 0.6,
        blur: 3,
      }}
      styles={{
        content: {
          overflow: 'hidden',
        },
        body: {
          padding: 0,
        },
      }}
    >
      <Stack gap={0}>
        {/* Close Button */}
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
          }}
        >
          <X size="sm" />
        </ActionIcon>

        {/* Header */}
        <Stack align="center" gap={12} px={32} pt={30} pb={24}>
          <ThemeIcon
            size={72}
            radius="50%"
            variant="light"
            color="red"
            style={{
              backgroundColor: 'var(--mantine-color-red-light)',
            }}
          >
            <Trash
              size="lg"
              color="var(--mantine-color-red-6)"
            />
          </ThemeIcon>

          <Stack align="center" gap={6}>
            <Text
              fw={700}
              size="xl"
              ta="center"
              c="var(--mantine-color-text)"
            >
              Delete CCTV Camera{count === 1 ? '' : 's'}
            </Text>

            <Text size="sm" c="dimmed" ta="center" maw={350} lh={1.5}>
              Are you sure you want to delete the selected{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {count} CCTV camera{count === 1 ? '' : 's'}
              </Text>
              ? This action cannot be undone.
            </Text>
          </Stack>
        </Stack>

        {/* Divider */}
        <Divider />

        {/* Selected Cameras */}
        <Stack gap={12} px={32} py={22}>
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm" c="var(--mantine-color-text)">
              Cameras to be deleted
            </Text>

            <Badge color="red" variant="light" size="lg" radius="md">
              {count} {count === 1 ? 'Camera' : 'Cameras'}
            </Badge>
          </Group>

          <Paper
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-body)',
              borderColor: 'var(--mantine-color-default-border)',
              maxHeight: 150,
              overflowY: 'auto',
            }}
          >
            <Stack gap={9}>
              {selectedIds.map((id) => {
                const camera = cameras?.find((cam) => cam.id === id);

                return (
                  <Group key={id} gap={10} wrap="nowrap">
                    <Box
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-red-6)',
                        flexShrink: 0,
                      }}
                    />

                    <Text
                      size="sm"
                      fw={500}
                      c="var(--mantine-color-text)"
                      truncate
                    >
                      {camera?.name || `CAM ${id}`}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </Paper>
        </Stack>

        {/* Footer */}
        <Box px={32} pt={8} pb={28}>
          <Group grow gap={12}>
            <Button
              variant="default"
              size="md"
              radius="md"
              disabled={loading}
              onClick={onClose}
              styles={{
                root: {
                  borderColor: 'var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-text)',
                  fontWeight: 600,
                },
              }}
            >
              Cancel
            </Button>

            <Button
              color="red"
              size="md"
              radius="md"
              loading={loading}
              onClick={onConfirm}
              styles={{
                root: {
                  backgroundColor: 'var(--mantine-color-red-6)',
                  fontWeight: 600,
                },
              }}
            >
              Delete {count === 1 ? 'Camera' : 'Cameras'}
            </Button>
          </Group>
        </Box>
      </Stack>
    </Modal>
  );
}
