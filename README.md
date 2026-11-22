<div align="center">

# 🛣️ CivicFix

**Report it. Verify it. Fix it.**

Citizens photograph potholes, garbage, flooding and broken street lights; CivicFix turns them into tracked, verified repairs.

![React](https://img.shields.io/badge/React-Vite%20%2B%20Tailwind-61DAFB?logo=react&logoColor=white)
![Node](https://img.shields.io/badge/API-Express-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/DB-MySQL%208-4479A1?logo=mysql&logoColor=white)
![FastAPI](https://img.shields.io/badge/AI-FastAPI-009688?logo=fastapi&logoColor=white)

*SATHACK @ Thapar University*

</div>

## Features

- **Report in one minute:** photo, category, map pin (type an address or use GPS) and a *near a school or hospital* tick for priority problems.
- **AI photo check:** rejects screenshots, unrelated photos and AI-generated images (read from file metadata) before anything is saved.
- **Live map and heat map** of real reports, plus a safe-routes view.
- **Admin portal:** dashboard, reports sorted by severity, same-problem clusters, repairs, contractors, users and an audit log.
- **Clusters:** reports of the same problem within 100 m are grouped; fixing one resolves all and notifies every reporter.
- **Contractors** start jobs, upload proof photos, and an admin verifies before closing.
- **CivicCreds rewards:** +25 per verified report, +15 per confirmation, +50 when fixed, −40 for fakes, plus a PDF certificate.
- **Chatbot** in English, Hindi and Punjabi (Gemini, with an offline fallback).

## Tech stack

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React, Vite, Tailwind, Leaflet | 3000 |
| `backend/` | Node, Express, JWT, Socket.IO | 5000 |
| `ai-service/` | Python, FastAPI, optional CLIP | 8000 |
| `chatbot/server/` | Gemini assistant | 5001 |
| Database | MySQL 8 | 3306 |

## Quick start

Requires Node 18+, Python 3.11+ and MySQL 8 (or Docker).

```bash
npm run setup                          # install everything and create .env files
docker compose up -d                   # start MySQL
npm run seed                           # demo accounts (optional)
source ai-service/.venv/bin/activate
npm run dev                            # start all services
```

Open **http://localhost:3000**. Tables are created automatically when the API starts.

| Demo role | Email | Password |
|---|---|---|
| Citizen | `citizen@civicfix.com` | `Demo@123` |
| Admin | `admin@civicfix.com` | `Admin@123` |
| Contractor | `contractor@civicfix.com` | `Demo@123` |

Optional: add `GEMINI_API_KEY` to `chatbot/server/.env` for Gemini, and set `CLUSTER_RADIUS_M` in `backend/.env` to change the cluster radius.

## Tests

```bash
npm run test:api   # backend
npm run test:ai    # AI service
```

API reference: [`backend/API_DOCS.md`](backend/API_DOCS.md)

> **Note:** the AI is not trained on civic data. It uses heuristics and a pretrained zero-shot model, and an admin always makes the final call.
