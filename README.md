# CivicFix — AI-assisted civic issue reporting

Citizens photograph a road/civic problem; the AI screens the photo, the API stores the report, admins triage it,
and community confirmations unlock rewards. This repo combines the four parts built by the team into one project.

```
┌──────────────┐  REST /api/v1  ┌───────────────────────┐  multipart /api/v1/analyze  ┌──────────────────────┐
│  frontend/   │ ─────────────▶ │  backend/  (Express)  │ ──────────────────────────▶ │  ai-service/ (FastAPI)│
│  React+Vite  │                │  JWT · RBAC · MySQL   │                             │  relevance gate, CV,  │
│  :3000       │                │  uploads · XP rules   │ ── /chat ─▶ chatbot/server  │  optional CLIP  :8000 │
└──────────────┘                │  :5000                │            (Gemini)  :5001  └──────────────────────┘
                                └──────────┬────────────┘  └─ fallback: ai-service /chat (offline keyword bot)
                                           │
                                    MySQL 8 (the only database)
```

| Folder | What it is | Port |
|---|---|---|
| `frontend/` | React + Vite + Tailwind citizen/admin web app | 3000 |
| `backend/` | Express API: auth, reports, work orders, uploads, CivicCreds, Socket.IO, MySQL | 5000 |
| `ai-service/` | FastAPI: image relevance screening, damage/area heuristics, optional CLIP scene classifier, XP/priority/verification rules | 8000 |
| `chatbot/server/` | CivicBot — Gemini-powered assistant (API proxies `/ai/chat` here) | 5001 |
| `chatbot/standalone-ui/` | The chatbot's original stand-alone UI (optional; the main app has its own chat page) | 5173 |
| `backend/database/` | MySQL schema + reporting views + reference queries | 3306 |

## Quick start

Requirements: **Node 18+** (22 recommended), **Python 3.11+**, **MySQL 8** (Docker or local), optionally Docker.

```bash
git clone <this repo> && cd civicfix
npm run setup            # installs everything, creates .env files, generates a JWT secret
docker compose up -d     # MySQL on :3306  (skip if you have your own MySQL; set MYSQL_* in backend/.env)
npm run seed             # demo admin/citizen/contractor accounts only (no sample reports)
source ai-service/.venv/bin/activate     # Windows: ai-service\.venv\Scripts\activate
npm run dev              # starts AI :8000, API :5000, chatbot :5001, web :3000
```

Open http://localhost:3000 and sign in.

**Demo accounts** (created by `npm run seed` — development only, never deploy them):

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@civicfix.com` | `Demo@123` |
| Admin | `admin@civicfix.com` | `Admin@123` |
| Contractor | `contractor@civicfix.com` | `Demo@123` |

Optional switches
- **AI chatbot**: put a Gemini key in `chatbot/server/.env` (`GEMINI_API_KEY=...`). Without it the chat page falls back to the offline keyword assistant (English/Hindi/Punjabi).
- **Pretrained CLIP scene model** — this is what actually recognises whether a photo shows a pothole, garbage, flooding, a damaged street light or something unrelated. Without it, every photo that is not an obvious document/screenshot is only queued for manual review. `npm run setup` installs it; on an existing setup run `ai-service/.venv/bin/pip install -r ai-service/requirements-clip.txt` and restart. It switches on automatically when installed (`CIVICFIX_ENABLE_CLIP=0` turns it off), downloads ~600 MB on first start and pre-loads in the background (`AI_TIMEOUT_MS` in `backend/.env` covers a slow first check).
- **Live map tiles**: the map uses Leaflet + OpenStreetMap tiles, which need **no API key**. To use a keyed provider (MapTiler, Stadia, Thunderforest, …) set `VITE_MAP_TILE_URL` (with `{key}` placeholder) and `VITE_MAP_API_KEY` in `frontend/.env`.
- **Cloudinary**: fill the three `CLOUDINARY_*` values; otherwise photos are stored in `backend/uploads/`.

Run services individually: `npm run dev:ai | dev:api | dev:bot | dev:web`.

## How a report flows

1. Citizen picks a photo → frontend calls `POST /api/v1/ai/analyze-upload` for an instant pre-check (non-civic photos such as certificates, screenshots or diagrams are flagged immediately).
2. Submit → photo uploaded to `/upload/images`, then `POST /api/v1/reports`. **The server re-runs the AI check itself** (the pre-check is only UX) and answers `422 NON_CIVIC_IMAGE` for rejected images — nothing is stored, no rewards.
3. Accepted reports store the AI result (`aiAnalysis`: outcome, category, severity, confidence, image hash, manual-review flag). If the AI is unsure or down, the report is stored and flagged for **manual review**.
4. **Rewards (CivicCreds)** are *pending* at submission. The +25 is granted once, only after independent verification: a different citizen confirms (`POST /reports/:id/confirm`) or an admin moves the report past `pending`. Daily caps limit farming (5 submit rewards, 10 confirm rewards per 24 h).
5. Near-duplicates: `/reports/pre-check` (60 m geo check) and perceptual image-hash matching against reports within 150 m.

## Databases

* **MySQL 8 is the only database** (users, reports, image metadata, work orders, notifications, road segments, translations). One `mysql2/promise` pool is configured from `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` in `backend/.env`.
* Tables are created automatically on server start (or with `npm run db:init`); `npm run seed` adds demo data. Schema, views and design notes: `backend/database/schema.sql`, `DATABASE_README.md`, `test_queries.sql`. The original database teammate's analytics schema is kept for reference in `backend/database/legacy/`.
* The API returns the same JSON shapes as before (string `_id`s, GeoJSON `location`, populated `submittedBy`, …), so the frontend is unchanged.

## Tests

```bash
npm run test:api     # backend: unit + AI-adapter + report/XP flow + full endpoint suite against the MySQL data layer
                     # (default: in-memory SQLite adapter; real MySQL: TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm run test:api)
npm run test:ai      # ai-service pytest suite
```

## Honest status

What was run when the MySQL migration was assembled (Linux sandbox, no MySQL server/Docker/network):
* backend tests pass on the in-memory SQLite adapter that executes the real `schema.sql` (translated) and the same SQL as production; **they have not yet been run against a real MySQL server in the sandbox** — run `TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm run test:api` on your machine to confirm (details in `backend/database/DATABASE_README.md`);
* ai-service relevance/business/keyword-chat tests passed earlier (28);
* every frontend source file parses and all relative imports resolve.

**Not run end-to-end here**: the full stack with a live MySQL server, the FastAPI service after the `/chat` router was added, `vite build`, Gemini, Cloudinary. Expect to fix small integration issues on first launch; see `docs/INTEGRATION.md` for exactly what changed and where to look.

AI honesty: no model in this repo is fine-tuned on real civic data. Photo screening uses heuristics (+ optional pretrained zero-shot CLIP); severity is an area-based rubric, not ground truth; the AI can never auto-verify a report.

## Security notes
* The uploaded team zips contained real secrets in `.env` files (database URI, JWT secret, Cloudinary secret, Gemini API key). They were **not** copied here — **rotate those credentials** and never commit `.env` files (`.gitignore` blocks them).
* Public sign-up now always creates a `citizen` (it previously trusted a client-supplied `role`, allowing self-registered admins).
* `/ai/*` image fetching is restricted to `backend/uploads` and an allow-listed host list (SSRF guard).
