# Crop each transparent cutout to its alpha bbox (+pad), downscale, encode WebP with alpha.
# The jewelry row is split into its four pieces (empty alpha columns, left to right).
import json
import numpy as np
from PIL import Image
RAW, CUT, OUT = 'assets/raw/', 'assets/cut/', 'src/assets/'

j = Image.open(RAW + 'jewelry.png').convert('RGBA')
cols = (np.array(j.getchannel('A')) > 10).any(axis=0)
runs, x = [], 0
while x < len(cols):
    if cols[x]:
        x0 = x
        while x < len(cols) and cols[x]: x += 1
        if x - x0 > 40: runs.append((x0, x))
    x += 1
print('jewelry runs', runs)
assert len(runs) == 4, runs
for name, (x0, x1) in zip(['ring_cross', 'pendant', 'ring_fleur', 'ring_skull'], runs):
    j.crop((x0, 0, x1, j.height)).save(CUT + name + '.png')
for n in ['jacket_mic', 'denim', 'tee_guitar', 'kick', 'cab', 'fixture', 'boot']:
    Image.open(RAW + n + '.png').save(CUT + n + '.png')

SPEC = {  # name: max height in px
    'jacket_mic': 2000, 'denim': 1800, 'tee_guitar': 1700, 'kick': 1200, 'cab': 1500, 'fixture': 420, 'boot': 900,
    'ring_cross': 300, 'pendant': 520, 'ring_fleur': 300, 'ring_skull': 300,
}
manifest = {}
for name, maxh in SPEC.items():
    im = Image.open(CUT + name + '.png').convert('RGBA')
    al = im.getchannel('A')
    x0, y0, x1, y1 = al.point(lambda v: 255 if v > 6 else 0).getbbox()
    pad = int(0.02 * max(x1 - x0, y1 - y0))
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    im = im.crop((x0, y0, x1, y1))
    sc = 1.0
    if im.height > maxh:
        sc = maxh / im.height
        im = im.resize((round(im.width * sc), maxh), Image.LANCZOS)
    im.save(OUT + name + '.webp', 'WEBP', quality=90, method=6)
    im.save(CUT + name + '_crop.png')
    manifest[name] = {'w': im.width, 'h': im.height}
    print(name, im.size)
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
