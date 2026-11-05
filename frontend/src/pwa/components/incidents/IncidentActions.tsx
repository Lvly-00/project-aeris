import { Button, Stack, rem } from '@mantine/core';

import type { IncidentStatus } from '../../../shared/types';
import type { StatusAction } from './incidentMeta';

interface IncidentActionsProps {
  actions: StatusAction[];
  /** Status currently in flight, if a transition was just requested. */
  pendingStatus?: IncidentStatus;
  isPending: boolean;
  onAction: (next: IncidentStatus) => void;
}

/**
 * The one or two transitions this incident allows right now. The first is the
 * recommended step and reads as the primary button; the rest stay quiet.
 */
export const IncidentActions = ({
  actions,
  pendingStatus,
  isPending,
  onAction,
}: IncidentActionsProps) => {
  if (actions.length === 0) return null;

  return (
    <Stack gap={rem(8)}>
      {actions.map((action, index) => {
        const isThisPending = isPending && pendingStatus === action.next;

        return (
          <Button
            key={action.next}
            fullWidth
            size="md"
            radius="md"
            color={action.color}
            variant={index === 0 ? 'filled' : ((action.variant as any) || 'light')}
            // leftSection={<action.icon width={18} height={18} />}
            loading={isThisPending}
            disabled={isPending && !isThisPending}
            onClick={() => onAction(action.next)}
          >
            {action.label}
          </Button>
        );
      })}
    </Stack>
  );
};
