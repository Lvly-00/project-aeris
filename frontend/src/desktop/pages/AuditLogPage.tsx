import { useState, useMemo } from 'react';
import {
  Container, Table, Text, Group, Avatar, Stack,
  Button, Box, Pagination, TextInput, Select,
  Paper, Loader, Center, ScrollArea,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { CalendarAlt, Clock, Filter, Search } from '@boxicons/react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../shared/services/api';
import { resolveMediaUrl } from '../../shared/utils/mediaUrl';
import { PageHeader } from '../components/Layout/PageHeader';
import type { AuditLog, AuditAction, PaginatedResponse } from '../../shared/types';

const FALLBACK_ACTIONS: AuditAction[] = ['Login', 'Logout', 'Incident_Created', 'Incident_Verified', 'Incident_Dispatched', 'Camera_Created', 'User_Created', 'AI_Config_Changed'];

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
  const [debouncedSearch] = useDebouncedValue(search, 400);

  const { data: actionOptions } = useQuery<string[]>({
    queryKey: ['audit-actions'],
    queryFn: () => auditAPI.actions().then(r => r.data),
  });

  const ACTION_OPTIONS = (actionOptions?.length ? actionOptions : FALLBACK_ACTIONS).map((value) => ({
    value,
    label: value.replace(/_/g, ' '),
  }));

  const { start, end } = useMemo(() => getDateRange(dateRangeKey), [dateRangeKey]);

  const { data, isLoading } = useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', page, debouncedSearch, start, end, action],
    queryFn: () => auditAPI.list({ page, search: debouncedSearch, action, start_date: start, end_date: end }).then(r => r.data),
  });

  const handleReset = () => {
    setSearch(''); setDateRangeKey(null); setAction(null); setPage(1);
  };

  return (
    <Container fluid p="md" style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
      <Stack gap="xl">
        <PageHeader
          title="Audit Trail"
          subtitle="Monitor and review all significant system activities and user actions."
        />

        <Paper radius="md" withBorder bg="var(--mantine-color-body)" shadow="sm" style={{ overflow: 'hidden' }}>
          <Group
            p="md"
            align="flex-end"
            gap="md"
            wrap="wrap"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <TextInput
              label="Search"
              placeholder="Search user, IP..."
              leftSection={<Search width={16} height={16} />}
              style={{ flex: 1.4, minWidth: 240 }}
              radius="md"
              size="md"
              value={search}
              onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            />
            <Select label="Date" placeholder="All Time" data={['today', 'yesterday', '7d', '30d']} value={dateRangeKey} onChange={(val) => { setDateRangeKey(val); setPage(1); }} clearable size="md" style={{ flex: 1, minWidth: 160 }} />
            <Select label="Action" placeholder="All" data={ACTION_OPTIONS} value={action} onChange={(val) => { setAction(val); setPage(1); }} clearable searchable size="md" style={{ flex: 1, minWidth: 160 }} />
            <Button variant="light" color="gray" onClick={handleReset} h={40} leftSection={<Filter width={16} height={16} />}>Reset</Button>
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
                  <Table.Th c="dimmed" style={{ width: 220 }}>NAME</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 175 }}>TIMESTAMP</Table.Th>
                  <Table.Th c="dimmed" ta="center" style={{ width: 110 }}>MODULE</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 190 }}>DESCRIPTION</Table.Th>
                  <Table.Th c="dimmed" style={{ width: 135 }}>IP ADDRESS</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Loader /></Center></Table.Td></Table.Tr>
                ) : !data?.results.length ? (
                  <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">No audit logs found.</Text></Center></Table.Td></Table.Tr>
                ) : data.results.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td style={{ width: 220, maxWidth: 220 }}>
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Avatar
                          radius="xl"
                          size="sm"
                          color="orange"
                          src={resolveMediaUrl(log.profile_picture)}
                        >{log.username?.[0].toUpperCase()}</Avatar>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={700} lineClamp={1}>{log.username}</Text>
                          <Text size="xs" c="dimmed" tt="capitalize">{log.user_role || 'System'}</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ width: 175 }}>
                      <Box style={{ minWidth: 0 }}>
                          <Group gap={6} wrap="nowrap">
                            <CalendarAlt width={16} height={16} style={{ flexShrink: 0 }} color="var(--mantine-color-dimmed)" />
                            <Text size="sm" lineClamp={1}>{new Date(log.created_at).toLocaleDateString([], { dateStyle: 'medium' })}</Text>
                          </Group>
                          <Group gap={6} wrap="nowrap">
                            <Clock width={16} height={16} style={{ flexShrink: 0 }} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed">{new Date(log.created_at).toLocaleTimeString([], { timeStyle: 'short' })}</Text>
                          </Group>
                        </Box>
                    </Table.Td>

                    <Table.Td ta="center" style={{ width: 110 }}><Text size="xs" fw={700} c="orange" style={{ textTransform: 'uppercase' }}>{log.resource_type}</Text></Table.Td>
                    <Table.Td style={{ width: 190, maxWidth: 190 }}><Text size="sm" lineClamp={1}>{log.action.replace(/_/g, ' ')}</Text></Table.Td>

                    <Table.Td style={{ width: 135, maxWidth: 135 }}><Text size="xs" ff="monospace" c="dimmed" lineClamp={1}>{log.ip_address || '0.0.0.0'}</Text></Table.Td>

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