# Renderer adapter: Premium Motion Video

This adapter connects Live Carousel to the user's separately installed `premium-motion-video` skill and toolkit. It does not bundle or copy that private toolkit. The Live Carousel brief, 4:5 per-slide format, frame-zero fidelity, beat timing, and loop checks remain the production contract.

## Load and decide

If the `premium-motion-video` skill is available to the agent, read its current `SKILL.md` and the relevant motion/QA references before authoring. Apply its brand-led art direction, one-idea-per-shot motion, deterministic time model, contact-sheet review, audio alignment, and pop-check. For this carousel task, use the carousel's supplied format, slide count, imagery, and CTA instead of defaulting to a 45–60 s product film or 16:9/9:16 variants.

The optional toolkit path comes from `PREMIUM_MOTION_TOOLKIT` or `--premium-toolkit PATH`. On the owner's current Windows machine, the toolkit is documented at `D:\Hyper_Frames\.local-tools\video-motion`; read its `LOCAL_SETUP.md` before execution. On other machines, point the variable to the corresponding toolkit folder.

## Contract bridge

`build.py --premium-bridge` adds the page contract required by Premium Motion Video to each built slide:

| Premium contract | Live Carousel source |
| --- | --- |
| `window.ready` | resolves after the `main` GSAP timeline registers |
| `window.seek(t)` | seeks the paused `main` timeline deterministically |
| `window.DUR` | `#root[data-duration]` |
| `window.SIZE` | `#root[data-width][data-height]` |
| `window.B` | 0.5 s beat at 120 BPM |

The bridge is injected into generated `slides/*/index.html`, so source slides and the HyperFrames path remain intact. The existing audio generator produces the per-slide `mix.wav`; the Premium renderer muxes that file into the MP4.

## Run

```powershell
$env:PREMIUM_MOTION_TOOLKIT = 'D:\Hyper_Frames\.local-tools\video-motion'
$env:PATH = 'D:\Hyper_Frames\.local-tools\node_modules\ffmpeg-static;D:\Hyper_Frames\.local-tools\node_modules\ffprobe-static\bin\win32\x64;' + $env:PATH
& 'D:\Hyper_Frames\.local-tools\video-motion\.venv\Scripts\python.exe' scripts/render_all.py <project-dir> --renderer premium --workers 2
```

On macOS/Linux, set `PREMIUM_MOTION_TOOLKIT` to the installed toolkit and run the same Python script using the environment prepared for Live Carousel. Install the toolkit's Node/Playwright dependencies according to its own setup guide.

`render_all.py` then runs: Live Carousel audio → build with bridge → Premium contact sheet per slide → Premium final render (60 fps with motion blur) → Premium pop-check → Live Carousel audio/duration probe, seam strips, combined contact sheet, and swipe preview. `--check-only` stops after building the Premium contact sheets. HyperFrames CLI checks remain part of the original backend; the Premium path does not require the HyperFrames CLI.

Use `--renderer hyperframes` to run the original 30 fps path. A text-only agent without the toolkit or shell must prepare the design and report that MP4s were not rendered.

## Acceptance

- Every slide exists as a separate MP4 in order, at 1080 × 1350, with an audio track.
- Frame zero is readable; photo mode preserves the user's source image.
- Premium contact sheets and Live Carousel combined contact sheet are reviewed visually.
- Pop-check findings are written to `renders/premium-popcheck-<slide>.txt`. A flagged impact requires visual review and an explicit explanation; the wrapper continues to make contact sheets and seam strips available for that review.
- Seam strips show a continuous loop; audio tails wrap cleanly.
