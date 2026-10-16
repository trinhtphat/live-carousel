# Optional music composition sources

These imported generators are optional source material for composing original background music. The production entry point is `scripts/audio_pipeline.py` at skill root, copied to each project under `audio/`. Read `references/audio-integration.md` at skill root for the contract.

Do not mux the output of these legacy combined-score generators directly. Separate any composed BGM from accents; supply the BGM with provenance and license status to the common pipeline. All event accents must be on the SFX track and mapped to visual triggers. The common pipeline writes normalized BGM/SFX stems and the final mix.

Subtle/Smooth is the default. Explicitly requested Game/Tech/Cinematic styles can use sharp custom sounds; beep/click sounds are not globally prohibited. Manifest-backed source normalization and master clipping protection still apply.

`soft_bed.py` and `metrics.py` are optional composition/diagnostic sources. `acestep/` is an opt-in music-generation integration, not a setup dependency. Its shell scripts target Unix/Mac environments and must not be represented as native Windows installers. Validate requirements, model licensing and machine resources before installation; do not download models automatically. Imported generators and GPU paths have not been render-tested in this update.
