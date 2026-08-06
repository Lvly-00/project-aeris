import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Text,
  Group,
  Title,
  Button,
  Select,
  Stack,
  SimpleGrid,
  Paper,
  Box,
  Badge,
  ActionIcon,
  Tooltip,
  Divider,
  Pagination,
  ThemeIcon,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications as mantineNotifications } from '@mantine/notifications';
import {
  Bell,
  Check,
  CheckCheck,
  TriangleAlert,
  Info,
  AlertCircle,
  Mail,
  MailOpen,
  Filter,
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/helpers';
import { PRIORITY_COLORS } from '../utils/constants';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<string | null>(null);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', typeFilter, readFilter],
    queryFn: async () => {
      const params: any = { ordering: '-created_at' };
      if (typeFilter) params.notification_type = typeFilter;
      if (readFilter === 'unread') params.is_read = 'false';
      else if (readFilter === 'read') params.is_read = 'true';
      const res = await notificationsAPI.list(params);
      return { results: res.data.results || res.data, count: res.data.count || 0 };
    },
    refetchInterval: 15000,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const res = await notificationsAPI.unreadCount();
      return res.data.count || 0;
    },
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      mantineNotifications.show({ title: 'Success', message: 'All notifications marked as read', color: 'green' });
    },
  });

  const notifications = notificationsData?.results || [];
  const totalCount = notificationsData?.count || 0;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'Alert': return <TriangleAlert size={16} />;
      case 'Warning': return <AlertCircle size={16} />;
      case 'Info': return <Info size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'Alert': return 'red';
      case 'Warning': return 'yellow';
      case 'Info': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Group>
          <Title order={3}>Notifications</Title>
          {unreadCount > 0 && (
            <Badge color="red" size="lg">{unreadCount} Unread</Badge>
          )}
        </Group>
        <Group>
          <Button
            variant="light"
            leftSection={<CheckCheck size={16} />}
            onClick={() => markAllReadMutation.mutate()}
            disabled={!unreadCount}
            loading={markAllReadMutation.isPending}
          >
            Mark All Read
          </Button>
        </Group>
      </Group>

      <Group mb="md" gap="sm">
        <Select
          placeholder="Filter by Type"
          data={[
            { value: 'Alert', label: 'Alerts' },
            { value: 'Warning', label: 'Warnings' },
            { value: 'Info', label: 'Info' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          size="sm"
          style={{ width: 180 }}
        />
        <Select
          placeholder="Filter by Status"
          data={[
            { value: 'unread', label: 'Unread' },
            { value: 'read', label: 'Read' },
          ]}
          value={readFilter}
          onChange={setReadFilter}
          clearable
          size="sm"
          style={{ width: 180 }}
        />
      </Group>

      <Stack gap="sm">
        {notifications.length > 0 ? (
          notifications.map((notif: any) => (
            <Card
              key={notif.id}
              withBorder
              padding="md"
              radius="md"
              style={{
                opacity: notif.is_read ? 0.7 : 1,
                borderLeft: `4px solid ${
                  notif.priority === 'Critical' ? '#FF4444' :
                  notif.priority === 'High' ? '#FF8800' :
                  notif.priority === 'Medium' ? '#FFAA00' : '#666'
                }`,
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon
                    color={typeColor(notif.notification_type)}
                    variant="light"
                    size="md"
                  >
                    {typeIcon(notif.notification_type)}
                  </ThemeIcon>
                  <Badge
                    color={typeColor(notif.notification_type)}
                    variant="light"
                    size="sm"
                  >
                    {notif.notification_type}
                  </Badge>
                  {!notif.is_read && (
                    <Badge color="red" variant="dot" size="sm">New</Badge>
                  )}
                </Group>
                <Group gap="xs">
                  <Badge
                    color={PRIORITY_COLORS[notif.priority] || 'gray'}
                    variant="filled"
                    size="sm"
                  >
                    {notif.priority}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {formatRelativeTime(notif.created_at)}
                  </Text>
                  {!notif.is_read && (
                    <Tooltip label="Mark as read">
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => markReadMutation.mutate(notif.id)}
                      >
                        <Check size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>
              <Text fw={600} size="sm" mb={4}>
                {notif.title}
              </Text>
              <Text size="sm" c="dimmed">
                {notif.message}
              </Text>
              {notif.incident && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={() => navigate(`/incidents/${notif.incident}`)}
                >
                  View Incident
                </Button>
              )}
            </Card>
          ))
        ) : (
          <Paper p="xl" ta="center" withBorder>
            <Bell size={48} color="#444" />
            <Text mt="md" size="lg" fw={500}>
              No Notifications
            </Text>
            <Text size="sm" c="dimmed">
              {unreadCount > 0 ? 'Loading...' : 'No notifications yet. Notifications will appear here when incidents are detected.'}
            </Text>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
