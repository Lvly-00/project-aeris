import { Group, Text, Select, ActionIcon } from '@mantine/core';
import { ChevronDown, MoreVertical } from 'lucide-react';

interface CameraToolbarProps {
  count: number;
  layout: string;
  onLayoutChange: (val: string) => void;
}

export function CameraToolbar({ count, layout, onLayoutChange }: CameraToolbarProps) {
  return (
    <Group justify="space-between" mb="md" mt="xs">
      <Text fw={900} size="xs" style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        CAMERAS: {count}
      </Text>

      <Group gap={4}>
        <Select
          value={layout}
          onChange={(v) => onLayoutChange(v || 'grid')}
          data={[
            { label: 'Grid: 2×2', value: 'cctv-2x2' },
            { label: 'Grid: 3×3', value: 'cctv-3x3' },
            { label: 'Grid: Auto', value: 'grid' },
          ]}
          rightSection={<ChevronDown size={14} />}
          size="xs"
          styles={{
            input: { width: 130, fontWeight: 600, borderRadius: '4px' }
          }}
        />
        <ActionIcon variant="subtle" color="gray"><MoreVertical size={18} /></ActionIcon>
      </Group>
    </Group>
  );
}