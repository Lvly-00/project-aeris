import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Loader,
  Text,
  Title,
  rem,
  useMantineColorScheme,
  useMantineTheme,
  Transition,
} from '@mantine/core';
import { Wifi, WifiSlash, RefreshCw } from '@boxicons/react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/** True when running inside the Electron desktop wrapper. */
const IS_ELECTRON = Boolean((window as any).electronAPI?.isDesktop);

/**
 * OfflineOverlay
 *
 * Full-screen overlay that covers the entire app whenever the device loses
 * network connectivity.  Mounts above z-index 9999 so it appears over every
 * other layer (modals, drawers, navigation).
 *
 * Four phases (driven by useNetworkStatus):
 *
 *  1. offline       — WifiSlash icon + "You are currently offline." + Refresh btn
 *  2. justBack      — Wifi icon (green) + "You're back online!" banner
 *  3. reconnecting  — Spinner + "Reconnecting…" (same on both PWA and Desktop)
 *  4. online        — overlay fades out
 *                     • PWA:     window.location.reload() after fade
 *                     • Desktop: silent dismiss, no renderer reload
 */
export default function OfflineOverlay() {
  const { isOnline, phase, isOffline, isJustBack, isReconnecting } =
    useNetworkStatus();

  const { colorScheme } = useMantineColorScheme();
  const theme           = useMantineTheme();
  const isDark          = colorScheme === 'dark';

  // `visible` drives the <Transition> mount prop.
  // We keep it true through all recovery phases and only set it false
  // once phase === 'online', so the fade-out plays before unmount.
  const [visible, setVisible] = useState(!isOnline);
  const reloadScheduled       = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      // Going offline — show the overlay.
      setVisible(true);
      reloadScheduled.current = false;
      return;
    }

    if (phase === 'online' && visible) {
      // Recovery sequence finished — dismiss the overlay.
      setVisible(false);

      // PWA: reload once the fade-out completes (300 ms).
      if (!IS_ELECTRON && !reloadScheduled.current) {
        reloadScheduled.current = true;
        setTimeout(() => window.location.reload(), 320);
      }
    }
  }, [isOnline, phase, visible]);

  // Manual refresh button — only shown while offline.
  const handleRefresh = () => {
    if (IS_ELECTRON) {
      if (isOnline) setVisible(false);
      return;
    }
    window.location.reload();
  };

  // ── Colour tokens ─────────────────────────────────────────────────────────
  const bg         = isDark ? theme.colors.dark[8] : '#ffffff';
  const dimmed     = isDark ? theme.colors.dark[2] : '#868e96';
  const accent     = theme.colors.orange[6];
  const successClr = isDark ? '#69db7c' : '#2f9e44';

  // Icon background circle colour
  const iconBg = isDark ? theme.colors.dark[6] : theme.colors.gray[1];

  // ── Icon selection ────────────────────────────────────────────────────────
  const iconColor = isOffline ? accent : successClr;

  // ── Early return: nothing to show while fully online ─────────────────────
  if (!visible) return null;

  return (
    <Transition mounted={visible} transition="fade" duration={280} timingFunction="ease">
      {(styles) => (
        <Box
          style={{
            ...styles,
            position:        'fixed',
            inset:           0,
            zIndex:          9999,
            backgroundColor: bg,
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             rem(24),
            padding:         rem(32),
            paddingBottom:   rem(80),
            textAlign:       'center',
          }}
        >

          {/* ── Icon circle ─────────────────────────────────────────────── */}
          <Box
            style={{
              width:           rem(96),
              height:          rem(96),
              borderRadius:    '50%',
              backgroundColor: iconBg,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
              // Pulse only while offline; stop during recovery phases
              animation: isOffline
                ? 'aeris-offline-pulse 2.4s ease-in-out infinite'
                : 'none',
            }}
          >
            {isOffline ? (
              <WifiSlash width={48} height={48} color={iconColor} />
            ) : (
              <Wifi width={48} height={48} color={iconColor} />
            )}
          </Box>

          {/* ── Text block ──────────────────────────────────────────────── */}
          <Box style={{ maxWidth: rem(440) }}>
            {isOffline && (
              <>
                <Title
                  order={2}
                  style={{
                    color:        isDark ? theme.colors.gray[2] : theme.colors.dark[7],
                    marginBottom: rem(8),
                  }}
                >
                  You are currently offline.
                </Title>
                <Text fz="sm" style={{ color: dimmed }}>
                  Check your network connection. AERIS will reconnect
                  automatically once you're back online.
                </Text>
              </>
            )}

            {isJustBack && (
              <>
                <Title order={2} style={{ color: successClr, marginBottom: rem(8) }}>
                  You're back online!
                </Title>
                <Text fz="sm" style={{ color: dimmed }}>
                  Connection restored.
                </Text>
              </>
            )}

            {isReconnecting && (
              <>
                <Title
                  order={2}
                  style={{
                    color:        isDark ? theme.colors.gray[2] : theme.colors.dark[7],
                    marginBottom: rem(8),
                  }}
                >
                  Reconnecting…
                </Title>
                <Text fz="sm" style={{ color: dimmed }}>
                  {IS_ELECTRON
                    ? 'Re-establishing connection. Please wait.'
                    : 'Re-establishing connection. This page will reload shortly.'}
                </Text>
              </>
            )}
          </Box>

          {/* ── Reconnecting spinner (phase 3) ──────────────────────────── */}
          {isReconnecting && (
            <Loader color="orange" size="md" type="dots" />
          )}

          {/* ── Refresh button (phase 1 — offline only) ─────────────────── */}
          {isOffline && (
            <Button
              leftSection={<RefreshCw width={16} height={16} />}
              variant="light"
              color="orange"
              size="md"
              radius="md"
              onClick={handleRefresh}
              style={{ minWidth: rem(160) }}
            >
              Refresh
            </Button>
          )}

          {/* ── Progress bar (phase 2 — justBack, PWA only) ─────────────── */}
          {isJustBack && !IS_ELECTRON && (
            <Box
              style={{
                width:           rem(200),
                height:          rem(3),
                borderRadius:    rem(2),
                backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[2],
                overflow:        'hidden',
              }}
            >
              <Box
                style={{
                  height:          '100%',
                  backgroundColor: successClr,
                  borderRadius:    rem(2),
                  // Duration matches BACK_ONLINE_MSG_DURATION in the hook (1600 ms)
                  animation:       'aeris-back-progress 1600ms linear forwards',
                }}
              />
            </Box>
          )}

          {/* ── Keyframes ───────────────────────────────────────────────── */}
          <style>{`
            @keyframes aeris-offline-pulse {
              0%, 100% { opacity: 1;    transform: scale(1);    }
              50%       { opacity: 0.65; transform: scale(0.95); }
            }
            @keyframes aeris-back-progress {
              from { width: 0%;   }
              to   { width: 100%; }
            }
          `}</style>

        </Box>
      )}
    </Transition>
  );
}
