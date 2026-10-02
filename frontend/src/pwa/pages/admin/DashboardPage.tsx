import { useQuery } from '@tanstack/react-query';
import { Siren, Community, User, Video, AlertCircle } from '@boxicons/react';
import { StatCard } from '../../components/Dashboard/StatCard';
import { Banner } from '../../components/Dashboard/Banner';
import { ConfidenceIndex } from '../../components/Dashboard/ConfidenceIndex';
import { IncidentSummary } from '../../components/Dashboard/IncidentSummary';
import { SimpleGrid, Container, Stack, Alert } from '@mantine/core';

import { useAuth } from '../../../shared/hooks/useAuth';
import { incidentsAPI } from '../../../shared/services/api';
import type { DashboardStats } from '../../../shared/types';

export default function DashboardPage() {
  const { user } = useAuth();

  /*
   * One request drives the whole page. The shared WebSocket already
   * invalidates ['dashboard-stats'] on incident events, so the figures move
   * the moment an incident is created, updated or deleted; the interval is
   * only a safety net.
   */
  const { data: stats, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await incidentsAPI.dashboardStats();
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isError) {
    return (
      <Container size="sm" py="md">
        <Alert
          color="red"
          variant="light"
          icon={<AlertCircle width={18} height={18} />}
          title="Could not load dashboard"
        >
          {(error as any)?.response?.data?.detail ||
            (error as any)?.message ||
            'The statistics service did not respond.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md"> {/* Using size="sm" to keep it mobile-looking */}
      <Stack gap="md">
        <Banner user={user} />

        {/* 2-Column Grid for Stats as seen in Image */}
        <SimpleGrid cols={2} spacing="md">
          <StatCard
            label="Total Users"
            value={stats?.total_users}
            loading={isLoading}
            description="Manage and monitor all registered users."
            icon={<Community  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Cameras"
            value={stats?.total_cameras}
            loading={isLoading}
            description="Manage and monitor all registered cameras."
            icon={<Video  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Tanods"
            value={stats?.total_tanods}
            loading={isLoading}
            description="Manage and monitor all registered tanods."
            icon={<User  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Incidents"
            value={stats?.total_incidents}
            loading={isLoading}
            description="Manage and monitor all reported incidents."
            icon={<Siren  width={ 32 } height={ 32 } color="#f15a24" />}
          />
        </SimpleGrid>

        {/* Bottom charts stacking on mobile */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* <ConfidenceIndex verdicts={stats?.verdicts} loading={isLoading} /> */}
          <IncidentSummary byType={stats?.by_type ?? []} loading={isLoading} />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}