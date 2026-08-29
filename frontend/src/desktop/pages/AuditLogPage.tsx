import { useState, useMemo } from 'react';
import {
  Container, Table, Text, Group, Avatar, Stack,
  Button, Box, Pagination, TextInput, Select,
  Badge, Paper, Loader, Center, Tooltip, ScrollArea,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Filter, InfoCircle, RefreshCcw, Search } from '@boxicons/react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../shared/services/api';
import { PageHeader } from '../components/Layout/PageHeader';
import type { AuditLog, AuditAction, PaginatedResponse } from '../../shared/types';

const getDateRange = (key: string | null) => {
  const now = new Date();
  const start = new Date();
  if (!key) return { start: null, end: null };
  switch (key) {
    case 'today': start.setHours(0, 0, 0, 0); break;
    case 'yesterday': start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0); break;
    case '7d': start.setDate(now.getDate() - 7); break;
    case '30d': start.setDate(now.getDate() - 30); break;
    default: return { start: null, end: null };
  }
  return { start: start.toISOString(), end: now.toISOString() };
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateRangeKey, setDateRangeKey] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [debouncedSearch] = useDebouncedValue(search, 400);

  const ACTION_OPTIONS: AuditAction[] = ['Login', 'Logout', 'Incident_Created', 'Incident_Verified', 'Incident_Dispatched', 'Camera_Created', 'User_Created', 'AI_Config_Changed'];

  const { start, end } = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);

  const { data, isLoading, isFetching, refetch } = useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', page, debouncedSearch, start, end, action, status],
    queryFn: () => auditAPI.list({ page, search: debouncedSearch, action, start_date: start, end_date: end, status }).then(r => r.data),
  });

  const handleReset = () => {
    setSearch(''); setDateRangeKey(null); setAction(null); setStatus(null); setPage(1);
  };

  return (
    <Container fluid p="md" style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Stack gap="xl">
        <PageHeader
          title="Audit Trail"
          subtitle="Monitor and review all significant system activities and user actions."
          actions={
            <Group gap="sm">
              {isFetching && <Loader size="xs" color="orange" />}
              <Button variant="outline" color="gray" leftSection={<RefreshCcw width={16} height={16} className={isFetching ? 'animate-spin' : ''} />} onClick={() => refetch()}>Refresh</Button>
            </Group>
          }
        />

        <Paper radius="md" withBorder bg="var(--mantine-color-body)" shadow="sm" style={{ overflow: 'hidden' }}>
          <Group
            p="md"
            justify="space-between"
            gap="md"
            wrap="wrap"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <TextInput
              placeholder="Search user, IP..."
              leftSection={<Search width={16} height={16} />}
              style={{ flex: 1, maxWidth: 400 }}
              radius="md"
              size="md"
              value={search}
              onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            />
            <Group gap="sm" wrap="wrap">
              <Select label="Date" placeholder="All Time" data={['today', 'yesterday', '7d', '30d']} value={dateRangeKey} onChange={(val) => { setDateRangeKey(val); setPage(1); }} clearable size="md" />
              <Select label="Action" placeholder="All" data={ACTION_OPTIONS} value={action} onChange={(val) => { setAction(val); setPage(1); }} clearable searchable size="md" />
              <Select label="Status" placeholder="All" data={['Success', 'Failed']} value={status} onChange={(val) => { setStatus(val); setPage(1); }} clearable size="md" />
              <Button variant="light" color="gray" onClick={handleReset} h={40} mt={22}><Filter width={18} height={18} /></Button>
            </Group>
          </Group>

          <ScrollArea>
            <Table
              verticalSpacing="md"
              horizontalSpacing="md"
              highlightOnHover
              style={{ tableLayout: 'fixed', minWidth: 1200 }}
            >
              <Table.Thead bg="var(--mantine-color-default-hover)">
                <Table.Tr>
                  <Table.Th c="dimmed" style={{ width: 175 }}>Timestamp</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 220 }}>User</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 190 }}>Action</Table.Th>
                  <Table.Th c="dimmed" ta="center" style={{ width: 110 }}>Module</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 270 }}>Description</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 135 }}>IP Address</Table.Th>
                  <Table.Th c="dimmed" ta="center" style={{ width: 100 }}>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Loader /></Center></Table.Td></Table.Tr>
                ) : !data?.results.length ? (
                  <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">No audit logs found.</Text></Center></Table.Td></Table.Tr>
                ) : data.results.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td style={{ width: 175 }}><Text size="sm" c="dimmed" lineClamp={1}>{new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text></Table.Td>
                    <Table.Td style={{ width: 220, maxWidth: 220 }}>
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Avatar radius="xl" size="sm" color="orange">{log.username?.[0].toUpperCase()}</Avatar>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={700} lineClamp={1}>{log.username}</Text>
                          <Text size="xs" c="dimmed">ID: #{log.user || 'System'}</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ width: 190, maxWidth: 190 }}><Text size="sm" lineClamp={1}>{log.action.replace(/_/g, ' ')}</Text></Table.Td>
                    <Table.Td ta="center" style={{ width: 110 }}><Text size="xs" fw={700} c="orange" style={{ textTransform: 'uppercase' }}>{log.resource_type}</Text></Table.Td>
                    <Table.Td style={{ width: 270, maxWidth: 270 }}>
                      <Tooltip label={JSON.stringify(log.details)} multiline w={300}>
                        <Group gap={4} wrap="nowrap" style={{ cursor: 'help', minWidth: 0 }}>
                          <Text size="sm" lineClamp={1} style={{ minWidth: 0 }}>{typeof log.details === 'string' ? log.details : `Modified ${log.resource_type}`}</Text>
                          <InfoCircle width={14} height={14} style={{ flexShrink: 0 }} color="var(--mantine-color-dimmed)" />
                        </Group>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td style={{ width: 135, maxWidth: 135 }}><Text size="xs" ff="monospace" c="dimmed" lineClamp={1}>{log.ip_address || '0.0.0.0'}</Text></Table.Td>
                    <Table.Td ta="center" style={{ width: 100 }}>
                      <Badge variant="light" color={log.action.includes('Rejected') ? 'red' : 'green'} size="sm">
                        {log.action.includes('Rejected') ? 'Failed' : 'Success'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Box p="md" bg="var(--mantine-color-default-hover)" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Showing <b>{data?.results.length || 0}</b> of <b>{data?.count || 0}</b></Text>
              {(data?.count || 0) > 25 && (
                <Pagination total={Math.ceil((data?.count || 0) / 25)} value={page} onChange={setPage} color="orange" size="sm" />
              )}
            </Group>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}