# Direction — making it look like an agency spot

## The shape of a carousel on steroids
A carousel is a short ad told across N looping slides that share one world. Typical 6-slide arc:

| # | Role | What it does | Example (Ember & Bun) |
|---|------|--------------|------------------------|
| 1 | **Hook / tease** | Stops the thumb. Big promise, big word, something igniting. A cue to swipe that points across the edge. | Black → spark → fire wall, SOMETHING HOT IS COMING burns in, fuse runs into slide 2 |
| 2 | **Start / problem / build begins** | The protagonist arrives with weight. First impact. | Bun drops and squashes; two patties SLAM with shockwaves; grill flare-ups |
| 3 | **Details / proof / layers** | Show what's inside: features, ingredients, steps. Labels pop in. | Cheddar melts, onions and jalapeños rain down, labels with leader lines |
| 4 | **Transformation** | The thing changes state. Liquid, light, assembly, before → after. | Sauce ribbon wraps the stack, top bun drops, burger squishes and hops |
| 5 | **Reveal / hero** | The finished protagonist, heroic: rim light, slow turn, title slam. | Ring of fire, god rays, turntable float, THE INFERNO slams with shimmer |
| 6 | **CTA** | Offer + one action. Price stamps, button pulses, logo. | $14.99 slot-machine roll + stamp, AVAILABLE NOW beats, glowing button |

Adapt the roles to the topic (a 5-slide "3 tips" post = hook, tip 1, tip 2, tip 3, CTA).

## The protagonist and the conveyor
Pick one object that belongs to the business and let it carry the story. In the example the burger
is built across slides 2–5 and, at the end of every loop, each slide's burger *whips* into the next
slide (`whip()` / `arrive()` in `03-slides.js`). In the strip it reads as an assembly line; on each
single slide the loop ends with the stack sliding out and the next one sliding in, so it stays
seamless. Other protagonists: a phone whose screen fills up, a sneaker being laced and launched, a
cocktail being poured and garnished, a house key turning into a door, a chart line drawing across
every slide, a parcel being packed and shipped.

## Motion vocabulary (all in the example)
- **Drop with weight**: `fallY()` — accelerating fall, stretch while falling, squash on landing, tiny bounces.
- **Slam**: very short fall + camera `shakes` + `zooms` punch + `flashes` + `ring()` shockwaves + `burst()` sparks/drops.
- **Squash & stretch on the whole stack**: `sq` with `damp(dt, f, d)`.
- **Gooey**: drips that grow with `E.ioS` and wobble with `OM()` sinusoids (`dripPath`).
- **Liquid ribbon**: a precomputed path drawn between a moving tail and head, split into back/front runs (S4).
- **Rain**: each piece has its own landing time, accelerates in, bounces out (`drawOnions`, `drawJalas`).
- **Hero turn**: everything placed at material angles, so `B.rot` turns it like a turntable (S5).
- **Heat / fire**: `flames()` (world-anchored rows that line up across edges), `embers()`, flare-ups.
- **Smoke / steam**: `puffs()` with emitters that follow the protagonist (`x: (tb) => whip(k, tb).x`).
- **Beats**: `beat(t)` pulses every second (8 per loop) for CTA buttons, badges, words.
- **Second beat**: every slide gets a mid-loop moment (surge, flare-up, hop, garnish) so the hold
  between 3 s and 7 s never goes dead.

## Typography treatments (one per slide, never repeated)
| Treatment | Where in the example | Helper |
|-----------|---------------------|--------|
| Burn-in letter by letter (white-hot → cool), burn-out to ash | S1 | `burnLetter()` + `word()` with hot/cool styles |
| Letters drop and bounce, jump on every impact, fall away | S2 | `drawLetter(..., { dy, sx, sy, piv: 1 })` |
| Word stacks in as horizontal slices, drips hang from it | S3 | slice `drawImage` of a `glyph()` sprite |
| Glass letters fill with sloshing liquid | S4 | offscreen mask + `source-in` wave |
| Slam from huge + chromatic ghosts + heat shimmer + burn away | S5 | strip-displaced `glyph()` sprite |
| Slot-machine digits roll, then the price stamps down | S6 | `S6.reel()` |
| Decode / scramble, typewriter with caret | S5 tagline, S3 subtitle | per-char `drawLetter` |
More to invent: letters magnetised into place, ink stamp with paper texture, neon tubes flickering on,
letters cut from a sheet and peeled, kinetic word wall, letters made of particles that assemble.

## Seam bridges (what crosses the edges)
Persistent things that sit across an edge at every moment, plus events that cross it:
- Floating items in zero-g straddling the edge (`FLOAT` in `04-world.js`): ingredients, products, icons, coins.
- Continuous world layers: background colour blend (`BGK`/`BAND`), floor line, fire row, smoke band, bokeh.
- Events: the swipe-cue fuse (S1→S2), shockwaves bigger than a slide, steam/smoke drifting right,
  ember explosions, the protagonist whipping across.
Place bridges at mid-height (y 500–1000) so they avoid the Instagram counter (top-right) and sound
icon (bottom-right), and never over a label or headline.

## Worlds and colour
Each slide gets its own world colour (`BGK`: top + bottom), blended across edges. Neighbours never
share a background. A strong recipe: 1 near-black base, 1–2 hot accents, 1 warm neutral for type,
and let the CTA slide flip to the brightest colour so it pops at the end of the swipe.

## Depth
Back (glows, rays, big background words, far bokeh), mid (protagonist, shadow, floor light), front
(particles, labels, titles, foreground fly-bys, near embers). Parallax: far things slow, near things fast.

## Copy
- Slide 1 promises; the last slide asks. Everything between proves.
- ≤ 8 big words per slide + one small line. Numbers beat adjectives. Verbs beat nouns.
- Labels are 1–3 words, mono, uppercase. Keep real claims real (from the user or their site).

## Industry starters (protagonist · signature moment)
- Restaurant / café: the dish being built · slam + steam + sauce pour (the example).
- Fashion / sneakers: the product turning on a plinth · laces whip, stitching draws on, drop-in with dust.
- SaaS / app: a phone or window filling with UI · cursor clicks that shockwave, numbers counting up.
- Fitness / gym: a barbell / timer · plate slams, heartbeat pulse, sweat-spark bursts.
- Beauty / skincare: the bottle · liquid swirl, droplets, glow and sparkle sweeps.
- Real estate: a house / key · blueprint lines draw the house, key turns, door light spills across edges.
- Coach / creator: the creator's photo as a cut-out · bold claims stamp in, chart line climbs across slides.
- E-commerce product: the product · unboxing, exploded-view parts flying in and locking together.
