import { useEffect, useRef, useState } from 'react';
import { Box, Group, ActionIcon, Text, UnstyledButton } from '@mantine/core';
import { ChevronLeft, ChevronRight, FullscreenExit } from '@boxicons/react';
import { CameraGrid } from './CameraGrid';
import type { IncidentDetectedData } from './DetectionOverlay';

interface FullscreenGridWallProps {
  cameras: any;
  layout: string;
  onExit: () => void;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
  onFullscreen?: (camera: any) => void;
  onEdit?: (camera: any) => void;
  onDelete?: (id: number) => void;
}

export function FullscreenGridWall({
  cameras,
  layout,
  onExit,
  onIncidentDetected,
  onFullscreen,
  onEdit,
  onDelete,
}: FullscreenGridWallProps) {
  const arr = Array.isArray(cameras) ? cameras : [];
  const cols = layout === 'cctv-2x2' ? 2 : layout === 'cctv-3x3' ? 3 : 4;
  const perPage = cols * cols;
  const totalPages = Math.max(1, Math.ceil(arr.length / perPage));

  const [page, setPage] = useState(0);
  const [edgeHover, setEdgeHover] = useState<'left' | 'right' | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);

  // Esc closes the right-click menu (and exits fullscreen when it is open).
  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  // If the camera list shrinks below the current page, fall back to the last page.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const pageCameras = arr.slice(page * perPage, (page + 1) * perPage);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wallRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < 96) setEdgeHover('left');
    else if (x > rect.width - 96) setEdgeHover('right');
    else if (edgeHover !== null) setEdgeHover(null);
  };

  const arrowStyle = (side: 'left' | 'right') => ({
    opacity: edgeHover === side ? 1 : 0,
    transition: 'opacity 150ms ease',
    pointerEvents: 'auto',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
  } as const);

  return (
    <Box
      ref={wallRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setEdgeHover(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#111',
      }}
    >
      {/* Only the camera cards */}
      <CameraGrid
        cameras={pageCameras}
        layout={layout}
        onIncidentDetected={onIncidentDetected}
        onFullscreen={onFullscreen}
        onEdit={onEdit}
        onDelete={onDelete}
        hoverFooter
      />

      {/* Right-click menu — Exit fullscreen */}
      {ctxMenu && (
        <>
          <Box
            style={{
              position: 'fixed',
              top: ctxMenu.y,
              left: ctxMenu.x,
              zIndex: 90,
              background: '#fff',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              minWidth: 190,
              padding: 4,
            }}
          >
            <UnstyledButton
              onClick={() => {
                setCtxMenu(null);
                onExit();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 3,
                color: '#c92a2a',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <FullscreenExit width={16} height={16} />
              Exit fullscreen
            </UnstyledButton>
          </Box>
          <Box
            style={{ position: 'fixed', inset: 0, zIndex: 80 }}
            onClick={() => setCtxMenu(null)}
          />
        </>
      )}

      {/* Prev — only visible while hovering the left edge */}
      <Box
        style={{
          position: 'absolute',
          left: 16,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <ActionIcon
          size={48}
          radius="xl"
          style={arrowStyle('left')}
          disabled={page === 0}
          aria-label="Previous cameras"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft width={28} height={28} />
        </ActionIcon>
      </Box>

      {/* Next — only visible while hovering the right edge */}
      <Box
        style={{
          position: 'absolute',
          right: 16,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <ActionIcon
          size={48}
          radius="xl"
          style={arrowStyle('right')}
          disabled={page >= totalPages - 1}
          aria-label="Next cameras"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          <ChevronRight width={28} height={28} />
        </ActionIcon>
      </Box>

      {/* Page indicator */}
      <Group
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
        }}
      >
        <Text
          size="sm"
          c="white"
          fw={600}
          style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 999 }}
        >
          {page + 1} / {totalPages}
        </Text>
      </Group>
    </Box>
  );
}