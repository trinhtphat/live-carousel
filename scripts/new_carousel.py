#!/usr/bin/env python3
"""Scaffold a new live-carousel project.

  new_carousel.py <project-dir> [--mode motion|photo] [--theme cobalt|tomato|forest|noir]
                  [--title "Motion Design 101"] [--handle your_handle] [--images a.png b.png ...]

motion: starts from the 4-slide bouncing-ball carousel (a complete, working reference you then rewrite).
photo:  copies the user's finished slide images into source/ and sets up layer prep + a slide template.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
T = SKILL / "templates"
HF_VERSION = "0.8.121"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dest")
    ap.add_argument("--mode", choices=["motion", "photo"], default="motion")
    ap.add_argument("--theme", default="cobalt")
    ap.add_argument("--title", default="")
    ap.add_argument("--handle", default="your_handle")
    ap.add_argument("--caption", default="")
    ap.add_argument("--images", nargs="*", default=[])
    ap.add_argument("--force", action="store_true", help="write into a non-empty folder")
    a = ap.parse_args()

    themes = json.loads((T / "themes.json").read_text())
    if a.theme not in themes:
        sys.exit(f"unknown theme '{a.theme}'. Pick one of: {', '.join(themes)}")
    dest = Path(a.dest).expanduser().resolve()
    if dest.exists() and any(dest.iterdir()) and not a.force:
        sys.exit(f"{dest} is not empty (use --force to write into it anyway)")
    if a.mode == "photo" and not a.images:
        sys.exit("photo mode needs --images (the finished carousel slides, in order)")

    (dest / "shared/fonts").mkdir(parents=True, exist_ok=True)
    (dest / "audio").mkdir(parents=True, exist_ok=True)
    (dest / "src").mkdir(parents=True, exist_ok=True)
    (dest / "renders").mkdir(parents=True, exist_ok=True)
    c = T / "common"
    shutil.copy2(c / "build.py", dest / "build.py")
    shutil.copy2(c / "preview.html", dest / ".preview.template.html")
    for f in ("engine.js", "grain-overlay.html", "fonts.css"):
        shutil.copy2(c / f, dest / "shared" / f)
    for f in (c / "fonts").iterdir():
        shutil.copy2(f, dest / "shared/fonts" / f.name)
    for helper in ("lc_audio.py", "project_audio.py"):
        shutil.copy2(c / "audio" / helper, dest / "audio" / helper)
    shutil.copy2(SKILL / "scripts/audio_pipeline.py", dest / "audio/audio_pipeline.py")
    shutil.copy2(SKILL / "sfx_manifest.json", dest / "sfx_manifest.json")
    shutil.copytree(SKILL / "assets/sfx", dest / "assets/sfx", dirs_exist_ok=True)

    m = T / a.mode
    if a.mode == "motion":
        for f in (m / "src").glob("*.html"):
            shutil.copy2(f, dest / "src" / f.name)
        shutil.copy2(m / "chrome.css", dest / "shared/chrome.css")
        for f in ("BRIEF.md", "frame.md", "STORYBOARD.md"):
            shutil.copy2(m / f, dest / f)
        shutil.copy2(m / "audio/make_audio.py", dest / "audio/make_audio.py")
        title = a.title or "Motion Design 101"
        slides = ["01-hook", "02-easing", "03-weight", "04-cta"]
    else:
        (dest / "source").mkdir(exist_ok=True)
        shutil.copy2(m / "photo.js", dest / "shared/photo.js")
        shutil.copy2(m / "photo.css", dest / "shared/photo.css")
        shutil.copy2(m / "prep_photo.py", dest / "prep_photo.py")
        shutil.copy2(m / "src/_slide.html", dest / "src/_slide.html")
        shutil.copy2(m / "audio/make_audio.py", dest / "audio/make_audio.py")
        shutil.copy2(m / "BRIEF.md", dest / "BRIEF.md")
        slides = []
        for i, img in enumerate(a.images, 1):
            p = Path(img).expanduser()
            if not p.exists():
                sys.exit(f"image not found: {p}")
            name = f"{i:02d}"
            shutil.copy2(p, dest / "source" / f"{name}{p.suffix.lower()}")
            shutil.copy2(m / "src/_slide.html", dest / "src" / f"{name}.html")
            slides.append(name)
        title = a.title or "Live carousel"

    hf = {
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True},
    }
    (dest / "hyperframes.json").write_text(json.dumps(hf, indent=2) + "\n")
    pkg = {
        "name": dest.name.lower().replace(" ", "-"),
        "private": True,
        "type": "module",
        "scripts": {k: f"npx --yes hyperframes@{HF_VERSION} {k if k != 'dev' else 'preview'}" for k in ("dev", "check", "render")},
    }
    (dest / "package.json").write_text(json.dumps(pkg, indent=2) + "\n")
    (dest / "theme.json").write_text(json.dumps({"name": a.theme, **themes[a.theme]}, indent=2) + "\n")
    carousel = {"title": title, "handle": a.handle, "caption": a.caption, "mode": a.mode, "slides": slides, "audio": {"profile": "subtle", "custom_style_requested": False}}
    if a.mode == "motion":
        carousel["visual_triggers"] = {
            "01-hook": {"ball-contact": 0.5, "headline-flip": 2.0, "drop": 2.5},
            "02-easing": {"ball-land": 0.34, "easing-finish": 2.0},
            "03-weight": {"first-bounce": 1.0, "launch": 6.45},
            "04-cta": {"ball-land": 0.5, "snap": 1.0, "post-click": 3.0}
        }
    if a.mode == "photo":
        # the cover hits early (people decide in half a second); the rest land on the downbeat of bar 2
        carousel["cues"] = {
            s: ({"dur": 6, "hits": [0.5], "shine": [1.0, 3.5], "extrude": True} if i == 0 else {"dur": 6, "hits": [2.0], "shine": [0.6, 3.6], "extrude": True})
            for i, s in enumerate(slides)
        }
        carousel["music"] = None
    (dest / "carousel.json").write_text(json.dumps(carousel, indent=2) + "\n")
    print(f"created {a.mode} carousel at {dest}  (theme {a.theme}, slides: {', '.join(slides)})")


if __name__ == "__main__":
    main()
