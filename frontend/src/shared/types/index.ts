export type UserRole = 'CCTV Chief' | 'CCTV Operator' | 'Barangay Tanod';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  role_display?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  profile_picture?: string | null;
  two_factor_enabled: boolean;
  receive_notifications: boolean;
  preferred_language: string;
  agreement_accepted: boolean;
  agreement_accepted_at?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role?: string;
}

export type CameraStatusType = 'Online' | 'Offline' | 'Connecting' | 'Error';

export interface Camera {
  id: number;
  name: string;
  stream_url: string;
  stream_type: 'RTSP' | 'HTTP' | 'MP4' | 'EMBED';
  location_name: string;
  is_active: boolean;
  status: CameraStatusType;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export type IncidentType = 'Fire' | 'Smoke' | 'Vehicle_Accident';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentStatus = 'Detected' | 'Verified' | 'Dispatched' | 'Resolved' | 'Dismissed';

export interface Incident {
  id: number;
  incident_type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  camera: number | null;
  camera_name?: string;
  confidence_score: number;
  description: string;
  detected_at: string;
  verified_at: string | null;
  dispatched_at: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  archived_at: string | null;
  dismissed_at: string | null;
  recorded_by: number | null;
  recorded_by_name?: string;
  verified_by: number | null;
  verified_by_name?: string;
  dismissed_by: number | null;
  dismissed_by_name?: string;
  evidence_image: string | null;
  evidence_gallery: string[];
  duration: string;
  created_at: string;
}

export interface Detection {
  id: number;
  incident: number | null;
  camera: number;
  camera_name?: string;
  incident_type: IncidentType;
  confidence_score: number;
  bbox_coords: number[];
  fps: number;
  frame_timestamp: string;
  snapshot_image: string | null;
  is_verified: boolean;
  processed: boolean;
  created_at: string;
}

export type NotificationType = 'Alert' | 'Warning' | 'Info';

export interface AppNotification {
  id: number;
  incident: number | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: Severity;
  is_read: boolean;
  recipient: number | null;
  created_at: string;
}

export interface IncidentSummary {
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  total: number;
}

export interface HighRiskLocation {
  camera_id: number;
  camera_name: string;
  location_name: string;
  incident_count: number;
}

export interface PeakHour {
  hour: number;
  count: number;
}

export interface ResponseTime {
  incident_type: string;
  avg_response_time: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone_number: string;
  incident_type: IncidentType | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  active_incidents: number;
  total_incidents: number;
  today_incidents: number;
  avg_response_time: number | null;
  total_cameras: number;
  by_status: { status__name: string; count: number }[];
  by_type: { incident_type__name: string; count: number }[];
  by_severity: { severity: string; count: number }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Dispatch types
export type TimelineEventType =
  | 'Detected' | 'Verified' | 'Dispatched'
  | 'Responding' | 'Resolved' | 'Archived' | 'Dismissed'
  | 'Note_Added' | 'Evidence_Added' | 'Severity_Changed' | 'Escalated';

export interface IncidentTimelineEntry {
  id: number;
  incident: number;
  event_type: TimelineEventType;
  title: string;
  description: string;
  actor: number | null;
  actor_name: string;
  metadata: any;
  created_at: string;
}

export interface DispatchMessage {
  id: number;
  incident: number;
  incident_data: Incident;
  title: string;
  body: string;
  dispatched_by: number | null;
  dispatched_by_name?: string;
  recipient: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Audit types
export type AuditAction =
  | 'Login' | 'Logout' | 'Incident_Created' | 'Incident_Verified'
  | 'Incident_Dismissed' | 'Incident_Dispatched' | 'Incident_Resolved'
  | 'Incident_Archived' | 'Incident_Updated' | 'Camera_Created'
  | 'Camera_Updated' | 'Camera_Deleted' | 'User_Created' | 'User_Updated'
  | 'User_Deactivated' | 'AI_Config_Changed' | 'Settings_Changed'
  | 'Profile_Updated' | 'Password_Changed'
  | 'Email_Change_Requested' | 'Email_Change_Completed'
  | 'Chief_Mode_Entered' | 'Chief_Mode_Exited'
  | 'Two_Factor_Enabled' | 'Two_Factor_Disabled'
  | 'Two_Factor_Verified' | 'Two_Factor_Failed'
  | 'Agreement_Accepted';

export interface AuditLog {
  id: number;
  user: number | null;
  username: string;
  action: AuditAction;
  resource_type: string;
  resource_id: number | null;
  details: any;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

// AI Configuration
export interface AIConfiguration {
  id: number;
  global_confidence_threshold: number;
  fire_threshold: number;
  smoke_threshold: number;
  accident_threshold: number;
  detection_interval_ms: number;
  model_name: 'yolo11n.pt' | 'yolo11s.pt' | 'yolo11m.pt';
  enable_sound_alerts: boolean;
  enable_push_notifications: boolean;
  auto_create_incidents: boolean;
  dedup_window_minutes: number;
}
