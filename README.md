<div align="center">

# 🛣️ CivicFix

**Report it. Verify it. Fix it.**

A citizen-powered platform that turns photos of potholes, garbage, flooding and broken street lights<br>
into tracked, verified repairs.

![React](https://img.shields.io/badge/React-Vite%20%2B%20Tailwind-61DAFB?logo=react&logoColor=white)
![Node](https://img.shields.io/badge/API-Express-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/DB-MySQL%208-4479A1?logo=mysql&logoColor=white)
![FastAPI](https://img.shields.io/badge/AI-FastAPI-009688?logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Chatbot-Gemini-8E75B2?logo=googlegemini&logoColor=white)

*Built for SATHACK @ Thapar University*

</div>

---

## Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Configuration](#configuration)
- [How a report flows](#how-a-report-flows)
- [CivicCreds rewards](#civiccreds-rewards)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Tests](#tests)
- [Honest status](#honest-status)
- [Security notes](#security-notes)

---

## What it does

Road and civic problems often go unreported, reach the wrong office, or vanish without an answer. CivicFix connects
**citizens, AI, the city team and contractors** in one loop:

```
  📷 Report  ──▶  🤖 AI check  ──▶  ✅ Verify  ──▶  🔧 Repair  ──▶  🏅 Reward
  photo + pin     screen photo     citizen or     contractor      CivicCreds +
  + category      score severity   admin          with photo      certificate
                                                  proof
```

---

## Features

### 👤 Citizens

| Feature | What it does |
|---|---|
| **Report an issue** | Six categories, a photo, a short note and a map pin |
| **AI photo check** | Rejects screenshots, documents, unrelated and AI-generated photos before anything is saved |
| **Pin the exact spot** | Type a street or landmark and press Enter, use GPS, or tap and drag the pin |
| **Near a school or hospital** | One tick marks the report as a priority problem and alerts admins |
| **Live map** | Real reports on OpenStreetMap, colour-coded, with a heat map; refreshes every 15 s |
| **Safe routes** | Route view that highlights hazards along the way |
| **My Reports** | Live status of every report you filed, with reward state |
| **Confirm reports** | Back up another citizen's report and earn points |
| **Notification bell** | Verified, assigned, resolved and points updates |
| **Resolution certificate** | Download a PDF once your report is fixed |
| **Chatbot** | Gemini assistant in English, Hindi and Punjabi, with an offline fallback |

### 🛠️ Admin portal

| Page | What it does |
|---|---|
| **Dashboard** | Totals, alert cards, charts by category and severity, hotspots, top citizens, CSV export |
| **Reports** | Search and filter; **Severity** column with *Most severe first* sort; verify, reject as fake, assign, resolve |
| **Report drawer** | Photo, AI analysis, a "why this severity" box, severity override, same-problem list, history |
| **Clusters** | Same problem reported by several people, grouped into one; fix it once and everyone is notified |
| **Repairs** | Work orders with the contractor's proof-of-repair photos; verify to close |
| **Contractors** | Create contractor accounts; see workload and finished jobs |
| **Users** | CivicCreds per user, adjust points with a written reason, suspend abusers |
| **Activity** | Audit log of every admin action: who did what, and when |

### 🔧 Contractors

A single **My Jobs** page: start a job, upload photos of the finished repair, and mark it complete. The *Mark complete*
button stays off until at least one photo is uploaded, and only an admin can verify and close the job.

### 🧭 Severity and priority

Every report has a severity of **Low · Medium · High · Critical**:

- the AI estimates it from how much of the photo is damaged;
- **3** citizen confirmations raise it to High, **5** to Critical;
- a report near a **school or hospital** is always at least High;
- an admin can override it, and the change is written to the activity log.

### 🔗 Same-problem clusters

Reports of the same kind of problem within **100 m** of the first report are grouped into one cluster
(pothole + road damage count together, and so do waterlogging + drainage).

- Assigning the main report moves every pending report in the cluster to *assigned*.
- Resolving it resolves them all, notifies every reporter and enables their certificates.
- The **+50** reward is paid once, so filing duplicates cannot farm points.
- The radius is configurable with `CLUSTER_RADIUS_M` in `backend/.env`.

### 🕵️ AI-generated image check

No ML model is needed for this. AI image tools leave traces in the file itself, so CivicFix reads them directly:
metadata tags in JPEG, PNG and WebP files, names of known generators, Content Credentials (C2PA) markers, and data hidden
after the end of the image. The check runs in the AI service **and** again in the Node API, so it still works when
the AI service is offline.

> **Limit:** a photo whose metadata has been stripped is not caught by this check. Unsure photos go to manual review,
> and an admin always makes the final call.

---

## Architecture

```
┌──────────────┐  REST /api/v1  ┌───────────────────────┐  /api/v1/analyze   ┌───────────────────────┐
│  frontend/   │ ─────────────▶ │  backend/  (Express)  │ ─────────────────▶ │  ai-service/ (FastAPI)│
│  React+Vite  │                │  JWT · roles · MySQL  │                    │  photo checks, CLIP,  │
│  :3000       │ ◀── Socket.IO ─│  uploads · CivicCreds │ ── /chat ─▶ chatbot/server (Gemini) :5001 │
└──────────────┘                │  :5000                │                    │  severity  :8000      │
                                └──────────┬────────────┘                    └───────────────────────┘
                                           │
                                    MySQL 8 (the only database)
```

| Folder | What it is | Port |
|---|---|---|
| `frontend/` | React + Vite + Tailwind web app for citizens, admins and contractors | 3000 |
| `backend/` | Express API: auth, reports, work orders, clusters, notifications, uploads, CivicCreds, Socket.IO | 5000 |
| `ai-service/` | FastAPI: photo relevance, AI-generated image check, damage area and severity, optional CLIP classifier | 8000 |
| `chatbot/server/` | CivicBot, the Gemini-powered assistant | 5001 |
| `backend/database/` | MySQL schema, reporting views and reference queries | 3306 |

---

## Quick start

**Requirements:** Node 18+ (22 recommended) · Python 3.11+ · MySQL 8 (Docker or local)

```bash
git clone https://github.com/VivekAgrawal10/CivicFix.git
cd CivicFix

npm run setup                          # installs everything, creates .env files, generates a JWT secret
docker compose up -d                   # MySQL on :3306 (skip if you run your own MySQL)
npm run seed                           # demo accounts (optional)

source ai-service/.venv/bin/activate   # Windows: ai-service\.venv\Scripts\activate
npm run dev                            # AI :8000 · API :5000 · chatbot :5001 · web :3000
```

Open **http://localhost:3000**. The footer shows the build number (`build v8`), and `GET http://localhost:5000/health`
returns it too, so you can confirm you are running the latest code.

Run a single service with `npm run dev:ai`, `dev:api`, `dev:bot` or `dev:web`. Stop everything with **Ctrl+C**.

> Database tables are created automatically when the API starts. You do not need to run `schema.sql` by hand.

---

## Demo accounts

Created by `npm run seed`. **For development only; never deploy them.**

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@civicfix.com` | `Demo@123` |
| Admin | `admin@civicfix.com` | `Admin@123` |
| Contractor | `contractor@civicfix.com` | `Demo@123` |

---

## Configuration

All settings live in `.env` files created by `npm run setup`. The ones you are most likely to change:

| Setting | File | Purpose |
|---|---|---|
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | `backend/.env` | Database connection |
| `CLUSTER_RADIUS_M` | `backend/.env` | Same-problem radius in metres (default 100) |
| `AI_TIMEOUT_MS` | `backend/.env` | Time allowed for a photo check (the first CLIP check is slow) |
| `AI_STRICT` | `backend/.env` | `true` rejects photo reports when the AI service is down |
| `CLOUDINARY_*` | `backend/.env` | Store photos on Cloudinary instead of `backend/uploads/` |
| `GEMINI_API_KEY` | `chatbot/server/.env` | Enables Gemini; without it the offline keyword assistant answers |
| `CIVICFIX_ENABLE_CLIP` | `ai-service` env | `0` turns the CLIP scene model off |
| `VITE_API_URL` | `frontend/.env` | API address (default `http://localhost:5000/api/v1`) |
| `VITE_MAP_TILE_URL`, `VITE_MAP_API_KEY` | `frontend/.env` | Use a keyed map tile provider instead of OpenStreetMap |

**CLIP scene model.** This is what recognises whether a photo shows a pothole, garbage, flooding, a street light or
something unrelated. `npm run setup` installs it; it downloads about 600 MB on first start. Without it, photos that are
not obvious screenshots or documents are queued for manual review. On an older setup:
`ai-service/.venv/bin/pip install -r ai-service/requirements-clip.txt`.

---

## How a report flows

1. **Pre-check.** When a photo is picked, the web app calls `POST /api/v1/ai/analyze-upload` and warns about
   screenshots, documents and AI-generated images straight away.
2. **Submit.** The photo is uploaded and `POST /api/v1/reports` is called. **The server runs the check again itself**;
   a rejected photo returns `422` and nothing is stored.
3. **Store.** Accepted reports keep the AI result (category, severity, confidence, image hash, manual-review flag).
   If the AI is unsure or offline, the report is stored and flagged for manual review.
4. **Priority.** Severity, confirmations and the school/hospital flag set the priority; admins are alerted to priority reports.
5. **Duplicates.** Nearby reports are matched by distance and image hash, and same-problem reports are clustered.
6. **Verify → assign → repair.** An admin verifies, assigns a contractor, the contractor uploads proof, and the admin
   verifies the work. The report and its whole cluster are then resolved and every reporter is notified.

---

## CivicCreds rewards

| Action | Points | Notes |
|---|---|---|
| Report a real problem | **+25** | Pending until another citizen or an admin verifies it; max 5 rewarded reports a day |
| Confirm someone else's report | **+15** | Max 10 a day |
| Your report gets fixed | **+50** | Paid once per cluster |
| Fake or spam report | **−40** | Also lowers CivicScore |

New users start with 50 CivicCreds. Tiers: **Silver Guardian** at 100, **Gold Civic Champion** at 300 and
**Platinum City Hero** at 750 CivicCreds.

---

## Project structure

```
CivicFix/
├── frontend/              React app
│   └── src/
│       ├── pages/         Report, Map, My Reports, Rewards, Routes, Chatbot, Contractor jobs
│       ├── pages/admin/   Dashboard, Reports, Clusters, Repairs, Contractors, Users, Activity
│       ├── components/    LocationPicker, NotificationBell, map, layout, admin UI kit
│       └── api/client.js  All API calls
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── routes/ → controllers/ → models/    request → business rules → SQL
│   │   ├── services/      clusters, resolution, notifications, AI client
│   │   ├── utils/         CivicCreds engine, image metadata check
│   │   └── db/            schema setup and column migrations on start
│   ├── database/          schema.sql, views, reference queries
│   └── tests/
├── ai-service/            FastAPI photo analysis (+ tests)
├── chatbot/server/        Gemini assistant
├── scripts/setup.sh
└── docker-compose.yml     MySQL
```

---

## API overview

Base URL: `http://localhost:5000/api/v1`. Full reference: [`backend/API_DOCS.md`](backend/API_DOCS.md).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` (public sign-up always creates a citizen) |
| Reports | `GET/POST /reports`, `POST /reports/:id/confirm`, `POST /reports/pre-check` |
| AI | `POST /ai/analyze-upload`, `POST /ai/chat` |
| Contractor | My Jobs: list, change status, upload proof photos |
| Admin | `GET /admin/analytics`, `GET /admin/reports?sort=severity`, `POST /admin/reports/:id/verify \| reject \| assign \| resolve`, `POST /admin/reports/:id/severity`, `POST /admin/reports/:id/priority-zone`, `GET /admin/clusters`, `GET/POST /admin/contractors`, `GET /admin/users`, `POST /admin/users/:id/creds`, `PATCH /admin/users/:id/active`, `GET /admin/activity`, `GET /admin/export/reports.csv` |

Every admin route checks the role on the server, not just in the interface.

---

## Tests

```bash
npm run test:api     # backend: API, AI client, report flow, endpoints, admin, clusters, image metadata
npm run test:ai      # ai-service pytest suite
```

Backend tests run against an in-memory SQLite adapter that executes the real schema and SQL. To run them against a
real MySQL server:

```bash
TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm run test:api
```

---

## Honest status

- ✅ Backend suites pass on the in-memory adapter; ai-service tests pass.
- ✅ Every frontend file parses and all imports resolve; key admin and report screens were render-checked.
- ⚠️ Not yet run against a real MySQL server in CI. Run the MySQL test command above on your machine.
- ⚠️ Safe routes currently use sample routes; the route planner behind them is built and ready to connect.
- 🤖 **AI honesty:** no model here is fine-tuned on real civic data. Photo screening uses heuristics plus an optional
  pretrained zero-shot CLIP model; severity is an area-based estimate, not ground truth. The AI can never verify a
  report on its own.

---

## Security notes

- Passwords are hashed; sessions use JWT; roles (citizen, admin, contractor) are checked on every request.
- Public sign-up always creates a **citizen**; it no longer trusts a role sent by the client.
- Helmet, rate limiting, a CORS allow-list and an image-host allow-list (SSRF guard) protect the API.
- Never commit `.env` files; `.gitignore` blocks them. Secrets found in the original team zips were not copied here,
  and those credentials should be **rotated**.

---

<div align="center">

Made with ❤️ by the CivicFix team

</div>
