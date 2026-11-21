# CivicFix AI service

FastAPI service for image analysis and decision support. See the [root README](../README.md) for setup.

```bash
python -m venv ~/civicfix-venv && source ~/civicfix-venv/bin/activate   # keep the venv path free of ':'
pip install -r requirements-dev.txt
python -m pytest -q
python -m uvicorn app.main:app --port 8000
```

Endpoints (prefix `/api/v1`): `GET /health`, `GET /models/status`, `POST /analyze` (multipart `image`),
`POST /xp/calculate`, `POST /priority`, `POST /verify`.
