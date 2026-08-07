import { useState } from 'react';
import {
  Container, Paper, Title, Table, Text, Badge, Group,
  Select, TextInput, Pagination, Stack,
} from '@mantine/core';
import { History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../services/api';
import type { AuditLog } from '../../types';
import { AUDIT_ACTION_LABELS } from '../../utils/constants';

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }));

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, page],
    queryFn: () => auditAPI.list({ action: actionFilter, page }).then(r => r.data),
    refetchInterval: 30000,
  });

  const logs: AuditLog[] = data?.results || [];

  return (
    <Container fluid p="md">
      <Group mb="lg">
        <History size={28} />
        <Title order={2}>Audit Log</Title>
      </Group>

      <Paper p="md" withBorder mb="md">
        <Group>
          <Select
            label="Filter by Action"
            placeholder="All actions"
            data={ACTION_OPTIONS}
            value={actionFilter}
            onChange={setActionFilter}
            clearable
            style={{ minWidth: 250 }}
          />
          <Text size="sm" c="dimmed" mt="lg">{data?.count || 0} total entries</Text>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>Resource</Table.Th>
              <Table.Th>Details</Table.Th>
              <Table.Th>IP</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {logs.map((log: AuditLog) => (
              <Table.Tr key={log.id}>
                <Table.Td><Text size="sm">{new Date(log.created_at).toLocaleString()}</Text></Table.Td>
                <Table.Td><Text size="sm" fw={500}>{log.username || 'System'}</Text></Table.Td>
                <Table.Td><Badge size="sm" variant="light">{AUDIT_ACTION_LABELS[log.action] || log.action}</Badge></Table.Td>
                <Table.Td>
                  <Text size="sm">{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(log.details) || '-'}
                  </Text>
                </Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{log.ip_address || '-'}</Text></Table.Td>
              </Table.Tr>
            ))}
            {logs.length === 0 && (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="xl">No audit logs found</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {data?.count > 25 && (
          <Group justify="center" mt="md">
            <Pagination total={Math.ceil((data?.count || 0) / 25)} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>
    </Container>
  );
}
