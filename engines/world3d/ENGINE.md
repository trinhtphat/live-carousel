# world3d — 3D brand live carousel

A brand / product carousel where **all slides are one continuous 3D world** (a stage, a sea, a lab…): products as
cut-outs and real 3D models, light and particles that cross every seam, crisp type on top, and a soundtrack that
plays through as people swipe. Every slide is a seamless 8 s loop (4 bars at 120 BPM), 1080×1350, rendered
frame-exact to MP4. `ENGINE` = this folder. Read `references/architecture.md` before touching code.

**Examples (source examples; imported render verification is pending — always start from the closest one):**
| example | brand / world | what to learn from it |
|---|---|---|
| `encore` | ENCORE® rock clothing drop — one concert stage across all 6 slides; each garment "plays" an instrument | the most advanced engine: shared set (`gl.js` STAGE), light rig (`stage.js`), `post.js` bloom/halation/camera punches, `kit.js` (gerbs, confetti, flame jets, VU meter), a 3D boot, 3D chrome type |
| `offshore` | OFFSHORE surf shop — dawn sea → underwater → shaping room → wave → sunrise | a calm product world, a 3D board with an exploded view, light products, a real song played through the slides |
| `dental` | PEARL LAB dental practice — scan lab, glass aligners, 3D implant + molar | a service business; luma-keyed glass product; the soft synth sound (`audio/make_audio.py`, runs offline) |
The brands are placeholders. Never ship an example's text, colours or story to a client: reuse the machinery.

**Cost:** $0 with the user's own product photos (cut out locally) or code-drawn objects. Higgsfield (or another AI
image tool the user has connected) is optional, used ONLY after the user sees the exact credit cost and says go.

## 0. Setup only this engine
Use Node 22+, ffmpeg/ffprobe, Chrome/Chromium, and Python with numpy/Pillow. On Windows use native Python and npm; the Bash setup scripts are optional Unix helpers, not a requirement. Do not install every engine or ACE-Step. See `../../references/world-modes.md`.

## 1. Intake (after the shared topic and mode gates)
Follow `../../SKILL.md` and ask only unanswered questions one at a time. Gather brand + what it sells · 2–4 hero products (photos? links?) · the **world**: one place the whole carousel lives in,
that suits the brand and can run through every seam (stage, ocean, lab, kitchen, forest, city at night, a giant
product…) · the drop / offer / CTA (date, comment keyword, link) · brand colours + vibe · sound (a track they own,
an original score made locally if the machine can, or the soft synth bed) · assets budget ($0 or AI, with the cost).

## 2. Concept → separate brief and storyboard approvals
Read `references/concept.md`. Approve `BRIEF.md` first. Then write `STORYBOARD.md` and `ASSET_PLAN.md` in the project: the world, then 6 slides — hook (the world + the
promise), 3–4 product slides (each product does something only it can do, one big moment per slide on ~4.0 s), the
hero/finale (everything together), the drop/CTA — with what crosses each seam. Show the storyboard and image plan for separate approval. If images must be generated, approve one sample image before batch generation.

## 3. Build
```text
python ENGINE/scripts/new_carousel.py <encore|offshore|dental> <project-dir> --install
cd <project-dir>
```

- Assets (`references/assets.md`): photos → `ENGINE/scripts/py ENGINE/scripts/cutout.py <photo> assets/cut/<name>.png`
  → `ENGINE/scripts/py tools/prep_assets.py <name>:<maxh> …` → `src/assets/*.webp` + `manifest.json`. 3D (optional):
  a GLB → `npx -y @gltf-transform/cli optimize …` → `src/assets/<name>.glb`. Register them in `build.mjs` (`assets`).
- Rewrite for the brand: `carousel.json` (title, html name, slide names), `src/template.html` (DOM type + brand),
  `src/gl.js` (the world shader + palette), `src/s1…s6_*.js` (one module per slide: `init(ctx)` → `{ bg, update(t) }`),
  `src/main.js` (imports, fonts, environment map). Keep the engine rules in `references/architecture.md`.
- `node build.mjs` → `dist/<name>.html` (one self-contained file: open it; `S` strip, `1–6`, drag, `M` sound, `G` seams).

## 4. Sound
Read `references/sound.md` and `../../references/audio-integration.md`. Set `audio/plan.json` with actual visual-trigger IDs/times and separate BGM/SFX configuration. Run `python tools/make_audio.py` to create normalized mix, BGM stem and SFX stem per slide. Run `node tools/mux.mjs` only after rendering. Legacy example audio generators are reference source, not production entry points. Custom Game/Tech/Cinematic styles require an explicit request in BRIEF.md; default Subtle/Smooth. No blanket beep/click ban.

## 5. QA → render → deliver
`references/qa.md`. `node tools/sheet.mjs` (rows = slides; first and last column must match), `node tools/seams.mjs`
(things line up across every seam), `node tools/shots.mjs qa "3:4.15"` (full size + page errors). Fix, repeat.
For cover review, run `node build.mjs`, `python tools/make_audio.py <cover-name>`, `node tools/render.mjs 1`, and `node tools/mux.mjs 1 --draft`. Show the complete `renders/draft/slide-<cover-name>.mp4` with sound and wait for approval. Then finish every slide and run `python tools/make_audio.py`, `node build.mjs && node tools/render.mjs all && node tools/mux.mjs` → `renders/final/slide-*.mp4`
(~10–20 s per slide on an M-series Mac), optionally `node tools/swipe.mjs` (a preview of swiping through).
Deliver: the 6 MP4s in posting order, `dist/<name>.html`, the caption + CTA, and what it cost.

## Rules
- Every moving thing is a pure function of `t` in [0, 8): no `Math.random` / `Date` in updates; loop exactly.
- Brighter worlds by default (the user disliked near-black voids): mid-blue / dawn / warm stage light over black.
- Real products stay real: never re-draw a client's product with AI without saying so; never invent logos.
- Money: nothing paid before the exact cost and a "go". Keep job IDs and credits in the project README.
