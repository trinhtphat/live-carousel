#!/bin/bash
# One-time setup for the 3D brand carousel engine. Safe to re-run; prints "All set" when ready.
#   bash setup.sh            Node 22+, ffmpeg, Chrome, the npm packages (three, esbuild, playwright-core, opentype.js), Python + numpy + Pillow
#   bash setup.sh --cutout   + rembg, to cut products out of the user's own photos for $0 (~0.3 GB + a model on first use)
set -u
ENGINE="$(cd "$(dirname "$0")/.." && pwd)"; MC="${MC_HOME:-$HOME/.motion-carousels}"; VENV="$MC/venv"
CUTOUT=0; [ "${1:-}" = "--cutout" ] && CUTOUT=1
ok=1; say() { printf '%-12s %s\n' "$1" "$2"; }
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
NODE_V=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -n "$NODE_V" ] && [ "$NODE_V" -ge 22 ]; then say node "ok ($(node -v))"; else say node "MISSING or too old: need Node.js 22+ (nodejs.org LTS, or brew install node)"; ok=0; fi
if command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null; then say ffmpeg ok; else say ffmpeg "MISSING (brew install ffmpeg / winget install ffmpeg / sudo apt install ffmpeg)"; ok=0; fi
CH=""; for p in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  /usr/bin/google-chrome /usr/bin/google-chrome-stable /opt/google/chrome/chrome /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; do
  [ -x "$p" ] && CH="$p" && break; done
[ -n "${CHROME:-}" ] && CH="$CHROME"
if [ -n "$CH" ]; then say chrome "ok"; else say chrome "MISSING (install Google Chrome from google.com/chrome, or set CHROME=/path/to/chrome)"; ok=0; fi
# npm packages: installed once into a cache folder; every new project installs from it offline in seconds
if command -v npm >/dev/null; then
  mkdir -p "$MC/world3d-deps"; cp "$ENGINE/kit/package.json" "$ENGINE/kit/package-lock.json" "$MC/world3d-deps/"
  if (cd "$MC/world3d-deps" && npm ci --no-audit --no-fund --loglevel=error >/dev/null 2>&1) && (cd "$MC/world3d-deps" && node -e "require('three');require('esbuild');require('playwright-core')" 2>/dev/null); then
    say npm "ok (three, esbuild, playwright-core, opentype.js)"
  else say npm "FAILED: run  cd \"$MC/world3d-deps\" && npm ci  to see why"; ok=0; fi
fi
# Python with numpy + Pillow (asset prep, sound)
PY=""
for p in python3 python; do command -v "$p" >/dev/null 2>&1 && "$p" -c "import numpy, PIL" 2>/dev/null && PY="$p" && break; done
if [ -z "$PY" ] || [ "$CUTOUT" = 1 ]; then
  if [ ! -x "$VENV/bin/python" ] && [ ! -x "$VENV/Scripts/python.exe" ]; then
    echo "building a private Python env in $VENV …"
    if command -v uv >/dev/null; then uv venv --python 3.11 "$VENV" >/dev/null 2>&1 || uv venv "$VENV" >/dev/null 2>&1
    else python3 -m venv "$VENV" >/dev/null 2>&1 || python -m venv "$VENV" >/dev/null 2>&1; fi
  fi
  VP="$VENV/bin/python"; [ -x "$VP" ] || VP="$VENV/Scripts/python.exe"
  PKGS="numpy pillow"; [ "$CUTOUT" = 1 ] && PKGS="$PKGS rembg[cpu]"
  if command -v uv >/dev/null; then uv pip install --python "$VP" -q $PKGS >/dev/null 2>&1; else "$VP" -m pip install -q $PKGS >/dev/null 2>&1; fi
fi
if "$ENGINE/scripts/py" -c "import numpy, PIL" 2>/dev/null; then say python "ok"; else say python "MISSING numpy/Pillow (install Python from python.org, then re-run)"; ok=0; fi
if [ "$CUTOUT" = 1 ]; then
  if "$ENGINE/scripts/py" -c "import rembg" 2>/dev/null; then say cutout "ok (rembg)"; else say cutout "rembg FAILED to install"; ok=0; fi
fi
chmod +x "$ENGINE/scripts/"*.sh "$ENGINE/scripts/py" 2>/dev/null
[ $ok = 1 ] && echo "All set" || { echo "Fix the MISSING items above (the free, official way), then run setup.sh again."; exit 1; }
