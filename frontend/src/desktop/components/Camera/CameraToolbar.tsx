import { Group, Text, Select, ActionIcon, Button, Menu, Checkbox } from '@mantine/core';
import { ChevronDown, DotsVerticalRounded, Fullscreen, Trash } from '@boxicons/react';

interface CameraToolbarProps {
  count: number;
  layout: string;
  onLayoutChange: (val: string) => void;
  onFullscreen: () => void;
  /** Shown while the grid is in mass-delete selection mode. */
  selectMode: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  /** Enters selection mode (via the ⋮ → Mass delete menu item). */
  onStartSelect: () => void;
  onCancelSelect: () => void;
  onDeleteSelected: () => void;
  bulkDeleting?: boolean;
}

export function CameraToolbar({
  count,
  layout,
  onLayoutChange,
  onFullscreen,
  selectMode,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onStartSelect,
  onCancelSelect,
  onDeleteSelected,
  bulkDeleting = false,
}: CameraToolbarProps) {
  return (
    <Group justify="space-between" mb="lg" mt="xs">
      {selectMode ? (
        <Group gap="sm">
          <Checkbox
            checked={selectedCount === count && count > 0}
            indeterminate={selectedCount > 0 && selectedCount < count}
            onChange={(e) => (e.currentTarget.checked ? onSelectAll() : onDeselectAll())}
            color="orange"
            size="md"
            aria-label="Select all cameras"
          />
          <Text fw={700} size="md" style={{ letterSpacing: '1px' }}>
            SELECTED: {selectedCount}
          </Text>
        </Group>
      ) : (
        <Text fw={700} size="md" style={{ letterSpacing: '1px' }}>
          CAMERAS: {count}
        </Text>
      )}

      <Group gap={12} align="center">
        {selectMode ? (
          <>
            <Button
              variant="outline"
              color="gray"
              size="sm"
              style={{ height: 36, fontWeight: 600, padding: '0 20px' }}
              onClick={onCancelSelect}
            >
              Cancel
            </Button>

            <Button
              color="red"
              size="sm"
              disabled={selectedCount === 0}
              loading={bulkDeleting}
              style={{ height: 36, fontWeight: 600, padding: '0 20px' }}
              onClick={onDeleteSelected}
            >
              Delete ({selectedCount})
            </Button>
          </>
        ) : (
          <>
            {/* Full Screen Button */}
            <Button
              variant="default"
              size="sm"
              leftSection={<Fullscreen width={16} height={16} />}
              onClick={onFullscreen}
              style={{
                height: 36,
                padding: '0 20px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Full Screen
            </Button>

            {/* Grid Select */}
            <Select
              value={layout}
              onChange={(v) => onLayoutChange(v || 'cctv-2x2')}
              data={[
                { label: 'Grid: 2×2', value: 'cctv-2x2' },
                { label: 'Grid: 3×3', value: 'cctv-3x3' },
                { label: 'Grid: 4×4', value: 'cctv-4x4' },
              ]}
              rightSection={<ChevronDown width={16} height={16} />}
              size="sm"
              styles={{
                input: {
                  width: 110,
                  height: 36,
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            />

            {/* Vertical dots: an action menu, like the one on each camera card */}
            <Menu width={200} position="bottom-end" shadow="md" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xl"
                  aria-label="Camera actions"
                >
                  <DotsVerticalRounded width={24} height={24} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<Trash width={14} height={14} />}
                  onClick={onStartSelect}
                >
                  Mass delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        )}
      </Group>
    </Group>
  );
}
