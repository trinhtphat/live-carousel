# QA — check like a creative director

## Commands (run inside the project)
```
python3 build.py                                    # rebuild carousel.html after every edit
node tools/capture.mjs sheet  renders/qa            # contact-sheet.jpg: rows = slides, cols = 0/25/50/75%/last
node tools/capture.mjs seams  renders/qa "2.4,5.6"  # close-ups across every slide edge
node tools/capture.mjs frames renders/qa "2:2.25,5:1.6,6:1.7"   # big moments, full size
node tools/capture.mjs bench  renders/qa            # ms per frame (keep strip < 25 ms)
node tools/capture.mjs video  renders all           # slide-01.mp4 … one exact loop each
```
Page errors print as `PAGE EXCEPTION`; the tool exits non-zero when the page has errors.
Look at the images yourself (Read them). Do not report done from code alone.

## Checklist
- [ ] Every slide: one big moment + a second beat; ≥ 3 things moving in every frame; real easing.
- [ ] Every slide uses a different typography treatment and hero technique; neighbours differ in colour.
- [ ] Loop seam: the last column of the contact sheet flows into the first (no jumps, pops or vanishing).
- [ ] Slide edges: something crosses every edge at every moment; nothing important is cut by an edge.
- [ ] Copy: spelled right, readable at phone size, nothing hidden behind the protagonist or particles.
- [ ] Instagram overlays: top-right and bottom-right 72 px kept clear.
- [ ] Frame 0 of each slide is a good first frame (slide 1's is the default cover).
- [ ] No leftover example content (grep for burger/Ember/Inferno etc.).
- [ ] "Would this stop someone scrolling? Would they watch it twice?" If not, push the weakest slide.

## Common problems
| Symptom | Cause → fix |
|---|---|
| Page never ready / blank | JS error in a `build()` → read the PAGE EXCEPTION line |
| Jump at the loop point | a sinusoid not using `OM(k)`, a particle `life` that doesn't divide LOOP, or a state that isn't back to frame 0 by LOOP |
| A slide's title shows up in the neighbour | heavy drawing not wrapped in `if (vis(0, W))` |
| Edge mismatch while swiping | the bridge only exists for part of the loop → make it persistent (`FLOAT`, world layers) |
| Slow strip | per-frame `createLinearGradient` in big loops, `shadowBlur`, huge offscreen canvases → pre-render sprites, use `LG/RG` caches |
| Text too wide | `fitSize(str, font, size, maxW)` |
| Blurry text in MP4 | text drawn from a sprite scaled up → build the sprite at the size you draw it |

## Posting tips
- Post `slide-01.mp4 … slide-0N.mp4` together as one carousel, in order. Choose a strong cover frame.
- Loops are whole bars at 120 BPM (8 s = 4 bars): add a trending sound in Instagram and it stays on beat.
- Caption: the hook line, one proof line, the CTA (and the keyword if it's a DM CTA).
