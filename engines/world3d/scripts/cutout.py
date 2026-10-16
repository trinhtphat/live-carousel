"""Cut a product out of a photo for $0, on this computer (rembg, MIT; model downloads once, ~170 MB).

  <engine>/scripts/py <engine>/scripts/cutout.py <photo.jpg> assets/cut/<name>.png      → transparent PNG
  <engine>/scripts/py <engine>/scripts/cutout.py <folder of photos> assets/cut/          → every photo in it
  options: --model isnet-general-use (default, people + objects) | u2net_human_seg (people) | birefnet-general (best, slower)
           --max 2048 (longest side of the output) --pad 24 (transparent margin around the subject)

The output is cropped to the subject with a small margin (rim light and shadows need the room).
Already-transparent PNGs are just cropped and resized. Needs  setup.sh --cutout  once. Then tools/prep_assets.py.
"""
import argparse, sys
from pathlib import Path
from PIL import Image

EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tif', '.tiff'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--model', default='isnet-general-use'); ap.add_argument('--max', type=int, default=2048); ap.add_argument('--pad', type=int, default=24)
    a = ap.parse_args()
    src, dst = Path(a.src), Path(a.dst)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in EXTS) if src.is_dir() else [src]
    if not files: sys.exit(f'no images in {src}')
    session = None
    for f in files:
        out = (dst / (f.stem + '.png')) if (dst.is_dir() or src.is_dir() or not dst.suffix) else dst
        out.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(f); im.load()
        if im.mode == 'RGBA' and im.getextrema()[3][0] < 250:
            cut = im  # already transparent
        else:
            if session is None:
                from rembg import new_session
                print(f'loading {a.model} (first run downloads it)…', flush=True)
                session = new_session(a.model)
            from rembg import remove
            cut = remove(im.convert('RGB'), session=session)
        bbox = cut.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
        if not bbox: print(f'  {f.name}: nothing found, skipped'); continue
        cut = cut.crop(bbox)
        s = min(1.0, a.max / max(cut.size))
        if s < 1: cut = cut.resize((round(cut.width * s), round(cut.height * s)), Image.LANCZOS)
        canvas = Image.new('RGBA', (cut.width + a.pad * 2, cut.height + a.pad * 2), (0, 0, 0, 0)); canvas.paste(cut, (a.pad, a.pad))
        canvas.save(out)
        print(f'  {out}  {canvas.width}×{canvas.height}')


if __name__ == '__main__':
    main()
