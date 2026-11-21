#!/usr/bin/env bash
# One-time setup: installs Node + Python dependencies for every service.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Node dependencies"
npm install
( cd backend && npm install )
( cd frontend && npm install )
( cd chatbot/server && npm install )
( cd chatbot/standalone-ui && npm install )   # optional standalone chat UI

echo "==> Python virtual environment for the AI service"
VENV="ai-service/.venv"
case "$PWD" in *:*) VENV="$HOME/civicfix-venv"; echo "(path contains ':' -> using $VENV)";; esac
python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r ai-service/requirements.txt -r ai-service/requirements-dev.txt
# Pretrained CLIP photo classifier (torch + transformers, large download). Without it every photo that is not an
# obvious document/screenshot is only queued for manual review. Skip with:  SKIP_CLIP=1 npm run setup
if [ "${SKIP_CLIP:-0}" != "1" ]; then "$VENV/bin/pip" install -r ai-service/requirements-clip.txt; fi

echo "==> Environment files (edit the values!)"
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f chatbot/server/.env ] || cp chatbot/server/.env.example chatbot/server/.env
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
# a fresh random JWT secret for this machine
if grep -q "change_me_to_a_long_random_string" backend/.env; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i.bak "s/change_me_to_a_long_random_string/$SECRET/" backend/.env && rm -f backend/.env.bak
fi

cat <<MSG

Setup done. Next:
  1. docker compose up -d            # MySQL 8   (or set MYSQL_HOST/PORT/USER/PASSWORD/DATABASE in backend/.env for your own server;
                                     #            for the compose MySQL use MYSQL_PASSWORD=civicfix_dev_only)
  2. npm run seed                    # creates the tables + demo admin / citizen / contractor accounts + sample reports
  3. source $VENV/bin/activate       # so 'python3' is the venv one
  4. npm run dev                     # AI :8000, API :5000, chatbot :5001, web :3000
Optional: put your GEMINI_API_KEY in chatbot/server/.env for the AI chatbot.
MSG
