# Crop each transparent cutout to its alpha bbox (+pad), downscale, encode WebP with alpha.
# The quiver image is split into its four boards (connected alpha columns, left to right).
import json
import numpy as np
from PIL import Image
RAW = 'assets/raw/'
CUT = 'assets/cut/'
OUT = 'src/assets/'

# 1. split the quiver into boards by empty alpha columns
q = Image.open(RAW + 'quiver.png').convert('RGBA')
a = np.array(q.getchannel('A')) > 10
cols = a.any(axis=0)
runs, x = [], 0
while x < len(cols):
    if cols[x]:
        x0 = x
        while x < len(cols) and cols[x]: x += 1
        if x - x0 > 40: runs.append((x0, x))
    x += 1
print('quiver runs', runs)
assert len(runs) == 4, runs
for name, (x0, x1) in zip(['longboard', 'egg', 'fish', 'short2'], runs):
    q.crop((x0, 0, x1, q.height)).save(CUT + name + '.png')
Image.open(RAW + 'shortboard.png').save(CUT + 'shortboard.png')
Image.open(RAW + 'hero.png').save(CUT + 'hero.png')

SPEC = {  # name: max height in px
    'shortboard': 1500, 'longboard': 1500, 'egg': 1300, 'fish': 1150, 'short2': 1200, 'hero': 2048,
}
manifest = {}
for name, maxh in SPEC.items():
    im = Image.open(CUT + name + '.png').convert('RGBA')
    al = im.getchannel('A')
    x0, y0, x1, y1 = al.point(lambda v: 255 if v > 6 else 0).getbbox()
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    im = im.crop((x0, y0, x1, y1))
    if im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    im.save(OUT + name + '.webp', 'WEBP', quality=90, method=6)
    manifest[name] = {'w': im.width, 'h': im.height, 'srcH': y1 - y0}
    print(name, im.size)
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
