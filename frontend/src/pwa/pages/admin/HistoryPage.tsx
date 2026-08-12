import { useEffect, useState } from 'react';
import { Container, Title, Text, Button, Group, Stack, ActionIcon, Loader, Center, rem } from '@mantine/core';
import { Filter, MoreVertical } from 'lucide-react';
import { Incident } from '../../../shared/types/index';
import { IncidentCard } from '../../components/commons/IncidentCard';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Simulate API call
      setTimeout(() => {
        setIncidents(MOCK_API_DATA);
        setLoading(false);
      }, 600);
    };
    loadData();
  }, []);

  return (
    <Container size="sm" py="lg">
      {/* Page Header */}
      <Stack mb="lg" gap={4}>
        <Title order={1} fz={rem(38)} fw={700} style={{ letterSpacing: rem(-1) }}>
          History
        </Title>
        <Text c="dimmed" fz="md" fw={400}>
          Monitor and manage detected incidents.
        </Text>
      </Stack>

      {/* Control Bar */}
      <Group justify="space-between" mb="lg">
        <Button
          variant="outline"
          color="gray"
          leftSection={<Filter size={18} />}
          radius="sm"
          fw={500}
        >
          Filter
        </Button>
        <ActionIcon variant="transparent" color="gray" size="lg">
          <MoreVertical size={24} />
        </ActionIcon>
      </Group>

      {/* Results List */}
      <Stack gap="md">
        {loading ? (
          <Center py="xl"><Loader variant="dots" color="blue" /></Center>
        ) : (
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onClick={(item) => console.log('Viewing:', item.id)}
            />
          ))
        )}
      </Stack>
    </Container>
  );
}

const MOCK_API_DATA: Incident[] = [
  {
    id: 123,
    incident_type: 'Fire',
    severity: 'Critical',
    status: 'Detected',
    camera: 101,
    zone: null, // Fixed: Added required property
    confidence_score: 0.80,
    description: 'Fire Incident',
    location_lat: 14.0,
    location_lng: 121.0,
    detected_at: new Date().toISOString(),
    verified_at: null, dispatched_at: null, responded_at: null, resolved_at: null, archived_at: null, dismissed_at: null,
    recorded_by: null, verified_by: null, dismissed_by: null,
    evidence_image: null, evidence_gallery: [],
    duration: null, crowd_size: null, review_notes: '', escalated_to: '', dispatch_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 122,
    incident_type: 'Vehicle_Accident',
    severity: 'High',
    status: 'Detected',
    camera: 102,
    zone: null, // Fixed: Added required property
    confidence_score: 0.60,
    description: 'Vehicular Accident',
    location_lat: 14.1,
    location_lng: 121.1,
    detected_at: new Date().toISOString(),
    verified_at: null, dispatched_at: null, responded_at: null, resolved_at: null, archived_at: null, dismissed_at: null,
    recorded_by: null, verified_by: null, dismissed_by: null,
    evidence_image: null, evidence_gallery: [],
    duration: null, crowd_size: null, review_notes: '', escalated_to: '', dispatch_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];