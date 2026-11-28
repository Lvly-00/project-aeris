import type { DismissReason } from '../../../shared/types';

/**
 * Why an incident was dismissed. The values match `Incident.DismissReason` on
 * the backend; keeping one list here means the modal, the detail notice and
 * the history card always agree.
 */
export const DISMISS_REASONS: { value: DismissReason; label: string }[] = [
  { value: 'false_positive', label: 'False positive / no incident' },
  { value: 'wrong_type', label: 'Wrong incident type' },
  { value: 'duplicate', label: 'Duplicate of another incident' },
  { value: 'camera_issue', label: 'Camera or location issue' },
  { value: 'test', label: 'Test or maintenance' },
  { value: 'other', label: 'Other' },
];

export function dismissReasonLabel(reason?: string | null): string | null {
  return DISMISS_REASONS.find((option) => option.value === reason)?.label ?? null;
}
