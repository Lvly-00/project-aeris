import { useState } from 'react';
import {
  Card,
  Badge,
  Group,
  Text,
  Button,
  Progress,
  Select,
  Stack,
  SimpleGrid,
  Box,
  Title,
  Paper,
  Collapse,
  ThemeIcon,
  Divider,
  Tabs,
  ActionIcon,
  Timeline,
  Tooltip,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  Lightbulb,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  TriangleAlert,
  Users,
  Building2,
  Ambulance,
  Flame,
  Shield,
  RefreshCcw,
} from 'lucide-react';
import { recommendationsAPI } from '../../shared/services/api';
import { formatRelativeTime, formatConfidence } from '../../shared/utils/helpers';
import { PRIORITY_COLORS, SEVERITY_COLORS, INCIDENT_COLORS } from '../../shared/utils/constants';

const responderIcons: Record<string, React.ReactNode> = {
  Barangay_Tanod: <Users size={16} />,
  Barangay_Official: <Building2 size={16} />,
  MDRRMO: <Ambulance size={16} />,
  BFP: <Flame size={16} />,
  PNP: <Shield size={16} />,
};

export default function RecommendationsPage() {
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [responderFilter, setResponderFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(new Set());

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations', priorityFilter, responderFilter, statusFilter],
    queryFn: async () => {
      const params: any = { ordering: '-created_at' };
      if (priorityFilter) params.priority = priorityFilter;
      if (responderFilter) params.responder_type = responderFilter;
      if (statusFilter === 'pending') params.is_accepted = 'null';
      else if (statusFilter === 'accepted') params.is_accepted = 'true';
      else if (statusFilter === 'rejected') params.is_accepted = 'false';
      const res = await recommendationsAPI.list(params);
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, is_accepted }: { id: number; is_accepted: boolean }) =>
      recommendationsAPI.accept(id, { is_accepted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      notifications.show({ title: 'Updated', message: 'Recommendation status updated', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to update recommendation', color: 'red' });
    },
  });

  const stats = {
    total: Array.isArray(recommendations) ? recommendations.length : 0,
    pending: Array.isArray(recommendations) ? recommendations.filter((r: any) => r.is_accepted === null).length : 0,
    accepted: Array.isArray(recommendations) ? recommendations.filter((r: any) => r.is_accepted === true).length : 0,
    rejected: Array.isArray(recommendations) ? recommendations.filter((r: any) => r.is_accepted === false).length : 0,
  };

  const toggleReasoning = (id: number) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={3}>AI Decision Support & Recommendations</Title>
        <Button
          variant="light"
          leftSection={<RefreshCcw size={16} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['recommendations'] })}
        >
          Refresh
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
        <Paper p="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total</Text>
          <Text fw={700} size="xl">{stats.total}</Text>
        </Paper>
        <Paper p="md" withBorder style={{ borderColor: '#FFD43B' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Pending</Text>
          <Text fw={700} size="xl" c="yellow">{stats.pending}</Text>
        </Paper>
        <Paper p="md" withBorder style={{ borderColor: '#51CF66' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Accepted</Text>
          <Text fw={700} size="xl" c="green">{stats.accepted}</Text>
        </Paper>
        <Paper p="md" withBorder style={{ borderColor: '#FF6B6B' }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Rejected</Text>
          <Text fw={700} size="xl" c="red">{stats.rejected}</Text>
        </Paper>
      </SimpleGrid>

      <Group mb="md" gap="sm">
        <Select
          placeholder="Filter by Priority"
          data={[
            { value: 'Critical', label: 'Critical' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ]}
          value={priorityFilter}
          onChange={setPriorityFilter}
          clearable
          size="sm"
          style={{ width: 180 }}
        />
        <Select
          placeholder="Filter by Responder"
          data={[
            { value: 'Barangay_Tanod', label: 'Barangay Tanod' },
            { value: 'Barangay_Official', label: 'Barangay Official' },
            { value: 'MDRRMO', label: 'MDRRMO' },
            { value: 'BFP', label: 'BFP' },
            { value: 'PNP', label: 'PNP' },
          ]}
          value={responderFilter}
          onChange={setResponderFilter}
          clearable
          size="sm"
          style={{ width: 200 }}
        />
        <Select
          placeholder="Filter by Status"
          data={[
            { value: 'pending', label: 'Pending Review' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          size="sm"
          style={{ width: 180 }}
        />
      </Group>

      <Stack gap="md">
        {Array.isArray(recommendations) && recommendations.length > 0 ? (
          recommendations.map((rec: any) => {
            const isExpanded = expandedReasoning.has(rec.id);
            return (
              <Card key={rec.id} withBorder padding="md" radius="md">
                <Group justify="space-between" mb="sm">
                  <Group gap="sm">
                    <Badge
                      color={PRIORITY_COLORS[rec.priority] || 'gray'}
                      variant="filled"
                      size="lg"
                    >
                      {rec.priority}
                    </Badge>
                    {rec.incident_type && (
                      <Badge
                        color={INCIDENT_COLORS[rec.incident_type] || 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {rec.incident_type?.replace('_', ' ')}
                      </Badge>
                    )}
                    {rec.is_accepted === true && (
                      <Badge color="green" variant="dot" size="sm">Accepted</Badge>
                    )}
                    {rec.is_accepted === false && (
                      <Badge color="red" variant="dot" size="sm">Rejected</Badge>
                    )}
                    {rec.is_accepted === null && (
                      <Badge color="yellow" variant="dot" size="sm">Pending</Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {formatRelativeTime(rec.created_at)}
                  </Text>
                </Group>

                <Group gap="lg" mb="md">
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="blue" size="md">
                      {responderIcons[rec.responder_type] || <Shield size={16} />}
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">Responder</Text>
                      <Text size="sm" fw={500}>
                        {rec.responder_type?.replace(/_/g, ' ')}
                      </Text>
                    </div>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="grape" size="md">
                      <Lightbulb size={16} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="dimmed">Suggested Action</Text>
                      <Text size="sm" fw={500}>
                        {rec.suggested_action?.replace(/_/g, ' ')}
                      </Text>
                    </div>
                  </Group>
                </Group>

                <Text size="sm" mb="md" style={{ lineHeight: 1.6 }}>
                  {rec.explanation}
                </Text>

                <Group gap="lg" mb="md">
                  <Box style={{ flex: 1, maxWidth: 300 }}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" c="dimmed">Confidence</Text>
                      <Text size="xs" fw={600}>{formatConfidence(rec.confidence_score)}</Text>
                    </Group>
                    <Progress
                      value={rec.confidence_score * 100}
                      color={rec.confidence_score > 0.7 ? 'green' : rec.confidence_score > 0.5 ? 'yellow' : 'red'}
                      size="sm"
                    />
                  </Box>
                </Group>

                <Button
                  variant="subtle"
                  size="sm"
                  leftSection={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  onClick={() => toggleReasoning(rec.id)}
                >
                  {isExpanded ? 'Hide Reasoning' : 'Show Reasoning'}
                </Button>

                <Collapse in={isExpanded}>
                  <Paper p="sm" withBorder mt="sm">
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      {rec.reasoning}
                    </Text>
                  </Paper>
                </Collapse>

                {rec.is_accepted === null && (
                  <>
                    <Divider my="sm" />
                    <Group justify="flex-end" gap="sm">
                      <Button
                        variant="light"
                        color="red"
                        leftSection={<X size={14} />}
                        onClick={() => acceptMutation.mutate({ id: rec.id, is_accepted: false })}
                        loading={acceptMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="filled"
                        color="green"
                        leftSection={<Check size={14} />}
                        onClick={() => acceptMutation.mutate({ id: rec.id, is_accepted: true })}
                        loading={acceptMutation.isPending}
                      >
                        Accept Recommendation
                      </Button>
                    </Group>
                  </>
                )}
              </Card>
            );
          })
        ) : (
          <Paper p="xl" ta="center" withBorder>
            <Lightbulb size={48} color="#444" />
            <Text mt="md" size="lg" fw={500}>
              No Recommendations
            </Text>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Loading...' : 'AI recommendations will appear here once incidents are detected.'}
            </Text>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
