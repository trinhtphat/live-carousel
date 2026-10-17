# Adapter: Claude / Claude Code

Load the entire skill folder using the skill mechanism supported by the installed Claude environment. Claude Code may run local scripts with its granted permissions. A chat-only Claude session should produce a handoff when no render tools exist.

Use the same English core and four modes. Reply in the user's language; confirm on-video language in the brief. Read references/model-selection.md for model advice. Keep assets, manifests, fonts, licenses, scripts and engine paths relative to the skill/project. Never assume a private Premium toolkit, paid connector or local absolute path exists on another machine.

Follow every core human review gate, preserving prior choices: focused research/questions, 5–10 numbered topics and owner selection, image inventory before mode, approved production brief, separate storyboard/image-plan approval, one generated-image sample approval when needed, and one complete cover/hook draft with animation and audio approved before full rendering. Read references/audio-integration.md before editing audio: every slide needs at least one licensed library SFX at a named visual trigger; BGM stays below that SFX, with separate stems and peak normalization. Use Subtle/Smooth by default and custom styles only on explicit request.

On Windows, use a Python interpreter with numpy/opencv and Node/ffmpeg/ffprobe available in the same environment. POSIX setup wrappers require Git Bash/WSL; portable Python scaffolds can be invoked directly. Install only dependencies for the chosen engine. Runtime checks on one platform do not prove execution on another.

Prompt example:
"Use live-carousel for [idea]. Preserve my approved brand and language. Research and ask focused questions, then let me choose from 5–10 numbered topics. Ask about my images before recommending a mode. Get separate approval for the brief, storyboard/image plan, one generated-image sample if needed, and a complete cover draft with motion and sound before the final render. Use one licensed library SFX per slide with BGM below it. Report only actual artifacts and checks."
