import { useState } from 'react';
import { Card, Text, Group, Badge, ActionIcon, Box, Stack, UnstyledButton } from '@mantine/core';
import { Maximize, Video, DotsVerticalRounded, Pencil, Trash } from '@boxicons/react';
import { CameraFeed } from './CameraFeed';

interface CameraCardProps {
  camera: any;
  onFullscreen: (cam: any) => void;
  onEdit: (cam: any) => void;
  onDelete: (id: number) => void;
}

export function CameraCard({ camera, onFullscreen, onEdit, onDelete }: CameraCardProps) {
  // Assuming camera object has properties like: name, location, fps, resolution
  const { name = 'CAM 01', location = 'AROMA STREET', fps = '50 FPS', resolution = '640p' } = camera;

  return (
    <Card
      padding={0}
      radius="sm"
      withBorder
      style={{ overflow: 'hidden', backgroundColor: '#f8f9fa' }}
    >
      {/* Video Feed Section */}
      <Box pos="relative" style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
        <CameraFeed camera={camera} />

        {/* Top Left: Live Status Overlay */}
        <Box
          pos="absolute"
          top={15}
          left={15}
          px={12}
          py={6}
          style={{
            zIndex: 5,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#40C057' }} />
          <Text fw={700} size="sm" c="white" lts={1}>LIVE</Text>
        </Box>

        {/* Top Right: Fullscreen Overlay */}
        <ActionIcon
          pos="absolute"
          top={15}
          right={15}
          size="lg"
          variant="filled"
          color="rgba(0, 0, 0, 0.7)"
          onClick={() => onFullscreen(camera)}
          style={{ zIndex: 5, borderRadius: 6 }}
        >
          <Maximize size={20} />
        </ActionIcon>
      </Box>

      {/* Bottom Info Bar */}
      <Group justify="space-between" p="md" wrap="nowrap" bg="white">
        <Group gap="md" wrap="nowrap">
          {/* Camera Icon */}
          <Box c="gray.7">
            <Video size={32} />
          </Box>

          {/* Camera Labels */}
          <Stack gap={0}>
            <Text fw={800} size="sm" style={{ lineHeight: 1.2 }}>
              {name.toUpperCase()}
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {location.toUpperCase()}
            </Text>
          </Stack>
        </Group>

        <Group gap="lg">
          <Text size="xs" c="dimmed" fw={600}>
            {fps}
          </Text>

          <Badge
            variant="outline"
            color="gray.6"
            radius="sm"
            size="lg"
            styles={{
              root: { border: '1.5px solid var(--mantine-color-gray-4)', height: 32, padding: '0 12px' },
              label: { color: 'var(--mantine-color-gray-7)', textTransform: 'none', fontSize: 14 }
            }}
          >
            {resolution}
          </Badge>
        </Group>
      </Group>
    </Card>
  );
}