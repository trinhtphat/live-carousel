# Assets — products, 3D, fonts

## Product pictures
**$0 — the user's own photos (best: it's their real product).** Any decent photo on a plain-ish background:
```bash
bash ENGINE/scripts/setup.sh --cutout                                  # once: installs rembg locally
ENGINE/scripts/py ENGINE/scripts/cutout.py photos/jacket.jpg assets/cut/jacket.png   # or a whole folder → assets/cut/
ENGINE/scripts/py tools/prep_assets.py jacket:2000 boot:900            # crop, scale, webp → src/assets + manifest.json
```
- `--luma <name>` for clear/glass products shot on black (alpha from brightness). `--split row=a,b,c` for one image
  holding several products in a row. Max heights: hero garments ~1800–2000 px, small items 300–900 px.
- Products the user can't photograph can be drawn in code (simple objects) — or AI, below.

**Optional, paid — AI stills (only after the exact cost and a "go").** Higgsfield `gpt_image_2_5`, quality high, 2k,
`background: "transparent"` returns a clean RGBA cut-out (~2.75 credits each; no background-removal step). Make the
hero still first and pass it as the reference for the others so the products match. Prompt shape:
> Studio product photograph of <product: material, colour, details>, <angle / pose>, the whole product visible,
> nothing cropped. Isolated on a transparent background, soft even studio light, sharp detail. No text, no logos.
Clear plastic/glass: ask for it on pure black instead and use `--luma`. Keep every job id + credit cost in README.md.

## 3D models (optional)
A real 3D product (turntable, exploded view, stomping boot) lifts a slide a lot, but it's optional.
- Paid: Higgsfield `tripo_h3_1_image_to_3d` from the still's job id (~9 credits standard, ~18 detailed).
- $0: a GLB the user already has (from their manufacturer, a 3D scan app, or free CC0 sites) or simple code geometry.
- Optimise (on demand, no install needed):
  `npx -y @gltf-transform/cli optimize raw.glb src/assets/<name>.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.05`
  (0.04–0.06 keeps the silhouette; check it in the page). Keep the raw file in `assets/3d/`.
- `node tools/glb-profile.mjs assets/3d/raw.glb y` → radius by height, to choose split planes for an exploded view.
- Register in `build.mjs` (`<name>Glb: b64('src/assets/<name>.glb')`) and load it in `main.js` like the examples.

## Type
Fonts live in `fonts/` and are embedded by `build.mjs` (`font(family, file, mime, extra)`); `main.js` awaits them
before boot. Use free fonts (Google Fonts, OFL) and keep their licence files. 3D type: `node tools/typeface.mjs
fonts/X.ttf src/assets/x.json "ONLY THESE CHARS"` → three.js typeface JSON for `TextGeometry` (encore's chrome "Encore").
Brand logos: only the client's own, from them. Never recreate someone else's logo.
