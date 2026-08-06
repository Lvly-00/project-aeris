/**
 * CameraGrid (formerly CctvLayout) — the 2×2 / 3×3 / 4×4 CCTV wall view.
 * All interaction logic (context menu, focus, fullscreen grid) is unchanged.
 */
import { useState, useEffect, useRef } from 'react';
import { Box, Text, Button, Badge, Paper } from '@mantine/core';
import { Camera, Maximize, LayoutGrid, Pencil, Trash2, Monitor } from 'lucide-react';
import { CameraFeed } from './CameraFeed';
import type { IncidentDetectedData } from './DetectionOverlay';

interface CameraGridProps {
  cameras: any;
  layout: string;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
  onFullscreen: (camera: any) => void;
  onEdit: (camera: any) => void;
  onDelete: (id: number) => void;
}

function statusDot(status: string) {
  const color = status === 'Online' ? '#2ecc71' : status === 'Error' ? '#e74c3c' : '#95a5a6';
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      backgroundColor: color, boxShadow: `0 0 4px ${color}`,
      marginRight: 6, flexShrink: 0,
    }} />
  );
}

function ContextPortal({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <Box style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}>
      <Paper shadow="md" radius="md" p={4} style={{
        minWidth: 160, backgroundColor: 'var(--mantine-color-dark-6)',
        border: '1px solid var(--mantine-color-dark-4)',
      }}>
        {children}
      </Paper>
    </Box>
  );
}

function ContextMenuItem({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color?: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Box
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        borderRadius: 4, cursor: 'pointer', color: color || 'var(--mantine-color-gray-0)',
        backgroundColor: hovered ? 'var(--mantine-color-dark-4)' : 'transparent',
        fontSize: 13, transition: 'background-color 100ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {icon}<span>{label}</span>
    </Box>
  );
}

function FullscreenExitBadge({ onExit }: { onExit: () => void }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBriefly = () => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  };

  useEffect(() => {
    showBriefly();
    document.addEventListener('mousemove', showBriefly);
    return () => {
      document.removeEventListener('mousemove', showBriefly);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Box style={{
      position: 'fixed', top: 12, right: 12, zIndex: 10000,
      opacity: visible ? 1 : 0, transition: 'opacity 300ms',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <Button size="xs" variant="filled" color="dark" leftSection={<Monitor size={14} />}
        onClick={onExit} style={{
          backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
        Exit Fullscreen (Esc)
      </Button>
    </Box>
  );
}

export function CameraGrid({ cameras, layout, onIncidentDetected, onFullscreen, onEdit, onDelete }: CameraGridProps) {
  const camList = Array.isArray(cameras) ? cameras : [];
  const cols = layout === 'cctv-2x2' ? 2 : layout === 'cctv-3x3' ? 3 : 4;
  const totalCells = cols * cols;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; camera: any } | null>(null);
  const [focusedCamera, setFocusedCamera] = useState<any>(null);
  const [fullscreenGrid, setFullscreenGrid] = useState(false);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    if (ctxMenu) {
      document.addEventListener('click', close);
      document.addEventListener('contextmenu', close);
      return () => {
        document.removeEventListener('click', close);
        document.removeEventListener('contextmenu', close);
      };
    }
  }, [ctxMenu]);

  useEffect(() => {
    if (!focusedCamera && !fullscreenGrid) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusedCamera) setFocusedCamera(null);
        else if (fullscreenGrid) setFullscreenGrid(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [focusedCamera, fullscreenGrid]);

  // Single-camera focused view
  if (focusedCamera) {
    return (
      <Box style={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 160px)', minHeight: 500 }}>
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Button variant="subtle" size="xs" leftSection={<LayoutGrid size={14} />} onClick={() => setFocusedCamera(null)}>
            Back to Grid
          </Button>
          <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {statusDot(focusedCamera.status)}
            <Text fw={600} size="sm">{focusedCamera.name}</Text>
            <Badge size="xs" variant="filled" color="dark">{focusedCamera.stream_type}</Badge>
          </Box>
          <Box style={{ display: 'flex', gap: 4 }}>
            <Button variant="subtle" size="xs" leftSection={<Pencil size={14} />} onClick={() => onEdit(focusedCamera)}>Edit</Button>
            <Button variant="subtle" size="xs" color="red" leftSection={<Trash2 size={14} />} onClick={() => onDelete(focusedCamera.id)}>Delete</Button>
          </Box>
        </Box>
        <Box style={{ flex: 1, backgroundColor: '#0a0a0a', borderRadius: 6, overflow: 'hidden', position: 'relative' }}
          onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, camera: focusedCamera }); }}>
          <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
            <CameraFeed camera={focusedCamera} onIncidentDetected={onIncidentDetected} />
          </Box>
          <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
            <Text size="sm" c="dimmed" ff="monospace">{focusedCamera.stream_type} · Focused View</Text>
            <Text size="xs" c="dimmed" style={{ opacity: 0.5 }}>Press Esc or click "Back to Grid"</Text>
          </Box>
        </Box>
        {ctxMenu && (
          <ContextPortal x={ctxMenu.x} y={ctxMenu.y}>
            <ContextMenuItem icon={<LayoutGrid size={14} />} label="Back to Grid" onClick={() => { setFocusedCamera(null); setCtxMenu(null); }} />
            <ContextMenuItem icon={<Maximize size={14} />} label="Full Screen" onClick={() => { onFullscreen(ctxMenu.camera); setCtxMenu(null); }} />
            <ContextMenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(ctxMenu.camera); setCtxMenu(null); }} />
            <Box style={{ height: 1, backgroundColor: 'var(--mantine-color-dark-4)', margin: '4px 0' }} />
            <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" color="red" onClick={() => { onDelete(ctxMenu.camera.id); setCtxMenu(null); }} />
          </ContextPortal>
        )}
      </Box>
    );
  }

  const gridContent = (
    <>
      <Box style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${cols}, 1fr)`, gap: 2, flex: 1, backgroundColor: '#111', borderRadius: fullscreenGrid ? 0 : 6, overflow: 'hidden' }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const camera = camList[i];
          if (!camera) {
            return (
              <Box key={`empty-${i}`} style={{ backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <Box style={{ textAlign: 'center', opacity: 0.3 }}>
                  <Camera size={cols <= 2 ? 32 : 24} color="#555" />
                  <Text size="xs" c="dimmed" mt={4}>No Signal</Text>
                </Box>
                <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  <Text size="xs" c="dimmed" ff="monospace">CH{i + 1}</Text>
                </Box>
              </Box>
            );
          }
          return (
            <Box key={camera.id} style={{ backgroundColor: '#0a0a0a', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, camera }); }}
              onDoubleClick={() => setFocusedCamera(camera)}>
              <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
                <CameraFeed camera={camera} onIncidentDetected={onIncidentDetected} />
              </Box>
              <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'center', gap: 4, zIndex: 5 }}>
                {statusDot(camera.status)}
                <Text size={cols <= 2 ? 'sm' : 'xs'} fw={600} c="white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camera.name}</Text>
              </Box>
              <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
                <Text size="xs" c="dimmed" ff="monospace">CH{i + 1} · {camera.stream_type}</Text>
                <Text size="xs" c="dimmed" style={{ opacity: 0.5 }}>Double-click to focus</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
      {ctxMenu && (
        <ContextPortal x={ctxMenu.x} y={ctxMenu.y}>
          <ContextMenuItem icon={<Maximize size={14} />} label="Full Screen" onClick={() => { onFullscreen(ctxMenu.camera); setCtxMenu(null); }} />
          <ContextMenuItem icon={<LayoutGrid size={14} />} label="Focus Camera" onClick={() => { setFocusedCamera(ctxMenu.camera); setCtxMenu(null); }} />
          {!fullscreenGrid && <ContextMenuItem icon={<Monitor size={14} />} label="Fullscreen Grid" onClick={() => { setFullscreenGrid(true); setCtxMenu(null); }} />}
          <ContextMenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(ctxMenu.camera); setCtxMenu(null); }} />
          <Box style={{ height: 1, backgroundColor: 'var(--mantine-color-dark-4)', margin: '4px 0' }} />
          <ContextMenuItem icon={<Trash2 size={14} />} label="Delete" color="red" onClick={() => { onDelete(ctxMenu.camera.id); setCtxMenu(null); }} />
        </ContextPortal>
      )}
    </>
  );

  if (fullscreenGrid) {
    return (
      <Box style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        {gridContent}
        <FullscreenExitBadge onExit={() => setFullscreenGrid(false)} />
      </Box>
    );
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {gridContent}
    </Box>
  );
}
