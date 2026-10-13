# Image source and generation

Use this guide after a topic and production brief have been approved.

1. Ask whether the user has usable photos, brand assets, finished slides, or wants original imagery. Preserve supplied images and their order; do not replace them with generated images without a reason accepted by the user.
2. If no images are available, decide whether the story works best with HTML/vector motion graphics alone or benefits from a generated cutout, illustration, scene, or photo. Avoid generating images merely because the option exists.
3. When `gpt-image-2-style-library` is installed in the current environment, read its `SKILL.md` and relevant style reference. Propose 2–3 topic-fit visual directions, each with a short reason. The user's approved palette, video ratio, language, and brand assets take precedence over a style template.
4. After the user chooses a direction, write an image prompt with subject, composition, style, palette, text policy, ratio, and negative constraints. Generate only if an image-generation tool is available and the user has selected that direction. Otherwise, deliver the prompt as a handoff. The style library supplies prompt patterns; it does not itself render images.
5. Keep key headlines and CTA as editable video text. Prefer text-free generated artwork unless the user explicitly needs text inside the image. Inspect crop, legibility, transparency, and consistency across slides before rendering.
6. Record source, licence/rights information when known, selected style/template, exact prompt, output paths, and any missing assets in `ASSET_PLAN.md`. Never claim an image was generated or licensed when it was only proposed.

If the style library is absent, propose visual directions from the approved brief and state that no library template was used. This path must work in ChatGPT, Codex, Cursor, Gemini, and Claude Code without making a local Codex skill installation mandatory.
