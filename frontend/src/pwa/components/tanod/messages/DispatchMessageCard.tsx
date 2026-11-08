import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Group, Paper, Stack, Text, UnstyledButton, rem } from '@mantine/core';

import { formatDate, formatRelativeTime } from '../../../../shared/utils/helpers';
import { resolveMediaUrl } from '../../../../shared/utils/mediaUrl';
import type { DispatchMessage } from '../../../../shared/types';
import { formatIncidentId, messageTypeIcon, messageTypeLabel } from './messageMeta';

interface DispatchMessageCardProps {
  message: DispatchMessage;
  /** When set, the card selects instead of navigating (delete mode). */
  onSelect?: () => void;
  selected?: boolean;
}

/**
 * One dispatch order. The evidence frame, fixed text bands and the right-edge
 * dot keep read and unread cards exactly the same size. The dot navigates to
 * the message detail when clicked.
 */
export function DispatchMessageCard({
  message,
  onSelect,
  selected = false,
}: DispatchMessageCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isRead = Boolean(message.is_read);
  const unread = !isRead;

  const incident = message.incident_data;
  const TypeIcon = messageTypeIcon(incident.incident_type);
  const typeLabel = messageTypeLabel(incident.incident_type);
  const evidence = resolveMediaUrl(incident.evidence_image);

  const leftBorderColor = selected || unread
    ? 'var(--mantine-color-orange-6)'
    : 'var(--mantine-color-gray-4)';

  const body = (
    <Paper
      withBorder
      p="md"
      radius="md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        borderLeft: `${rem(4)} solid ${leftBorderColor}`,
        boxShadow: hovered ? 'var(--mantine-shadow-sm)' : 'none',
        transition: 'box-shadow 150ms ease-out',
      }}
    >
      <Group align="flex-start" wrap="nowrap" gap="md">
        {/* Left: Media image or Incident Icon */}
        {evidence && !imageFailed ? (
          <img
            src={evidence}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            style={{
              display: 'block',
              width: rem(64),
              height: rem(64),
              flexShrink: 0,
              objectFit: 'cover',
              borderRadius: rem(12),
              backgroundColor: 'var(--mantine-color-default)',
            }}
          />
        ) : (
          <Box
            aria-hidden="true"
            style={{
              width: rem(64),
              height: rem(64),
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: rem(12),
              backgroundColor: 'var(--mantine-color-orange-light)',
              color: 'var(--mantine-color-orange-6)',
            }}
          >
            <TypeIcon width={26} height={26} strokeWidth={2} />
          </Box>
        )}

        {/* Center: Title and Message Body */}
        <Stack gap={rem(4)} style={{ flex: 1, minWidth: 0 }}>
          <Text
            fw={unread ? 700 : 600}
            fz={rem(15)}
            lh={1.35}
            c={unread ? undefined : 'gray.6'}
            lineClamp={2}
            style={{
              overflowWrap: 'anywhere',
              color: unread ? undefined : 'var(--mantine-color-gray-6)',
            }}
          >
            {message.title}
          </Text>

          <Text
            fz={rem(15)}
            c="dimmed"
            lh={1.7}
            lineClamp={3}
            mih={rem(52)}
            style={{ overflowWrap: 'anywhere' }}
          >
            {message.body}
          </Text>
        </Stack>

        {/* Right: Timestamp (top) and Unread Dot (bottom) */}
        <Stack
          align="flex-end"
          justify="space-between"
          gap={rem(8)}
          style={{ flexShrink: 0, alignSelf: 'stretch' }}
        >
          <Text
            fw={600}
            fz={rem(12)}
            c="dimmed"
            title={formatDate(message.created_at)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {formatRelativeTime(message.created_at)}
          </Text>

          <Box
            aria-hidden="true"
            w={8}
            h={8}
            style={{
              borderRadius: '50%',
              backgroundColor: unread ? 'var(--mantine-color-orange-6)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/pwa/tanod/messages/${message.id}`, { replace: true });
            }}
          />
        </Stack>
      </Group>
    </Paper>
  );

  if (onSelect) {
    return (
      <UnstyledButton
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Select message: ${message.title}`}
        w="100%"
        style={{ display: 'block', textAlign: 'left' }}
      >
        {body}
      </UnstyledButton>
    );
  }

  return (
    <Link
      to={`/pwa/tanod/messages/${message.id}`}
      aria-label={`Open message: ${message.title}${unread ? ', unread' : ''}`}
      style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
    >
      {body}
    </Link>
  );
}