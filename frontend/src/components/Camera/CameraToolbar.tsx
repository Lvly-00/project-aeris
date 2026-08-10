import { Group, Text, Select, ActionIcon, Menu } from '@mantine/core';
import { ChevronDown, MoreVertical, RefreshCcw, Settings } from 'lucide-react';

interface CameraToolbarProps {
  count: number;
  layout: string;
  onLayoutChange: (val: string) => void;
}

export function CameraToolbar({ count, layout, onLayoutChange }: CameraToolbarProps) {
  return (
    <Group justify="space-between" mb="lg" mt="xs">
      <Text fw={700} size="sm" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
        CAMERAS: {count}
      </Text>

      <Group gap={8}>
        <Select
          value={layout}
          onChange={(v) => onLayoutChange(v || 'grid')}
          data={[
            { label: 'Grid: Auto', value: 'grid' },
            { label: 'Grid: 2×2', value: 'cctv-2x2' },
            { label: 'Grid: 3×3', value: 'cctv-3x3' },
            { label: 'Grid: 4×4', value: 'cctv-4x4' },
          ]}
          rightSection={<ChevronDown size={14} />}
          size="xs"
          variant="filled"
          styles={{
            input: { 
                width: 140, 
                fontWeight: 600, 
                borderRadius: '4px',
                backgroundColor: '#fff',
                border: '1px solid #dee2e6'
            }
          }}
        />
        
        <Menu position="bottom-end" shadow="md">
            <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg">
                    <MoreVertical size={20} />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<RefreshCcw size={14} />}>Reconnect All</Menu.Item>
                <Menu.Item leftSection={<Settings size={14} />}>Grid Settings</Menu.Item>
            </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}