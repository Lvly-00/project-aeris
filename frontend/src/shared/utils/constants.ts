export const INCIDENT_TYPES = [
  'Fire',
  'Smoke',
  'Vehicle_Accident',
] as const;

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

export const INCIDENT_STATUSES = [
  'Detected',
  'Verified',
  'Dispatched',
  'Resolved',
  'Dismissed',
] as const;

export const USER_ROLES = [
  'CCTV Chief',
  'CCTV Operator',
  'Barangay Tanod',
] as const;

export const STREAM_TYPES = ['RTSP', 'HTTP', 'MP4', 'EMBED'] as const;

export const INCIDENT_COLORS: Record<string, string> = {
  Fire: '#FF4444',
  Smoke: '#FF8800',
  Vehicle_Accident: '#FFAA00',
};

export const SEVERITY_COLORS: Record<string, string> = {
  Low: '#888888',
  Medium: '#FFAA00',
  High: '#FF6600',
  Critical: '#FF0000',
};

export const STATUS_COLORS: Record<string, string> = {
  Detected: '#FF4444',
  Verified: '#FFAA00',
  Dispatched: '#44AAFF',
  Resolved: '#44CC44',
  Dismissed: '#888888',
};

/**
 * Mantine color *names* for status badges, icons, and themed panels.
 * Use these for any `color=` prop or `var(--mantine-color-…)` interpolation.
 * STATUS_COLORS above holds the matching hex values for raw CSS (borders, etc.).
 */
export const STATUS_BADGE_COLORS: Record<string, string> = {
  Detected: 'red',
  Verified: 'orange',
  Dispatched: 'blue',
  Resolved: 'green',
  Dismissed: 'gray',
};

/** Human-readable labels for status badges. */
export const STATUS_LABELS: Record<string, string> = {
  Detected: 'Detected',
  Verified: 'Verified',
  Dispatched: 'Dispatched',
  Resolved: 'Resolved',
  Dismissed: 'Dismissed',
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: '#888888',
  Medium: '#FFAA00',
  High: '#FF6600',
  Critical: '#FF0000',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  Login: 'Login',
  Logout: 'Logout',
  Incident_Detected: 'Incident Detected',
  Incident_Verified: 'Incident Verified',
  Incident_Dismissed: 'Incident Dismissed',
  Incident_Dispatched: 'Incident Dispatched',
  Incident_Resolved: 'Incident Resolved',
  Incident_Archived: 'Incident Archived',
  Incident_Updated: 'Incident Updated',
  Camera_Created: 'Camera Created',
  Camera_Updated: 'Camera Updated',
  Camera_Deleted: 'Camera Deleted',
  User_Created: 'User Created',
  User_Updated: 'User Updated',
  User_Deactivated: 'User Deactivated',
  AI_Config_Changed: 'AI Config Changed',
  Settings_Changed: 'Settings Changed',
};
