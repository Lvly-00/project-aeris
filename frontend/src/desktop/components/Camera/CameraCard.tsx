import { useState } from 'react';
import { Card, Text, Group, Badge, ActionIcon, Box, Menu, Transition } from '@mantine/core';
import { Maximize, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { CameraFeed } from './CameraFeed';

interface CameraCardProps {
  camera: any;
  onFullscreen: (cam: any) => void;
  onEdit: (cam: any) => void;
  onDelete: (id: number) => void;
}

export function CameraCard({ camera, onFullscreen, onEdit, onDelete }: CameraCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      padding={0}
      radius="xs"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ overflow: 'hidden', backgroundColor: '#000', aspectRatio: '16/9' }}
    >
      <Box pos="relative" h="100%" w="100%">
        <CameraFeed camera={camera} />

        {/* CCTV Label Overlay */}
        <Box pos="absolute" top={12} left={12} px="md" py={6} bg="rgba(20, 20, 20, 0.85)" style={{ zIndex: 5 }}>
          <Text fw={700} size="sm" c="white">{camera.name}</Text>
        </Box>

        {/* Live Status Overlay */}
        <Box pos="absolute" top={12} right={12} style={{ zIndex: 5 }}>
          <Badge 
            variant="filled" 
            color="rgba(100, 160, 140, 0.9)" 
            size="lg" 
            radius="xl"
            leftSection={<Box style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff' }} />}
          >
            LIVE
          </Badge>
        </Box>

        {/* Hover Controls */}
        <Transition mounted={hovered} transition="fade" duration={150}>
          {(styles) => (
            <Box style={{ ...styles, position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Group gap="sm">
                <ActionIcon variant="filled" color="dark" size="xl" onClick={() => onFullscreen(camera)}><Maximize size={20} /></ActionIcon>
                <Menu position="bottom" shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="filled" color="dark" size="xl"><MoreVertical size={20} /></ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<Pencil size={14} />} onClick={() => onEdit(camera)}>Edit</Menu.Item>
                    <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={() => onDelete(camera.id)}>Delete</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Box>
          )}
        </Transition>
      </Box>
    </Card>
  );
}