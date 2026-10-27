# Live Carousel

Portable skill for producing looping video carousels in GPT/Codex, Claude and Gemini. Start with [SKILL.md](SKILL.md) and the matching guide in `adapters/`. The human review path is: focused research/questions → 5–10 numbered topics and owner selection → image inventory → production mode → approved brief → separately approved storyboard and image plan → one approved generated-image sample when needed → one complete cover/hook draft approved with animation and sound → full final render.

The complete Vietnamese workflow, review gates and mode-specific draft commands are in [docs/workflow-human-review.vi.md](docs/workflow-human-review.vi.md).

[Watch the rendered demo](https://github.com/user-attachments/assets/2ae5f935-f42b-4e05-8f8c-081a410d37d3) · [Open the MP4](media/demo-carousel.mp4) · [View the poster](media/demo-poster.jpg)

The skill supports four modes: editable Motion slides, animation of finished Photo slides, connected World 2D scenes, and shared World 3D product scenes. Motion and Photo use `scripts/new_carousel.py` and `scripts/render_all.py`; World modes follow `references/world-modes.md`. The shipped Motion/Photo baseline is four 1080 × 1350 slides at 30 fps. Adapt and verify other ratios before claiming a render for them.

## Audio library

Audio is registered in [sfx_manifest.json](sfx_manifest.json) and stored under `assets/sfx/`. The library contains 133 SFX and 17 music tracks from `sound-effects-pack.zip`; 56 files matched previously registered assets by SHA-256, so the ZIP added 94 files. The user confirmed commercial-use and public redistribution rights for the entire archive on 2026-10-16. The manifest records source, category, duration, volume, hash and rights evidence for each file.

Read [audio integration](references/audio-integration.md) before changing sound design. Every slide needs at least one audible licensed library SFX following a named visual trigger. Music stays below SFX during those events, and the two tracks have separate stems. Defaults are Subtle/Smooth; use Game, Tech or Cinematic only when the approved brief calls for them. The mixer checks registration and rights before playback.

## Local use

Install Node.js 22+, Python 3.9+ with numpy/opencv, ffmpeg/ffprobe, and the selected renderer. The original Motion/Photo backend pins `hyperframes@0.8.121`; a Premium Motion Video renderer is optional. Read [render QA](references/render-qa.md) for checks and [VALIDATION.md](VALIDATION.md) for prior package validation. On Windows, invoke the Python scripts directly or use Bash/WSL for POSIX wrappers.

Bundled fonts and third-party assets are described in [LICENSES.md](LICENSES.md). Preserve source files and the manifest when copying the skill.

## Curaçao case study

[Case study: 7-slide Curaçao carousel (Tiếng Việt)](docs/case-study-curacao-carousel.vi.md) records the image-first review gates, slide-by-slide feedback, audio/preview failures, seven-file delivery and the newly specified Cointreau orange `#FA4616`. The case study distinguishes this colour standard from older renders; it does not claim that those MP4s were recoloured.
