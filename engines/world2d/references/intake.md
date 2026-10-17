# Intake — the interview

The core `SKILL.md` controls the order and human review gates. Use these questions as an engine-specific checklist after the selected topic and image inventory have led to World 2D. Ask only the important unanswered questions, using the brainstorming skill's focused one-at-a-time method. The bracketed examples are starting points, never assumed approvals.

```
Possible World 2D questions:

1. Your business — name, what you sell, who it's for. Website or Instagram handle if you have one (I'll look).
2. Topic — use the owner's already selected whole-carousel topic. If no topic is selected, return to the core 5–10 numbered-topic gate.
3. Goal — what should people do after the last slide? (order / DM a keyword / link in bio / book / follow) Any price, offer or date?
4. Budget — code-drawn assets or generated images? Record the owner's choice and disclose costs before paid generation.
5. Real images — use the owner's image inventory from the core workflow; ask only if an asset is still unclear.
6. Style — brand colours/fonts, a brand guide / style sheet, or posts / carousels / accounts you love (files or links)? [I pick a look for your business]
7. Format — how many slides, which platform, how long each loop? [6 slides · Instagram 4:5 (1080×1350) · 8 s]
8. Words — language and tone, plus anything you must say or must never say (claims, legal lines, words to avoid)? [your language · punchy]
```

Record decisions in the brief and image plan. Obtain their separate approvals, then one generated-image sample approval if applicable, before building the complete cover draft. Show that draft for approval before rendering all slides.

## How each answer changes the build

**1 · Business.** Decides the protagonist (the object that travels or evolves across the slides),
the metaphors, the vocabulary of motion (a bakery rises and steams; a fintech app ticks and counts;
a gym slams and pulses; a skincare brand drips and glows) and the world colours. If you got a URL or
handle, read it for product names, prices, tone of voice and real claims. Never invent prices,
awards, reviews or claims; put a `[CHECK]` placeholder and ask.

**2 · Topic.** Preserve the topic selected through the core 5–10-topic gate. The following are examples of story angles when preparing that list:
- Launch / new item ("Something hot is coming") · Process / behind the scenes ("How we build it, layer by layer")
- Offer with urgency ("This weekend only") · Myth vs truth · Before → after / transformation
- Ranked list ("3 things every … needs") · Story of a customer · Seasonal / cultural moment.
Prefer the angle that gives the protagonist the most to *do* across the slides.

**3 · Goal.** Shapes the last slide (and the caption): a price stamp + "order now" button, a giant
DM keyword, a "link in bio" arrow, a booking date. One CTA only. Repeat the offer once earlier.

**4 · Budget.**
- `code-drawn`: the protagonist can be drawn in code like the example burger (gradients, layered shapes,
  material angles so it can turn). Document the resulting style in the image plan.
- `AI assets`: follow `references/assets.md` (Higgsfield recipe). Check the connector is available
  (its tools appear in your tool list). If not, tell the user how to connect it — in Claude Desktop /
  claude.ai: Settings → Connectors → add Higgsfield and sign in; in Claude Code: add the connector or MCP
  server the tool documents — and wait. List every asset you plan to make with its credit cost; get a
  yes before the first paid call. Follow the core one-sample image approval before generating a batch.
- If they name another tool (any AI image/video tool they have connected), use it the same way:
  generate → cut out → drop PNGs into `assets/`.

**5 · Real images.** Copy them into `assets/` (rename to short names: `logo.png`, `product.png`,
`shot1.jpg`). Products and logos work best as PNGs with a transparent background; photos work as
framed cards (rounded, shadowed, parallax, tilted into place). Ask before using photos of people other
than the user. See `references/assets.md`.

**6 · Style.** Take colours (hex), fonts and attitude from what they give you. Bundled display
fonts: Anton (tall condensed), Anybody Wide/Black (chunky), JetBrains Mono (labels). If their brand
font is a free web font file they give you, add it to `fonts/` and `build.py`. For reference posts,
borrow the energy and layout logic, never the artwork. With no reference, derive a palette from the
business (dark base + one hot accent + one warm neutral is a safe premium recipe).

**7 · Format.** Instagram/LinkedIn 4:5 = 1080×1350 (default). TikTok photo mode / Stories 9:16 =
1080×1920 (set `width`/`height` in `00-project.js` and lay out for the taller frame). 4–8 slides;
loop 4, 6 or 8 s (whole bars at 120 BPM so music syncs later).

**8 · Words.** Write all on-slide copy in their language and tone. Keep slides to ≤ 8 big words plus a
small line. Put must-say lines on the CTA slide; respect must-never-say lists everywhere.

After the answers: follow the separate brief, storyboard/image-plan, sample-image (when needed) and complete-cover approval gates in `SKILL.md`.
