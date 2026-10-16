#!/usr/bin/env python3
"""Assemble every src/<slide>.html into its own HyperFrames project under slides/<slide>/.

One project per slide means each slide checks, previews and renders on its own.
Placeholders filled in each src file:
  /*@CHROME@*/      shared/fonts.css + the other shared/*.css
  //@ENGINE@        shared/engine.js       (window.LC: easing, springs, ball path, bursts, ruler)
  //@PHOTO@         shared/photo.js        (window.PH: photo-mode layers; photo projects only)
  <!--@GRAIN@-->    animated film grain
  /*@GEO@*/ {}      assets/<slide>/geo.json (photo-mode geometry from prep_photo.py)
  /*@CUES@*/ {}     carousel.json -> cues.<slide> (photo-mode timing, shared with audio/make_audio.py)
  @DUR@             cues.<slide>.dur
The palette in theme.json is applied last (see the skill's references/house-style.md).
Files starting with "_" in src/ are skipped. Usage: python3 build.py [slide ...]
"""
import json
import re
import shutil
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
SHARED = ROOT / "shared"

# Optional adapter for Premium Motion Video's window.seek(t) page contract.
# Injected only for that renderer; the source slides remain HyperFrames-compatible.
PREMIUM_BRIDGE = """
<script>
window.__timelines = window.__timelines || {};
window.B = 0.5;
// Current carousel templates use GSAP only as a paused clock. This local
// fallback keeps Premium renders working when the GSAP CDN is unavailable.
window.gsap = window.gsap || {
  timeline() {
    let target, update, duration = 0;
    return {
      fromTo(obj, from, to) {
        target = obj;
        duration = Number(to.duration) || 0;
        update = to.onUpdate;
        Object.assign(target, from);
        return this;
      },
      seek(t) {
        if (!target || !update) throw new Error("GSAP clock fallback has no tween");
        target.t = Math.max(0, Math.min(Number(t), duration));
        update();
        return this;
      }
    };
  }
};
window.ready = new Promise((resolve, reject) => {
  const started = Date.now();
  function waitForTimeline() {
    const root = document.getElementById("root");
    const timeline = window.__timelines["main"];
    if (root && timeline) {
      window.DUR = Number(root.dataset.duration);
      window.SIZE = [Number(root.dataset.width), Number(root.dataset.height)];
      resolve();
    } else if (Date.now() - started > 30000) {
      reject(new Error("Live Carousel timeline did not register for Premium Motion Video"));
    } else {
      setTimeout(waitForTimeline, 25);
    }
  }
  waitForTimeline();
});
window.seek = function (t) {
  const timeline = window.__timelines["main"];
  if (!timeline) throw new Error("Live Carousel timeline is not ready");
  timeline.seek(Math.max(0, Math.min(Number(t), window.DUR)), false);
};
</script>
"""

# The house palette the templates are written in. theme.json maps these to new colours.
BASE = {
    "hero": "#2041f2",
    "hero-hi": "#3a5cff",
    "hero-deep": "#1530c8",
    "paper": "#fff3e0",
    "accent": "#ff6a1f",
    "accent-hi": "#ff9a5c",
    "accent-deep": "#e4500d",
    "ink": "#0c1236",
}


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def apply_theme(html, colors):
    substitutions = {}
    for key, base in BASE.items():
        new = colors.get(key)
        if not new or new.lower() == base:
            continue
        token = f"__LC_COLOR_{key.upper().replace('-', '_')}__"
        html = re.sub(re.escape(base), token, html, flags=re.I)
        substitutions[token] = new
        r, g, b = rgb(base)
        nr, ng, nb = rgb(new)
        rgba_token = token + 'RGBA'
        html = re.sub(rf"rgba\(\s*{r}\s*,\s*{g}\s*,\s*{b}\s*,", rgba_token, html)
        substitutions[rgba_token] = f"rgba({nr}, {ng}, {nb},"
    for token in sorted(substitutions, key=len, reverse=True):
        html = html.replace(token, substitutions[token])
    return html


def apply_typography(html, typography, font_css_path):
    """Alias installed font faces without renaming their asset URLs or originals."""
    if not typography:
        return html
    typography = dict(typography)
    if typography.get('serif') == 'Instrument Serif' and re.search(r'[ĂăĐđĨĩŨũƠơƯư\u1ea0-\u1ef9]', html):
        typography['serif'] = 'Fraunces Vietnamese'
    css = font_css_path.read_text(encoding='utf-8')
    original_faces = []
    def hold(match):
        original_faces.append(match.group(0))
        return f'__LC_FACE_{len(original_faces)-1}__'
    html = re.sub(r'@font-face\s*\{[^}]+\}', hold, html)
    aliases = []
    for role, old, alias in [('display','Anybody','LCDisplay'),('serif','Fraunces','LCSerif'),('mono','JetBrains Mono','LCMono')]:
        family = typography.get(role)
        if not family:
            continue
        faces = [m.group(0) for m in re.finditer(r'@font-face\s*\{[^}]+\}',css)
                 if re.search(r'font-family:\s*[\"\']'+re.escape(family)+r'[\"\']',m.group(0))]
        if not faces:
            raise ValueError(f'Font not bundled: {family}')
        aliases.extend(re.sub(r'(font-family:\s*)[\"\']'+re.escape(family)+r'[\"\']',r'\1"'+alias+'"',face) for face in faces)
        html = html.replace(old,alias)
    for i, face in enumerate(original_faces):
        html = html.replace(f'__LC_FACE_{i}__',face)
    styles = '\n'.join(aliases)
    return html.replace('</head>',f'<style>{styles}</style></head>') if '</head>' in html else html+'\n'+styles


def silent_wav(path, seconds, sr=48000):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"\x00\x00\x00\x00" * int(seconds * sr))


def read(path):
    return path.read_text(encoding="utf-8") if path.exists() else ""


def main():
    css = read(SHARED / "fonts.css") + "\n" + "\n".join(p.read_text(encoding="utf-8") for p in sorted(SHARED.glob("*.css")) if p.name != "fonts.css")
    engine = read(SHARED / "engine.js")
    photo = read(SHARED / "photo.js")
    grain = read(SHARED / "grain-overlay.html")
    grain = re.sub(r"<!--.*?-->", "", grain, count=1, flags=re.S).strip().replace("opacity: 0.15;", "opacity: 0.11;")
    theme = json.loads(read(ROOT / "theme.json") or "{}")
    cues_all = json.loads(read(ROOT / "carousel.json") or "{}").get("cues", {})
    colors = theme.get("colors", {})

    premium_bridge = "--premium-bridge" in sys.argv[1:]
    only = set(arg for arg in sys.argv[1:] if arg != "--premium-bridge")
    built = 0
    for src in sorted(SRC.glob("*.html")):
        name = src.stem
        if name.startswith("_") or (only and name not in only):
            continue
        geo_path = ROOT / "assets" / name / "geo.json"
        html = (
            src.read_text(encoding="utf-8")
            .replace("/*@CHROME@*/", css)
            .replace("/*@CSS@*/", css)
            .replace("//@ENGINE@", engine)
            .replace("//@PHOTO@", photo)
            .replace("<!--@GRAIN@-->", grain)
            .replace("/*@GEO@*/ {}", read(geo_path).strip() or "{}")
        )
        cues = cues_all.get(name, {})
        html = html.replace("/*@CUES@*/ {}", json.dumps(cues)).replace("@DUR@", f"{cues.get('dur', 6):g}")
        html = apply_theme(html, colors)
        # Finished photos retain their original design; typography affects motion only.
        if json.loads(read(ROOT / "carousel.json") or "{}").get("mode") != "photo":
            html = apply_typography(html, theme.get('typography', {}), SHARED / 'fonts.css')
        if premium_bridge:
            html = html.replace("<head>", "<head>\n" + PREMIUM_BRIDGE, 1)
        dest = ROOT / "slides" / name
        assets = dest / "assets"
        (assets / "fonts").mkdir(parents=True, exist_ok=True)
        (dest / "index.html").write_text(html, encoding="utf-8")
        for f in (SHARED / "fonts").iterdir():
            if f.suffix.lower() in ('.woff2', '.woff', '.ttf', '.otf', '.txt'):
                shutil.copy2(f, assets / "fonts" / f.name)
        layer_dir = ROOT / "assets" / name
        if layer_dir.is_dir():
            for f in layer_dir.iterdir():
                if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4"):
                    shutil.copy2(f, assets / f.name)
        m = re.search(r'data-composition-id="main"[^>]*data-duration="([\d.]+)"', html)
        if not m:
            sys.exit(f"{src.name}: the #root needs data-composition-id=\"main\" and data-duration")
        dur = float(m.group(1))
        mix = ROOT / "audio/out" / f"{name}.wav"
        target = assets / "audio/mix.wav"
        target.parent.mkdir(parents=True, exist_ok=True)
        if mix.exists():
            shutil.copy2(mix, target)
        else:
            silent_wav(target, dur)
            print(f"  (no audio/out/{name}.wav yet: using silence)")
        for meta in ("hyperframes.json", "package.json"):
            shutil.copy2(ROOT / meta, dest / meta)
        (dest / "meta.json").write_text(json.dumps({"id": f"live-carousel-{name}", "name": f"Live Carousel {name}"}, indent=2), encoding="utf-8")
        print(f"built slides/{name} ({dur:g}s, theme {theme.get('name', 'cobalt')})")
        built += 1
    if not built:
        sys.exit("nothing built: no matching src/*.html")


if __name__ == "__main__":
    main()
