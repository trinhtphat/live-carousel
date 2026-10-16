"""A whole carousel's sound from the soft kit, no music file needed: one progression in one key, arranged to build
slide by slide (hook → products → finale), a hit on each slide's big moment, extra notes from audio/events.json.

  <engine>/scripts/py tools/audio/soft_bed.py [--prog bright|warm|night|lift] [--root D] [--hit 4.0] [--events audio/events.json]
  → audio/out/<slide>.wav (loop-exact 8 s, -17.5 dB RMS) + src/assets/audio/<slide>.webm, then a harshness report.

events.json (optional): {"01-hook": [{"t": 1.0, "kind": "boom"}, {"t": 2.2, "kind": "sparkle"}], "03-…": [...]}
kinds: boom, bigboom, swell (rises INTO t), bloom (swell out of t), chime, sparkle, pluck, bloop, keys.
For a bespoke mix, copy this file to audio/make_audio.py and write each slide by hand (examples/dental does).
"""
import argparse, json, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import Bus, stereo, write_wav, to_webm, report  # noqa: E402
import soft  # noqa: E402
from soft import bed, master, keys, pluck, chime, sparkle, boom, swell, bloop, verb  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--prog', default='bright'); ap.add_argument('--root', default=None)
ap.add_argument('--hit', type=float, default=4.0, help='the big moment on every slide (s)')
ap.add_argument('--events', default='audio/events.json')
a = ap.parse_args()
cfg = json.load(open('carousel.json'))
NAMES, SEC = cfg['slides'], float(cfg.get('loop', 8))
soft.use(a.prog, a.root or {'bright': 'D', 'warm': 'F', 'night': 'A', 'lift': 'E'}[a.prog])
EV = json.load(open(a.events)) if Path(a.events).exists() else {}
N = len(NAMES)
ARP = ['dream', 'sparse', 'flow', 'lift', 'flow', 'lift']


def event(bus, kind, t, level=1.0):
    k = {'boom': lambda: stereo(boom(0.7 * level)), 'bigboom': lambda: stereo(boom(0.85 * level, big=True)),
         'swell': lambda: swell(0.8, 0.45 * level, 300, 2400, 'in'), 'bloom': lambda: swell(1.0, 0.3 * level, 300, 2000, 'out'),
         'chime': lambda: verb(stereo(chime(soft.PENTA[6], 0.3 * level)), 0.35), 'sparkle': lambda: sparkle(soft.PENTA[8], 4, 0.05, 0.45 * level),
         'pluck': lambda: verb(stereo(pluck(soft.PENTA[5], 0.5 * level, 0.5)), 0.25), 'bloop': lambda: stereo(bloop(0.5 * level)),
         'keys': lambda: stereo(keys([m + 12 for m in soft.CHORDS[int(t // 2) % 4][1]], 0.5 * level, 1.6, 1.0))}[kind]()
    bus.add(k, t - (0.8 if kind == 'swell' else 0))


for i, name in enumerate(NAMES):
    bus = Bus(SEC + 4)
    first, last = i == 0, i == N - 1
    # the arrangement grows through the carousel: pads → + bass/kick → + arp → + keys/brush
    parts = {'pad'} if first else {'pad', 'bass', 'kick', 'arp'} | ({'keys'} if i >= 2 else set()) | ({'brush'} if last or i >= 4 else set())
    x = bed(parts, arp=ARP[i % len(ARP)], arp_level=0.18, pad_level=0.5, bass_level=0.38, kick_level=0.48,
            brush_level=0.14, keys_level=0.14, pump=0 if first else 0.15)
    bus.x[:len(x)] += x
    if first:   # the hook: the groove starts on the hit
        x = bed({'bass', 'kick'}, bass_level=0.4, kick_level=0.5, from_t=a.hit, to_t=SEC, pump=0.15)
        bus.x[:len(x)] += x
    event(bus, 'swell', a.hit, 0.8)
    event(bus, 'bigboom' if last else 'boom', a.hit)
    event(bus, 'keys', a.hit, 0.9)
    event(bus, 'bloom', a.hit, 0.8)
    if last: event(bus, 'sparkle', a.hit + 0.1)
    for e in EV.get(name, []):
        event(bus, e['kind'], float(e['t']), float(e.get('level', 1.0)))
    out = master(bus, SEC)
    wav = Path('audio/out') / f'{name}.wav'
    write_wav(wav, out); to_webm(wav, Path('src/assets/audio') / f'{name}.webm')
    report(name, out)
print('next: node build.mjs (embeds the sound), node tools/mux.mjs after rendering')
