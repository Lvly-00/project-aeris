import { Box, Button, Card, Group, Text, ThemeIcon, rem } from '@mantine/core';
import { Phone } from '@boxicons/react';

interface IncidentContactProps {
  contact?: { name: string; phone_number: string };
  /** Agency that answers for this incident type, named when none is set. */
  responder: string;
}

/**
 * Who to call for this kind of incident. The agency name is spelled out when
 * no number is configured, so a missing contact reads as a gap rather than a
 * broken button.
 */
export const IncidentContact = ({ contact, responder }: IncidentContactProps) => (
  <Card withBorder radius="lg" p="md" mb="md">
    <Group justify="space-between" align="center" gap="md" wrap="nowrap">
      <Group gap={rem(10)} wrap="nowrap" style={{ minWidth: 0 }}>
        <ThemeIcon size={38} radius="xl" variant="light" color="red" style={{ flexShrink: 0 }}>
          <Phone width={18} height={18} />
        </ThemeIcon>

        <Box style={{ minWidth: 0 }}>
          <Text fz={rem(12)} c="dimmed" lh={1.3}>
            Emergency contact
          </Text>
          <Text fz={rem(15)} fw={600} lh={1.35} truncate>
            {contact ? contact.name : `No ${responder} contact`}
          </Text>
          {contact && (
            <Text fz={rem(13)} c="dimmed" lh={1.35} truncate>
              {contact.phone_number}
            </Text>
          )}
        </Box>
      </Group>

      <Button
        component="a"
        href={contact ? `tel:${contact.phone_number}` : undefined}
        color="red"
        radius="md"
        size="md"
        disabled={!contact}
        leftSection={<Phone width={16} height={16} />}
        style={{ flexShrink: 0 }}
      >
        Call
      </Button>
    </Group>
  </Card>
);
