# QA — look at it like a creative director

```bash
node build.mjs
node tools/sheet.mjs qa/sheet.jpg "0,2,3.6,4.15,5.2,7.95"   # rows = slides; col 1 and the last col must match (loop)
node tools/seams.mjs qa/seams.jpg "0,4.15"                   # every seam centred: things must line up across it
node tools/shots.mjs qa "strip:4.15,3:4.15"                  # full size + page errors ("no page errors" = clean)
node tools/console.mjs 3 4.15                                # every console message for one view
```
Look at every image yourself. Checklist:
- **Boot / black frames:** a page error, a NaN in a shader (`pow(neg, …)` on Metal, divide by zero), a giant sprite
  (scale set in px instead of relative) → the whole frame goes black or white.
- **Loop:** frame 0 = last frame on every slide; tails of bursts wrap (`since()`), no pops at the loop point.
- **Seams:** every bridge is continuous at every time; light washes agree on both sides.
- **Instagram safe areas:** keep 72 px clear top-right (the 1/6 counter) and bottom-right (the sound icon); key copy
  away from the bottom 180 px (the caption overlay on Reels-style previews).
- **Readable on a phone:** headlines ≥ 90 px, labels ≥ 24 px, real contrast; spell-check every word and number.
- **Alive:** at least 3 things moving on every frame; one clear impact per slide; nothing static > 1 s.
- **Products look like the products:** colour, logo placement, proportions; light products not blown out.
- **Sound:** metrics clean (references/sound.md); hits land on the visual moments.

## Render + deliver
```bash
node tools/render.mjs all      # renders/slide-*.mp4 (video), ~10–20 s per slide on an M-series Mac; "2,5" or "1-3" for some
node tools/mux.mjs             # renders/final/slide-*.mp4 with sound — post THESE, in order, as one carousel
node tools/swipe.mjs           # optional: renders/final/preview-swipe-through.mp4 (each loop, then a swipe along the world)
```
Verify with ffprobe: 1080×1350, 240 frames (8.000 s), an AAC stream. Instagram takes up to 20 items per carousel.
Deliver the 6 MP4s in order + `dist/<name>.html` + the caption (hook line, one paragraph, the CTA, 5–8 hashtags) +
the cost (credits and job ids if any AI was used).
