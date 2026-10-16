# Assets — $0, the user's own images, or AI assets

## Mode A · $0, drawn in code (default)
The protagonist is drawn with canvas shapes, exactly like `examples/ember-and-bun/02-hero.js`:
- Build it from layers, each a function drawing in local units around a base point.
- Shade with gradients (cylindrical: dark edges, bright off-centre), add ambient-occlusion shadows
  between layers (`SPR.dark` stretched), speculars (`SPR.cream`/`SPR.glow` with `'lighter'`) and a rim light.
- Put surface details at **material angles** around a vertical axis (x = r·sin(a + rot), depth = cos(a + rot))
  so one `rot` value turns the whole object like a turntable.
- Keep it stylised-premium: fewer, bolder shapes, glossy highlights, rich colour, crisp silhouettes.
It costs nothing and every pixel stays editable and animatable.

## Mode B · the user's own images
1. Copy files into `<project>/assets/` with short names (`logo.png`, `product.png`, `shot1.jpg`).
   Resize anything over ~1600 px wide first (ffmpeg: `ffmpeg -i in.jpg -vf scale=1600:-1 out.jpg`).
2. `python3 build.py` embeds them; use `drawImg(g, 'product', x, y, width)` or `IMG.product`.
3. Treatments: products/logos as PNG cut-outs with a floor shadow, rim glow and squash on landing;
   photos as framed cards (rounded clip, drop shadow, tilt + parallax, a light sweep across); screenshots
   inside a drawn phone/browser frame; a logo stamped or drawn on with a shine.
4. Only use images the user owns or supplied. Ask before using photos of other people.
No transparent background? In $0 mode, frame the photo instead of cutting it out; in Mode C you can
cut it out with the AI tool's background remover.

## Mode C · AI assets (only if the user chose it in the intake)
Use the AI tool the user has connected. Higgsfield (Claude connector) is the tested path:
1. **Check the connector is live**: its tools appear in your tool list (e.g. `generate_image`,
   `remove_background`, `models_explore`, `balance`). If not, tell the user to connect it
   (Claude Desktop / claude.ai → Settings → Connectors → Higgsfield → sign in; Claude Code: add the
   connector/MCP server per Higgsfield's docs), then wait.
2. **Plan and price first.** List every asset (e.g. "hero product 3/4 view, top view, 2 ingredient
   close-ups"), the model, and the credit cost from the tool's cost/preflight info. Show the total and
   the user's balance. Wait for an explicit yes. Re-rolls, upscales and extra assets need a new yes.
3. **Generate for cut-out**: product centred, studio lighting, plain light-grey (or pure black) background,
   consistent 3/4 hero angle, no text. For multiple angles, pass the first result as an image reference
   so the product stays identical. Tested model on Higgsfield: GPT Image 2.5 at high quality, 2K
   (≈ 2.75 credits per image at the time this was written — always check the live price).
4. **Cut out** with `remove_background`, download the PNGs into `assets/`.
5. **Animate them in code**: shadows, rim light, squash and stretch, drops, slams, floating, light sweeps,
   faux-turn (swap angle shots, or scale x by cos(rot) briefly while turning). Drawn particles and
   typography stay code-made, so they loop perfectly.
Other connected AI tools work the same way: generate → cut out → `assets/` → animate in code.
3D models are not used by this engine (it is canvas 2D); use several angle shots instead.

Never put credentials in project files. Never spend credits the user did not approve.
