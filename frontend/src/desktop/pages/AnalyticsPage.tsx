import { useState } from 'react';
import {
  Card,
  Text,
  Group,
  Title,
  Badge,
  Table,
  SimpleGrid,
  Paper,
  Box,
  Grid,
  Tabs,
  Stack,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Map,
  Clock,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { analyticsAPI } from '../../shared/services/api';
import { INCIDENT_COLORS, SEVERITY_COLORS, STATUS_COLORS } from '../../shared/utils/constants';

const COLORS = ['#FF4444', '#FF8800', '#44AAFF', '#44CC44', '#CC44FF', '#FFAA00', '#88AA44', '#AA8844'];

export default function AnalyticsPage() {
  const { data: incidentSummary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await analyticsAPI.incidentSummary();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: highRiskLocations } = useQuery({
    queryKey: ['analytics-high-risk'],
    queryFn: async () => {
      const res = await analyticsAPI.highRiskLocations();
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: peakHours } = useQuery({
    queryKey: ['analytics-peak-hours'],
    queryFn: async () => {
      const res = await analyticsAPI.peakHours();
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: responseTimes } = useQuery({
    queryKey: ['analytics-response-times'],
    queryFn: async () => {
      const res = await analyticsAPI.responseTimes();
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: severityDist } = useQuery({
    queryKey: ['analytics-severity'],
    queryFn: async () => {
      const res = await analyticsAPI.severityDistribution();
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: trendData } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: async () => {
      const res = await analyticsAPI.trendAnalysis({ days: 30 });
      return res.data;
    },
    refetchInterval: 60000,
  });

  const typeData = incidentSummary?.by_type
    ? incidentSummary.by_type.map((item: any) => ({
        name: (item.incident_type || item.name).replace(/_/g, ' '),
        value: item.count || item.value,
        fill: INCIDENT_COLORS[item.incident_type || item.name] || '#888',
      }))
    : [];

  const severityData = severityDist
    ? severityDist.map((item: any) => ({
        name: item.severity || item.name,
        value: item.count || item.value,
        color: SEVERITY_COLORS[item.severity || item.name] || '#888',
      }))
    : [];

  const statusData = incidentSummary?.by_status
    ? incidentSummary.by_status.map((item: any) => ({
        name: item.status || item.name,
        value: item.count || item.value,
        color: STATUS_COLORS[item.status || item.name] || '#888',
      }))
    : [];

  return (
    <Box p="md">
      <Title order={3} mb="lg">Analytics Dashboard</Title>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        <Paper p="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Incidents</Text>
          <Text fw={700} size="xl">{Array.isArray(incidentSummary?.by_status) ? incidentSummary.by_status.reduce((s: number, i: any) => s + (i.count || 0), 0) : 0}</Text>
        </Paper>
        <Paper p="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Incident Types</Text>
          <Text fw={700} size="xl">{typeData.length}</Text>
        </Paper>
        <Paper p="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Active Incidents</Text>
          <Text fw={700} size="xl" c="red">
            {((incidentSummary?.by_status || []).find((s: any) => s.status === 'Detected')?.count || 0) +
             ((incidentSummary?.by_status || []).find((s: any) => s.status === 'Responding')?.count || 0)}
          </Text>
        </Paper>
        <Paper p="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Resolved</Text>
          <Text fw={700} size="xl" c="green">
            {(incidentSummary?.by_status || []).find((s: any) => s.status === 'Resolved')?.count || 0}
          </Text>
        </Paper>
      </SimpleGrid>

      <Grid>
        {/* Incident Types Chart */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Incidents by Type</Text>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* Severity Distribution */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Severity Distribution</Text>
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {severityData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No data available</Text>
            )}
            <Stack gap="xs" mt="sm">
              {severityData.map((item: any) => (
                <Group key={item.name} justify="space-between">
                  <Group gap="xs">
                    <Box w={10} h={10} style={{ borderRadius: '50%', backgroundColor: item.color }} />
                    <Text size="xs">{item.name}</Text>
                  </Group>
                  <Text size="xs" fw={600}>{item.value}</Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Trend Analysis */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Incident Trends (Last 30 Days)</Text>
            {Array.isArray(trendData) && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#FF4444"
                    strokeWidth={2}
                    dot={{ fill: '#FF4444', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No trend data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* Peak Hours */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Peak Incident Hours</Text>
            {Array.isArray(peakHours) && peakHours.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="#FF8800" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* High Risk Locations */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">High Risk Locations</Text>
            {Array.isArray(highRiskLocations) && highRiskLocations.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Incidents</Table.Th>
                    <Table.Th>Risk Level</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {highRiskLocations.slice(0, 10).map((loc: any, idx: number) => {
                    const riskLevel = loc.incident_count > 10 ? 'High' : loc.incident_count > 5 ? 'Medium' : 'Low';
                    const riskColor = riskLevel === 'High' ? 'red' : riskLevel === 'Medium' ? 'yellow' : 'blue';
                    return (
                      <Table.Tr key={loc.camera_id || idx}>
                        <Table.Td>
                          <Text size="sm">{loc.camera_name || `Camera #${loc.camera_id}`}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600}>{loc.incident_count}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={riskColor} variant="light" size="sm">{riskLevel}</Badge>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No location data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* Response Times */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Average Response Times by Incident Type</Text>
            {Array.isArray(responseTimes) && responseTimes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimes} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Minutes', position: 'bottom', fill: '#666' }} />
                  <YAxis type="category" dataKey="incident_type" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                    formatter={(value: number) => [`${(value / 60).toFixed(1)} min`, 'Avg Response Time']}
                  />
                  <Bar dataKey="avg_response_time" fill="#44AAFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No response time data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* Status Distribution */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Text fw={600} size="sm" mb="md">Incident Status Distribution</Text>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1B1E', border: '1px solid #333', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No data available</Text>
            )}
          </Card>
        </Grid.Col>

        {/* Heatmap Placeholder */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="md" radius="md" mb="md">
            <Group justify="space-between" mb="md">
              <Text fw={600} size="sm">Incident Heatmap</Text>
              <Map size={16} color="#666" />
            </Group>
            <Paper
              p="xl"
              ta="center"
              style={{
                height: 250,
                backgroundColor: '#1A1B1E',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #333',
                borderRadius: 8,
              }}
            >
              <Map size={48} color="#444" />
              <Text mt="md" size="sm" c="dimmed">
                GIS Map Integration
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Heatmap visualization requires Leaflet map integration
              </Text>
            </Paper>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
