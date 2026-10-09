import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Text,
  Group,
  Title,
  Button,
  Stack,
  SimpleGrid,
  Paper,
  Box,
  Slider,
  NumberInput,
  Divider,
  Tabs,
} from '@mantine/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { Brain, InfoCircle, Save } from '@boxicons/react';
import { aiAPI } from '../../shared/services/api';

const INCIDENT_TYPES = [
  'Fire', 'Smoke', 'Vehicle_Accident',
];

const DEFAULT_GLOBAL_THRESHOLD = 0.3;
const DEFAULT_TYPE_THRESHOLD = 0.5;

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai');
  // `null` means "not edited yet — mirror the loaded config"
  const [confThreshold, setConfThreshold] = useState<number | null>(null);
  const [typeThresholds, setTypeThresholds] = useState<Record<string, number>>({});

  const { data: aiConfig } = useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      try {
        const res = await aiAPI.getConfig();
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => aiAPI.updateConfig(data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Configuration saved', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to save configuration', color: 'red' });
    },
  });

  const effectiveConf = confThreshold ?? aiConfig?.confidence_threshold ?? DEFAULT_GLOBAL_THRESHOLD;

  const typeThresholdValue = (type: string) =>
    (typeThresholds[type] ?? aiConfig?.type_thresholds?.[type] ?? DEFAULT_TYPE_THRESHOLD) * 100;

  const handleSaveConfig = () => {
    const payload: Record<string, unknown> = {
      confidence_threshold: Number(effectiveConf),
    };
    if (Object.keys(typeThresholds).length > 0) {
      payload.type_thresholds = typeThresholds;
    }
    saveConfigMutation.mutate(payload);
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['ai', 'system'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <Box p="md">
      <Title order={3} mb="lg">System Settings</Title>

      <Tabs value={activeTab} onChange={(v) => { setActiveTab(v || 'ai'); setSearchParams({ tab: v || 'ai' }); }}>
        <Tabs.List mb="md">
          <Tabs.Tab value="ai" leftSection={<Brain  width={ 14 } height={ 14 } />}>
            AI Configuration
          </Tabs.Tab>
          <Tabs.Tab value="system" leftSection={<InfoCircle  width={ 14 } height={ 14 } />}>
            System Info
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ai">
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Detection Confidence Threshold</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Global confidence threshold for AI detection. Detections below this threshold will be ignored.
            </Text>
            <Group mb="md">
              <Box style={{ flex: 1 }}>
                <Slider
                  value={Math.round(effectiveConf * 100)}
                  onChange={(v) => setConfThreshold(v / 100)}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                  min={0}
                  max={100}
                  step={5}
                />
              </Box>
              <Text fw={700} size="lg">{Math.round(effectiveConf * 100)}%</Text>
            </Group>
          </Card>

          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Per-Incident-Type Thresholds</Text>
            <Text size="xs" c="dimmed" mb="md">
              Set custom confidence thresholds for each incident type.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {INCIDENT_TYPES.map((type) => (
                <Group key={type} justify="space-between">
                  <Text size="sm">{type.replace(/_/g, ' ')}</Text>
                  <NumberInput
                    value={Math.round(typeThresholdValue(type))}
                    onChange={(v) => {
                      const num = typeof v === 'number' ? v : (v.trim() === '' ? Number.NaN : Number(v));
                      setTypeThresholds((prev) => ({
                        ...prev,
                        [type]: Number.isFinite(num) ? num / 100 : DEFAULT_TYPE_THRESHOLD,
                      }));
                    }}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
                    size="sm"
                    style={{ width: 100 }}
                  />
                </Group>
              ))}
            </SimpleGrid>
          </Card>

          <Button
            leftSection={<Save  width={ 16 } height={ 16 } />}
            onClick={handleSaveConfig}
            loading={saveConfigMutation.isPending}
          >
            Save AI Configuration
          </Button>
        </Tabs.Panel>

        <Tabs.Panel value="system">
          <Card withBorder padding="md" radius="md">
            <Text fw={600} size="sm" mb="md">System Information</Text>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Version</Text>
                <Text size="sm" fw={500}>1.0.0</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Frontend</Text>
                <Text size="sm" fw={500}>React + Vite + Mantine UI</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Backend</Text>
                <Text size="sm" fw={500}>Django + DRF + PostgreSQL</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">AI Engine</Text>
                <Text size="sm" fw={500}>YOLOv11 + PyTorch + OpenCV</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">AI Service Status</Text>
                <Text size="sm" fw={500} c={aiConfig ? 'green' : 'yellow'}>
                  {aiConfig ? 'Connected' : 'Not Connected'}
                </Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Global Confidence Threshold</Text>
                <Text size="sm" fw={500}>{aiConfig ? `${Math.round(aiConfig.confidence_threshold * 100)}%` : 'N/A'}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Incident Types Monitored</Text>
                <Text size="sm" fw={500}>8 Types</Text>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}