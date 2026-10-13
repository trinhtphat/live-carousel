# Install prompt

Download the skill. Open **Claude Code** in any folder, paste everything inside the box below, and press Enter.
Claude finds the download, installs it, sets up the free tools, and renders a demo carousel to prove
it works.

```text
Install the free "live-carousel" Claude Code skill for me and make sure it works end to end.

1. FIND IT. I downloaded it (probably from Skool or Google Drive). Look in ~/Downloads first, then ~/Desktop, for anything named like "live-carousel" or "Live Carousel". It may be a .zip, a folder, or a .zip inside another .zip. Unzip into a temporary folder as needed until you find the folder whose SKILL.md starts with "name: live-carousel". If you can't find it, ask me where it is.

2. INSTALL IT to ~/.claude/skills/live-carousel/ (on Windows: %USERPROFILE%\.claude\skills\live-carousel). If that folder already exists, rename the old one to live-carousel.backup-<today's date> first. Copy the whole folder (SKILL.md, README.md, scripts/, templates/, references/), then run: chmod +x ~/.claude/skills/live-carousel/scripts/*

3. SET IT UP: run  bash ~/.claude/skills/live-carousel/scripts/setup.sh
   It checks Node.js 22+, ffmpeg and Python 3.9+, puts numpy + opencv in a private folder if needed, and downloads the free renderer's headless Chrome. If anything is missing, install it the free, official way for my computer (Node.js LTS from nodejs.org or Homebrew; ffmpeg with Homebrew, winget or apt; Python from python.org). Ask me before any step that needs my password. Re-run setup.sh until it prints "All set".

4. PROVE IT WORKS. Build and render the demo carousel:
   ~/.claude/skills/live-carousel/scripts/py ~/.claude/skills/live-carousel/scripts/new_carousel.py ~/live-carousels/demo
   ~/.claude/skills/live-carousel/scripts/py ~/.claude/skills/live-carousel/scripts/render_all.py ~/live-carousels/demo
   Look at ~/live-carousels/demo/renders/contact-sheet.jpg yourself. Confirm that 4 MP4s were made, each with an audio track, then open ~/live-carousels/demo/preview.html for me.

5. TELL ME in plain words: what you installed and where, that it cost $0, and 3 things I can ask you now: one that makes a new carousel from a topic, one that brings my own carousel images to life, and one that switches the colour theme. Also remind me to start a new Claude Code session so the skill loads.

Rules: keep everything free (no paid APIs, credits, accounts or sign-ups). Don't change anything outside ~/.claude/skills/live-carousel, ~/live-carousels and the free tools listed above.
```

## After installing: things to ask

- "Make me a live carousel about why most people quit the gym in February. Noir theme, 5 slides."
- "Bring my carousel to life: ~/Desktop/my-carousel/ (01.png to 06.png). Make the cover hit hard."
- "Switch the demo to the tomato theme and make the CTA keyword GROW."
