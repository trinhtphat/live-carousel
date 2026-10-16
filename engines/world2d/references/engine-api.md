# Engine API

## Project layout (made by `scripts/new_carousel.py`)
```
<project>/
  BRIEF.md            intake answers + slide plan
  build.py            → carousel.html (fonts, assets/, CSS and src/*.js inlined, name order)
  carousel.html       the deliverable: strip / single / swipe / record / export, works offline
  assets/             optional images (logo.png → IMG.logo)
  fonts/              Anton, Anybody Wide/Black, JetBrains Mono (OFL)
  renders/            slide-01.mp4 … and renders/qa/ (contact sheet, seams, frames)
  tools/capture.mjs   headless-Chrome frame capture (frames | sheet | seams | video | bench)
  src/
    00-project.js  PROJECT config                         ← edit
    01-core.js     math, sprites, text, particles, assets ← engine (don't edit)
    02-hero.js     the protagonist drawing                 ← replace
    03-slides.js   slides S1…SN and SL = [S1, …]          ← replace
    04-world.js    world colours, seam bridges, floor, far/near particles, projectBuild() ← edit
    05-render.js   camera impacts, post (flash, vignette, grain), renderView ← engine
    06-app.js      preview UI, export, automation hooks (window.EB) ← engine
    template.html, style.css                              ← engine
```

## Coordinates and time
- Each slide is W×H = 1080×1350 (from `PROJECT.width/height`). The world is `WORLD = W × N` wide.
- Slide functions draw in **slide-local** coords (0..W). The renderer translates by `k × W`, so
  drawing at x > W lands in the next slide (that is how things cross edges).
- `t` is seconds in `[0, LOOP)`, the same for all slides at the same instant.
- `FLOOR` = `PROJECT.floor` (default 1100): the shared floor line.

## Slide anatomy (`03-slides.js`)
```js
const S3 = {
  shakes: [[0.62, 5]],                 // [time, pixels] camera shake
  zooms: [[0.62, 0.01]],               // [time, amount] zoom punch
  flashes: [[1.5, 0.4, '255,190,120']],// [time, alpha, 'r,g,b'] additive flash
};
S3.build = () => { /* once, after fonts load: make text sprites, pills, offscreen canvases */ };
S3.back  = (g, t) => { /* glows, rays, big background words, shadows on the floor */ };
S3.mid   = (g, t) => { /* the protagonist */ };
S3.front = (g, t) => { /* particles, titles, labels, foreground, chrome(g, 2, t) */ };
const SL = [S1, S2, S3, S4, S5, S6];   // length must equal PROJECT.slides.length
```
Layer order across ALL visible slides: world back → every slide's `back` → every `mid` → every
`front` → world front → post. Each slide is also drawn into its neighbours' views, so guard heavy
work with `if (!vis(0, W)) return;` (true only when this slide's own area is on screen) and let spill
content (particles, smoke, whips) run unguarded — the particle helpers cull themselves.

## Time & easing (`01-core.js`)
| Helper | Meaning |
|---|---|
| `seg(t, a, b)` | 0..1 progress of t through [a, b], clamped |
| `E.inQ outQ inC outC ioC ioS outQuart inExpo outExpo outBack(x,s) inBack ioBack outElastic` | easings on 0..1 |
| `damp(dt, f, d)` | 1 → 0 oscillating (springy settle). 0 before dt = 0 |
| `kick(dt, f, d)` | 0 → bump → 0 (recoil, jump) |
| `decay(dt, d)` | exp falloff after an event |
| `OM(k)` | angular speed for exactly k cycles per loop: `Math.sin(t * OM(3))` loops |
| `pnoise(t, P, seed)` | smooth noise in [-1, 1] that loops (P lattice points per loop) |
| `hash(a, b)` | deterministic random in [0, 1) — use instead of `Math.random` |
| `wrapT(x)`, `frac(x)`, `lerp`, `clamp`, `smooth(a, b, x)`, `mixHex(a, b, t)` | utilities |

## Particles (closed-form, deterministic, loop-safe)
- `embers(g, t, { n, seed, life, x0, x1, y0, y1, rise, wind, size:[a,b], alpha, wig, streak, inten(tb, x), spr, comp })`
  rising field; `life` must divide LOOP; `inten(tb)` is evaluated at each particle's birth time.
- `puffs(g, t, { n, seed, life, sprites, x(tb), y(tb), spread, yspread, rise, drift, size:[a,b], alpha, aspect, inten(tb), comp })`
  smoke/steam; `SPR.smoke`, `SPR.smokeLit` (use `comp:'lighter'`), `SPR.steam`, `SPR.wisp` (+ `aspect: 1.9`).
- `burst(g, t, te, { n, seed, x, y, sx, sy, ang:[a,b], spd:[a,b], life:[a,b], g, drag, size:[a,b], kind, color, hi, floor, alpha, fade, grow, sprites, delay(i, r), delayMax, wrap, comp })`
  one-shot at time `te`. `kind`: `'spark'` streaks, `'drop'` glossy droplets (`color`, `hi`), `'puff'`
  (`sprites`), `'dot'` (`color`), default glowing ember. `wrap: true` lets tails continue past the loop end.
- `ring(g, t, ti, x, y, { r0, r1, dur, w, color, alpha, flat, soft, comp })` shockwave (flat = ry/rx, 0.16 for floor rings).
- `flames(g, t, x0, x1, base, height, { spacing, width, seed, alpha, layers, env(x, xw), wx, bed, licks, comp })`
  a row of flame tongues; pass `wx` = world offset of local 0 (k × W) so rows line up across edges.

## Sprites (`SPR`, built once)
`glow`, `ember`, `orange`, `red`, `gold`, `cream`, `dark` (soft radial dots: draw stretched for glows,
pools of light, shadows), `smoke[]`, `smokeLit[]`, `steam[]`, `wisp[]`, `flame`, `grain`.
Make your own with `mk(w, h)` + 2D drawing, `radial(size, stops)`, `blurred(canvas, px)` (padded
blur for out-of-focus foreground), `soften(canvas, px)`.
Cached gradients for static local geometry: `LG(g, key, x0, y0, x1, y1, stops)`, `RG(g, key, ...)`.

## Text
Fonts: `FONT.anton` (tall condensed), `FONT.wide` (Anybody Wide Black, chunky), `FONT.blk`
(Anybody Black), `FONT.mono` (JetBrains Mono ExtraBold).
- `glyph(str, font, size, style)` → sprite `{ c, w, h, cap, cx, cy, ... }` for a whole string.
  `style = { fill: '#hex' | [[0,'#top'],[1,'#bottom']], stroke: [color, w], ext: [depth, color] (3D extrude), extX, glow: [color, blur], shine: 0..1 }`.
- `word(str, font, size, style, track)` → `{ items: [{ ch, pen, adv, g }], width, cap }` per-letter sprites
  sharing one layout (make a hot and a cool version with the same font/size to cross-fade).
- `fitSize(str, font, size, maxW, track)` largest size ≤ size that fits maxW.
- `drawLetter(g, item, left, base, { dx, dy, s, sx, sy, rot, alpha, piv, spr, comp })` — piv 1 = scale
  from the baseline (squash on landing). `letterCenter(item, left, base)`.
- `drawSprite(g, G, x, base, { dx, dy, s, sx, sy, rot, alpha, comp })` centred on x, sitting on base.
- `burnLetter(g, G, cx, cy, edge, t, seed, s, alpha)` — burning front: edge 1 → 0 reveals bottom-up, 0 → 1 burns away.
- Labels: `pill(text)` → canvas; `drawLabel(g, t, { c, x, y }, tIn, tOut, anchorX, anchorY)` pops in with a leader line.
- `chrome(g, k, t, alpha)` draws the small brand mark (top-left) and `01 / 06 · NAME` counter.

## Camera, flashes, post (`05-render.js`)
Per slide, from its `shakes`, `zooms`, `flashes` arrays. Post adds top/bottom vignette and film grain.
Neighbouring slides shake independently (fine: impacts are short).

## World (`04-world.js`)
- `BGK` = per-slide `[topColour, bottomColour]`; `BAND` = half-width of the blend at each edge. `bakeBG()`.
- `worldLight(xWorld, t)` dims world particles (the example keeps slide 1 pitch black until ignition).
- `buildFG()` makes seam-bridge sprites; `FLOAT = [[spriteKey, xWorld, y, scale], …]` places them across edges.
- `drawWorldBack(g, t, x0, x1)` / `drawWorldFront(...)` draw in WORLD coords (bg, floor, bokeh, floats, smoke band, near embers).
- `projectBuild()` is called once after fonts load: `bakeBG(); buildFG(); buildChrome(); …` — add your own builders.

## Images (`assets/`)
`IMG.name` (HTMLImageElement) and `drawImg(g, name, x, y, w, h?, { rot, alpha, comp })` centred.
For a protagonist from photos, compose it in `02-hero.js` like the burger: layers, shadow, rim light,
squash via the transform, parallax by drawing separated cut-outs at different speeds.

## The example's helpers worth reusing (`03-slides.js`)
`fallY(t, t0, t1, height, bounce)` drop + bounces + squash value · `whip(k, t)` / `arrive(t)` conveyor
between slides · `beat(t, off)` once-a-second pulse · `ST` text styles (cream, creamHot, fire, fireHot, cheddar).

## Preview page and automation
- URL params: `?mode=single&slide=3&t=2.5&paused=1&clean=1`.
- Keys: ← → swipe, 1–N jump, Space pause, R restart, S strip, F record mode (Esc exits), E export.
- `window.EB.frame(k, t)` → JPEG data URL of slide k (0-based) at t; `EB.strip(t, scale)`; `EB.bench()`.
