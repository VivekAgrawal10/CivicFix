# CivicFix

AI-assisted civic issue reporting. Citizens upload a photo of a pothole, damaged road, garbage, waterlogging or
broken streetlight; the AI service screens and analyses it, and the Node server owns reports, verification and the XP ledger.

```
 Browser (web/index.html, "AI Lab")
        │  multipart upload
        ▼
 Node + Express  (server/, port 3000)  ── reports, verification, XP ledger, anti-farming
        │  HTTP/JSON
        ▼
 FastAPI AI service (ai-service/, port 8000) ── relevance gate, scene model, area, severity, duplicates, priority, XP rules
```

The Node server also serves `web/`, so the frontend and backend run from one URL. To use your own frontend, call the
Node API below (CORS is not enabled; add the `cors` package in `server/src/app.js` if the frontend is on another origin).

## Requirements

| Tool | Version | Used for |
|---|---|---|
| Python | 3.11+ (developed on 3.13) | AI service |
| Node.js | 20+ (developed on 24) | Node server |
| pip packages | `ai-service/requirements.txt` | fastapi, uvicorn, python-multipart, pydantic-settings, pillow, numpy, scipy, scikit-learn, joblib |
| dev packages | `ai-service/requirements-dev.txt` | pytest, httpx |
| optional | `ai-service/requirements-clip.txt` | torch, transformers (CLIP scene model, ~600 MB weights) |
| npm packages | `server/package.json` | express, multer |

## Run it

Use **three steps in two terminals**. Do not put the virtual environment in a path containing `:`.

```bash
# 1. AI service (terminal 1)
cd ai-service
python3 -m venv ~/civicfix-venv && source ~/civicfix-venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
python -m uvicorn app.main:app --port 8000

# 2. Node server (terminal 2)
cd server
npm install
npm test
AI_SERVICE_URL=http://127.0.0.1:8000 PORT=3000 npm start      # change PORT if 3000 is taken

# 3. Open http://127.0.0.1:3000  (the AI Lab)
```

### Optional: pretrained CLIP scene classifier
Without it, photos that are not clearly a document or screenshot are labelled `uncertain` and held for manual review.
```bash
pip install -r requirements-clip.txt
CIVICFIX_ENABLE_CLIP=1 python -m uvicorn app.main:app --port 8000     # first request downloads ~600 MB
```
Check `GET http://127.0.0.1:8000/api/v1/models/status` → `scene_classifier.status` should be `available`.

### Environment variables
| Variable | Default | Where |
|---|---|---|
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | server |
| `PORT` | `3000` | server |
| `AI_SERVICE_TIMEOUT_MS` | `8000` | server (raise it for the first CLIP request) |
| `CIVICFIX_ENABLE_CLIP` | `0` | ai-service |
| `CIVICFIX_SCENE_MODEL` | `openai/clip-vit-base-patch32` | ai-service |

## API for frontends

Node (`/api`):
- `POST /reports` multipart: `image`, `reporterId`, `category`, `lat`, `lon`, `safetyRisk`, `trafficImpact`, `publicExposure` → analysis, priority, pending XP. Non-civic images return 422 `NON_CIVIC_IMAGE` and nothing is stored.
- `GET /reports/:id`
- `POST /reports/:id/verify` JSON `{ "corroboratingReportId": "..." }` (a different citizen, same category, ≤100 m, ≤48 h, different image)
- `POST /reports/:id/finalize-xp` (only after verification; idempotent; daily cap 300)
- `GET /models/status`

FastAPI (`/api/v1`): `POST /analyze`, `POST /xp/calculate`, `POST /priority`, `POST /verify`, `GET /models/status`, `GET /health`.

## What is real and what is not

- **Pretrained, not trained by us:** CLIP (OpenAI ViT-B/32), used zero-shot; not fine-tuned on civic data; accuracy unverified.
- **Heuristics (rule-based):** document/screenshot gate, HSV dark-region area estimate (filters borders, shadows, dark backgrounds), area-based severity rubric, dHash duplicate check, priority score.
- **Unavailable:** trained pothole/garbage/waterlogging detectors, authenticity (AI-image) detector.
- **Synthetic only:** `ai-service/ml/train_severity.py` (Gradient Boosting vs Random Forest) uses synthetic weak labels; its metrics are not real-world performance.
- **Not production:** reports and the XP ledger are in memory; there is no database or authentication.
- No dataset or labelled real-photo evaluation exists yet. See `docs/STATUS.md` and `data/DATASETS.md`.

## Tests
```bash
cd ai-service && python -m pytest -q     # relevance gate, area filters, priority, XP, verification, API
cd server && npm test                    # ledger, daily cap, anti-farming, verification, rejection
```
