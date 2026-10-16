> Imported visual/source reference. Original audio commands below are historical only. Production MUST use tools/make_audio.py and the shared normalized BGM/SFX pipeline; see references/world-modes.md at skill root. Demo mixed audio is excluded. Custom beep/click sounds remain available on explicit request.

# OFFSHORE SURF CO. — QUIVER 01: SWELL (live carousel)

6 slides × 1080×1350, 8 s seamless loops at 120 BPM. This is the VOIDWEAR engine re-skinned for a surf shop. OFFSHORE is a placeholder brand.

## Files
- `dist/offshore-swell.html` is the whole carousel in one self-contained file (Three.js, fonts, images, the 3D board and the sound are all inlined). Open it in Chrome.
- `renders/final/slide-0N-*.mp4` are the post-ready videos: 30 fps, frame-exact, with sound. Post them in order as one carousel.

## Higgsfield spend: 29 credits, no video models
| job | model | use |
| --- | --- | --- |
| 84c233d9 | gpt_image_2_5, transparent | hero shortboard (slide 2), and the reference for every other shot |
| cbad34ac | gpt_image_2_5 | the same board at 3/4 view, the source for the 3D model |
| 2d7472ee | gpt_image_2_5, transparent | the quiver: longboard / egg / fish / shortboard (slides 4 and 6) |
| eaf1846c | gpt_image_2_5, transparent | the surfer doing an aerial (slide 5) |
| 78ecfbc1 | tripo_h3_1_image_to_3d, detailed | the 3D board (slides 3 and 6), 18 cr |

## Sound (v2)
One original sunny surf-pop instrumental made locally with ACE-Step 1.5 (take seed11, G major, nudged from 119 to exactly
120 BPM). Slide N plays bars 4N-3..4N of the song (3.8 s to 51.8 s of the take), so swiping plays it straight through;
`renders/final/preview-swipe-through.mp4` is all six back to back. Slide 1 opens out of a low-pass on the sunrise and
closes on the sunset; slide 5 goes muffled while she's in the air. Accents are soft and low-passed only (swooshes,
splashes, felt thumps, wooden rack knocks). Master: about -17.5 dB RMS with a soft high shelf; no ticks, clicks, glitches or crashes.

## Preview controls (in the HTML)
`S` strip · `1`–`6` / arrows / drag single slide · `Space` play · `M` sound · `R` rec mode · `O` 1:1 · `G` seams · `,` `.` step a frame.
URL: `?view=3&t=4.2&clean=1`.

## Rebuild (from this project folder)
```
node build.mjs                                   # src/ → dist/offshore-swell.html
node tools/render.mjs all && node tools/mux.mjs  # renders/final/slide-*.mp4 (the shipped sound: src/assets/audio/*.webm)
node tools/sheet.mjs qa/sheet.jpg && node tools/seams.mjs qa/seams.jpg
```
To make a new song-through soundtrack from any 120 BPM track: `<engine>/scripts/py tools/audio/song_loops.py audio/track.wav`
(the same method that made this one). `tools_prep_assets.py` and `audio/make_audio.py` are a record only: the raw
images and the ACE-Step take they read are not shipped.
Note: this example's `src/gl.js hexv4` predates the colour fix (see references/architecture.md › Colour); its palette
was tuned with it, so it renders as approved. Apply the fix if you start a new world from here.

## Slide plan
| # | world | technique | big moment |
|---|---|---|---|
| 1 SWELL | pre-dawn sea | liquid-chrome letters with water clip + mirrored reflections, perspective ocean shader, sun glitter, anamorphic flare | the sun cracks the horizon at 1.0 and the letters burst out of the water one by one (splash rings) |
| 2 THE 6'2" | underwater studio | caustics on the backdrop and the board, flare rim light, droplet orbit, tracked callouts | swell pulse at 4.0 |
| 3 THE BUILD | sun shaft over a water pool | Higgsfield 3D board, 360° turntable, reflection, exploded DECK / CORE (foam + cedar stringer) / HULL / FINS | explode at 3.9, snaps home with a splash on 6.0 |
| 4 THE QUIVER | sun-bleached shaping room | outline type wall "PICK ONE.", board rack, size labels | wipeout at 3.0; boards re-rack on 5.0, 5.5, 6.0, 6.5 |
| 5 SEND | wave face | flow-noise water racing up the face, foam lip, spray echo trail, splash particles | the boost at 4.0 (spray, 4.2 FT), lands on 6.0 |
| 6 THE DROP | sunrise | sun disc + god rays + glitter path, boards spiralling into the sun, 3D board orbit | the sun flares and 6AM slams at 4.0 |

What crosses the seams: the sunrise flare (1→2), droplets (2→1, 2→3), the waterline (3→4), the scattered boards (4→3, 4→5), the golden stream and the boards (5→6), and the salt spray (everywhere).
