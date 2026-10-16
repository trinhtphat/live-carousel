> Imported visual/source reference. Original audio commands below are historical only. Production MUST use tools/make_audio.py and the shared normalized BGM/SFX pipeline; see references/world-modes.md at skill root. Demo mixed audio is excluded. Custom beep/click sounds remain available on explicit request.

# PEARL LAB — SMILE, ENGINEERED (live carousel, dental)

6 slides × 1080×1350, 8 s seamless loops at 120 BPM. Built on the VOIDWEAR engine: one Three.js world across all 6 slides, Higgsfield stills + 3D, sound per slide.

"PEARL LAB" is a placeholder brand. To swap in a real practice, change the `.brand` / `.logo` text in
`src/template.html` (plus the copy lines), then rebuild and re-render.

## Files
- `dist/pearl-lab-smile.html` is the whole carousel in one self-contained file. Double-click it to open it in Chrome.
- `renders/final/slide-0N-*.mp4` are the frame-exact 30 fps videos with sound, ready to post in order.

## Higgsfield spend (2026-10-13) = 40.75 credits
| asset | model | job id | credits |
|---|---|---|---|
| implant still | gpt_image_2_5 sunburst, high, 2k | 4855a23c-0ddf-4202-8369-12486d8d6ab7 | 2.75 |
| molar still | " | 57d710d6-630c-4596-85ab-bc09fa1e802b | 2.75 |
| aligner still (on black, luma-keyed) | " | d6f31e12-30a0-4360-86fe-439c8689b6d3 | 2.75 |
| veneer arch still | " | ac1387d8-8dcc-473e-a44d-56edabfa065a | 2.75 |
| hero portrait | " | 08033f32-bea7-463c-a855-9ea7e22c8efd | 2.75 |
| implant 3D (detailed) | tripo_h3_1_image_to_3d | 14c64507-3e67-4210-8491-65b58f70eba0 | 18 |
| molar 3D | tripo_h3_1_image_to_3d | d298d4ca-b800-426e-8b7f-d44c11f5d77e | 9 |

## Preview controls (in the HTML)
`S` strip view · `1`–`6` / `←` `→` / drag single slide · `Space` play/pause · `M` sound · `R` rec mode · `O` 1:1 · `G` seams · `,` `.` step a frame.
URL params: `?view=3&t=4.2&clean=1`.

## Rebuild (from this project folder)
```
<engine>/scripts/py audio/make_audio.py           # the sound, made from code (tools/audio/audiolib + audio/soft_audio.py): audio/out + src/assets/audio
<engine>/scripts/py tools/audio/metrics.py audio/out/*.wav   # harshness / clicks / loop seam
node build.mjs                                   # src/ → dist/pearl-lab-smile.html
node tools/render.mjs all && node tools/mux.mjs  # renders/final/slide-*.mp4
```
`tools_prep_assets.py` is a record only (the raw stills are not shipped; the prepared `src/assets/` are).

## Sound (v2)
The sound is its own kit (`audio/soft_audio.py`), not the shared lc_audio groove. The bed is a D-major progression
(Dmaj9 | Bm9 | Gmaj9 | A6/9 at 120 BPM, one chord per 2 s bar) with warm pads, a soft FM electric piano, a marimba
pluck, a round sub and a click-free kick. There are no hats, ticks, beeps, glitches or cymbals. Events are notes,
soft chimes, swells and round booms, and the master rolls off the top end.

## Slide plan
| # | world | technique | big moment |
|---|---|---|---|
| 1 SMILE | scan void | pearl-chrome letters (iridescent env reflections), cyan scan laser, scan grid, glitch | laser cuts in at 1.0, letters land one per step |
| 2 CLEAR ALIGNERS | deep teal | glass tray (luma-keyed), iridescent pearl orbit, tracked callouts | scan pulse at 4.0 |
| 3 THE IMPLANT | spotlight | Higgsfield 3D implant, turntable, reflective floor, exploded CROWN / ABUTMENT / POST | explode 3.9, ratchets home on 6.0 |
| 4 WHITE. | pearl lab | warm→white scan wipe (sprite shader), shade guide pointer, zero-g shade tabs | whitening 1.0–2.0, glints, tabs snap 5.0–6.5 |
| 5 SHINE | electric cyan | hero cutout, afterglow trail, rising sparkles | lens-flare glint from the smile at 4.0 |
| 6 FIRST SCAN FREE | space | lensed iridescent pearl + light ring, spiralling treatments, 3D molar orbit | ring pulses, FREE slams at 4.0 |

Crossing the seams: the scan laser (1→2), pearls (2→1, 2→3), the horizon laser (3→4), shade tabs (4→3, 4→5),
the glint streak (5→4, 5→6), the light stream and treatments (5→6), dust everywhere.
