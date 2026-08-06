export type UserRole = 'Admin' | 'Operator' | 'Viewer' | 'Barangay_Official' | 'Barangay_Tanod';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  phone_number: string;
  barangay_zone: number | null;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
  role?: string;
  phone_number?: string;
}

export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  stream_type: 'RTSP' | 'HTTP' | 'MP4' | 'EMBED';
  location_name: string;
  latitude: number;
  longitude: number;
  zone: number | null;
  zone_name?: string;
  is_active: boolean;
  status: 'Online' | 'Offline' | 'Error';
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: number;
  name: string;
  barangay: string;
  boundary_coords: any;
  description: string;
  created_at: string;
}

export type IncidentType = 'Fire' | 'Smoke' | 'Vehicle_Accident';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentStatus = 'Detected' | 'Pending_Verification' | 'Verified' | 'Dispatched' | 'Responding' | 'Resolved' | 'Archived' | 'Dismissed' | 'False_Positive';

export interface Incident {
  id: number;
  incident_type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  camera: number;
  camera_name?: string;
  zone: number | null;
  zone_name?: string;
  confidence_score: number;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
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
  duration: number | null;
  crowd_size: number | null;
  review_notes: string;
  escalated_to: string;
  dispatch_count: number;
  created_at: string;
  updated_at: string;
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

export type ResponderType = 'Barangay_Tanod' | 'Barangay_Official' | 'MDRRMO' | 'BFP' | 'PNP';
export type SuggestedAction = 'Verify_Incident' | 'Dispatch_Responders' | 'Road_Clearing' | 'Evacuation' | 'Emergency_Escalation' | 'Continue_Monitoring';

export interface Recommendation {
  id: number;
  incident: number;
  responder_type: ResponderType;
  suggested_action: SuggestedAction;
  priority: Severity;
  explanation: string;
  confidence_score: number;
  reasoning: string;
  is_accepted: boolean | null;
  accepted_by: number | null;
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

export type ReportType = 'Daily' | 'Weekly' | 'Monthly';

export interface Report {
  id: number;
  title: string;
  report_type: ReportType;
  generated_by: number;
  date_range_start: string;
  date_range_end: string;
  file_pdf: string | null;
  file_excel: string | null;
  parameters: any;
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
  latitude: number;
  longitude: number;
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

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone_number: string;
  incident_type: string;
  zone: number | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  active_incidents: number;
  total_incidents: number;
  today_incidents: number;
  avg_response_time: number | null;
  total_cameras: number;
  by_status: { status: string; count: number }[];
  by_type: { incident_type: string; count: number }[];
  by_severity: { severity: string; count: number }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Dispatch types
export type DispatcherType = 'Barangay_Tanod' | 'Barangay_Official' | 'MDRRMO' | 'BFP' | 'PNP';
export type DispatcherStatus = 'Available' | 'En_Route' | 'On_Scene' | 'Unavailable';
export type DispatchStatus = 'Pending' | 'Accepted' | 'En_Route' | 'On_Scene' | 'Completed' | 'Rejected' | 'Cancelled';
export type TimelineEventType =
  | 'Detected' | 'Verified' | 'Dispatched' | 'Dispatch_Accepted'
  | 'Dispatch_En_Route' | 'Dispatch_On_Scene' | 'Dispatch_Completed'
  | 'Responding' | 'Resolved' | 'Archived' | 'Dismissed'
  | 'Note_Added' | 'Evidence_Added' | 'Severity_Changed' | 'Escalated';

export interface Dispatcher {
  id: number;
  user: number;
  username: string;
  full_name: string;
  dispatcher_type: DispatcherType;
  status: DispatcherStatus;
  phone_number: string;
  zone: number | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  is_active: boolean;
}

export interface Dispatch {
  id: number;
  incident: number;
  dispatcher: number;
  dispatcher_name: string;
  dispatcher_type: DispatcherType;
  incident_type: IncidentType;
  incident_severity: Severity;
  status: DispatchStatus;
  dispatched_by: number | null;
  dispatched_by_name: string;
  notes: string;
  accepted_at: string | null;
  en_route_at: string | null;
  on_scene_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

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

// Audit types
export type AuditAction =
  | 'Login' | 'Logout' | 'Incident_Created' | 'Incident_Verified'
  | 'Incident_Dismissed' | 'Incident_Dispatched' | 'Incident_Resolved'
  | 'Incident_Archived' | 'Incident_Updated' | 'Dispatch_Accepted'
  | 'Dispatch_Rejected' | 'Dispatch_Status' | 'Recommendation_Accepted'
  | 'Recommendation_Rejected' | 'Camera_Created' | 'Camera_Updated'
  | 'Camera_Deleted' | 'User_Created' | 'User_Updated' | 'User_Deactivated'
  | 'AI_Config_Changed' | 'Report_Generated' | 'Report_Approved' | 'Settings_Changed';

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
  flood_threshold: number;
  accident_threshold: number;
  crowd_threshold: number;
  road_obstruction_threshold: number;
  detection_interval_ms: number;
  model_name: 'yolo11n.pt' | 'yolo11s.pt' | 'yolo11m.pt';
  enable_sound_alerts: boolean;
  enable_push_notifications: boolean;
  auto_create_incidents: boolean;
  dedup_window_minutes: number;
}
