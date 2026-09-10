import { Group, Text, Select, ActionIcon, Menu } from '@mantine/core';
import { ChevronDown, Cog, DotsVerticalRounded, RefreshCcw } from '@boxicons/react';

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
          onChange={(v) => onLayoutChange(v || 'cctv-2x2')}
          data={[
            { label: 'Grid: 2×2', value: 'cctv-2x2' },
            { label: 'Grid: 3×3', value: 'cctv-3x3' },
            { label: 'Grid: 4×4', value: 'cctv-4x4' },
          ]}
          rightSection={<ChevronDown  width={14} height={14} />}
          size="xs"
          variant="filled"
          styles={{
            input: { 
                width: 140, 
                fontWeight: 600, 
                borderRadius: '4px',
                backgroundColor: 'var(--mantine-color-body)',
                border: '1px solid var(--mantine-color-default-border)'
            }
          }}
        />
        
        <Menu position="bottom-end" shadow="md">
            <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg">
                    <DotsVerticalRounded  width={20} height={20} />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<RefreshCcw  width={ 14 } height={ 14 } />}>Reconnect All</Menu.Item>
                <Menu.Item leftSection={<Cog  width={ 14 } height={ 14 } />}>Grid Settings</Menu.Item>
            </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}