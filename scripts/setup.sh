#!/usr/bin/env bash
# live-carousel setup: checks (and where it safely can, installs) the free toolchain. Safe to re-run.
# Everything here is free and runs locally: Node.js, ffmpeg, Python + numpy/opencv, the HyperFrames CLI
# (open source, fetched through npx) and its headless Chrome.
set -u
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HF="hyperframes@0.8.121"
OS="$(uname -s)"
problems=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; problems=$((problems + 1)); }
note() { printf '    %s\n' "$1"; }

echo "live-carousel setup  ($SKILL_DIR)"

# 1. Node.js 22+ (runs the HyperFrames CLI)
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -ge 22 ]; then ok "Node.js $(node -v)"; else bad "Node.js $(node -v) is too old (need 22 or newer)"; note "Install the LTS from https://nodejs.org (free), then re-run."; fi
else
  bad "Node.js not found"
  note "Install the LTS from https://nodejs.org (free), or: brew install node   (macOS with Homebrew)"
fi

# 2. ffmpeg + ffprobe (encoding, audio decoding, contact sheets)
if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"
else
  if [ "$OS" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    echo "  … installing ffmpeg with Homebrew"
    brew install ffmpeg >/dev/null && ok "ffmpeg installed" || bad "brew install ffmpeg failed"
  else
    bad "ffmpeg not found"
    case "$OS" in
      Darwin) note "Install Homebrew (https://brew.sh) then: brew install ffmpeg" ;;
      Linux)  note "sudo apt install ffmpeg   (or your distro's package manager)" ;;
      *)      note "winget install ffmpeg   (Windows), then reopen the terminal" ;;
    esac
  fi
fi

# 3. Python with numpy + opencv: reuse python3 when it already has them, else a private venv in the skill folder
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  bad "Python 3 not found"
  note "Install Python 3.9+ from https://www.python.org/downloads/ (free), then re-run."
elif "$PY" -c 'import sys; assert sys.version_info >= (3, 9)' 2>/dev/null; then
  if [ -x "$SKILL_DIR/.venv/bin/python" ] || [ -x "$SKILL_DIR/.venv/Scripts/python.exe" ]; then
    ok "Python venv ($SKILL_DIR/.venv)"
  elif "$PY" -c 'import numpy, cv2' 2>/dev/null; then
    echo "$PY" > "$SKILL_DIR/.python"
    ok "Python $("$PY" -c 'import sys; print(sys.version.split()[0])') already has numpy + opencv"
  else
    echo "  … creating a private Python environment (numpy, opencv; about 150 MB)"
    if "$PY" -m venv "$SKILL_DIR/.venv" && "$SKILL_DIR/scripts/py" -m pip install -q --upgrade pip && "$SKILL_DIR/scripts/py" -m pip install -q -r "$SKILL_DIR/requirements.txt"; then
      ok "Python packages installed in $SKILL_DIR/.venv"
    else
      bad "could not install numpy/opencv"
      note "Try: $PY -m pip install --user numpy opencv-python-headless"
    fi
  fi
else
  bad "Python is older than 3.9"
fi
chmod +x "$SKILL_DIR/scripts/py" 2>/dev/null

# 4. HyperFrames CLI + its headless Chrome (downloaded once, then cached)
if command -v npx >/dev/null 2>&1; then
  if npx --yes "$HF" --version >/dev/null 2>&1; then
    ok "HyperFrames CLI ($HF)"
    if npx --yes "$HF" browser ensure >/dev/null 2>&1; then ok "headless Chrome for rendering"; else bad "Chrome download failed"; note "Run: npx --yes $HF browser ensure --force"; fi
  else
    bad "could not run the HyperFrames CLI through npx (network?)"
  fi
fi

# 5. Optional extras
for d in "$HOME/.claude/skills/media-use/audio/assets/sfx" "$HOME/.agents/skills/media-use/audio/assets/sfx"; do
  if [ -d "$d" ]; then SFX="$d"; fi
done
if [ -n "${SFX:-}" ]; then ok "real sound-effect pack found (HyperFrames media-use skill)"; else note "optional: 'npx $HF skills' adds HyperFrames' free skills + a real SFX pack (synthesized stand-ins are used otherwise)"; fi
FREE_KB="$(df -Pk "$HOME" | awk 'NR==2 {print $4}')"
if [ "${FREE_KB:-0}" -lt 2000000 ]; then note "heads-up: under 2 GB free disk. Each render needs a few hundred MB of temporary space."; fi

echo
if [ "$problems" -eq 0 ]; then
  echo "All set. Try: \"make me a live carousel about <your topic>\""
else
  echo "$problems thing(s) to fix above, then run this again: bash \"$SKILL_DIR/scripts/setup.sh\""
  exit 1
fi
