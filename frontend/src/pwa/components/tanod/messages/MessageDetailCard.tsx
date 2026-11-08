import {
  Badge,
  Paper,
  Stack,
  Text,
  Title,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';

import type { DispatchMessage } from '../../../../shared/types';
import { messageTypeLabel } from './messageMeta';

interface MessageDetailCardProps {
  message: DispatchMessage;
}

/*
 * The order names the scene inline: "… reported at <location> (Incident No. …)".
 * Splitting that phrase out lets the location be emphasised while the rest of
 * the order stays one readable paragraph.
 */
const LOCATION_IN_BODY = /(reported at )(.+?)(\s*\(Incident No\.)/i;

function DispatchBody({ body }: { body: string }) {
  const match = body.match(LOCATION_IN_BODY);
  const start = match?.index !== undefined ? match.index + match[1].length : -1;

  if (!match || start < 0) return <>{body}</>;

  return (
    <>
      {body.slice(0, start)}
      <Text span fw={700} inherit>
        {match[2]}
      </Text>
      {body.slice(start + match[2].length)}
    </>
  );
}

/**
 * The order itself, sitting under the evidence frame: what command wrote and
 * the incident type it belongs to.
 */
export function MessageDetailCard({ message }: MessageDetailCardProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const incident = message.incident_data;
  const typeLabel = messageTypeLabel(incident.incident_type);

  return (
    <Paper
      p="xl"
      radius="lg"
      style={{
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : '#FFF5F2',
        border: colorScheme === 'dark' ? `1px solid ${theme.colors.dark[4]}` : 'none',
      }}
    >
      <Stack gap={rem(6)} mb="lg" align="flex-start">
        <Title
          order={2}
          fw={700}
          lh={1.2}
          style={{ letterSpacing: rem(1), overflowWrap: 'anywhere' }}
        >
          {message.title.toUpperCase()}
        </Title>

      </Stack>

      <Text
        size="lg"
        lh={1.5}
        fw={400}
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      >
        <DispatchBody body={message.body} />
      </Text>
    </Paper>
  );
}
