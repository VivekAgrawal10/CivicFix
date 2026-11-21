# CivicFix API Documentation

> **Base URL:** `http://localhost:5000/api/v1`  
> **Production:** `https://api.civicfix.app/api/v1`

---

## Authentication

All protected endpoints require a **Bearer JWT** token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.  
Token lifetime is controlled by `JWT_EXPIRES_IN` (default `7d`).

### Roles
| Role | Description |
|------|-------------|
| `citizen` | Regular app user, can submit and track reports |
| `admin` | Municipal staff, full access |
| `contractor` | Field worker, can view and update assigned work orders |

---

## Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [ ... ]   // present on validation errors
}
```

HTTP status codes used: `400`, `401`, `403`, `404`, `409`, `422`, `500`, `503`.

---

## Language Codes

| Code | Language |
|------|----------|
| `en` | English |
| `pa` | Punjabi |
| `hi` | Hindi |

Pass `language` in request body or as `?lang=pa` query param where supported.

---

## Modules

---

### 1. Auth

#### `POST /auth/register`

Register a new user.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | String | ✅ | |
| `email` | String | ✅ | unique |
| `password` | String | ✅ | min 6 chars |
| `role` | String | ❌ | default `citizen` |
| `language` | String | ❌ | `en`/`pa`/`hi` |
| `phone` | String | ❌ | |

**Response `201`:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "_id": "...", "name": "Demo", "email": "...", "role": "citizen" }
}
```

---

#### `POST /auth/login`

| Field | Type | Required |
|-------|------|----------|
| `email` | String | ✅ |
| `password` | String | ✅ |

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "_id": "...", "name": "Demo", "role": "citizen" }
}
```

---

#### `GET /auth/me`
Auth: ✅ | Role: any

Returns the authenticated user's profile.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "Demo", "email": "...", "role": "citizen", "language": "en" }
}
```

---

#### `POST /auth/logout`
Auth: ✅ | Role: any

Invalidates the current session / FCM token.

---

### 2. Users

#### `GET /users/contractors`
Auth: ✅ | Role: `admin`

List all contractor accounts with active orders count and completed orders count for the Contractors admin page.

**Response `200`:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "name": "Demo Contractor",
      "email": "contractor@civicfix.com",
      "phone": "9000000003",
      "activeOrders": 1,
      "completedOrders": 3,
      "performanceScore": 86
    }
  ]
}
```

---

#### `GET /users/civic-creds`
Auth: ✅ | Role: any authenticated

Returns authenticated citizen's current **🪙 CivicCreds** coin balance, **CivicScore** (0-100 reputation score), current tier, badges, and coin ledger transaction history.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "name": "Demo Citizen",
    "civicCreds": 90,
    "civicScore": 100,
    "citizenTier": "Bronze Citizen",
    "badges": ["Welcome Citizen", "Verified Eyewitness"],
    "tierProgress": {
      "currentTier": "Bronze Citizen",
      "nextTier": "Silver Guardian",
      "pointsNeededForNextTier": 10
    },
    "history": [
      {
        "action": "Report Submitted",
        "amount": 25,
        "date": "2024-01-01T10:00:00Z",
        "details": "Reported issue: Pothole on Sector 17 road"
      },
      {
        "action": "Community Vouch",
        "amount": 15,
        "date": "2024-01-02T11:30:00Z",
        "details": "Confirmed active issue: Waterlogging on 80 Feet Road"
      }
    ]
  }
}
```

---

#### `GET /users/leaderboard`
Auth: ✅ | Role: any authenticated

Returns top 10 municipal community champions ranked by CivicCreds and CivicScore.

---

#### `GET /users`
Auth: ✅ | Role: `admin`

List all users with pagination.

Query params: `page`, `limit`, `role`, `search`

**Response `200`:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "data": [ { "_id": "...", "name": "...", "role": "citizen" } ]
}
```

---

#### `GET /users/:id`
Auth: ✅ | Role: `admin` or own profile

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "...", "email": "...", "role": "citizen" }
}
```

---

#### `PUT /users/:id`
Auth: ✅ | Role: `admin` or own profile

Update profile fields: `name`, `phone`, `language`, `fcmToken`, `avatar`.

---

#### `DELETE /users/:id`
Auth: ✅ | Role: `admin`

Soft-delete (sets `isActive: false`).

---

### 3. Reports

#### `POST /reports/pre-check`
Auth: ✅ | Role: `citizen`, `admin`

Anti-spam verification pre-check. Runs before report submission to detect if an active issue was already reported within 60 meters. Returns alert popup metadata prompting the citizen to confirm the existing issue rather than creating duplicates.

**Request Body:**
```json
{
  "latitude": 30.7333,
  "longitude": 76.7794,
  "category": "pothole"
}
```

**Response `200` (when duplicate detected nearby):**
```json
{
  "success": true,
  "hasExistingIssueNearby": true,
  "existingReport": {
    "_id": "673...",
    "title": "Large pothole on Sector 17 road",
    "category": "pothole",
    "confirmationCount": 4,
    "priority": "high"
  },
  "alertPopup": {
    "title": "🚨 Existing Issue Already Reported Nearby!",
    "message": "A similar active pothole report was already logged within 60 meters. Submitting duplicate complaints slows down repair teams. Would you like to confirm and vouch for this issue instead?",
    "incentive": "Vouching escalates priority rank immediately and awards you +15 🪙 CivicCreds!",
    "warning": "Filing false or duplicate calls may reduce your CivicScore reputation.",
    "actionConfirm": {
      "text": "Confirm & Vouch (+15 🪙 CivicCreds)",
      "endpoint": "/api/v1/reports/673.../confirm",
      "method": "POST"
    },
    "actionProceed": {
      "text": "This is a Distinct Issue (Submit Anyway)"
    }
  }
}
```

---

#### `POST /reports/:id/confirm`
Auth: ✅ | Role: `citizen`

Allows a citizen to vouch for an active reported problem. Each community confirmation elevates the issue's priority score. Reaching 3 confirmations escalates to `high` priority; 5 confirmations escalates to `critical` priority for fast-track dispatch.
Awards **+15 🪙 CivicCreds** to the confirming citizen.

---

#### `POST /reports`
Auth: ✅ | Role: `citizen`, `admin`

Submit a new civic issue report.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | String | ✅ | |
| `description` | String | ✅ | |
| `category` | String | ✅ | `pothole/streetlight/garbage/drainage/waterlogging/road_damage/other` |
| `location` | Object | ✅ | GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }` |
| `address` | String | ❌ | human-readable |
| `images` | String[] | ❌ | Cloudinary URLs |
| `language` | String | ❌ | original language of description |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a...",
    "title": "Pothole on NH5",
    "category": "pothole",
    "status": "pending",
    "priority": "medium",
    "location": { "type": "Point", "coordinates": [76.779, 30.733] },
    "submittedBy": "user_id",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

---

#### `GET /reports`
Auth: ✅ | Role: any

List reports. Citizens see only their own. Admins/contractors see all.

Query params: `status`, `category`, `priority`, `page`, `limit`, `lat`, `lng`, `radius` (meters). Admin list (`GET /admin/reports`) also takes `sort=severity` (critical first) and returns `sameProblemCount` per row.

---

#### `GET /reports/:id`
Auth: ✅ | Role: any

Get a single report with AI analysis and work order details.

---

#### `PUT /reports/:id`
Auth: ✅ | Role: `admin`, or owner for draft updates

Update report fields.

---

#### `PUT /reports/:id/status`
Auth: ✅ | Role: `admin`

| Field | Type | Required |
|-------|------|----------|
| `status` | String | ✅ |

Triggers `report_update` Socket.IO event to the submitter.

---

#### `POST /reports/:id/upvote`
Auth: ✅ | Role: `citizen`

Toggle upvote on a report.

---

#### `DELETE /reports/:id`
Auth: ✅ | Role: `admin`

---

#### `GET /reports/priority-queue`
Auth: ✅ | Role: `admin`

Returns unresolved issues ordered by priority weight (critical → high → medium → low) combined with upvote score and ticket age for the Priority Queue admin page.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Large pothole on Sector 17 road",
      "priority": "critical",
      "priorityScore": 4,
      "upvoteCount": 12,
      "status": "pending"
    }
  ]
}
```

---

#### `GET /reports/duplicates`
Auth: ✅ | Role: `admin`

Returns all reports flagged as duplicates by the AI/ML microservice for the Duplicate Reports admin page.

---

#### `GET /reports/map`
Auth: ✅ | Role: any

Returns lightweight report points for Live Map (citizen) and Map Monitoring (admin).
Optional query params: `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`, `category`, `status`.

---

#### `POST /reports/:id/duplicate`
Auth: ✅ | Role: `admin`

Manually link an issue as a duplicate of an existing report. Body: `{ "duplicateOf": "<reportId>" }`.

---

### 4. Work Orders

#### `POST /workorders`
Auth: ✅ | Role: `admin`

| Field | Type | Required |
|-------|------|----------|
| `report` | ObjectId | ✅ |
| `assignedContractor` | ObjectId | ✅ |
| `priority` | String | ❌ |
| `scheduledDate` | Date | ❌ |
| `notes` | String | ❌ |

Triggers `work_order` Socket.IO event to the contractor.

**Response `201`:**
```json
{
  "success": true,
  "data": { "_id": "...", "report": "...", "status": "open", "assignedContractor": "..." }
}
```

---

#### `GET /workorders`
Auth: ✅ | Role: `admin`, `contractor`

Contractors only see their own work orders.

Query params: `status`, `page`, `limit`

---

#### `GET /workorders/:id`
Auth: ✅ | Role: `admin`, `contractor`

---

#### `PUT /workorders/:id`
Auth: ✅ | Role: `admin`, `contractor`

Update status, add `repairEvidence` (image URLs), `notes`, `completedDate`.

---

### 5. Notifications

#### `GET /notifications/alerts`
Auth: ✅ | Role: any

Fetch all broadcast CivicAlerts received by the citizen.

---

#### `POST /notifications/broadcast-alert`
Auth: ✅ | Role: `admin`

Broadcast a citywide or area-specific CivicAlert to all connected citizens via WebSocket and push notification.

**Request:**
```json
{
  "title": "Severe Waterlogging on Sector 15 Road",
  "message": "Traffic diversion in place due to heavy rainwater accumulation. Please use alternative route.",
  "severity": "critical",
  "area": "Sector 15"
}
```

---

#### `GET /notifications`
Auth: ✅ | Role: any

Returns notifications for the authenticated user.

Query params: `isRead`, `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "unreadCount": 3,
  "data": [
    {
      "_id": "...",
      "type": "report_update",
      "title": "Report Status Changed",
      "message": "Your report is now in_progress",
      "isRead": false,
      "createdAt": "..."
    }
  ]
}
```

---

#### `PUT /notifications/:id/read`
Auth: ✅ | Role: any

Mark a single notification as read.

---

#### `PUT /notifications/read-all`
Auth: ✅ | Role: any

Mark all notifications as read.

---

### 6. Languages / Translation

#### `POST /language/translate`
Auth: ✅ | Role: any

Translate text using the AI service.

| Field | Type | Required |
|-------|------|----------|
| `text` | String | ✅ |
| `targetLanguage` | String | ✅ | `en`/`pa`/`hi` |
| `entityId` | ObjectId | ❌ | cache translation |

**Response `200`:**
```json
{
  "success": true,
  "data": { "translated": "ਸੜਕ ਵਿੱਚ ਖੱਡਾ", "language": "pa" }
}
```

---

#### `GET /language/translations/:entityId`
Auth: ✅ | Role: any

Retrieve cached translations for an entity.

---

### 7. Dashboard

#### `GET /dashboard/stats`
Auth: ✅ | Role: `admin`

Returns aggregate statistics.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalReports": 320,
    "pendingReports": 85,
    "resolvedReports": 210,
    "avgResolutionDays": 4.2,
    "reportsByCategory": { "pothole": 90, "streetlight": 60, "garbage": 45 },
    "reportsByStatus": { "pending": 85, "in_progress": 25, "resolved": 210 }
  }
}
```

---

#### `GET /dashboard/recent-activity`
Auth: ✅ | Role: `admin`

Last 10 status changes / work order updates.

---

### 8. Upload

#### `POST /upload/image`
Auth: ✅ | Role: any

Upload a single image to Cloudinary. `multipart/form-data`.

| Field | Type | Required |
|-------|------|----------|
| `image` | File | ✅ | max 5 MB, jpeg/png/webp |

**Response `200`:**
```json
{
  "success": true,
  "data": { "url": "https://res.cloudinary.com/...", "publicId": "civicfix/abc123" }
}
```

---

### 9. Road Health

#### `GET /roadhealth/segments`
Auth: ✅ | Role: any

List road segments with computed health scores.

Query params: `status` (`good`/`fair`/`poor`/`critical`), `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "...",
      "name": "NH-5 Sector 17-22",
      "healthScore": 42,
      "status": "poor",
      "reportCount": 12,
      "dominantIssue": "pothole",
      "lastInspected": "2024-01-10T00:00:00Z"
    }
  ]
}
```

---

#### `GET /roadhealth/analytics`
Auth: ✅ | Role: `admin`

Aggregate analytics grouped by status.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "byStatus": [
      { "_id": "critical", "count": 3, "avgHealthScore": 18, "totalReports": 45 }
    ],
    "overall": { "avgHealthScore": 61, "totalSegments": 24, "totalReports": 180 },
    "topIssues": [ { "_id": "pothole", "count": 11 } ]
  }
}
```

---

#### `GET /roadhealth/heatmap?bounds=sw_lat,sw_lng,ne_lat,ne_lng`
Auth: ✅ | Role: any

Returns lat/lng/weight points suitable for a Google Maps HeatmapLayer.

**Response `200`:**
```json
{
  "success": true,
  "count": 38,
  "data": [
    { "lat": 30.733, "lng": 76.779, "weight": 7 }
  ]
}
```

---

#### `POST /roadhealth/segment`
Auth: ✅ | Role: `admin`

Create or update (upsert by `name`) a road segment.

```json
{
  "name": "NH-5 Sector 17-22",
  "location": {
    "type": "LineString",
    "coordinates": [ [76.779, 30.733], [76.805, 30.726] ]
  },
  "healthScore": 60,
  "lastInspected": "2024-01-10",
  "dominantIssue": "pothole",
  "status": "fair"
}
```

---

#### `POST /roadhealth/safe-route`
Auth: ✅ | Role: any

Calculates safety score and finds active reported hazards along a travel corridor for the Safe Route Planner page.

**Request:**
```json
{
  "origin": { "lat": 30.7333, "lng": 76.7794 },
  "destination": { "lat": 30.7500, "lng": 76.7460 }
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "safetyScore": 75,
    "safetyLevel": "Moderate Caution",
    "hazardCount": 2,
    "hazards": [
      {
        "_id": "...",
        "title": "Large pothole on Sector 17 road",
        "category": "pothole",
        "priority": "high",
        "location": { "type": "Point", "coordinates": [76.779, 30.7333] },
        "address": "Sector 17, Chandigarh"
      }
    ],
    "corridor": { "minLat": 30.7133, "maxLat": 30.77, "minLng": 76.726, "maxLng": 76.7994 }
  }
}
```

---

### 10. AI Proxy

> **Note:** All AI endpoints proxy requests to the Python AI/ML service (`AI_SERVICE_URL`).  
> On AI service failure, endpoints return a graceful fallback and **never 500**.

---

#### `POST /ai/analyze-image`
Auth: ✅ | Role: any

Forward an image URL to the CV service for damage analysis.

**Request:**
```json
{ "imageUrl": "https://res.cloudinary.com/civicfix/sample.jpg" }
```

**Response `200` (success):**
```json
{
  "success": true,
  "data": {
    "severity": "high",
    "category": "pothole",
    "confidence": 0.91,
    "description": "Deep pothole approximately 60cm wide detected."
  }
}
```

**Response `200` (AI unavailable):**
```json
{ "success": false, "error": "AI service unavailable", "fallback": true }
```

---

#### `POST /ai/analyze-upload`
Auth: ✅ | Role: any

Live pre-check of a photo before submitting a report. `multipart/form-data`, field `image` (JPG/PNG/WEBP, ≤ 8 MB). The image is analysed and **not stored**. Returns `data.outcome` = `rejected` | `manual_review_required` | `accepted_pending_verification` | `unavailable`, plus `category`, `severity`, `confidence`, `message`, `manualReviewRequired`. `POST /reports` repeats this check server-side and answers `422 { code: "NON_CIVIC_IMAGE" }` for rejected photos.

---

#### `POST /ai/chat`
Auth: ✅ | Role: any

Multilingual chatbot assistant.

**Request:**
```json
{
  "message": "ਮੇਰੀ ਰਿਪੋਰਟ ਦਾ ਕੀ ਹੋਇਆ?",
  "language": "pa",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ!" }
  ]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "reply": "ਤੁਹਾਡੀ ਰਿਪੋਰਟ in_progress ਹੈ।" }
}
```

---

#### `GET /ai/insights`
Auth: ✅ | Role: `admin`

AI-generated weekly/monthly insights. Cached for 5 minutes.

**Response `200`:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "summary": "Potholes increased 23% in Sector 15–22 corridor this week.",
    "hotspots": [ { "area": "Sector 17", "issueCount": 18 } ],
    "recommendations": [ "Deploy crew to Sector 17 road junction" ]
  }
}
```

---

#### `POST /ai/check-duplicate`
Auth: ✅ | Role: any

Before submitting a report, check if a similar one already exists.

**Request:**
```json
{
  "title": "Pothole near bus stand",
  "description": "Big hole in the road",
  "category": "pothole",
  "location": { "type": "Point", "coordinates": [76.779, 30.733] }
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "isDuplicate": true, "duplicateOf": "64a...", "confidence": 0.87 }
}
```

---

## WebSocket Events (Socket.IO)

**Endpoint:** `ws://localhost:5000`

### Client → Server

#### `connection` with auth
```js
const socket = io('http://localhost:5000', {
  auth: { token: 'Bearer eyJhbGc...' }
});
```

On connect, the server places the socket in:
- `user_<userId>` — personal room
- `admins` — if role is `admin`

---

### Server → Client

#### `notification`
Sent to `user_<userId>` when a new notification is created.
```json
{
  "_id": "...",
  "type": "report_update",
  "title": "Your report was updated",
  "message": "Status changed to in_progress",
  "isRead": false,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

#### `report_update`
Sent to admins room **and** `user_<submitterId>` when a report status changes.
```json
{
  "reportId": "64a...",
  "title": "Pothole on NH5",
  "status": "in_progress",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

#### `work_order`
Sent to `user_<contractorId>` when assigned a new work order.
```json
{
  "workOrderId": "...",
  "reportId": "...",
  "status": "open",
  "scheduledDate": "2024-01-03T08:00:00Z",
  "priority": "high"
}
```

#### `civic_alert`
Broadcast to **all** connected clients for city-wide alerts.
```json
{
  "title": "Road closure alert",
  "message": "Sector 17–22 road closed for 3 hours",
  "severity": "high",
  "area": "Sector 17",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Integration Notes

### 11. Google Maps Platform & Google Routes API

> **Base Route:** `/api/v1/maps`  
> Powers Live Map, Map Monitoring, Search Autocomplete, and the Safe Route Planner.

---

#### `POST /maps/safe-route`
Auth: ✅ | Role: any

Computes turn-by-turn driving routes via **Google Routes API v2**, evaluates alternative paths, and scores each route against active reported civic hazards (potholes, flooding, road cave-ins).

**Request Body:**
```json
{
  "origin": { "lat": 30.7333, "lng": 76.7794 },
  "destination": { "lat": 30.7500, "lng": 76.7460 }
}
```
*(Can also accept street address strings like `"Sector 17, Chandigarh"` for auto-geocoding).*

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "origin": { "lat": 30.7333, "lng": 76.7794 },
    "destination": { "lat": 30.7500, "lng": 76.7460 },
    "totalRoutesEvaluated": 2,
    "safestRouteIndex": 1,
    "fastestRouteIndex": 0,
    "safetyAdvice": "Recommended: Take Route Option 2 (Score: 92/100, 0 hazard(s)), avoiding 2 hazard(s) on the fastest route.",
    "routes": [
      {
        "routeLabel": "Fastest Route via Sector 17 Main Rd",
        "distanceMeters": 4800,
        "durationFormatted": "11 mins",
        "durationSeconds": 660,
        "polyline": "encoded_polyline_string...",
        "coordinates": [ [30.7333, 76.7794], [30.7410, 76.7620], ... ],
        "safetyScore": 65,
        "safetyGrade": "B - Moderate Caution",
        "badgeColor": "#F59E0B",
        "hazardCount": 2,
        "hazardsOnRoute": [
          {
            "_id": "673...",
            "title": "Large pothole on Sector 17 road",
            "category": "pothole",
            "priority": "high",
            "severity": "high",
            "location": { "lat": 30.7333, "lng": 76.779 },
            "distanceFromRouteMeters": 14
          }
        ]
      },
      {
        "routeLabel": "Safest Route via Jan Marg",
        "distanceMeters": 5300,
        "durationFormatted": "13 mins",
        "durationSeconds": 780,
        "polyline": "encoded_polyline_string...",
        "coordinates": [ ... ],
        "safetyScore": 95,
        "safetyGrade": "A - Safe",
        "badgeColor": "#10B981",
        "hazardCount": 0,
        "hazardsOnRoute": []
      }
    ]
  }
}
```

---

#### `GET /maps/live-markers`
Auth: ✅ | Role: any

Returns active civic complaints formatted for Google Maps Markers with custom pins, category color badges, and infoWindow payloads.

Query params: `category`, `priority`, `status`.

---

#### `GET /maps/heatmap`
Auth: ✅ | Role: any

Returns points specifically formatted for `google.maps.visualization.HeatmapLayer`:
`[{ "lat": 30.733, "lng": 76.779, "weight": 4, "category": "pothole" }]`

---

#### `GET /maps/geocode?address=...`
Auth: ✅ | Role: any

Converts human-readable address into `{ lat, lng, formattedAddress }`.

---

#### `GET /maps/reverse-geocode?lat=...&lng=...`
Auth: ✅ | Role: any

Converts GPS coordinates into verified street address.

---

#### `GET /maps/autocomplete?query=...`
Auth: ✅ | Role: any

Returns real-time street and locality suggestions as the citizen types.

---

#### `GET /maps/config`
Auth: ✅ | Role: any

Returns safe client map configuration (`defaultCenter`, `defaultZoom`, `supportedModes`).

---

### For the AI/ML Teammate

The backend calls the FastAPI service at `AI_SERVICE_URL` (default `http://localhost:8000`):

| Method | Path | Payload | Response |
|--------|------|---------|----------|
| POST | `/api/v1/analyze` | multipart `image` (+ optional `candidate_hashes`) | envelope `{ ok, data, meta, error }`; HTTP 422 with `data` when the image is rejected |
| POST | `/chat` | `{ message, language, userId, history }` | `{ reply, language }` (offline keyword fallback) |

Chat prefers the CivicBot (Gemini) service at `CHATBOT_URL` (`POST /api/chat`). Insights and duplicate checks are computed from MySQL inside the backend.

---

### For the CV Teammate (Computer Vision)

- Upload your analysed image to Cloudinary first (use `POST /upload/image`), then pass the returned URL to `POST /ai/analyze-image`.
- Expected response fields: `severity` (`low`/`medium`/`high`/`critical`), `category` (matches Report categories), `confidence` (0–1 float), `description` (string).
- The backend stores AI analysis in `Report.aiAnalysis` on creation.

---

## Admin portal (`/api/v1/admin`, admin role only)

Every state-changing action is written to the audit log (`GET /admin/activity`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/analytics` | Totals, status/category/priority breakdown, 14-day trend, top citizens, contractor workload, alerts (needs review, awaiting verification, overdue) |
| GET | `/reports?status&category&priority&q&needsReview&page&limit` | Filtered report list with reporter, work-order summary and moderation verdict |
| GET | `/reports/:id` | Full detail: images, AI analysis, confirmers, status history, work order |
| POST | `/reports/:id/verify` | Mark genuine; releases the citizen's pending +25 |
| POST | `/reports/:id/reject` `{reason}` | Reject as fake: report closed, citizen −40, reason shown to them. Once only |
| POST | `/reports/:id/assign` `{contractorId, dueDate?, priority?, notes?}` | Create (or reassign) the work order, notify contractor and citizen |
| POST | `/reports/:id/resolve` `{note?}` | Close without a contractor; pays +50 once |
| GET | `/workorders?status&contractor` | All work orders with report and contractor details |
| GET/POST | `/contractors` | Contractor stats (active, overdue, avg repair time, on-time %) / create a contractor account |
| GET | `/users?role&q&page` | Accounts with report counts and CivicCreds |
| GET/POST | `/users/:id/creds` | Points history / manual adjustment `{amount (±500), reason}` |
| PATCH | `/users/:id/active` `{isActive}` | Suspend or reactivate (not yourself, not admins) |
| GET | `/activity` | Audit log |
| GET | `/clusters` | Same problem reported by 2+ people (same kind of problem, within `CLUSTER_RADIUS_M` = 100 m by default of the oldest report, still open; pothole + road damage and waterlogging + drainage count as the same kind), oldest report first |
| POST | `/reports/:id/severity` `{priority: 'low'\|'medium'\|'high'\|'critical'}` | Admin sets the severity of a report (validated, written to the activity log) |
| POST | `/reports/:id/priority-zone` `{zone: 'school'\|'hospital'\|null}` | Confirm or remove the near-school/hospital flag (removing puts the report back in the normal queue) |
| GET | `/export/reports.csv` | All reports as CSV |

### Duplicates and priority zones

- `POST /reports` accepts `priorityZone: "school" | "hospital"`. Such a report is never below `high` priority and admins are notified. The flag is self-declared, so admins can remove it from the report screen. `GET /admin/reports?priorityZone=true` lists them.
- Assigning a report also moves its still-pending duplicates to `assigned`. Resolving it (work order verified, or resolved directly) resolves every open duplicate too: each reporter gets a notification, the report becomes `resolved` (so the certificate PDF is available in My Reports) and their pending +25 is released. Only the resolved report itself earns the +50, and the same person filing duplicates earns no extra points.
- A report rejected as fake is never swept into a cluster resolution.

### Work-order rules (`PATCH /workorders/:id/status`)

- Allowed moves: `open → in_progress | completed`, `in_progress → completed | open`, `completed → in_progress | verified`.
- A contractor can start and finish only their own jobs, and must upload at least one proof photo before `completed`.
- Only an admin can set `verified`. Verifying resolves the report, releases any pending +25 and pays the reporter **+50 exactly once** (a second attempt returns `409`).
- Setting a report to `resolved` through `PATCH /reports/:id/status` goes through the same code path, so points are never paid twice.

## Rate Limiting

All endpoints share a rate limit of **100 requests per 15 minutes** per IP.  
Exceeded requests return `429 Too Many Requests`.
