import React from 'react';
import { Car, File, Flame, Group, ShieldAlt, UserCircle, Video } from '@boxicons/react';
import { StatCard } from '../../components/Dashboard/StatCard';
import { Banner } from '../../components/Dashboard/Banner';
import { ConfidenceIndex } from '../../components/Dashboard/ConfidenceIndex';
import { IncidentSummary } from '../../components/Dashboard/IncidentSummary';
import { SimpleGrid, Container, Stack, Box } from '@mantine/core';



export default function DashboardPage() {
  return (
    <Container size="sm" py="md"> {/* Using size="sm" to keep it mobile-looking */}
      <Stack gap="md">
        <Banner />

        {/* 2-Column Grid for Stats as seen in Image */}
        <SimpleGrid cols={2} spacing="md">
          <StatCard
            label="Total Users"
            value="10"
            description="Manage and monitor all registered users."
            icon={<Group  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Cameras"
            value="10"
            description="Manage and monitor all registered cameras."
            icon={<Video  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Tanods"
            value="10"
            description="Manage and monitor all registered tanods."
            icon={<ShieldAlt  width={ 32 } height={ 32 } color="#f15a24" />}
          />
          <StatCard
            label="Total Incidents"
            value="10"
            description="Manage and monitor all reported incidents."
            icon={<File  width={ 32 } height={ 32 } color="#f15a24" />}
          />
        </SimpleGrid>

        {/* Bottom charts stacking on mobile */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* <ConfidenceIndex /> */}
          <IncidentSummary />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}