#!/bin/bash
# Proves the engine on this machine from a fresh copy: example → npm → build → render one slide → sound on it →
# contact sheet + seam sheet. Prints "SELFTEST PASSED". ~1–2 minutes.
#   bash selftest.sh [example=offshore] [slide=3]
set -e
ENGINE="$(cd "$(dirname "$0")/.." && pwd)"; EX="${1:-offshore}"; SL="${2:-3}"
T="${MC_TEST_DIR:-$HOME/motion-carousels/_selftest-world3d}"; rm -rf "$T"
bash "$ENGINE/scripts/new_carousel.sh" "$EX" "$T" >/dev/null
cd "$T"
node tools/shots.mjs qa "strip:4.15" | tail -1
node tools/render.mjs "$SL"
node tools/mux.mjs "$SL"
node tools/sheet.mjs qa/selftest-sheet.jpg "0,2,4.15,6,7.95" "1-6" | head -1
node tools/seams.mjs qa/selftest-seams.jpg "4.15" | head -1
"$ENGINE/scripts/py" -c "import numpy, PIL"
F="renders/final/slide-$(node -e "console.log(require('./carousel.json').slides[$SL-1])").mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
A=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$F")
V=$(ffprobe -v error -select_streams v -show_entries stream=width,height,nb_frames -of csv=p=0 "$F")
echo "$F: video $V, audio ${A:-none}, ${D}s"
if [ -n "$A" ] && echo "$V" | grep -q "^1080,1350,240" && [ -s qa/selftest-sheet.jpg ] && [ -s qa/selftest-seams.jpg ]; then
  echo "SELFTEST PASSED — look at $T/qa/selftest-sheet.jpg (rows = slides) and $T/qa/selftest-seams.jpg"
else echo "SELFTEST FAILED"; exit 1; fi
