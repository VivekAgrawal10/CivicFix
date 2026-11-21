# Integration notes — what changed from each teammate's original

## Frontend (was: mock data only, no API calls)
* New `src/api/client.js` (fetch client + backend→UI mapper), `context/AuthContext.jsx`, `pages/LoginPage.jsx`.
* `CivicDataContext` loads live reports (`GET /reports`, polled every 30 s) once signed in; falls back to the bundled demo data otherwise (footer shows which). Admin status changes → `PATCH /reports/:id/status`; confirmations → `POST /reports/:id/confirm`. Clusters/roads/weather/navigation presets are still demo data.
* `ReportIssuePage`: real photo upload, live AI pre-check, GPS button, rejection messages; removed the hard-coded Unsplash "sample photos".
* `ChatbotPage`: was an empty shell; now chats via `/ai/chat` (en/hi/pa).
* `Navbar`: sign in/out, Admin Portal link only for admins; `/admin/*` routes guarded (the API enforces roles regardless).
* Resolved committed merge-conflict markers in `.gitignore` and `README.md` (the README held the chatbot's README — moved to `chatbot/README.md`).
* Left untouched: legacy pages under `src/pages/citizen` and `src/pages/admin` that are not routed in `App.jsx`.

## Backend
* `services/aiClient.js` (new): adapter to the FastAPI contract (multipart `/api/v1/analyze`), response normalisation, SSRF-safe image loading, never throws (AI outage → manual review).
* `ai.controller.js`: `analyze-image` uses the adapter; new `analyze-upload` (multipart pre-check); `chat` → CivicBot, then keyword fallback; `insights` and `check-duplicate` now computed from MongoDB (previous version proxied to hard-coded sample numbers / a signature the AI service didn't match).
* `report.controller.js`: server-side AI screening, `422 NON_CIVIC_IMAGE`, stores `aiAnalysis`; submit reward moved from "immediate" to "pending until independent verification", idempotent.
* `civicCreds.js`: daily caps. `Report` model: `waterlogging` category, AI fields, reward flags.
* `auth.controller.js`: public registration cannot choose a role.
* `config/mysql.js` + `mysqlService.js`: MySQL pool only when `MYSQL_HOST`/`DB_HOST` is set (it previously always claimed to be available and threw `ECONNREFUSED`); view queries fail soft.
* `server.js`: CORS accepts several origins; helmet CORP relaxed so `/uploads` images show in the frontend; rate limit configurable.
* The backend's own `ai_service/` Python folder was **not** carried over: `vision.py` is replaced by `ai-service/` (relevance gate + CV), `nlp.py` keyword chat was moved into `ai-service/app/services/keyword_chat.py` (check-status intent now matches before report), `duplicate.py` logic lives in `ai.controller.js`/pre-check, and `mock_translate` (a 4-word dictionary reported as "ai_service") was dropped — `/translate` honestly returns the original text.

## AI service
* Added `/chat` (offline keyword assistant) and CORS settings. Everything else is the original service. The earlier standalone Node XP server is superseded by `backend` (CivicCreds + pending-reward policy); the FastAPI `/xp/calculate`, `/priority` and `/verify` endpoints remain available but are not yet called by the Express API.

## Chatbot
* `server/`: default port 5001 (was 5000, clashing with the API), accepts `language`, CORS defaults for the new ports, `.env.example` added. `standalone-ui/` points at 5001.

## Known gaps / next steps
* Sockets: the backend emits Socket.IO events, the frontend does not subscribe yet (polling instead).
* Work orders / contractor flows exist in the API but the frontend "Repairs" page still uses demo clusters.
* Run the backend suites against a real MySQL server (`TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm run test:api`); in the migration sandbox they ran on an in-memory SQLite adapter only.

## MySQL migration (branch `feature/mysql-migration`)
MongoDB/Mongoose were removed; MySQL 8 (`mysql2/promise`, one pooled connection) is the only database. `src/models/*` are now SQL data-access modules that return the same object shapes the Mongoose models did, so controllers, routes and the frontend contract are unchanged. Tables: `backend/database/schema.sql`; design notes: `backend/database/DATABASE_README.md`. The previous analytics schema is kept in `backend/database/legacy/`.
