# User Guide

This guide explains how to use the Barangay CCTV Incident Detection System from an operator's perspective.

## Logging In

1. Open the application in your browser (default: `http://localhost`)
2. Enter your **username** and **password**
3. Click **Sign In**

> If you don't have an account, contact your system administrator. Self-registration is available if enabled.

## Dashboard

The dashboard provides a real-time overview of the monitoring area:

- **Stats Cards**: Active incidents, camera count, pending recommendations, today's incidents, average response time
- **Recent Incidents**: Table of the latest incidents with type, severity, status, camera, and time
- **Charts**:
  - Incident Status Pie Chart — shows distribution by status
  - Severity Bar Chart — shows counts by severity level
- **Recent Notifications**: Latest alerts that need attention

The dashboard auto-refreshes every 15 seconds.

## Camera Monitoring

Navigate to **Cameras** in the sidebar.

### Camera Grid

- Each camera tile shows the live video feed (or a placeholder if offline)
- Camera name and status are displayed on each tile
- Green border = Online, Red = Error, Gray = Offline

### Adding a Camera

1. Click **Add Camera**
2. Fill in the form:
   - **Name**: Descriptive label
   - **RTSP URL**: Video source URL
   - **Stream Type**: RTSP / HTTP / MP4 / EMBED
   - **Zone**: Select barangay zone
   - **Location**: Latitude and longitude
   - **Status**: Set active/inactive
3. For **EMBED** type: paste a full webpage URL (e.g., SkylineWebcams page)
4. Click **Save**

### Editing a Camera

1. Click the **Edit** (pencil) icon on a camera tile
2. Modify fields as needed
3. Click **Save**

### Deleting a Camera

1. Click the **Delete** (trash) icon on a camera tile
2. Confirm deletion

### Detection Overlays

When a camera has active AI detection, bounding boxes and labels are drawn on the video feed:
- Red boxes for detected incidents
- Color-coded labels show incident type and confidence score

## Incidents

Navigate to **Incidents** to see all incident records.

### Incident List

Each incident shows:
- **Type**: Icon + label (Fire, Smoke, Accident, etc.)
- **Severity**: Color-coded badge (Critical=red, High=orange, Medium=yellow, Low=green)
- **Status**: Detected → Verified → Responding → Resolved / Dismissed
- **Camera**: Source camera name
- **Zone**: Barangay zone
- **Confidence**: Percentage score
- **Evidence**: Thumbnail of snapshot image
- **Actions**: Buttons for review

Filter incidents by:
- Type, severity, status
- Camera, zone
- Date range

### Incident Detail

Click an incident to view full details:

- **Evidence Image**: Full-size snapshot from the time of detection
- **Description**: AI-generated description
- **Timeline**: detected_at → verified_at → responded_at → resolved_at
- **Duration**: How long the incident lasted
- **Crowd Size**: Estimated number of people involved (if applicable)
- **Location**: GIS coordinates
- **Recommendations**: List of AI-generated recommendations

### Changing Incident Status

At the bottom of the incident detail page:

1. Click the appropriate action button:
   - **Verify** (Detected → Verified)
   - **Respond** (Verified → Responding)
   - **Resolve** (Responding → Resolved)
   - **Dismiss** (any status → Dismissed) — for false reports
2. Status transitions are logged for audit

## Recommendations

Navigate to **Recommendations** to review and act on AI-generated suggestions.

### Recommendation Card

Each recommendation shows:
- **Incident Type** and severity
- **Responder Type**: Who should respond (Barangay Tanod, BFP, PNP, MDRRMO, Barangay Official)
- **Suggested Action**: What they should do
- **Priority**: Critical / High / Medium / Low
- **Explanation**: Why this recommendation was made
- **Reasoning**: Detailed analysis backing the recommendation
- **Confidence Score**

### Accepting/Rejecting

1. Click **Accept** to approve a recommendation (this confirms the suggested response)
2. Click **Reject** to decline (you may add a reason)
3. Accepted recommendations are marked with a green checkmark; rejected ones show a red X
4. Once accepted, the recommendation cannot be changed (for audit trail integrity)

## Notifications

Navigate to **Notifications** to view all alerts.

### Notification Types

| Type | Icon | Description |
|------|------|-------------|
| **Alert** | 🔴 | Critical incidents requiring immediate attention |
| **Warning** | 🟡 | Moderate severity incidents |
| **Info** | 🔵 | Informational updates |

### Managing Notifications

- Click a notification to navigate to the related incident
- Click the **Mark Read** button on individual notifications
- Click **Mark All Read** to clear all unread badges
- Unread count is displayed in the sidebar header

### Sound Alerts

When a new Alert or Warning notification arrives:
- **Critical**: 3 rapid beeps
- **High**: 2 beeps
- **Medium**: 1 beep
- **Low**: short single beep

Sounds play automatically when the browser tab is open.

## Reports

Navigate to **Reports** to generate and download reports.

### Generating a Report

1. Click **Generate Report**
2. Select report type: **Daily**, **Weekly**, or **Monthly**
3. Set the date range
4. Click **Generate**
5. The system creates both PDF and Excel versions

### Downloading Reports

- Click **Download PDF** for a formatted PDF
- Click **Download Excel** for spreadsheet data
- Reports include: incident summaries, severity distributions, response times, camera activity logs

### Approving Reports

Administrators can approve reports via the **Approve** button, which locks the report for audit purposes.

## Analytics

Navigate to **Analytics** to explore data insights.

### Available Views

| View | Description |
|------|-------------|
| **Incident Summary** | Counts by type, severity, and status |
| **High-Risk Locations** | Top 10 cameras/zones with most incidents |
| **Peak Hours** | Incident frequency by hour of day |
| **Response Times** | Average response time by incident type |
| **Severity Distribution** | Breakdown of incidents by severity |
| **Trend Analysis** | Daily incident counts over time |
| **Heatmap** | Geographic distribution of incidents |

All views can be filtered by date range.

## GIS Map

The map view shows:
- **Camera locations** as markers
- **Incident locations** as colored markers (color-coded by type)
- **Zone boundaries** as polygons

Click any marker for details.
