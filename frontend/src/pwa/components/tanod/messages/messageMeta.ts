import { Car, Cloud, Flame } from '@boxicons/react';
import type { BoxIconProps } from '@boxicons/react';
import type { ComponentType } from 'react';

import type { IncidentType } from '../../../../shared/types';

/** Display label for an incident type inside a dispatch message. */
export const MESSAGE_TYPE_LABEL: Record<IncidentType, string> = {
  Fire: 'Fire',
  Smoke: 'Smoke',
  Vehicle_Accident: 'Vehicular accident',
};

/** Icon that stands for the incident behind a dispatch message. */
export function messageTypeIcon(type: IncidentType): ComponentType<BoxIconProps> {
  if (type === 'Smoke') return Cloud;
  if (type === 'Vehicle_Accident') return Car;
  return Flame;
}

export function messageTypeLabel(type: IncidentType): string {
  return MESSAGE_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

/** Human-readable incident number, matching the admin incident pages. */
export function formatIncidentId(id: number): string {
  return `INC-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
}
