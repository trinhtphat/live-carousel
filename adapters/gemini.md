# Adapter: Gemini / AI Studio

Supply SKILL.md and the relevant references as named context files or system instructions as supported by the environment. A tool-enabled Gemini agent can execute scripts; an AI Studio chat without tools must produce an unrendered handoff.

Use the same English core and four modes. Reply in the user's language; confirm on-video language in the brief. Read references/model-selection.md for model advice. Keep assets, manifests, fonts, licenses, scripts and engine paths relative to the skill/project. Never assume a private Premium toolkit, paid connector or local absolute path exists on another machine.

Follow topic selection and brief approval gates, preserving prior user choices. Read references/audio-integration.md before editing audio: mandatory manifest, BGM/SFX stems, visual triggers, subtle default, explicit custom style and peak normalization.

On Windows, use a Python interpreter with numpy/opencv and Node/ffmpeg/ffprobe available in the same environment. POSIX setup wrappers require Git Bash/WSL; portable Python scaffolds can be invoked directly. Install only dependencies for the chosen engine. Runtime checks on one platform do not prove execution on another.

Prompt example:
"Use live-carousel for [idea]. Preserve my approved brand and language. Propose topics if necessary, then present a production brief for approval. Use Subtle/Smooth audio unless I request another profile. Render only when your tools support it and report the actual artifacts and checks."
