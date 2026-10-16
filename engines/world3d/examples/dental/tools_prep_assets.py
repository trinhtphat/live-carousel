# Crop each transparent cutout to its alpha bbox (+pad), downscale, encode WebP with alpha.
# The aligner was shot on pure black (clear plastic), so its alpha is keyed from luminance.
import json
import numpy as np
from PIL import Image

SRC = 'assets/raw/'
OUT = 'src/assets/'
SPEC = {  # name: max height in px
    'implant': 900, 'molar': 700, 'aligner': 1000, 'arch': 700, 'hero': 2048,
}


def luma_key(im):
    rgb = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    mx = rgb.max(axis=2)
    a = np.clip((mx - 0.035) / 0.7, 0, 1) ** 0.85
    col = np.clip(rgb / np.maximum(a[..., None], 1e-3), 0, 1)
    out = np.dstack([col, a]) * 255
    return Image.fromarray(out.round().astype(np.uint8), 'RGBA')


manifest = {}
for name, maxh in SPEC.items():
    im = Image.open(SRC + name + '.png')
    im = luma_key(im) if name == 'aligner' else im.convert('RGBA')
    a = im.getchannel('A')
    x0, y0, x1, y1 = a.point(lambda v: 255 if v > 6 else 0).getbbox()
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    im = im.crop((x0, y0, x1, y1))
    if im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    im.save(OUT + name + '.webp', 'WEBP', quality=90, method=6)
    manifest[name] = {'w': im.width, 'h': im.height}
    print(name, im.size)
json.dump(manifest, open(OUT + 'manifest.json', 'w'), indent=1)
