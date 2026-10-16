#!/usr/bin/env bash
# Builds the bundled example carousel, renders a contact sheet and slide 1 as an MP4, and checks the results.
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$HOME/motion-carousels/_selftest-world2d}"
bash "$SK/scripts/setup.sh"
python3 "$SK/scripts/new_carousel.py" "$OUT" --force
node "$OUT/tools/capture.mjs" sheet "$OUT/renders/qa"
node "$OUT/tools/capture.mjs" video "$OUT/renders" "1"
"$SK/scripts/py" "$SK/scripts/add_sound.py" "$OUT"
test -s "$OUT/renders/qa/contact-sheet.jpg" && test -s "$OUT/renders/slide-01.mp4"
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$OUT/renders/slide-01.mp4" | grep -q audio || { echo "SELFTEST FAILED: no sound on slide-01.mp4"; exit 1; }
frames=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$OUT/renders/slide-01.mp4")
echo "slide-01.mp4: $frames frames"
[ "$frames" -gt 100 ] && echo "SELFTEST PASSED: $OUT/carousel.html"
