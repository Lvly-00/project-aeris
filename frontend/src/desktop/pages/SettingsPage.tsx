import { useState, useEffect, useRef } from 'react';
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
  Switch,
  NumberInput,
  Divider,
  Tabs,
  TextInput,
  Select,
  Modal,
  ActionIcon,
  Tooltip,
  Badge,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { Bell, Brain, Camera, Cog, InfoCircle, Pencil, Phone, PhoneRing, Plus, Save, Trash } from '@boxicons/react';
import { aiAPI, contactsAPI } from '../../shared/services/api';

const INCIDENT_TYPES = [
  'Fire', 'Smoke', 'Vehicle_Accident',
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai');
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [typeThresholds, setTypeThresholds] = useState<Record<string, number>>({});
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState('General');
  const [editingContact, setEditingContact] = useState<any>(null);
  const editingRef = useRef(editingContact);
  editingRef.current = editingContact;

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

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await contactsAPI.list();
      return res.data.results || res.data;
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (data: any) => {
      const ec = editingRef.current;
      return ec ? contactsAPI.update(ec.id, data) : contactsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notifications.show({ title: 'Success', message: editingRef.current ? 'Contact updated' : 'Contact added', color: 'green' });
      setContactModalOpen(false);
      setEditingContact(null);
      setContactName('');
      setContactPhone('');
      setContactType('General');
    },
    onError: (err: any) => {
      const data = err.response?.data;
      let detail = data?.detail || '';
      if (!detail && data && typeof data === 'object') {
        detail = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ');
      }
      notifications.show({ title: 'Error', message: detail || err.message || 'Failed to save contact', color: 'red' });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => contactsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notifications.show({ title: 'Success', message: 'Contact deleted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete contact', color: 'red' });
    },
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      confidence_threshold: confThreshold,
      type_thresholds: typeThresholds,
    });
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['ai', 'contacts', 'system'].includes(tab)) {
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
          <Tabs.Tab value="contacts" leftSection={<Phone  width={ 14 } height={ 14 } />}>
            Emergency Contacts
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
                  value={confThreshold * 100}
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
              <Text fw={700} size="lg">{Math.round(confThreshold * 100)}%</Text>
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
                    value={(typeThresholds[type] || aiConfig?.type_thresholds?.[type] || 0.5) * 100}
                    onChange={(v) => setTypeThresholds((prev) => ({ ...prev, [type]: (Number(v) || 50) / 100 }))}
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

        <Tabs.Panel value="contacts">
          <Group justify="space-between" mb="md">
            <Text fw={600} size="sm">Emergency Contacts</Text>
            <Button
              size="sm"
              leftSection={<Plus  width={ 14 } height={ 14 } />}
              onClick={() => {
                setEditingContact(null);
                setContactName('');
                setContactPhone('');
                setContactType('General');
                setContactModalOpen(true);
              }}
            >
              Add Contact
            </Button>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {Array.isArray(contacts) && contacts.map((contact: any) => (
              <Card key={contact.id} withBorder padding="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <PhoneRing  width={16} height={16} color="#e74c3c" />
                    <Text fw={600} size="sm">{contact.name}</Text>
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={() => {
                        setEditingContact(contact);
                        setContactName(contact.name);
                        setContactPhone(contact.phone_number);
                        setContactType(contact.incident_type || 'General');
                        setContactModalOpen(true);
                      }}
                    >
                      <Pencil  width={14} height={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => deleteContactMutation.mutate(contact.id)}
                    >
                      <Trash  width={14} height={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Group gap="xs" mb="xs">
                  <Badge size="sm" variant="filled" color="red">{(contact.incident_type || 'General').replace(/_/g, ' ')}</Badge>
                  <Badge size="sm" variant="light" color={contact.is_active ? 'green' : 'gray'}>{contact.is_active ? 'Active' : 'Inactive'}</Badge>
                </Group>
                <Text size="lg" fw={700} ff="monospace">{contact.phone_number}</Text>
              </Card>
            ))}
            {(!contacts || (Array.isArray(contacts) && contacts.length === 0)) && (
              <Paper p="xl" ta="center" withBorder style={{ gridColumn: '1 / -1' }}>
                <Phone  width={48} height={48} color="var(--mantine-color-dimmed)" />
                <Text mt="md" size="sm" c="dimmed">No emergency contacts configured</Text>
              </Paper>
            )}
          </SimpleGrid>

          <Modal
            opened={contactModalOpen}
            onClose={() => { setContactModalOpen(false); setEditingContact(null); }}
            title={editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          >
            <Stack>
              <TextInput
                label="Name"
                placeholder="e.g., BFP - Apalit Fire Station"
                value={contactName}
                onChange={(e) => setContactName(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Phone Number"
                placeholder="e.g., 911 or 09171234567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.currentTarget.value)}
                required
              />
              <Select
                label="Incident Type"
                data={[
                  ...INCIDENT_TYPES,
                  'General',
                ].map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
                value={contactType}
                onChange={(v) => setContactType(v || 'General')}
                required
              />
              <Button
                onClick={() => {
                  if (!contactName || !contactPhone) {
                    notifications.show({ title: 'Error', message: 'Name and phone number are required', color: 'red' });
                    return;
                  }
                  addContactMutation.mutate({
                    name: contactName,
                    phone_number: contactPhone,
                    incident_type: contactType === 'General' ? null : contactType,
                    is_active: true,
                  });
                }}
                loading={addContactMutation.isPending}
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </Button>
            </Stack>
          </Modal>
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
