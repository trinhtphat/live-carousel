#!/usr/bin/env bash
# Checks the free tools this skill needs. Safe to re-run. Prints "All set" when everything is ready.
ok=1
say() { printf '%s\n' "$*"; }
if command -v node >/dev/null 2>&1; then
  v=$(node -p 'process.versions.node.split(".")[0]'); if [ "$v" -ge 22 ]; then say "✓ Node.js $(node -v)"; else say "✗ Node.js $(node -v) is too old: install Node.js 22+ (LTS) from nodejs.org or Homebrew"; ok=0; fi
else say "✗ Node.js missing: install Node.js 22+ (LTS) from nodejs.org or Homebrew (brew install node)"; ok=0; fi
if command -v python3 >/dev/null 2>&1; then say "✓ $(python3 --version)"; else say "✗ Python 3 missing: install it from python.org"; ok=0; fi
if command -v ffmpeg >/dev/null 2>&1; then say "✓ ffmpeg"; else say "✗ ffmpeg missing (needed for MP4s and contact sheets): brew install ffmpeg / winget install ffmpeg / sudo apt install ffmpeg"; ok=0; fi
chrome=""
for c in "$CHROME" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
         "/c/Program Files/Google/Chrome/Application/chrome.exe" "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
         /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
  [ -n "$c" ] && [ -e "$c" ] && { chrome="$c"; break; }
done
if [ -n "$chrome" ]; then say "✓ Browser for frame capture: $chrome"; else say "✗ Google Chrome (or Chromium/Edge/Brave) not found: install Google Chrome, or set CHROME=/path/to/browser"; ok=0; fi
if [ $ok = 1 ]; then say "All set"; else say "Fix the ✗ items above, then run this again."; exit 1; fi
