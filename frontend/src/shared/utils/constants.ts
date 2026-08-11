export const INCIDENT_TYPES = [
  'Fire',
  'Smoke',
  'Vehicle_Accident',
] as const;

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

export const INCIDENT_STATUSES = [
  'Detected',
  'Pending_Verification',
  'Verified',
  'Dispatched',
  'Responding',
  'Resolved',
  'Archived',
  'Dismissed',
  'False_Positive',
] as const;

export const USER_ROLES = [
  'Admin',
  'Operator',
  'Viewer',
  'Barangay_Official',
  'Barangay_Tanod',
] as const;

export const STREAM_TYPES = ['RTSP', 'HTTP', 'MP4'] as const;

export const RESPONDER_TYPES = [
  'Barangay_Tanod',
  'Barangay_Official',
  'MDRRMO',
  'BFP',
  'PNP',
] as const;

export const DISPATCH_STATUSES = [
  'Pending',
  'Accepted',
  'En_Route',
  'On_Scene',
  'Completed',
  'Rejected',
  'Cancelled',
] as const;

export const DISPATCHER_STATUSES = [
  'Available',
  'En_Route',
  'On_Scene',
  'Unavailable',
] as const;

export const SUGGESTED_ACTIONS = [
  'Verify_Incident',
  'Dispatch_Responders',
  'Road_Clearing',
  'Evacuation',
  'Emergency_Escalation',
  'Continue_Monitoring',
] as const;

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
  Pending_Verification: '#FF8800',
  Verified: '#FFAA00',
  Dispatched: '#44AAFF',
  Responding: '#44AAFF',
  Resolved: '#44CC44',
  Archived: '#888888',
  Dismissed: '#888888',
  False_Positive: '#AA8844',
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: '#888888',
  Medium: '#FFAA00',
  High: '#FF6600',
  Critical: '#FF0000',
};

export const DISPATCH_STATUS_COLORS: Record<string, string> = {
  Pending: '#FFAA00',
  Accepted: '#44CC44',
  En_Route: '#44AAFF',
  On_Scene: '#CC44FF',
  Completed: '#44CC44',
  Rejected: '#FF4444',
  Cancelled: '#888888',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  Login: 'Login',
  Logout: 'Logout',
  Incident_Created: 'Incident Created',
  Incident_Verified: 'Incident Verified',
  Incident_Dismissed: 'Incident Dismissed',
  Incident_Dispatched: 'Incident Dispatched',
  Incident_Resolved: 'Incident Resolved',
  Incident_Archived: 'Incident Archived',
  Incident_Updated: 'Incident Updated',
  Dispatch_Accepted: 'Dispatch Accepted',
  Dispatch_Rejected: 'Dispatch Rejected',
  Dispatch_Status: 'Dispatch Status Changed',
  Camera_Created: 'Camera Created',
  Camera_Updated: 'Camera Updated',
  Camera_Deleted: 'Camera Deleted',
  User_Created: 'User Created',
  User_Updated: 'User Updated',
  User_Deactivated: 'User Deactivated',
  AI_Config_Changed: 'AI Config Changed',
  Report_Generated: 'Report Generated',
  Report_Approved: 'Report Approved',
  Settings_Changed: 'Settings Changed',
};
