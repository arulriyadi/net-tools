#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created net-tools-be/.env from .env.example"
fi

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8090}" --reload
