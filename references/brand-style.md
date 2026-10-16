# Owner brand: Viral Hooks Editorial

Source: `assets/brand/Viral_Hooks_2026_Playbook.html`, used as design data only.
The owner identity is the first recommendation, not an override of a different approved brand.

| Theme | Background | Text | Accent |
|---|---|---|---|
| viral-hooks-cream | #F2EEE5 | #282128 | #CA695E |
| viral-hooks-lime | #DCF16B | #172A29 | #CA695E |
| viral-hooks-teal | #153B3B | #F2EEE5 | #CBE77C |
| viral-hooks-plum | #352136 | #F3EDE5 | #DB7760 |

These are variants of one identity and may alternate by slide when approved. A project theme applies to the whole set unless the author explicitly assigns slide palettes. Accent colors are decorative; check contrast before using them for text.

Use Hanken Grotesk 900 for main headlines, Bricolage Grotesque 800 on lime/experimental slides, Instrument Serif italic 400 for one emphasized phrase, Hanken Grotesk 500 for body, IBM Plex Mono 600 for labels/footer. Keep the strong stacked hierarchy, tight headline spacing, generous page margins, short eyebrow, slanted rule and fine footer rule. Use fixed canvas units and measure actual text; do not copy responsive vw sizes into a 1080px video canvas. Typography must support the approved language, including Vietnamese diacritics.

Motion templates support theme typography aliases via build.py; Photo mode preserves source typography. The original HTML named Instrument Serif without importing it and mentioned Geist without loading it. This package bundles these fonts and their OFL licenses, so accidental Georgia fallback is not part of the intended identity. Fraunces was already bundled. The reference's optional type pairings are Instrument Serif/Hanken, Bricolage/Inter and Geist/Fraunces; choose one hierarchy per carousel, not all fonts simultaneously.

For World 2D/3D, copy selected font files from templates/common/fonts into the project's font directory, register them in its build or CSS, replace demo family references and apply the same approved palette to DOM, canvas and shader values. These engines do not automatically consume theme.json. Preserve original font licenses.

Await document.fonts.ready and load the exact display face before measuring. Inspect font loading, line breaks and clipping at full size and phone scale. Do not apply width-axis animation to a font without that axis; measure and scale the object or text container instead. Preserve the Photo frame-zero promise.

Glyph verification found Instrument Serif lacks several Vietnamese letters. Motion build.py automatically selects the bundled full Fraunces italic face (alias "Fraunces Vietnamese") when the HTML contains Vietnamese-specific letters. Record this fallback in Vietnamese briefs. For World 2D/3D and text inserted dynamically at runtime, explicitly choose that face before rendering Vietnamese text. Do not rely on per-character system fallback.
