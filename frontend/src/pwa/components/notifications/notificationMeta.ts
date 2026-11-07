import dayjs from 'dayjs';

import type { AppNotification } from '../../../shared/types/index';
import { formatDay } from '../../../shared/utils/helpers';

export const ORANGE = '#FF6B00';

export interface NotificationGroup {
  key: string;
  label: string;
  items: AppNotification[];
}

/**
 * Day headings turn a flat list into a shift log: what arrived today, and what
 * was waiting from before. Alerts are already newest-first, so a single pass
 * keeps consecutive entries of the same day together.
 */
export function groupByDay(items: AppNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];

  for (const item of items) {
    const day = dayjs(item.created_at);
    const key = day.format('YYYY-MM-DD');
    const last = groups[groups.length - 1];

    if (last?.key === key) {
      last.items.push(item);
      continue;
    }

    const label = day.isSame(dayjs(), 'day')
      ? 'Today'
      : day.isSame(dayjs().subtract(1, 'day'), 'day')
        ? 'Yesterday'
        : formatDay(item.created_at);

    groups.push({ key, label, items: [item] });
  }

  return groups;
}
