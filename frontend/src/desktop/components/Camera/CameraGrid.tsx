import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, Paper, Group, Stack, Badge, ActionIcon, Checkbox, Menu } from '@mantine/core';
import {
  Fullscreen,
  FullscreenExit,
  Video,
  Calendar,
  Clock,
  Pencil,
  Trash,
  DotsVerticalRounded,
} from '@boxicons/react';
import { CameraFeed } from './CameraFeed';
import type { FeedStats, FeedState } from './useFps';
import { IDLE_FEED_STATS } from './useFps';
import type { IncidentDetectedData } from './DetectionOverlay';

interface CameraGridProps {
  cameras: any;
  layout: string;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
  onFullscreen?: (camera: any) => void;
  onEdit?: (camera: any) => void;
  onDelete?: (id: number) => void;
  /** True while the toolbar entered mass-delete selection mode. */
  selectMode?: boolean;
  /** Ids ticked on the cards. */
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  /** Fullscreen wall mode: reveal each card's footer only while hovered. */
  hoverFooter?: boolean;
}

/** Ticking clock for the fullscreen timestamp, so it is never a fixed date. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const STATUS_STYLE: Record<FeedState, { label: string; dot: string; color: string }> = {
  live: { label: 'LIVE', dot: '#2f9e44', color: 'green' },
  connecting: { label: 'CONNECTING', dot: '#f59f00', color: 'yellow' },
  offline: { label: 'OFFLINE', dot: '#868e96', color: 'gray' },
};

/**
 * The badge reflects the feed, not an assumption. A camera the backend calls
 * Offline shows OFFLINE even if the last frame was recent; anything else falls
 * through to what the feed itself reports.
 */
function resolveState(stats: FeedStats | null | undefined, camera: any): FeedState {
  // The API serializes status as a plain string ("Online", "Offline", ...).
  const raw = camera?.status;
  const backendStatus = typeof raw === 'string' ? raw : raw?.name;
  if (camera?.is_active === false || backendStatus === 'Offline' || backendStatus === 'Error') {
    return 'offline';
  }
  if (backendStatus === 'Connecting' && stats?.state !== 'live') return 'connecting';
  return stats?.state ?? 'connecting';
}

/** Scan-line heights the operators recognise as a p-label. */
const STANDARD_HEIGHTS = [144, 160, 240, 360, 480, 540, 720, 1080, 1440, 2160];

/**
 * Turns the decoder's real pixel size into a quality label like 1080p / 480p.
 * The "p" number is the smaller edge (the scan lines), and the nearest standard
 * tier is used when the source sits close to one, so 1280x720 reads 720p while
 * an odd size falls back to its own line count.
 */
function resolutionLabel(stats: FeedStats | null | undefined): string | null {
  if (!stats || !stats.width || !stats.height) return null;
  const lines = Math.min(stats.width, stats.height);
  let nearest = STANDARD_HEIGHTS[0];
  for (const tier of STANDARD_HEIGHTS) {
    if (Math.abs(tier - lines) < Math.abs(nearest - lines)) nearest = tier;
  }
  return Math.abs(nearest - lines) <= lines * 0.07 ? `${nearest}p` : `${lines}p`;
}

function StatusBadge({ state }: { state: FeedState }) {
  const s = STATUS_STYLE[state];
  return (
    <Group
      gap={6}
      bg="rgba(0,0,0,0.6)"
      px={10}
      py={6}
      style={{ borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}
    >
      <Box w={8} h={8} bg={s.dot} style={{ borderRadius: '50%', boxShadow: `0 0 8px ${s.dot}` }} />
      <Text size="xs" c="white" fw={700} style={{ letterSpacing: 0.5 }}>{s.label}</Text>
    </Group>
  );
}

export function CameraGrid({
  cameras,
  layout,
  onIncidentDetected,
  onFullscreen,
  onEdit,
  onDelete,
  selectMode = false,
  selectedIds = [],
  onToggleSelect,
  hoverFooter = false,
}: CameraGridProps) {
  const camList = Array.isArray(cameras) ? cameras : [];
  const [focusedCamera, setFocusedCamera] = useState<any>(null);
  const [statsById, setStatsById] = useState<Record<number, FeedStats>>({});
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const now = useNow();

  const cols = layout === 'cctv-2x2' ? 2 : layout === 'cctv-3x3' ? 3 : 4;

  // Stable: one callback shared by every feed, so no feed's effect re-fires
  // just because the grid re-rendered.
  const handleStats = useCallback((cameraId: number, next: FeedStats) => {
    setStatsById((prev) => {
      const cur = prev[cameraId];
      if (
        cur &&
        cur.state === next.state &&
        cur.fps === next.fps &&
        cur.width === next.width &&
        cur.height === next.height
      ) {
        return prev;
      }
      return { ...prev, [cameraId]: next };
    });
  }, []);

  const focusCamera = useCallback((cam: any) => {
    setFocusedCamera(cam);
    onFullscreen?.(cam);
  }, [onFullscreen]);

  const clearFocus = useCallback(() => {
    setFocusedCamera(null);
    onFullscreen?.(null);
  }, [onFullscreen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // A modal opened from here (edit/delete) owns Escape for itself;
      // bailing out keeps the fullscreen view behind it intact.
      if (document.querySelector('[aria-modal="true"]')) return;
      clearFocus();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [clearFocus]);

  // Deleting the camera you are watching drops you back to the grid instead of
  // leaving a fullscreen feed for a camera that no longer exists.
  useEffect(() => {
    if (focusedCamera && !camList.some((c: any) => c && c.id === focusedCamera.id)) {
      clearFocus();
    }
  }, [camList, focusedCamera, clearFocus]);

  const focusedStats = useMemo(
    () => (focusedCamera ? statsById[focusedCamera.id] ?? IDLE_FEED_STATS : IDLE_FEED_STATS),
    [statsById, focusedCamera],
  );

  // --- FOCUSED FULLSCREEN VIEW ---
  if (focusedCamera) {
    // Re-read the camera from the list so a realtime rename or status change
    // lands here too, instead of showing the object as it was when focused.
    const cam = camList.find((c: any) => c && c.id === focusedCamera.id) ?? focusedCamera;
    const state = resolveState(focusedStats, cam);
    const fpsLabel = state === 'live' && focusedStats.fps ? `${focusedStats.fps} FPS` : '— FPS';

    return (
      <Box style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        <CameraFeed camera={cam} onIncidentDetected={onIncidentDetected} onStats={handleStats} />

        {/* Top Info Bar */}
        <Box pos="absolute" top={24} left={24} style={{ zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Stack gap={2}>
            <Group gap="sm">
              <Text c="white" size="lg" fw={700} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {cam.name || 'Untitled camera'}
              </Text>
              <Badge color={STATUS_STYLE[state].color} size="md" variant="filled" radius="xs">
                {STATUS_STYLE[state].label}
              </Badge>
            </Group>
            <Text c="white" size="md" style={{ opacity: 0.8, letterSpacing: 1 }}>
              {cam.location_name || 'No location set'}
            </Text>
          </Stack>
        </Box>

        {/* Top Right Controls */}
        <Box pos="absolute" top={24} right={24} style={{ zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Group gap="md">
            <Text c="white" size="nd" fw={600} style={{ opacity: 0.7 }}>{fpsLabel}</Text>
            <Text c="white" size="nd" fw={600} style={{ opacity: 0.7, fontFamily: 'monospace' }}>
              {resolutionLabel(focusedStats) ?? '—'}
            </Text>
            {onEdit && (
              <ActionIcon color="white" variant="transparent" aria-label="Edit camera" onClick={() => onEdit(cam)}>
                <Pencil width={20} height={20} />
              </ActionIcon>
            )}
            {onDelete && (
              <ActionIcon color="red" variant="transparent" aria-label="Delete camera" onClick={() => onDelete(cam.id)}>
                <Trash width={20} height={20} />
              </ActionIcon>
            )}
            <ActionIcon color="white" variant="transparent" aria-label="Exit fullscreen" onClick={clearFocus}>
              <FullscreenExit width={20} height={20} />
            </ActionIcon>
</Group>
            </Box>

        {/* Bottom Timestamp Overlay */}
        <Box pos="absolute" bottom={24} left={24} style={{ zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Group gap="md">
            <Group gap="xs">
              <Calendar color="white" width={16} height={16} />
              <Text c="white" size="md">
                {now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </Group>
            <Group gap="xs">
              <Clock color="white" width={16} height={16} />
              <Text c="white" size="md">
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </Text>
</Group>
              </Group>
            </Box>
      </Box>
    );
  }

  // --- GRID VIEW ---
  return (
    <Box style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', padding: '16px' }}>
      {camList.map((cam: any) => {
        const stats = statsById[cam.id] ?? IDLE_FEED_STATS;
        const state = resolveState(stats, cam);
        const fpsLabel = state === 'live' && stats.fps ? `${stats.fps} FPS` : '— FPS';
        const resLabel = resolutionLabel(stats) ?? '—';
        const isSelected = selectMode && selectedIds.includes(cam.id);

        return (
          <Paper
            key={cam.id}
            radius="md"
            onMouseEnter={() => setHoveredId(cam.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              overflow: 'hidden',
              position: 'relative',
              background: hoverFooter ? 'transparent' : 'var(--mantine-color-body)',
              border: '1px solid',
              borderColor: isSelected ? '#ff5700' : 'var(--mantine-color-default-border)',
              boxShadow: isSelected ? '0 0 0 1px #ff5700' : 'none',
              cursor: selectMode ? 'pointer' : undefined,
            }}
            onClick={selectMode ? () => onToggleSelect?.(cam.id) : undefined}
          >
            {/* Video Container */}
            <Box style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#111' }}>
              <Box style={{ position: 'absolute', inset: 0 }}>
                <CameraFeed camera={cam} onIncidentDetected={onIncidentDetected} onStats={handleStats} />
              </Box>
              {/* Live Indicator — LIVE / CONNECTING / OFFLINE from the real feed */}
              <Box pos="absolute" top={12} left={12}>
                <StatusBadge state={state} />
              </Box>

              {selectMode ? (
                <Box
                  pos="absolute"
                  top={8}
                  right={8}
                  style={{ borderRadius: 6, padding: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(cam.id)}
                    color="orange"
                    size="md"
                    aria-label={`Select ${cam.name}`}
                  />
                </Box>
              ) : (
                <Group
                  pos="absolute"
                  top={8}
                  right={8}
                  gap={4}
                  style={
                    hoverFooter
                      ? { opacity: hoveredId === cam.id ? 1 : 0, transition: 'opacity 150ms ease' }
                      : undefined
                  }
                >
                <ActionIcon
                  size={30}
                  bg="rgba(0,0,0,0.6)"
                  color="white"
                  aria-label="Focus camera"
                  onClick={() => focusCamera(cam)}
                >
                  <Fullscreen width={18} height={18} />
                </ActionIcon>

                {(onEdit || onDelete) && (
                  <Menu width={160} position="bottom-end" shadow="md" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        size={30}
                        bg="rgba(0,0,0,0.6)"
                        color="white"
                        aria-label="Camera actions"
                      >
                        <DotsVerticalRounded width={18} height={18} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      {onEdit && (
                        <Menu.Item
                          leftSection={<Pencil width={14} height={14} />}
                          onClick={() => onEdit(cam)}
                        >
                          Edit
                        </Menu.Item>
                      )}

                      {onDelete && (
                        <Menu.Item
                          color="red"
                          leftSection={<Trash width={14} height={14} />}
                          onClick={() => onDelete(cam.id)}
                        >
                          Delete
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                )}
                </Group>
              )}
            </Box>

            {/* Footer Info — real name, location, measured fps and resolution */}
            <Group
              justify="space-between"
              p="md"
              style={
                hoverFooter
                  ? {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'var(--mantine-color-body)',
                      opacity: hoveredId === cam.id ? 1 : 0,
                      transition: 'opacity 150ms ease',
                    }
                  : undefined
              }
            >
              <Group gap="xs">
                <Video width={24} height={24} color="var(--mantine-color-dimmed)" />
                <Stack gap={0}>
                  <Text fw={700} size="sm">{cam.name || 'Untitled camera'}</Text>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    {cam.location_name || 'No location set'}
                  </Text>
                </Stack>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed" fw={600}>{fpsLabel}</Text>
                <Text
                  size="sm"
                  fw={600}
                  style={{
                    border: hoverFooter ? 'none' : '1px solid var(--mantine-color-default-border)',
                    padding: '2px 6px',
                    borderRadius: 2,
                  }}
                >
                  {resLabel}
                </Text>
              </Group>
            </Group>
          </Paper>
        );
      })}
    </Box>
  );
}
