# Validation — 2026-10-15

Verified locally on Windows:

- 14 regression tests pass: manifest completeness, unsafe paths, unknown rights, custom-profile authorization, trigger timing, separate stems, overlapping-effects normalization, BGM licensing/duration, palette substitution and typography fallback.
- 34 Python source files parse; bundled JSON files parse.
- All 56 supplied library files decode, with measured duration matching the manifest. There are 54 WAV SFX and 2 MP3 BGM tracks. Rights remain unverified.
- Four Motion demo slides scaffold, generate four mixes/eight stems and build HTML. WAV sample peaks remain below the mixer ceiling.
- Photo scaffold, OpenCV preparation, mask generation, audio and HTML build succeed on a synthetic fixture. This is not a full subject-cutout or OCR accuracy test.
- Five Motion/Photo slides load in Chromium via a local HTTP server with external network blocked; font loading, deterministic seeks and screenshots succeed without JavaScript errors. Photo sky/repaint layers are hidden at frame zero after correcting a discovered fidelity issue.
- Hanken Grotesk, Bricolage Grotesque, IBM Plex Mono and full Fraunces italic contain the tested Vietnamese glyph sample. Instrument Serif lacks some Vietnamese letters; the builder uses the documented Fraunces fallback for Vietnamese HTML.
- World 2D/3D portable scaffolds were smoke-tested; World 2D builds standalone HTML; World 3D generated six mixes and twelve stems. Python/selected JavaScript syntax checks passed.

Not verified: full MP4 export across every engine, World 3D browser/model rendering, subjective listening, encoded-audio true-peak/LUFS, 9:16/16:9 export, execution in Claude or Gemini. Adapters describe portability and tool requirements; they do not claim those environments were executed here. HTML previews for world examples remain silent until normalized audio is explicitly embedded; final mux uses the generated mix and requires stems.

Audio duplicate audit compared SHA-256 of the 56 new files and 18 original motion-carousels WEBM files: no byte-identical duplicates. It does not establish perceptual uniqueness, compare transformed excerpts, or compare generated/embedded demo audio.
