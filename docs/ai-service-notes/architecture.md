# CivicFix architecture

## Reconnaissance result

The project directory was empty at the beginning of Phase 1.  There is no
existing React application, Node.js backend, database schema, authentication
mechanism, report flow, authority dashboard, or AI implementation to preserve.

The development host is Apple Silicon (`arm64`) with 16 GB RAM and 10 CPU
cores, running Python 3.13.14 and Node.js 24.13.0.  The design therefore
defaults to CPU-safe dependencies and small, cached model artifacts.  Hardware
acceleration is an optional optimisation, not a requirement for correctness.

## Service boundaries and ownership

```text
React web app
    | authenticated HTTP + uploads
    v
Node.js / Express API  <------------------->  MongoDB
    | owns users, reports, verification, XP,          owns durable state
    | authority work orders and uploads
    | private service-to-service HTTP
    v
Python FastAPI AI service
    owns image validation, analysis evidence,
    similarity signals and deterministic scoring helpers
```

`web/` never calls the AI service directly in production.  Browser requests go
to the Node API, which authenticates the user, stores the upload, calls the AI
service with a bounded timeout, and persists only the result it needs.  This
keeps service credentials and untrusted-image handling out of the browser.

MongoDB is owned only by `server/`.  The AI service remains stateless except
for local model caches and does not receive database credentials.  Media is
stored by the Node API in a pluggable object-store adapter; the initial local
adapter is for development only.

## Report lifecycle

```text
Submitted
  -> image validation failed (terminal) | pending verification
  -> awaiting second report | AI verification passed
  -> community verified | manual review required | rejected
  -> forwarded to authority -> work order approved / resolved

Pending XP --(approved verification, once)--> final XP ledger entry
           --(subsequent rejection, once)--> compensating negative entry
```

Every transition is enforced by the Node API.  Its idempotency key and a unique
ledger constraint prevent duplicate report processing and duplicate XP awards.
A reporter cannot contribute a confirming report for their own issue.

## AI contract

The initial API version is `/api/v1`.  All responses have this envelope:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "uuid",
    "processing_ms": 0,
    "model_status": "available|degraded|unavailable"
  },
  "error": null
}
```

Errors use the same envelope with `ok: false` and a stable error code.  Planned
endpoints are `GET /health`, `GET /models/status`, `POST /analyze`,
`POST /authenticity`, `POST /duplicates/check`, `POST /verify`, and
`POST /priority`.  `analyze` composes validation, classification/detection,
relative-area estimation, severity evidence, and optional annotations so that
the backend makes one bounded call per uploaded image.

The analysis result distinguishes an unavailable model from a negative
prediction.  It will never invent a detection, confidence, or prediction.  If
model weights cannot be loaded, callers receive a degraded outcome and can
route the report to manual review.

## AI modules

- **Validation:** MIME/signature, byte size, dimensions, decoding, supported
  formats, blur/brightness/contrast, and inference suitability.
- **Detection/classification:** a registry-loaded road-damage model with an
  explicit availability state.  Dataset/model provenance is recorded before a
  model is enabled.
- **Area:** the total detection-box area divided by image area, clearly named
  `relative_affected_area`; a segmentation mask supersedes it only when an
  actual segmentation model is present.
- **Severity:** initially a documented weak-label feature rubric; trained
  tabular models are introduced only after the data pipeline and held-out
  evaluation are reproducible.
- **Authenticity:** metadata, structural anomalies, duplicate signals and ELA
  indicators produce a risk assessment, never a claim of proof.
- **Duplicates:** perceptual hash as the P0 baseline, followed by ORB matching
  and broader image reuse checks in P2.
- **Business helpers:** pure, tested Python implementations for priority and
  verification recommendations.  The Node API applies the final workflow and
  XP transaction rules.

## Node/Mongo domain design

Initial collections are `users`, `reports`, `verificationEvidence`,
`xpLedger`, `workOrders`, and `idempotencyKeys`.  Reports record immutable
analysis snapshots, current lifecycle state, geospatial location, a content
hash, reporter identity, and audit timestamps.  `xpLedger` is append-only and
has a unique `{reportId, eventType}` index.  XP balance and level are derived
or atomically materialized by the Node API, never supplied by the AI service.

Configuration uses environment variables such as `AI_SERVICE_URL`,
`AI_SERVICE_TIMEOUT_MS`, `MONGODB_URI`, `UPLOAD_STORAGE_*`, and model artifact
paths.  Secrets and dataset credentials are excluded from version control.

## Frontend integration

The React application will use only Node API endpoints.  The AI Lab shows the
stored, real API response: validation stages, model availability, detection
overlay, relative affected area, severity evidence, authenticity risk, priority
explanation, pending-XP breakdown, and verification state.  Demo mode uses
licensed fixtures and labelled simulation inputs; it never replaces an API
response with hard-coded successful inference.

## Operational constraints

Models load once at FastAPI startup, are cached, and report their readiness.
The Node API uses request size limits, image-type checks, retries only for safe
service calls, and strict timeouts.  Structured logs carry a shared request ID.
Large training and inference work is separated from request-time CPU work.
