#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 -m http.server 4173 --bind 0.0.0.0
