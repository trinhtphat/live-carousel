# Sound design

Read audio-integration.md first. The shared mixer separates BGM and SFX, checks the manifest and normalizes sources and the mix. Use Subtle/Smooth unless the approved brief explicitly requests Game/Tech/Cinematic. Custom beep/click/woosh assets are allowed under that choice; they are never globally prohibited.

Author visual trigger times before SFX events. Motion uses carousel.json visual_triggers; Photo derives cues; world modes follow world-modes.md. Rerun audio/make_audio.py after timing changes and inspect both stems and the output mix. Default synthesis is a gentle chord bed plus soft events. Optional richer synthesis utilities live in shared/audio; render their BGM output separately and register it before use rather than importing a combined legacy score.
