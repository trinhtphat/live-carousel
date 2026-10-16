> Imported visual/source reference. Original audio commands below are historical only. Production MUST use tools/make_audio.py and the shared normalized BGM/SFX pipeline; see references/world-modes.md at skill root. Demo mixed audio is excluded. Custom beep/click sounds remain available on explicit request.

# ENCORE® — LOUD TOUR '26 (live carousel)

"The clothes are the band." A rock-and-roll clothing drop as a 6-slide Instagram carousel. Every slide is a
looping 1080×1350 video, and all six are one continuous stage: the truss, the moving heads, the red velvet,
the deck, the guitar cable and the footlights run straight through every seam, so swiping feels like the
camera tracking along the stage. No people: each garment plays an instrument. ENCORE is a placeholder brand.

Every swipe adds a band member to the soundtrack (one original rock instrumental made locally with ACE-Step,
split into stems): 01 the riff through the backstage wall → 02 drums → 03 + bass → 04 + guitar → 05/06 the full band.

## Files
- `renders/final/slide-01-frontman.mp4 … slide-06-encore.mp4`: post these in order. 30 fps, 8.000 s seamless loops, with sound.
- `renders/final/preview-swipe-through.mp4` (after `node tools/swipe.mjs`): 48 s preview, each slide's loop then a swipe along the stage.
- `dist/encore-loud.html`: the whole carousel in one file. `S` strip, `1`–`6` / arrows / drag to swipe, `M` sound, `R` rec mode, `G` seams.

## Slides
| # | product / role | what happens | the hit |
|---|---|---|---|
| 1 | leather jacket on a vintage mic: LEAD VOCALS | marquee sign (chrome blackletter, 54 chasing bulbs), "THE CLOTHES ARE THE BAND." | 3.2 house dips while the bulbs count in; 4.0 lights slam, beams fan, gerbs, wind machine |
| 2 | Chelsea boots (Tripo 3D): ON DRUMS | right boot stomps every kick, left taps the backbeat, kick-drum head pumps, rings across the boards | 3.5 both boots jump, spin 360°, slam on 4.0 |
| 3 | washed black denim: ON BASS | 8x10 cab whose eight cones really pump, pressure rings, jeans blown by the cab's air, LOW END. ripples | 4.0 drop: cones punch, shockwave, jeans whip |
| 4 | tour tee + SG: ON GUITAR | the shirt "wears" the guitar and rocks; its strings run on past the headstock over the seam into slide 5; tour-dates flip board | 4.0 power chord: strings flare, sparks off the bridge |
| 5 | everything: VOL 11 | the full band on stage, LOUDER. burning | 4.0 four flame jets, confetti cannons (drifts into slide 6), strobes |
| 6 | the drop | house curtain down, chrome "Encore?", swinging AAA pass, FRIDAY 8PM, comment ENCORE | 4.0 the curtain parts a crack, light + confetti pour through |

VU meter on every slide climbs VOL 01 → 03 → 05 → 07 → 11 → 11.

## Higgsfield spend: 40 credits (no video models)
| job | model | use |
|---|---|---|
| 16402afa | gpt_image_2_5 transparent | jacket on mic stand |
| 63dcf75a | gpt_image_2_5 transparent | boot (source for 3D) |
| 9f65a20c | gpt_image_2_5 transparent | denim |
| 5dd6d88e | gpt_image_2_5 transparent | tee + guitar |
| a7b55929 | gpt_image_2_5 transparent | kick drum |
| 462b6b9b | gpt_image_2_5 transparent | 8x10 bass cab |
| e85f5bdf | gpt_image_2_5 transparent | moving-head fixture (×18 on the truss) |
| cff51a07 | gpt_image_2_5 transparent | silver jewelry (prepped, not used yet) |
| 8f5bcbf2 | tripo_h3_1_image_to_3d detailed | 3D boot, 18 cr |

## Rebuild (from this project folder)
```
node build.mjs                                   # src/ → dist/encore-loud.html (fonts, images, the 3D boot and the sound inlined)
node tools/render.mjs all && node tools/mux.mjs  # renders/final/slide-*.mp4 (the shipped sound: src/assets/audio/*.webm)
node tools/swipe.mjs                             # renders/final/preview-swipe-through.mp4
node tools/sheet.mjs qa/sheet.jpg && node tools/seams.mjs qa/seams.jpg
node tools/typeface.mjs fonts/UnifrakturCook-Bold.ttf src/assets/fraktur.json "EncoreENCORE?!&"   # only if you change the 3D word
```
`tools_prep_assets.py` and `audio/make_audio.py` are kept as a record of how the assets and the sound were made;
the raw Higgsfield images and the ACE-Step stems they read are not shipped (the prepared `src/assets/` are).

## Engine notes (new in this version)
- `src/gl.js` STAGE: the shared set, in strip px. Per-slide light (`uWash`) is blended with the neighbours' near each seam.
- `src/stage.js`: 18 fixtures programmed per slide with `ctx.rig.setCue(i, (t, k) => ({a, w, I, col}))`; beams are drawn by the backdrop shader.
- `src/post.js`: bloom + red halation + per-slide camera punch (`ctx.punch[i]` zoom/shake/chromatic split, `ctx.flash[i]`); DOM type rides the same punch.
- Sprites: natural size comes from `uSize`; `mesh.scale` is a relative factor (use `place()` / `sizePx()`).
- GLSL on Metal: `pow(negative, 2.)` is NaN and poisons the whole frame. Use `sq()`. `half` is a reserved word.
