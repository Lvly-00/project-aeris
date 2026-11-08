import { useEffect, useState } from 'react';
import { Badge, Button, Card, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core';
import { ArrowDownCircle, CheckCircle, RefreshCw, Rocket } from '@boxicons/react';

/** Mirrors the payload main.cjs sends on the `update-status` channel. */
type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' | 'current' | 'downloaded'; version?: string }
  | { status: 'downloading'; percent: number }
  | { status: 'error'; message?: string };

const electron = () => window.electronAPI;

export default function UpdatesPanel() {
  const [version, setVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const api = electron();
    if (!api?.getVersion) return;

    let cancelled = false;
    api
      .getVersion()
      .then((v) => {
        if (!cancelled) setVersion(v);
      })
      .catch(() => {});

    // Main process is the single source of truth for updater progress.
    const unsubscribe = api.onUpdateStatus(setStatus);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const check = async () => {
    const api = electron();
    if (!api?.checkForUpdates) return;
    setNotice(null);
    setBusy(true);
    try {
      const result = await api.checkForUpdates();
      if (!result.ok) {
        setStatus({ status: 'idle' });
        setNotice(result.message || 'Could not check for updates.');
      }
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const api = electron();
    if (!api?.downloadUpdate) return;
    setNotice(null);
    setBusy(true);
    try {
      const result = await api.downloadUpdate();
      if (!result.ok) {
        setNotice(result.message || 'Could not download the update.');
      }
    } finally {
      setBusy(false);
    }
  };

  const install = () => electron()?.installUpdate();

  const downloading = status.status === 'downloading';
  const checking = status.status === 'checking' || busy;

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon size={36} radius="xl" variant="light" color="blue">
            <Rocket width={18} height={18} />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={600} size="sm">Aeris Desktop</Text>
            <Text size="xs" c="dimmed">
              Installed version{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {version ?? 'unknown'}
              </Text>
            </Text>
          </Stack>
        </Group>

        {status.status === 'current' && (
          <Badge color="green" variant="light" tt="none" leftSection={<CheckCircle width={12} height={12} />}>
            Up to date
          </Badge>
        )}
        {(status.status === 'available' || status.status === 'downloaded') && (
          <Badge color="blue" variant="light" tt="none">
            {status.version ? `v${status.version}` : 'Update'}
          </Badge>
        )}
      </Group>

      <Text size="xs" c="dimmed" lh={1.6} mb="md">
        Updates replace the desktop shell only — the screens you use are served by
        the backend, so fixes there arrive without reinstalling.
      </Text>

      <Stack gap="sm">
        <Text size="sm" aria-live="polite">
          {status.status === 'checking' && 'Checking for updates…'}
          {status.status === 'current' && 'You are running the latest version.'}
          {status.status === 'available' &&
            `Version ${status.version ?? ''} is available.`.trim()}
          {downloading && `Downloading the update… ${status.percent}%`}
          {status.status === 'downloaded' &&
            `Version ${status.version ?? ''} is ready. Restart to finish installing.`}
          {status.status === 'error' && (status.message || 'The update check failed.')}
          {status.status === 'idle' && notice}
        </Text>

        {downloading && (
          <Progress
            value={status.percent}
            aria-label="Update download progress"
            size="sm"
            radius="xl"
          />
        )}

        <Group gap="sm">
          <Button
            variant="default"
            size="sm"
            radius="md"
            leftSection={<RefreshCw width={16} height={16} />}
            onClick={check}
            loading={checking}
            disabled={downloading}
          >
            Check for updates
          </Button>

          {status.status === 'available' && (
            <Button
              size="sm"
              radius="md"
              leftSection={<ArrowDownCircle width={16} height={16} />}
              onClick={download}
              loading={busy}
            >
              Download update
            </Button>
          )}

          {status.status === 'downloaded' && (
            <Button
              size="sm"
              radius="md"
              color="green"
              leftSection={<CheckCircle width={16} height={16} />}
              onClick={install}
            >
              Restart and install
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
