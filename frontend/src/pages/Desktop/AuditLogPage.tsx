import { useState, useMemo } from 'react';
import {
  Container, Table, Text, Group, Avatar, Stack, 
  Button, Box, Pagination, TextInput, Select, 
  Badge, Paper, Grid, Loader, Center, Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Search, RefreshCw, FilterX, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../services/api';
import { PageHeader } from '../../components/Layout/PageHeader'; 
import type { AuditLog, AuditAction, PaginatedResponse } from '../../types';

// Helper to format Date Range for API
const getDateRange = (key: string | null) => {
  const now = new Date();
  const start = new Date();
  if (!key) return { start: null, end: null };

  switch (key) {
    case 'today': 
      start.setHours(0, 0, 0, 0); 
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0); // End of yesterday is start of today
      break;
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    default: return { start: null, end: null };
  }
  return { start: start.toISOString(), end: now.toISOString() };
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [dateRangeKey, setDateRangeKey] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [module, setModule] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [debouncedSearch] = useDebouncedValue(search, 400);

  // Map AuditAction enum to UI options
  const ACTION_OPTIONS: AuditAction[] = [
    'Login', 'Logout', 'Incident_Created', 'Incident_Verified', 'Incident_Dispatched', 
    'Camera_Created', 'User_Created', 'Report_Generated', 'AI_Config_Changed'
  ];

  const MODULE_OPTIONS = [
    { label: 'Authentication', value: 'User' },
    { label: 'Incidents', value: 'Incident' },
    { label: 'Cameras', value: 'Camera' },
    { label: 'Reports', value: 'Report' },
    { label: 'System', value: 'Configuration' },
  ];

  const { start, end } = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', page, debouncedSearch, start, end, action, module, status],
    queryFn: () => auditAPI.list({ 
      page, 
      search: debouncedSearch, 
      action, 
      resource_type: module,
      start_date: start,
      end_date: end,
      status // Assuming backend handles status filter from details or separate field
    }).then(r => r.data),
  });

  const handleReset = () => {
    setSearch('');
    setDateRangeKey(null);
    setAction(null);
    setModule(null);
    setStatus(null);
    setPage(1);
  };

  return (
    <Container fluid p="md" bg="#f8f9fa" style={{ minHeight: '100vh' }}>
      <PageHeader
        title="AUDIT TRAIL"
        subtitle="Monitor and review all significant system activities and user actions."
        actions={
          <Group gap="sm">
            {isFetching && <Loader size="xs" color="orange" />}
            <Button 
              variant="outline" 
              color="gray" 
              leftSection={<RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />} 
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Group>
        }
      />

      {/* 4. FILTERS */}
      <Paper p="md" withBorder radius="md" mb="xl" shadow="xs">
        <Grid gutter="md" align="flex-end">
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Search"
              placeholder="Search user, IP address..."
              leftSection={<Search size={16} />}
              value={search}
              onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 6, md: 2 }}>
            <Select
              label="Date"
              placeholder="All Time"
              data={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
              ]}
              value={dateRangeKey}
              onChange={(val) => { setDateRangeKey(val); setPage(1); }}
              clearable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 2 }}>
            <Select
              label="Action"
              placeholder="All Actions"
              data={ACTION_OPTIONS}
              value={action}
              onChange={(val) => { setAction(val); setPage(1); }}
              clearable
              searchable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 2 }}>
            <Select
              label="Module"
              placeholder="All Modules"
              data={MODULE_OPTIONS}
              value={module}
              onChange={(val) => { setModule(val); setPage(1); }}
              clearable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, md: 2 }}>
            <Select
              label="Status"
              placeholder="All"
              data={['Success', 'Failed']}
              value={status}
              onChange={(val) => { setStatus(val); setPage(1); }}
              clearable
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 1 }}>
            <Tooltip label="Clear Filters">
              <Button variant="light" color="gray" fullWidth onClick={handleReset}>
                <FilterX size={18} />
              </Button>
            </Tooltip>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* TABLE */}
      <Paper withBorder radius="md" shadow="sm" style={{ overflow: 'hidden' }}>
        <Table verticalSpacing="md" highlightOnHover>
          <Table.Thead bg="#fcfcfc">
            <Table.Tr>
              <Table.Th style={{ color: '#868e96', width: 180 }}>Timestamp</Table.Th>
              <Table.Th style={{ color: '#868e96', width: 220 }}>User</Table.Th>
              <Table.Th style={{ color: '#868e96' }}>Action</Table.Th>
              <Table.Th style={{ color: '#868e96' }}>Module</Table.Th>
              <Table.Th style={{ color: '#868e96' }}>Description</Table.Th>
              <Table.Th style={{ color: '#868e96' }}>IP Address</Table.Th>
              <Table.Th style={{ color: '#868e96' }}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Loader /></Center></Table.Td></Table.Tr>
            ) : data?.results.map((log) => (
              <Table.Tr key={log.id}>
                {/* Timestamp */}
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </Table.Td>

                {/* User Column (Rich Layout) */}
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar radius="xl" size="sm" color="orange">
                      {log.username?.[0].toUpperCase()}
                    </Avatar>
                    <Stack gap={0}>
                      <Text size="sm" fw={700} c="dark.4">{log.username}</Text>
                      <Text size="xs" c="dimmed">ID: #{log.user || 'System'}</Text>
                    </Stack>
                  </Group>
                </Table.Td>

                {/* Action */}
                <Table.Td>
                  <Text size="sm" c="dark.3">{log.action.replace(/_/g, ' ')}</Text>
                </Table.Td>

                {/* Module (Orange & Bold) */}
                <Table.Td>
                  <Text size="sm" fw={700} c="#fd7e14" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    {log.resource_type}
                  </Text>
                </Table.Td>

                {/* Description (Details) */}
                <Table.Td>
                  <Tooltip label={JSON.stringify(log.details, null, 2)} multiline w={300} withArrow>
                    <Group gap={4}>
                      <Text size="sm" lineClamp={1} style={{ maxWidth: 250 }}>
                        {typeof log.details === 'string' ? log.details : `Modified ${log.resource_type} #${log.resource_id}`}
                      </Text>
                      <Info size={14} color="#adb5bd" />
                    </Group>
                  </Tooltip>
                </Table.Td>

                {/* IP Address */}
                <Table.Td>
                  <Text size="xs" ff="monospace" c="dimmed">{log.ip_address || '0.0.0.0'}</Text>
                </Table.Td>

                {/* Status (Based on typical audit outcomes) */}
                <Table.Td>
                  <Badge 
                    variant="light" 
                    color={log.action.includes('Rejected') || log.action.includes('Deactivated') ? 'red' : 'green'}
                    size="sm"
                  >
                    {log.action.includes('Rejected') ? 'Failed' : 'Success'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Box p="md" bg="#fcfcfc" style={{ borderTop: '1px solid #e9ecef' }}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing <b>{data?.results.length || 0}</b> of <b>{data?.count || 0}</b> entries
            </Text>
            <Pagination 
              total={Math.ceil((data?.count || 0) / 25)} 
              value={page} 
              onChange={setPage} 
              color="orange" 
              size="sm" 
            />
          </Group>
        </Box>
      </Paper>
    </Container>
  );
}