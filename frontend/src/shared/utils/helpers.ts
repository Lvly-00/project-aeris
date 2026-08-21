import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return dayjs(date).format('MMM D, YYYY HH:mm:ss');
}

export function formatRelativeTime(date: string | null): string {
  if (!date) return 'N/A';
  return dayjs(date).fromNow();
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Detected: 'red',
    Verified: 'orange',
    Dispatched: 'blue',
    Resolved: 'green',
    Online: 'green',
    Connecting: 'yellow',
    Offline: 'gray',
    Error: 'red',
    Low: 'gray',
    Medium: 'yellow',
    High: 'orange',
    Critical: 'red',
  };
  return colors[status] || 'gray';
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getIncidentTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    Fire: 'flame',
    Smoke: 'smoke',
    Vehicle_Accident: 'car',
  };
  return icons[type] || 'alert-circle';
}
