import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, Text, Group, SimpleGrid, Badge, Table, Progress,
  Button, Title, Stack, Box, Paper, ThemeIcon, Alert, RingProgress,
  Center, Tooltip, ScrollArea,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  TriangleAlert, Camera, Lightbulb, Bell, Clock, List, BarChart3,
  MapPin, Siren, Users, CheckCircle, XCircle, Activity, Eye,
  TrendingUp, AlertTriangle, Shield, Radio, Wifi, WifiOff,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { incidentsAPI, camerasAPI, notificationsAPI, recommendationsAPI, analyticsAPI, dispatchAPI } from '../../shared/services/api';
import { formatRelativeTime, formatConfidence, formatDuration } from '../../shared/utils/helpers';
import { INCIDENT_COLORS, SEVERITY_COLORS, STATUS_COLORS, DISPATCH_STATUS_COLORS } from '../../shared/utils/constants';
import type { Incident, Dispatch } from '../../shared/types';

function GlassCard({ children, color, onClick, style }: any) {
  return (
    <Paper
      p="md"
      radius="md"
      style={{
        background: `linear-gradient(135deg, rgba(26,27,30,0.9) 0%, rgba(37,38,43,0.8) 100%)`,
        border: `1px solid ${color || '#373A40'}`,
        backdropFilter: 'blur(12px)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${color || '#373A40'}40`; }}}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}}
      onClick={onClick}
    >
      {children}
    </Paper>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [incidents, cameras, pendingRecs] = await Promise.all([
        incidentsAPI.dashboardStats(),
        camerasAPI.list(),
        recommendationsAPI.list({ is_accepted: 'null' }).catch(() => ({ data: { count: 0 } })),
      ]);
      const stats = incidents.data;
      const camData = cameras.data;
      const recData = pendingRecs.data;
      return {
        active_incidents: stats.active_incidents || 0,
        total_incidents: stats.total_incidents || 0,
        total_cameras: camData.count || camData.length || 0,
        online_cameras: Array.isArray(camData) ? camData.filter((c: any) => c.status === 'Online').length : camData.results?.filter((c: any) => c.status === 'Online').length || 0,
        pending_recommendations: recData.count || recData.length || 0,
        today_incidents: stats.today_incidents || 0,
        avg_response_time: stats.avg_response_time || 0,
      };
    },
    refetchInterval: 10000,
  });

  const { data: criticalIncidents } = useQuery({
    queryKey: ['critical-incidents'],
    queryFn: async () => {
      const res = await incidentsAPI.list({ severity: 'Critical', status__in: 'Detected,Pending_Verification,Verified,Dispatched,Responding' });
      return (res.data.results || res.data) as Incident[];
    },
    refetchInterval: 10000,
  });

  const { data: recentIncidents } = useQuery({
    queryKey: ['recent-incidents'],
    queryFn: async () => {
      const res = await incidentsAPI.list({ ordering: '-detected_at', limit: 8 });
      return res.data.results || res.data;
    },
    refetchInterval: 10000,
  });

  const { data: incidentSummary } = useQuery({
    queryKey: ['incident-summary'],
    queryFn: async () => { const res = await analyticsAPI.incidentSummary(); return res.data; },
    refetchInterval: 30000,
  });

  const { data: dispatches } = useQuery({
    queryKey: ['dashboard-dispatches'],
    queryFn: async () => {
      const res = await dispatchAPI.listDispatches({ status__in: 'Pending,Accepted,En_Route,On_Scene' });
      return (res.data.results || []) as Dispatch[];
    },
    refetchInterval: 10000,
  });

  const { data: trendData } = useQuery({
    queryKey: ['trend-data'],
    queryFn: async () => {
      const res = await analyticsAPI.trendAnalysis();
      return res.data as { date: string; count: number }[];
    },
    refetchInterval: 60000,
  });

  const activeStatuses = ['Detected', 'Pending_Verification', 'Verified', 'Dispatched', 'Responding'];
  const critCount = (criticalIncidents || []).length;

  const statusData: { name: string; value: number; color: string }[] = incidentSummary?.by_status
    ? incidentSummary.by_status.map((item: any) => ({
        name: item.status || item.name, value: item.count || item.value,
        color: STATUS_COLORS[item.status || item.name] || '#888',
      }))
    : [];

  const severityData = incidentSummary?.by_severity
    ? incidentSummary.by_severity.map((item: any) => ({
        name: item.severity || item.name, value: item.count || item.value,
        color: SEVERITY_COLORS[item.severity || item.name] || '#888',
      }))
    : [];

  const typeData = incidentSummary?.by_type
    ? incidentSummary.by_type.map((item: any) => ({
        name: item.incident_type || item.name, value: item.count || item.value,
        color: INCIDENT_COLORS[item.incident_type || item.name] || '#888',
      }))
    : [];

  const activeDispatchCount = (dispatches || []).filter(d => d.status !== 'Completed' && d.status !== 'Cancelled').length;

  const percentOnline = dashboardStats?.total_cameras ? Math.round((dashboardStats.online_cameras / dashboardStats.total_cameras) * 100) : 0;

  return (
    <Box p="md">
      {/* Critical Alert Banner */}
      {critCount > 0 && (
        <Alert
          icon={<AlertTriangle size={20} />}
          color="red"
          variant="filled"
          mb="md"
          style={{ border: '2px solid #FF4444', animation: 'pulse 2s infinite' }}
          onClick={() => navigate('/incidents?severity=Critical')}
        >
          <Group justify="space-between">
            <Text fw={700}>{critCount} Critical Incident{critCount > 1 ? 's' : ''} Require Immediate Attention</Text>
            <Button variant="white" size="xs" onClick={() => navigate('/incidents?severity=Critical')}>
              View All
            </Button>
          </Group>
        </Alert>
      )}

      {/* Command Bar */}
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <Siren size={28} color="#FF4444" />
          <Title order={3}>Command Center</Title>
          <Badge size="lg" variant="dot" color={percentOnline >= 80 ? 'green' : 'yellow'} ml="sm">
            {percentOnline}% System Online
          </Badge>
        </Group>
        <Group>
          <Button variant="light" color="red" leftSection={<TriangleAlert size={16} />} onClick={() => navigate('/incidents')}>
            Active Incidents
          </Button>
          <Button variant="light" leftSection={<BarChart3 size={16} />} onClick={() => navigate('/analytics')}>
            Analytics
          </Button>
        </Group>
      </Group>

      {/* Glassmorphism Stat Cards */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb="lg">
        <GlassCard color="#FF4444" onClick={() => navigate('/incidents')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Active</Text>
            <ThemeIcon color="red" variant="light" size="sm" radius="xl"><TriangleAlert size={14} /></ThemeIcon>
          </Group>
          <Text fw={700} size="xl" c="red.4">{dashboardStats?.active_incidents || 0}</Text>
          <Text size="xs" c="dimmed">{dashboardStats?.today_incidents || 0} today</Text>
        </GlassCard>

        <GlassCard color={critCount > 0 ? '#FF4444' : '#40C057'} onClick={() => navigate('/incidents?severity=Critical')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Critical</Text>
            <ThemeIcon color={critCount > 0 ? 'red' : 'green'} variant="light" size="sm" radius="xl"><AlertTriangle size={14} /></ThemeIcon>
          </Group>
          <Text fw={700} size="xl" c={critCount > 0 ? 'red.4' : 'green.4'}>{critCount}</Text>
          <Text size="xs" c="dimmed">active critical</Text>
        </GlassCard>

        <GlassCard color="#228BE6" onClick={() => navigate('/cameras')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Cameras</Text>
            <ThemeIcon color="blue" variant="light" size="sm" radius="xl"><Camera size={14} /></ThemeIcon>
          </Group>
          <Group gap="xs">
            <Text fw={700} size="xl" c="blue.4">{dashboardStats?.online_cameras || 0}</Text>
            <Text size="sm" c="dimmed">/ {dashboardStats?.total_cameras || 0}</Text>
          </Group>
          <Group gap={4}>
            <Wifi size={12} color="#40C057" />
            <Text size="xs" c="dimmed">{percentOnline}% online</Text>
          </Group>
        </GlassCard>

        <GlassCard color="#BE4BDB" onClick={() => navigate('/dispatch')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Dispatch</Text>
            <ThemeIcon color="grape" variant="light" size="sm" radius="xl"><Users size={14} /></ThemeIcon>
          </Group>
          <Text fw={700} size="xl" c="grape.4">{activeDispatchCount}</Text>
          <Text size="xs" c="dimmed">active dispatches</Text>
        </GlassCard>

        <GlassCard color="#FAB005" onClick={() => navigate('/recommendations')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Pending AI Recs</Text>
            <ThemeIcon color="yellow" variant="light" size="sm" radius="xl"><Lightbulb size={14} /></ThemeIcon>
          </Group>
          <Text fw={700} size="xl" c="yellow.4">{dashboardStats?.pending_recommendations || 0}</Text>
          <Text size="xs" c="dimmed">awaiting review</Text>
        </GlassCard>

        <GlassCard color="#7950F2" onClick={() => navigate('/analytics')}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Response Time</Text>
            <ThemeIcon color="violet" variant="light" size="sm" radius="xl"><Clock size={14} /></ThemeIcon>
          </Group>
          <Text fw={700} size="xl" c="violet.4">{dashboardStats?.avg_response_time ? formatDuration(dashboardStats.avg_response_time) : 'N/A'}</Text>
          <Text size="xs" c="dimmed">average</Text>
        </GlassCard>
      </SimpleGrid>

      <Grid>
        {/* Left Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Active Incidents Table */}
          <GlassCard color="#373A40" mb="md" style={{ padding: 0 }}>
            <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #373A40' }}>
              <Group gap="xs">
                <Activity size={16} color="#FF4444" />
                <Text fw={600} size="sm">Active Incidents</Text>
              </Group>
              <Button variant="subtle" size="xs" rightSection={<List size={14} />} onClick={() => navigate('/incidents')}>
                View All
              </Button>
            </Group>
            <Box p="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Severity</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Confidence</Table.Th>
                    <Table.Th>Camera</Table.Th>
                    <Table.Th>Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Array.isArray(recentIncidents) && recentIncidents.length > 0 ? (
                    recentIncidents.slice(0, 6).map((inc: any) => (
                      <Table.Tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/incidents/${inc.id}`)}>
                        <Table.Td>
                          <Badge color={INCIDENT_COLORS[inc.incident_type] || 'gray'} variant="light" size="sm">
                            {inc.incident_type?.replace(/_/g, ' ')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={SEVERITY_COLORS[inc.severity]} variant="filled" size="sm">{inc.severity}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLORS[inc.status]} variant="light" size="sm">
                            {inc.status.replace(/_/g, ' ')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Progress value={inc.confidence_score * 100} size="sm"
                              color={inc.confidence_score > 0.7 ? 'red' : inc.confidence_score > 0.5 ? 'yellow' : 'blue'}
                              style={{ flex: 1, minWidth: 60 }} />
                            <Text size="xs">{formatConfidence(inc.confidence_score)}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td><Text size="sm">{inc.camera_name || '-'}</Text></Table.Td>
                        <Table.Td><Text size="xs">{formatRelativeTime(inc.detected_at)}</Text></Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="xl">No active incidents</Text></Table.Td></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          </GlassCard>

          {/* Trend & Distribution Charts */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <GlassCard color="#373A40">
                <Group gap="xs" mb="md">
                  <TrendingUp size={16} color="#40C057" />
                  <Text fw={600} size="sm">Incident Trend (7 days)</Text>
                </Group>
                {trendData && trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendData.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || ''} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="count" stroke="#FF4444" fill="#FF444420" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Center h={180}><Text c="dimmed" size="sm">No trend data</Text></Center>
                )}
              </GlassCard>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <GlassCard color="#373A40">
                <Group gap="xs" mb="md">
                  <BarChart3 size={16} color="#228BE6" />
                  <Text fw={600} size="sm">By Type</Text>
                </Group>
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={typeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} tickFormatter={(v) => v.replace(/_/g, ' ')} />
                      <RechartsTooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {typeData.map((entry: any, i: number) => (<Cell key={i} fill={entry.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Center h={180}><Text c="dimmed" size="sm">No data</Text></Center>
                )}
              </GlassCard>
            </Grid.Col>
          </Grid>
        </Grid.Col>

        {/* Right Column */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          {/* Status Distribution */}
          <GlassCard color="#373A40" mb="md">
            <Group gap="xs" mb="md">
              <BarChart3 size={16} />
              <Text fw={600} size="sm">Status Distribution</Text>
            </Group>
            {statusData.length > 0 ? (
              <Center>
                <RingProgress
                  size={140}
                  thickness={20}
                  sections={statusData.filter(s => s.value > 0).map(s => ({ value: (s.value / Math.max(1, statusData.reduce((a: number, b: any) => a + b.value, 0))) * 100, color: s.color }))}
                  label={<Text ta="center" size="xs" fw={700}>{statusData.reduce((a: number, b: any) => a + b.value, 0)}</Text>}
                />
              </Center>
            ) : (
              <Center h={140}><Text c="dimmed" size="sm">No data</Text></Center>
            )}
            <Stack gap={4} mt="sm">
              {statusData.sort((a: any, b: any) => b.value - a.value).map((item: any) => (
                <Group key={item.name} justify="space-between" gap="xs">
                  <Group gap={6}>
                    <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: item.color }} />
                    <Text size="xs">{item.name.replace(/_/g, ' ')}</Text>
                  </Group>
                  <Text size="xs" fw={600}>{item.value}</Text>
                </Group>
              ))}
            </Stack>
          </GlassCard>

          {/* Active Dispatches */}
          <GlassCard color="#373A40" mb="md">
            <Group gap="xs" mb="md">
              <Radio size={16} color="#BE4BDB" />
              <Text fw={600} size="sm">Active Dispatches</Text>
            </Group>
            {(dispatches || []).length > 0 ? (
              <Stack gap="xs">
                {(dispatches || []).slice(0, 4).map((d: Dispatch) => (
                  <Paper key={d.id} p="xs" style={{ background: '#25262B', border: '1px solid #373A40' }}>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" fw={500}>{d.dispatcher_name}</Text>
                      <Badge size="sm" color={DISPATCH_STATUS_COLORS[d.status] || 'gray'} variant="light">
                        {d.status.replace(/_/g, ' ')}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">{d.incident_type.replace(/_/g, ' ')} — {d.incident_severity}</Text>
                  </Paper>
                ))}
                <Button variant="subtle" size="xs" fullWidth onClick={() => navigate('/dispatch')}>
                  View All Dispatches
                </Button>
              </Stack>
            ) : (
              <Text ta="center" c="dimmed" py="md" size="sm">No active dispatches</Text>
            )}
          </GlassCard>

          {/* System Health */}
          <GlassCard color="#373A40">
            <Group gap="xs" mb="md">
              <Shield size={16} color="#40C057" />
              <Text fw={600} size="sm">System Health</Text>
            </Group>
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  <Camera size={14} color="#666" />
                  <Text size="xs">Cameras Online</Text>
                </Group>
                <Group gap={4}>
                  <Text size="sm" fw={600}>{dashboardStats?.online_cameras || 0}/{dashboardStats?.total_cameras || 0}</Text>
                  {percentOnline >= 80 ? <Wifi size={14} color="#40C057" /> : <WifiOff size={14} color="#FF4444" />}
                </Group>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <Activity size={14} color="#666" />
                  <Text size="xs">Total Incidents</Text>
                </Group>
                <Text size="sm" fw={600}>{dashboardStats?.total_incidents || 0}</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <CheckCircle size={14} color="#666" />
                  <Text size="xs">Resolved</Text>
                </Group>
                <Text size="sm" fw={600}>
                  {statusData.find((s: any) => s.name === 'Resolved')?.value || 0}
                </Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <Clock size={14} color="#666" />
                  <Text size="xs">Avg Resolution</Text>
                </Group>
                <Text size="sm" fw={600}>{dashboardStats?.avg_response_time ? formatDuration(dashboardStats.avg_response_time) : 'N/A'}</Text>
              </Group>
            </Stack>
          </GlassCard>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
