#!/usr/bin/env bash
# Export Web local (Godot 4.7) + serveur de test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GODOT="${GODOT:-}"
if [[ -z "$GODOT" ]]; then
  if [[ -x "$HOME/Applications/godot" ]]; then
    GODOT="$HOME/Applications/godot"
  elif command -v godot >/dev/null 2>&1; then
    GODOT="$(command -v godot)"
  else
    echo "Godot introuvable. Exporte GODOT=/chemin/vers/godot" >&2
    exit 1
  fi
fi

OUT="${1:-build/web}"
mkdir -p "$OUT"

echo "[export] import…"
"$GODOT" --headless --path "$ROOT" --import
echo "[export] Web → $OUT/index.html"
"$GODOT" --headless --path "$ROOT" --export-release "Web" "$OUT/index.html"

echo "[export] OK — fichiers :"
ls -lh "$OUT" | sed 's/^/  /'

if [[ "${SERVE:-0}" == "1" ]]; then
  PORT="${PORT:-4174}"
  echo "[serve] http://127.0.0.1:${PORT}/  (Ctrl+C pour quitter)"
  exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$OUT"
fi

echo
echo "Tester localement :"
echo "  SERVE=1 ./scripts/export_web.sh"
echo "Partager : push sur main → GitHub Pages (voir README)."
