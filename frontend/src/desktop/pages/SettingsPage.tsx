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
  Box,
  Slider,
  NumberInput,
  Divider,
  Tabs,
  Skeleton,
  TextInput,
  ActionIcon,
  Badge,
  Center,
  Modal,
  ThemeIcon,
  rem,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { AddressBook, Brain, Plus, Save, Trash, User } from '@boxicons/react';
import { aiAPI, contactsAPI } from '../../shared/services/api';

const INCIDENT_TYPES = [
  'Fire', 'Smoke', 'Vehicle_Accident',
];

const DEFAULT_GLOBAL_THRESHOLD = 0.3;
const DEFAULT_TYPE_THRESHOLD = 0.5;

const PHONE_PATTERN = /^[+()\d\s-]+$/;

interface EmergencyContact {
  id: number;
  name: string;
  phone_number: string;
  incident_type: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    // "system" was the old System Info tab; keep old links working.
    if (tab === 'system') return 'contacts';
    return tab || 'ai';
  });
  // `null` means "not edited yet — mirror the loaded config"
  const [confThreshold, setConfThreshold] = useState<number | null>(null);
  const [typeThresholds, setTypeThresholds] = useState<Record<string, number>>({});

  const queryClient = useQueryClient();

  // Contact form — name and number only, per the contact record the API accepts.
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<EmergencyContact | null>(null);

  const { data: aiConfig, isLoading: configLoading } = useQuery({
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

  /*
   * Emergency contacts live in the backend and are what the incident pages
   * call. The panel only needs the two fields the API stores: name and number.
   */
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await contactsAPI.list();
      return (res.data.results || res.data) as EmergencyContact[];
    },
    enabled: activeTab === 'contacts',
  });

  const createContactMutation = useMutation({
    mutationFn: (data: { name: string; phone_number: string }) => contactsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setContactName('');
      setContactNumber('');
      notifications.show({ title: 'Success', message: 'Contact added', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.name?.[0] || err.response?.data?.phone_number?.[0] || 'Failed to add contact',
        color: 'red',
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => contactsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setContactToDelete(null);
      notifications.show({ title: 'Success', message: 'Contact deleted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete contact', color: 'red' });
    },
  });

  const handleAddContact = () => {
    const name = contactName.trim();
    const number = contactNumber.trim();
    const nextNameError = name ? null : 'Contact name is required';
    const nextNumberError = !number
      ? 'Contact number is required'
      : !PHONE_PATTERN.test(number) || number.replace(/\D/g, '').length < 7
        ? 'Enter a valid contact number'
        : null;

    setNameError(nextNameError);
    setNumberError(nextNumberError);
    if (nextNameError || nextNumberError) return;

    createContactMutation.mutate({ name, phone_number: number });
  };

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
    if (tab === 'system') {
      setActiveTab('contacts');
    } else if (tab && ['ai', 'contacts'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (configLoading && activeTab === 'ai') {
    return (
      <Box p="md" aria-busy="true" aria-label="Loading settings">
        <Skeleton h={rem(24)} w={rem(200)} radius="xl" mb="lg" />

        {/* Tab strip */}
        <Group gap="xs" mb="md" wrap="nowrap">
          <Skeleton h={rem(36)} w={rem(150)} radius="md" />
          <Skeleton h={rem(36)} w={rem(120)} radius="md" />
        </Group>

        {/* Threshold card */}
        <Card withBorder padding="md" radius="md" mb="md">
          <Skeleton h={rem(14)} w={rem(220)} radius="xl" mb="sm" />
          <Skeleton h={rem(11)} w="70%" radius="xl" mb="md" />
          <Group wrap="nowrap" gap="md">
            <Skeleton h={rem(18)} radius="xl" style={{ flex: 1 }} />
            <Skeleton h={rem(20)} w={rem(48)} radius="xl" />
          </Group>
        </Card>

        {/* Per-type card */}
        <Card withBorder padding="md" radius="md" mb="md">
          <Skeleton h={rem(14)} w={rem(200)} radius="xl" mb="sm" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {[0, 1, 2].map((row) => (
              <Group key={row} justify="space-between" wrap="nowrap">
                <Skeleton h={rem(12)} w={rem(90)} radius="xl" />
                <Skeleton h={rem(32)} w={rem(100)} radius="md" />
              </Group>
            ))}
          </SimpleGrid>
        </Card>

        <Skeleton h={rem(36)} w={rem(190)} radius="md" />
      </Box>
    );
  }

  return (
    <Box p="md">
      <Title order={3} mb="lg">System Settings</Title>

      <Tabs value={activeTab} onChange={(v) => { setActiveTab(v || 'ai'); setSearchParams({ tab: v || 'ai' }); }}>
        <Tabs.List mb="md">
          <Tabs.Tab value="ai" leftSection={<Brain  width={ 14 } height={ 14 } />}>
            AI Configuration
          </Tabs.Tab>
          <Tabs.Tab value="contacts" leftSection={<AddressBook  width={ 14 } height={ 14 } />}>
            Contacts
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

        <Tabs.Panel value="contacts">
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb={4}>Add Emergency Contact</Text>
            <Text size="xs" c="dimmed" mb="md">
              Contacts appear on incident details so responders can call them with one tap.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                label="Contact Name"
                placeholder="e.g. Barangay Tanod"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.currentTarget.value);
                  if (nameError) setNameError(null);
                }}
                error={nameError}
                size="sm"
                radius="md"
                maxLength={200}
              />
              <TextInput
                label="Contact Number"
                placeholder="e.g. 0917 123 4567"
                value={contactNumber}
                onChange={(e) => {
                  setContactNumber(e.currentTarget.value);
                  if (numberError) setNumberError(null);
                }}
                error={numberError}
                size="sm"
                radius="md"
                maxLength={50}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<Plus  width={ 16 } height={ 16 } />}
                onClick={handleAddContact}
                loading={createContactMutation.isPending}
              >
                Add Contact
              </Button>
            </Group>
          </Card>

          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md" wrap="nowrap" gap="sm">
              <Group gap="xs" wrap="nowrap">
                <Text fw={600} size="sm">Emergency Contacts</Text>
                <Badge variant="light" color="gray" size="sm" radius="sm" tt="none">
                  {contacts.length}
                </Badge>
              </Group>
            </Group>

            {contactsLoading ? (
              <Stack gap="sm" aria-busy="true" aria-label="Loading contacts">
                {[0, 1, 2].map((row) => (
                  <Group key={row} justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Skeleton h={rem(36)} w={rem(36)} circle />
                      <Stack gap={6}>
                        <Skeleton h={rem(12)} w={rem(140)} radius="xl" />
                        <Skeleton h={rem(10)} w={rem(100)} radius="xl" />
                      </Stack>
                    </Group>
                    <Skeleton h={rem(28)} w={rem(28)} radius="sm" />
                  </Group>
                ))}
              </Stack>
            ) : contacts.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <ThemeIcon size={rem(52)} radius="xl" variant="light" color="gray">
                    <AddressBook width={26} height={26} />
                  </ThemeIcon>
                  <Text fw={600}>No contacts yet</Text>
                  <Text size="sm" c="dimmed" ta="center" maw={280}>
                    Add a name and contact number above so incidents have someone to call.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap={0}>
                {contacts.map((contact, index) => (
                  <Box key={contact.id}>
                    {index > 0 && <Divider />}
                    <Group justify="space-between" wrap="nowrap" gap="sm" py="sm">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <ThemeIcon size={36} radius="xl" variant="light" color="gray">
                          <User width={18} height={18} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate>{contact.name}</Text>
                          <Text size="xs" c="dimmed" truncate>{contact.phone_number}</Text>
                        </Box>
                      </Group>

                      <ActionIcon
                        variant="subtle"
                        color="red"
                        radius="md"
                        aria-label={`Delete ${contact.name}`}
                        onClick={() => setContactToDelete(contact)}
                      >
                        <Trash width={16} height={16} />
                      </ActionIcon>
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        title={<Text fw={700}>Delete contact</Text>}
        centered
        radius="md"
      >
        <Text size="sm" c="dimmed" lh={1.5}>
          Are you sure you want to delete{' '}
          <Text span fw={600} c="var(--mantine-color-text)">
            {contactToDelete?.name}
          </Text>
          ? This action cannot be undone.
        </Text>

        <Group justify="flex-end" mt="lg" gap="sm">
          <Button
            variant="default"
            onClick={() => setContactToDelete(null)}
            disabled={deleteContactMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            leftSection={<Trash  width={ 16 } height={ 16 } />}
            loading={deleteContactMutation.isPending}
            onClick={() => contactToDelete && deleteContactMutation.mutate(contactToDelete.id)}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Box>
  );
}