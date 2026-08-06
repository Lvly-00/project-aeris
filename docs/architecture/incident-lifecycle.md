# Incident Lifecycle

This document explains how incidents are created, processed, reviewed, and resolved in the system.

## Lifecycle Overview

```
Detection ──▶ Created ──▶ Verified ──▶ Responding ──▶ Resolved
                              │              │
                              └── Dismissed ──┘
```

## Stage 1: Detection

### AI Detection

1. **Video Frame Capture**: Stream Manager reads a frame from the video source
2. **YOLOv11 Inference**: Frame is processed through YOLOv11, identifying objects and events
3. **HSV Detection**: Complementary HSV-based detection for fire, smoke, and water
4. **Confidence Filtering**: Results are filtered by per-type confidence thresholds
5. **Temporal Dedup**: Same-type detections within 5 seconds are suppressed

### Incident Creation

When a detection passes all filters:
1. AI service POSTs the detection to the Django backend
2. Backend checks for duplicates (same type, same camera, within 10 min, not Dismissed)
3. If no duplicate:
   - Creates `Detection` record (with bbox coordinates, FPS, snapshot)
   - Creates `Incident` record (with severity, description, evidence image)
   - Creates `Notification` (Alert for Critical/High, Warning for Medium, Info for Low)
   - Triggers recommendation generation

### Recommendation Generation

The recommendation engine analyzes the incident:
- **Incident Type** → Maps to relevant responders (e.g., Fire → BFP, MDRRMO, Barangay Tanod)
- **Severity** → Maps to suggested actions (Critical → Emergency Escalation/Evacuation)
- **Priority Calculation** (0–12+ points):
  - Severity: Low=2, Medium=4, High=6, Critical=8
  - Confidence: 0-2 points
  - Duration: 0-2 points
  - Crowd size: 0-3 points
  - Type boost: 0-1 points

### Notification Alert

Notifications are created with the incident:
- **Critical/High severity**: Alert notification type (triggers sound: 3 beeps / 2 beeps)
- **Medium severity**: Warning notification type (triggers sound: 1 beep)
- **Low severity**: Info notification type (short beep)

These appear in the notification panel and trigger browser sounds.

## Stage 2: Review (Operator)

### Dashboard Alerts

The dashboard shows:
- Recent incidents in the timeline
- Pending recommendation count on the stats card
- New notification badges in the sidebar

### Notification Sound Alerts

When a new Alert or Warning arrives:
- **Critical Priority**: 3 rapid beeps
- **High Priority**: 2 beeps
- **Medium Priority**: 1 beep
- **Low Priority**: short single beep

### Incident Detail View

Operators should review:
1. **Evidence image** — Is this a genuine incident?
2. **Confidence score** — How sure is the AI?
3. **Incident details** — Type, severity, location, time
4. **Recommendations** — Are the suggested actions appropriate?

## Stage 3: Action

### Verifying an Incident

1. Open the incident detail page
2. Review evidence and AI confidence
3. Click **Verify** to confirm it's a real incident
4. Status changes to **Verified**; `verified_at` timestamp is set

### Accepting/Rejecting Recommendations

1. Navigate to **Recommendations**
2. Review each recommendation's explanation and reasoning
3. Click **Accept** if the suggested response is appropriate
4. Click **Reject** if the suggestion is not suitable
5. Once accepted, the recommendation is locked (cannot be changed)

### Dispatching Responders

The system **never auto-dispatches**. The operator must:
1. Note the recommended responder type (Barangay Tanod, BFP, PNP, etc.)
2. Contact the responder through existing communication channels (radio, phone)
3. Update the incident status to **Responding** when help is on the way

## Stage 4: Resolution

### Resolving an Incident

1. Once the incident is handled, click **Resolve**
2. Status changes to **Resolved**; `resolved_at` timestamp is set
3. The incident becomes part of analytics and reports

### Dismissing False Reports

If an incident was incorrectly detected:
1. Click **Dismiss**
2. Status changes to **Dismissed**
3. Dismissed incidents are excluded from dedup logic (new detections of the same type will create fresh records)
4. They still appear in analytics but are marked as false positives

## Audit Trail

Every step in the lifecycle is logged:
- **Detection time** (`detected_at`)
- **Verification time** (`verified_at`)
- **Response dispatch time** (`responded_at`)
- **Resolution time** (`resolved_at`)
- **Who accepted/rejected** each recommendation
- **Who performed** each status transition

## Timeline

```
detected_at        verified_at        responded_at        resolved_at
     │                  │                  │                  │
     ▼                  ▼                  ▼                  ▼
─────┴──────────────────┴──────────────────┴──────────────────┴─────▶
  AI detects       Operator          Operator          Incident
  incident         confirms          dispatches        resolved
                   incident          responders
```

## Example: Fire Incident

```
Time T+0:   AI detects fire in camera "Market View" (confidence 92%)
            → Incident created (Severity: High)
            → Notification sent (Alert)
            → Recommendations generated:
              1. [Critical] BFP → Emergency Escalation
              2. [High] MDRRMO → Dispatch Response Team
              3. [Medium] Barangay Tanod → Cordon Off Area

Time T+1:   Operator sees notification, reviews evidence
            → Verifies incident (Status: Verified)
            → Accepts BFP recommendation

Time T+5:   Operator dispatches BFP via radio
            → Updates status to Responding

Time T+30:  BFP arrives, fire contained
            → Updates status to Resolved
```
