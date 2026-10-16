# World 3D audio

Production uses `tools/make_audio.py` and the common `audio/audio_pipeline.py`; final mux requires separate `.bgm.wav` and `.sfx.wav` stems plus the normalized mix. Never fall back to an old embedded example soundtrack.

In `audio/plan.json`, each slide has `visual_triggers` mapping IDs to actual seconds in the visual source and `audio` containing profile, BGM and trigger-linked events. No arbitrary timestamps independent of the animation. Confirm the map against each slide module before rendering.

Default profile is Subtle/Smooth. Game/Tech/Cinematic profiles require an explicit user request recorded in BRIEF.md and `custom_style_requested: true`. Beep/click/woosh sounds remain available in custom libraries with automatic normalization and clipping protection.

All SFX are isolated in project `assets/sfx/`; root `sfx_manifest.json` registers source, filename, category_group, duration_ms, volume_level and license_status. Unverified rights block use; a user upload is not proof of royalty-free licensing. BGM also lives inside assets/sfx and must have a manifest entry with category_group bgm and confirmed license status.

Legacy `tools/audio/*` and example score generators are retained for source study or BGM composition only. They cannot bypass the common pipeline. Reuse a synthesized bed only after recording its provenance as BGM, without embedded SFX; then rerender the two tracks through the pipeline.
