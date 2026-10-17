# World modes integration

World 2D uses a continuous canvas across slides. World 3D uses Three.js scenes, product cutouts and optional GLB models. Preserve the approved brief, palette, typography, language and ratio. The imported examples are source references with placeholder brands; rewrite them before delivery. Their original visual defaults do not override the user's brand.

## Setup and platform support

Only install dependencies for the chosen mode. Native Windows: use an available Python executable, Node 22+, npm, ffmpeg/ffprobe and Chrome/Chromium. Bash setup scripts are optional Unix helpers. Do not run all-engine setup, install ACE-Step or download models by default. Locate executables before running commands. These engines are imported source; syntax validation does not establish successful rendering or Windows browser compatibility.

World 2D: `python <skill>/engines/world2d/scripts/new_carousel.py <project>`.
World 3D: `python <skill>/engines/world3d/scripts/new_carousel.py <encore|offshore|dental> <project> --install`. Omit `--install` to scaffold without network installation; run `npm ci` in the project when ready. Use project directories under `./live-carousels/` by default.

## Shared production audio

Both scaffolds copy the common audio pipeline into project `audio/` and create isolated `assets/sfx/` with root `sfx_manifest.json`. Every imported audio asset, including BGM, must be registered with provenance and license status. BGM entries use category_group `bgm`. Unknown rights block use; user-provided does not mean royalty-free. See `audio-integration.md`.

World 2D: real shake/flash times from the visual engine become trigger IDs. Before rendering audio, fill `audio/plan.json` with at least one registered, licensed library SFX per slide and a BGM choice; the adapter no longer supplies synthetic-only production audio. For the approved cover, run `node tools/capture.mjs video renders/draft/raw "1"`, then `python <skill>/engines/world2d/scripts/add_sound.py <project> --only slide-01 --video-dir renders/draft/raw --output-dir renders/draft`. Show the complete `renders/draft/slide-01.mp4` and wait for owner approval. For final production, render all raw slides and run `add_sound.py <project>` with complete plans.

World 3D: edit `audio/plan.json` to match event times in the slide modules, then run `python tools/make_audio.py` from the project. Each slide entry has `visual_triggers` and `audio`, for example:

```json
{"slides":{"01-hook":{"visual_triggers":{"headline-reveal":1.2},"audio":{"profile":"subtle","events":[{"trigger":"headline-reveal","sfx":"effects/path.wav"}]}}}}
```

Use actual slide names from carousel.json and a manifest-registered file for `sfx`. The scaffolder's empty event maps deliberately make no assumptions about the rewritten visuals. For the complete cover draft, run `python tools/make_audio.py <cover-name>`, `node tools/render.mjs 1`, then `node tools/mux.mjs 1 --draft`. Show `renders/draft/slide-<cover-name>.mp4` and wait for approval. Then fill all slide plans and run the no-argument audio, all-slide render and mux commands for final production. Default Subtle/Smooth; Game/Tech/Cinematic require explicit request in BRIEF.md plus `custom_style_requested: true`. Custom beep/click sounds remain available with normalization. Preserve distinct `.bgm.wav` and `.sfx.wav` stems and the normalized `.wav` mix. Final mux is protected with a limiter; world3d refuses missing stems and never falls back to old example audio.

Imported combined-score generators are retained for study only; production must use the common pipeline. Original demo WEBM mixes are excluded so they cannot be mistaken for approved reusable library assets. Preview HTML is silent until its audio embedding is explicitly wired to the normalized outputs; the final MP4 mux is the production audio path.

## QA and limitations

Inspect first/quarter/mid/three-quarter/last frames, spatial seams at multiple times, text safe areas, Vietnamese glyphs, placeholder copy, audio/visual timing, loudness and loop seams. Defaults are 1080×1350; adapting 9:16 or 16:9 requires actual template and render checks. Do not report render, audio listening, model loading or export validation until performed on the target environment.
