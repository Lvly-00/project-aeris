import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  rem,
} from '@mantine/core';
import { Trash } from '@boxicons/react';
import { notifications } from '@mantine/notifications';

import { dispatchMessagesAPI } from '../../../shared/services/api';
import type { DispatchMessage } from '../../../shared/types';
import { MessageListHeader } from '../../components/tanod/messages/MessageListHeader';
import { MessageListSkeleton } from '../../components/tanod/messages/MessageListSkeleton';
import { MessageEmptyState } from '../../components/tanod/messages/MessageEmptyState';
import { DispatchMessageCard } from '../../components/tanod/messages/DispatchMessageCard';
import { DeleteConfirmModal } from '../../components/commons/DeleteConfirmModal';

/* Same band as the Incidents page: the list scrolls, the header stays put. */
const VIEWPORT_BAND =
  'calc(100dvh - var(--app-shell-header-offset, 70px) - var(--app-shell-footer-offset, 85px))';

export default function MessagesPage() {
  const queryClient = useQueryClient();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-messages'],
    queryFn: () => dispatchMessagesAPI.list(),
    // WebSocket `message_new` events invalidate this key; polling covers any
    // event missed while the socket reconnects.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const messages = useMemo<DispatchMessage[]>(() => {
    const rows: DispatchMessage[] = data?.data?.results ?? data?.data ?? [];

    // One card per message, newest first, even if the API repeats a row.
    const seen = new Set<number>();
    return rows
      .filter((message) => (seen.has(message.id) ? false : (seen.add(message.id), true)))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [data]);

  const unreadCount = messages.filter((message) => !message.is_read).length;

  const allSelected = messages.length > 0 && selectedIds.length === messages.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < messages.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : messages.map((message) => message.id));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const selectedMessages = messages.filter((message) => selectedIds.includes(message.id));

  const handleDeleteSelected = async () => {
    const ids = selectedIds;
    setDeleting(true);

    try {
      await Promise.all(ids.map((id) => dispatchMessagesAPI.delete(id)));

      queryClient.invalidateQueries({ queryKey: ['dispatch-messages'] });
      exitSelectMode();
      setDeleteOpened(false);

      notifications.show({
        title: 'Deleted',
        message: `${ids.length} message${ids.length === 1 ? '' : 's'} removed successfully`,
        color: 'red',
      });
    } catch (error) {
      console.error('[MESSAGES] Delete selected failed:', error);

      notifications.show({
        title: 'Error',
        message: 'Failed to delete the selected messages',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container
      size="sm"
      px={0}
      py="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: VIEWPORT_BAND,
        overflow: 'hidden',
      }}
    >
      <MessageListHeader
        unreadCount={unreadCount}
        onDeleteClick={selectMode ? undefined : () => setSelectMode(true)}
        deleteDisabled={messages.length === 0}
      />

      {/* Selection bar, mirroring the Incidents page. */}
      {selectMode && (
        <Paper radius="md" py={rem(6)} mb="md" style={{ flexShrink: 0 }}>
          <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
            <Checkbox
              label={`Select all (${messages.length})`}
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleSelectAll}
              radius="sm"
              styles={{ label: { fontWeight: 600 } }}
            />

            <Group gap="xs" wrap="nowrap">
              <Button variant="subtle" color="gray" onClick={exitSelectMode}>
                Cancel
              </Button>

              <Button
                color="red"
                leftSection={<Trash width={16} height={16} />}
                disabled={selectedIds.length === 0}
                onClick={() => setDeleteOpened(true)}
              >
                Delete ({selectedIds.length})
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Stack
        gap="md"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: rem(6),
        }}
      >
        {isLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <MessageEmptyState />
        ) : (
          messages.map((message) => (
            <Group key={message.id} wrap="nowrap" align="center" gap="xs">
              {selectMode && (
                <Checkbox
                  checked={selectedIds.includes(message.id)}
                  onChange={() => toggleSelect(message.id)}
                  radius="sm"
                  aria-label={`Select message: ${message.title}`}
                />
              )}

              <Box style={{ flex: 1, minWidth: 0 }}>
                <DispatchMessageCard
                  message={message}
                  onSelect={selectMode ? () => toggleSelect(message.id) : undefined}
                  selected={selectedIds.includes(message.id)}
                />
              </Box>
            </Group>
          ))
        )}
      </Stack>

      <DeleteConfirmModal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        onConfirm={handleDeleteSelected}
        loading={deleting}
        title={selectedIds.length === 1 ? 'Delete Message' : 'Delete Messages'}
        description={
          selectedIds.length === 1 ? (
            <>
              Are you sure you want to delete{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {selectedMessages[0]?.title ?? 'this message'}
              </Text>
              ? This action cannot be undone.
            </>
          ) : (
            <>
              Delete{' '}
              <Text span fw={600} c="var(--mantine-color-text)">
                {selectedIds.length} selected messages
              </Text>
              ? This action cannot be undone.
            </>
          )
        }
        items={selectedMessages.map((message) => message.title)}
        noun="Message"
        listTitle="Messages to be deleted"
        confirmLabel={`Delete (${selectedIds.length})`}
      />
    </Container>
  );
}
