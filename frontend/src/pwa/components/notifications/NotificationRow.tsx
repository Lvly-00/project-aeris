import { useState } from 'react';
import { Box, Group, rem, Stack, Text, UnstyledButton } from '@mantine/core';
import { LocationPin } from '@boxicons/react';

import type { AppNotification } from '../../../shared/types/index';
import { formatDate, formatRelativeTime } from '../../../shared/utils/helpers';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl';
import { ORANGE } from './notificationMeta';

/**
 * One alert, as a notification list item rather than a card: the detected frame
 * on the left, the alert's own headline, where it happened, and how long ago.
 * Unread rows get a dot on the image and full-strength text.
 */
export function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const [active, setActive] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isUnread = !notification.is_read;
  const typeLabel =
    notification.incident_type?.replace(/_/g, ' ') ?? 'Unknown type';
  const title = notification.title?.trim() || typeLabel;
  const thumbnail = resolveMediaUrl(notification.evidence_image);

  /*
   * The stored message usually repeats the type ("Fire detected"), which the
   * headline already says. Show it only when it adds something — instant-upload
   * descriptions, dispatch instructions.
   */
  const message = notification.message?.trim() ?? '';
  const showsMessage =
    message.length > 0 &&
    message.toLowerCase() !== `${typeLabel.toLowerCase()} detected`;

  return (
    <UnstyledButton
      onClick={() => onOpen(notification)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-label={`${isUnread ? 'Unread ' : ''}${typeLabel} alert for incident ${
        notification.incident ?? 'unknown'
      }${notification.location ? ` at ${notification.location}` : ''}`}
      w="100%"
      style={{
        display: 'block',
        padding: `${rem(10)} ${rem(8)}`,
        borderRadius: rem(8),
        backgroundColor: active ? 'var(--mantine-color-default-hover)' : 'transparent',
        transition: 'background-color 120ms ease',
      }}
    >
      <Group gap={rem(12)} wrap="nowrap" align="center">
        <Box style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
          {thumbnail && !imageFailed ? (
            /* The frame that triggered the alert, not a generic type icon */
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              style={{
                display: 'block',
                width: 44,
                height: 44,
                objectFit: 'cover',
                borderRadius: rem(8),
                backgroundColor: 'var(--mantine-color-gray-2)',
              }}
            />
          ) : (
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: rem(8),
                backgroundColor: 'var(--mantine-color-gray-light)',
              }}
            />
          )}
        </Box>

        <Stack gap={rem(3)} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
            <Text
              fw={isUnread ? 700 : 500}
              fz={rem(14.5)}
              lh={1.3}
              c={isUnread ? undefined : 'dimmed'}
              truncate
            >
              {title}
            </Text>

            <Text
              fz={rem(11.5)}
              c="dimmed"
              title={formatDate(notification.created_at)}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {formatRelativeTime(notification.created_at)}
            </Text>
          </Group>



          {showsMessage && (
            <Text fz={rem(12.5)} c="dimmed" lh={1.45} mt={rem(1)} lineClamp={2}>
              {message}
            </Text>
          )}
        </Stack>

        {/*
         * Unread marker, centred against the row's text block so it sits in
         * the middle of the right edge. Read rows keep the space empty so
         * every row ends on the same edge.
         */}
        <Box
          aria-hidden
          w={7}
          h={7}
          style={{
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: isUnread ? ORANGE : 'transparent',
          }}
        />
      </Group>
    </UnstyledButton>
  );
}
