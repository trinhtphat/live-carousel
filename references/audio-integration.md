# Audio and SFX integration contract

This contract applies to all four modes and supersedes legacy example sound recipes.

## Library
Every imported audio asset lives inside project `assets/sfx/`, including BGM sources in its music subfolder. Root `sfx_manifest.json` is mandatory:

```json
{"schema_version":1,"sounds":[{"source":"user-provided:library.zip/path.wav","filename":"effects/path.wav","category_group":"tech","duration_ms":320,"volume_level":0.12,"license_status":"unverified"}]}
```

filename is relative INSIDE assets/sfx, never an absolute path. volume_level is a linear peak amplitude from 0 to 1, not dB. category_group is subtle, smooth, game, tech, cinematic or bgm. All six fields are required. Add optional license_evidence and attribution when confirming rights. Do not infer rights from filenames or provider names. Accepted playback statuses are user_confirmed, licensed, public_domain and cc0; unverified files remain catalogued but cannot play. Do not mark imported files confirmed merely because a framework update was approved; record the user's rights confirmation as evidence.

The supplied 54 SFX and 2 BGM files were initially imported as unverified. On 2026-10-15, the user confirmed that the files in `sound_effects.zip` are permitted for commercial use; this evidence is recorded per asset in the manifest with `license_status: user_confirmed`.

The user separately confirmed commercial-use and public redistribution rights for all 150 audio files in `sound-effects-pack.zip` on 2026-10-16. Fifty-six archive files already match the earlier registered files by SHA-256; the other 94 are under `assets/sfx/sound-effects-pack/` and carry their own per-file evidence. The ZIP README describes origin and duration but is not the authorization source. Choose `filename` from the manifest; the mixer still enforces the selected profile, category and visual trigger.

Generated stems and rendered outputs are production outputs, not library inputs; they remain under audio/out and are not re-imported as unregistered source assets. No external automatic SFX search or silent substitute for an explicitly selected unlicensed file.

## Configuration and trigger mapping
Motion/Photo settings live in carousel.json. Use audio.slides to override individual slides. Example:

```json
{"visual_triggers":{"01-hook":{"headline-reveal":0.5}},"audio":{"profile":"subtle","custom_style_requested":false,"slides":{"01-hook":{"events":[{"trigger":"headline-reveal","sfx":"effects/path.wav","gain":0.08}]}}}}
```

The animation must use the same trigger time. Photo derives hit/shine triggers directly from its visual cues. World 2D extracts scene shake/flash times; World 3D uses audio/plan.json with per-slide visual_triggers and audio settings. Replace demo trigger maps when rewriting animation; never reuse timestamps merely because a slide filename stayed the same.

Every slide must have at least one non-silent `sfx` event from the registered, rights-confirmed library, mapped to a real visual trigger. A synthetic soft event may be an extra but never satisfies the per-slide requirement. Default profiles are subtle/smooth. Game/tech/cinematic profiles require an explicit request recorded in BRIEF.md and `custom_style_requested:true`. Do not enable this flag just to bypass an error. There is no blanket ban on beep/click/woosh sounds. Choose the approved style, verify rights and normalize the source. Review group labels on imported files; current groups are conservative classifications from archive folders, not listening-based assessments.

BGM source: `"bgm":{"file":"background music/song.mp3","start":0,"gain":0.2}`; the file must be in the manifest with category bgm and confirmed rights. Without a source the mixer synthesizes a gentle musical bed locally. Optional ACE-Step requires an explicit setup choice, compatible hardware and storage; register any selected generated track and provenance before using it.

## Mixing and verification
scripts/audio_pipeline.py provides `render_audio(root,duration,visual_triggers,audio,output_prefix)` and writes `<prefix>.bgm.wav` (Track 1), `<prefix>.sfx.wav` (Track 2) and `<prefix>.wav` (mix). It normalizes each selected source, limits overlapping SFX and attenuates both stems together when their sum exceeds -1 dBFS sample peak. Default SFX peaks remain restrained. Inspect the stems, synchronization and loop seam before rendering. Sample-peak protection is not a claim of measured LUFS or intersample true-peak compliance; inspect the encoded output too.

SFX are the foreground. The mixer lowers BGM smoothly around each registered SFX event (20 ms attack, 120 ms release) and keeps BGM RMS within the active event window at or below half the SFX RMS. Listen to the draft cover and every final MP4: this level rule does not replace an audible balance check. If no fitting licensed SFX exists, ask the owner for a usable asset or a change to the sound plan rather than using synthetic audio as a silent substitute.

Library registration, path containment, license status, profile authorization and named trigger validation run before playback. Missing prerequisites fail explicitly. Preserve separate stems; do not treat a mixed demo soundtrack as a BGM stem. Run `python -m unittest discover -s tests` in the skill to check policy and mixing regressions.
