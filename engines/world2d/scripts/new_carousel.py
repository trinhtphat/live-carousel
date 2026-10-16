#!/usr/bin/env python3
"""Scaffold a new carousel project from the engine + an example, then build it.

  python3 new_carousel.py ~/motion-carousels/my-brand            # starts from examples/ember-and-bun
  python3 new_carousel.py ~/motion-carousels/my-brand --from ember-and-bun --force
"""
import argparse, pathlib, shutil, subprocess, sys, json

SKILL = pathlib.Path(__file__).resolve().parent.parent
ENGINE = SKILL / "engine"
ap = argparse.ArgumentParser()
ap.add_argument("dir")
ap.add_argument("--from", dest="example", default="ember-and-bun")
ap.add_argument("--force", action="store_true", help="overwrite an existing project folder")
a = ap.parse_args()
out = pathlib.Path(a.dir).expanduser().resolve()
ex = SKILL / "examples" / a.example
if not ex.is_dir():
    sys.exit(f"no example called {a.example!r} in {SKILL / 'examples'}")
if out.exists() and any(out.iterdir()) and not a.force:
    sys.exit(f"{out} already exists and is not empty (use --force to overwrite)")
(out / "src").mkdir(parents=True, exist_ok=True)
for f in ["01-core.js", "05-render.js", "06-app.js", "template.html", "style.css"]:
    shutil.copy2(ENGINE / f, out / "src" / f)
for f in sorted(ex.glob("0*.js")):            # project files: 00-project, 02-hero, 03-slides, 04-world
    shutil.copy2(f, out / "src" / f.name)
shutil.copytree(ENGINE / "fonts", out / "fonts", dirs_exist_ok=True)
(out / "tools").mkdir(exist_ok=True)
shutil.copy2(ENGINE / "capture.mjs", out / "tools" / "capture.mjs")
shutil.copy2(ENGINE / "build.py", out / "build.py")
for d in ["assets", "renders"]:
    (out / d).mkdir(exist_ok=True)
if (ex / "assets").is_dir():
    shutil.copytree(ex / "assets", out / "assets", dirs_exist_ok=True)
(out / "audio").mkdir(exist_ok=True)
(out / "assets/sfx").mkdir(parents=True, exist_ok=True)
shutil.copy2(SKILL.parents[1] / "scripts/audio_pipeline.py", out / "audio/audio_pipeline.py")
manifest = out / "sfx_manifest.json"
if not manifest.exists():
    shutil.copytree(SKILL.parents[1] / "assets/sfx", out / "assets/sfx", dirs_exist_ok=True)
    shutil.copy2(SKILL.parents[1] / "sfx_manifest.json", manifest)
brief = out / "BRIEF.md"
if not brief.exists():
    shutil.copy2(SKILL / "references" / "brief-template.md", brief)
r = subprocess.run([sys.executable, str(out / "build.py")])
print(f"\nproject: {out}\nedit:    src/00-project.js, 02-hero.js, 03-slides.js, 04-world.js (engine files 01/05/06 stay as they are)")
print(f"build:   python3 {out / 'build.py'}\ncheck:   node {out / 'tools/capture.mjs'} sheet {out / 'renders/qa'}")
sys.exit(r.returncode)
