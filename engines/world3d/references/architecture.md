# Architecture — how a world3d carousel is built

## Files (a project = an example + the kit)
| file | role | change it? |
|---|---|---|
| `carousel.json` | title, output html, slide names (posting order), loop 8 s, 30 fps | yes |
| `build.mjs` | bundles three.js + code + fonts + images + GLBs + sound into ONE html (esbuild) | the `assets` + `fonts` lists |
| `src/template.html` | page shell, UI, and the DOM type of every slide (`<section class="slide sN">`) | yes: brand, copy, CSS |
| `src/main.js` | renderer, layers, layout, sound sync, swipe UI, capture API | imports, fonts to await, env map |
| `src/core.js` | constants (W 1080, H 1350, N 6, LOOP 8, D_CAM 1600), easing + loop helpers, textures, `sprite()` | palette, rarely the rest |
| `src/gl.js` | shared GLSL (noise, loop-safe time) and the WORLD: the background shader every slide's `bgQuad` uses | yes: this is the world |
| `src/s1_*.js … s6_*.js` | one module per slide | yes |
| `src/post.js`, `stage.js`, `kit.js` (encore) / `particles.js` (offshore, dental) | post pass, rigs, reusable effects | reuse, extend |
| `tools/` | render, mux, sheet, seams, shots, swipe, console, typeface, glb-profile, prep_assets, audio/ | no (shared kit) |

## One world, four layers (every frame, `main.js render()`)
1. **bgScene** (orthographic, strip px, y up): one full-slide `bgQuad(i, decl, body)` per slide — a fragment shader
   whose body draws that slide's part of the world. encore: starts from the shared set (`col = stageColor(p, sp, t);`)
   and the per-slide light blends with the neighbours' at each seam (`uWash/uWashL/uWashR`); offshore/dental: each slide
   paints its own world and `seamBlend(col, p)` fades into the neighbours' edge colours (`uSeamL/uSeamR`).
   `p` = slide px (y down), `sp` = strip px, so anything computed in `sp` is continuous
   across seams. Sprites behind the products go here too.
2. **main[i]** (perspective): the real 3D for slide i (`ctx.setMain(i, scene)`), rendered with a camera framed THREE
   slides wide (`setViewOffset`), so a 3D object can spill over its neighbours. `D_CAM = 1600` makes the z = 0 plane map
   1:1 to pixels. ACES tone mapping applies here.
3. **seamScene** (orthographic, strip px): products as sprites, particles, fog — anything that crosses a seam.
4. **post** (encore `post.js`): bloom, halation, per-slide camera punch (`ctx.punch[i]` = zoom, shake x/y, chromatic
   split; `ctx.flash[i]`). The DOM type rides the same punch.
**DOM type** sits on top (crisp at any size): `.slide` sections positioned at `left: i*1080px` in a 6480 px stage.

## A slide module
```js
export function init(ctx) {            // ctx: assets (textures + sizes, GLTFs), envMap, radialTex, bgScene, seamScene,
  const bg = bgQuad(I, decl, body, u);   //      projCam, dom[i], setMain(i, scene), punch/flash/rig (encore)
  ctx.bgScene.add(bg);
  const prod = sprite(ctx.assets.denim.tex, ctx.assets.denim.w, ctx.assets.denim.h, { segs: 40, order: 12 });
  place(prod, I, 735, 1112, 640 / ctx.assets.denim.h, 0.5, 1);   // slide i, x, y (down), scale, anchor
  ctx.seamScene.add(prod);
  return { bg, update(t) { bg.u.uTime.value = t; prod.u.uWind.value = 0.3 + 0.7 * pulse(t, 4.0, 0.4); /* … */ } };
}
```
(`place`, `sizePx`, `dcol`, `staged` are encore helpers; offshore/dental set `mesh.position`/`mesh.scale` directly.)
`update(t)` must set EVERYTHING from `t` alone (frames are rendered out of order). Helpers in `core.js`:
`since(t, at)` (time since an event, wrapped round the loop), `pulse`, `wobble`, `kickEnv` (beats 1+3 = every whole
second), `snareEnv`, `lsin/lcos(t, n)` (n whole cycles per loop), `lnoise` (loop-periodic noise), `seg`, easings.

## Sprites (`core.js sprite()`)
A textured quad with a shader that does rim light, gradient shading, wind/flutter/ripple, tilt (yaw/pitch/roll with
perspective), shine sweeps, tint, reflections (`uFade`) and UV sub-rects (`uUv`). **Its natural size comes from
`uSize` (w, h px); `mesh.scale` is a RELATIVE factor** — use `place()` / `sizePx()`. Setting scale to pixel sizes makes
giant sprites that turn the whole frame black or white. `kit.js staged()` (encore) adds the contact shadow + floor reflection.

## Colour
The background shaders and sprites work in DISPLAY space. Use `dcol(hex)` / `hexv3(hex)` (no sRGB→linear). A plain
`new THREE.Color(hex)` linearises it and the colour renders far darker than specified (black bands at seam blends).
The dental example's `hexv4` has the fix (`.convertLinearToSRGB()`); offshore keeps the old one and its colours were
tuned with it — apply the fix when you start from offshore and retune.

## 3D models
Load with `GLTFLoader` + `MeshoptDecoder` from base64 (`ASSETS.<name>Glb`). Light products (white boards, aligners,
sneakers): metalness 0, roughness ~0.55 and about a third of the default light, or they blow out to a flat slab.
Chrome needs a bright environment: the env scene in `main.js` must contain a big white front softbox (a red-only
room makes chrome look dark red). For exploded views, `node tools/glb-profile.mjs raw.glb y` shows the radius by
height to pick split planes; phase the turntable so the object is broadside while exploded.

## GLSL gotchas (they black out whole frames)
- On Apple GPUs (Metal), `pow(negative, 2.)` is NaN and poisons the frame: use `sq(x)` (= x*x; encore's COMMON has it,
  add `float sq(float x){ return x * x; }` to the older examples' COMMON when you need it).
- `half` is a reserved word. Keep loops with constant bounds. Divide-by-zero → NaN → black: clamp denominators.

## Capture API (what the tools use)
`dist/<name>.html?clean=1&capture=1&dpr=1&view=3&t=4.2` → `window.__ready` (or `window.__error`), then
`window.__go(view, t)` renders slide `view` (1..6 or 'strip') at time t, `window.__pan(px, t)` renders the view
panned to any strip x (seams, swipes). Keys in the normal page: `S` strip · `1–6` / ← → / drag · Space · `M` sound ·
`R` rec mode · `G` seam guides · `O` 1:1 · `,` `.` step a frame.
