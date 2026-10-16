"""Product cut-outs → web-ready textures + src/assets/manifest.json (sizes the engine reads).

  <engine>/scripts/py tools/prep_assets.py jacket:2000 boot:900 denim:1800          (from the project folder)
  options: --cut assets/cut   --out src/assets   --luma aligner (clear/glass product shot on BLACK: alpha from brightness)
           --split jewelry=ring_cross,pendant,ring_fleur,ring_skull   (one image with several products in a row)

Each name is a transparent PNG in --cut (from cutout.py, or a generator's transparent output). It is cropped to its
alpha box (+2 % pad), scaled down to the given max height, saved as <out>/<name>.webp, and its size goes into the manifest.
"""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('items', nargs='*', help='name:maxheight')
ap.add_argument('--cut', default='assets/cut'); ap.add_argument('--out', default='src/assets')
ap.add_argument('--luma', action='append', default=[]); ap.add_argument('--split', action='append', default=[])
a = ap.parse_args()
CUT, OUT = Path(a.cut), Path(a.out); OUT.mkdir(parents=True, exist_ok=True)

for s in a.split:  # one image, several products left to right, separated by empty columns
    src, names = s.split('='); names = names.split(',')
    im = Image.open(CUT / f'{src}.png').convert('RGBA')
    cols = (np.array(im.getchannel('A')) > 10).any(axis=0)
    runs, x = [], 0
    while x < len(cols):
        if cols[x]:
            x0 = x
            while x < len(cols) and cols[x]: x += 1
            if x - x0 > 40: runs.append((x0, x))
        x += 1
    if len(runs) != len(names): raise SystemExit(f'{src}: found {len(runs)} pieces, expected {len(names)}: {runs}')
    for n, (x0, x1) in zip(names, runs): im.crop((x0, 0, x1, im.height)).save(CUT / f'{n}.png')
    print(src, '→', ', '.join(names))

for n in a.luma:  # clear plastic / glass on black: brightness becomes alpha, colour is un-premultiplied
    im = np.asarray(Image.open(CUT / f'{n}.png').convert('RGB')).astype(np.float32) / 255
    al = np.clip((im.max(axis=2) - 0.06) / 0.5, 0, 1)
    rgb = np.clip(im / np.maximum(al[..., None], 1e-3), 0, 1)
    Image.fromarray((np.dstack([rgb, al]) * 255).astype(np.uint8), 'RGBA').save(CUT / f'{n}.png')
    print(n, 'luma-keyed')

mf = OUT / 'manifest.json'
manifest = json.loads(mf.read_text()) if mf.exists() else {}
for item in a.items:
    name, maxh = item.split(':') if ':' in item else (item, 1600)
    im = Image.open(CUT / f'{name}.png').convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    if not box: raise SystemExit(f'{name}: the image is fully transparent')
    x0, y0, x1, y1 = box; pad = int(0.02 * max(x1 - x0, y1 - y0))
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    if im.height > int(maxh):
        im = im.resize((round(im.width * int(maxh) / im.height), int(maxh)), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=90, method=6)
    manifest[name] = {'w': im.width, 'h': im.height}
    print(f'{name}: {im.width}×{im.height} → {OUT / (name + ".webp")}')
mf.write_text(json.dumps(manifest, indent=1))
print('manifest:', mf)
