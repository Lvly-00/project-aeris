import {
  AlertCircle,
  Car,
  CheckCircle,
  CheckShield,
  Cloud,
  Flame,
  RotateCcw,
  XCircle,
} from '@boxicons/react';

import type { Incident, IncidentStatus, Severity } from '../../../shared/types';

/** A status change the current state allows, rendered as a button. */
export interface StatusAction {
  label: string;
  next: IncidentStatus;
  color: string;
  variant?: string;
  icon: any;
}

export const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  Detected: [
    { label: 'Verify incident', next: 'Verified', color: 'orange', icon: CheckShield },
    { label: 'Dismiss incident', next: 'Dismissed', color: 'red', variant: 'light', icon: XCircle },
  ],
  Verified: [
    { label: 'Dispatch tanod', next: 'Dispatched', color: 'red', icon: Car },
    { label: 'Dismiss incident', next: 'Dismissed', color: 'gray', variant: 'light', icon: XCircle },
  ],
  Dispatched: [
    { label: 'Mark as resolved', next: 'Resolved', color: 'green', icon: CheckCircle },
  ],
  Resolved: [],
  Dismissed: [
    { label: 'Reopen incident', next: 'Detected', color: 'blue', icon: RotateCcw },
  ],
};

export interface IncidentTypeInfo {
  label: string;
  Icon: any;
  /** Agency that answers for this incident type. */
  responder: string;
}

export const INCIDENT_TYPE_INFO: Record<string, IncidentTypeInfo> = {
  Fire: { label: 'Fire', Icon: Flame, responder: 'BFP' },
  Vehicle_Accident: { label: 'Vehicular accident', Icon: Car, responder: 'NDRRMC' },
  Smoke: { label: 'Smoke', Icon: Cloud, responder: 'PNP' },
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  Low: 'gray',
  Medium: 'yellow',
  High: 'orange',
  Critical: 'red',
};

/**
 * Accent colour for an incident type. Mirrors the incident card so the
 * confidence meter reads the same on the list and on the detail page.
 */
export function incidentTypeColor(type: string): string {
  return type === 'Fire' ? 'red' : 'orange';
}

/** 1 = detected, 2 = verified, 3 = dispatched, 4 = resolved. */
export function statusStepIndex(status: IncidentStatus): number {
  if (status === 'Verified') return 2;
  if (status === 'Dispatched') return 3;
  if (status === 'Resolved') return 4;
  return 1;
}

export interface TimelineStep {
  label: string;
  time: string | null;
  done: boolean;
  color: string;
  icon: any;
}

/**
 * Dismissed incidents close out early, so they get their own two-step trace.
 * Every other incident shows the full detected → resolved flow, with each step
 * carrying the timestamp it actually reached.
 */
export function buildTimelineSteps(incident: Incident): TimelineStep[] {
  if (incident.status === 'Dismissed') {
    return [
      { label: 'Detected', time: incident.detected_at, done: true, color: 'red', icon: AlertCircle },
      { label: 'Dismissed', time: incident.dismissed_at, done: true, color: 'red', icon: XCircle },
    ];
  }

  const activeStep = statusStepIndex(incident.status);

  return [
    { label: 'Detected', time: incident.detected_at, done: activeStep > 0, color: 'red', icon: AlertCircle },
    { label: 'Verified', time: incident.verified_at, done: activeStep > 1, color: 'orange', icon: CheckShield },
    { label: 'Dispatched', time: incident.dispatched_at, done: activeStep > 2, color: 'blue', icon: Car },
    { label: 'Resolved', time: incident.resolved_at, done: activeStep > 3, color: 'green', icon: CheckCircle },
  ];
}
