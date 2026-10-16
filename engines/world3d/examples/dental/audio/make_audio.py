"""PEARL LAB / SMILE: one loop-exact 8 s mix per slide, written to audio/out/<slide>.wav.

Run from the project folder:  <engine>/scripts/py audio/make_audio.py   (numpy only; writes audio/out + src/assets/audio)
v2 sound (2026-10-13): soft_audio.py instead of the shared lc_audio groove. All six slides play the same
bright D-major progression (Dmaj9 | Bm9 | Gmaj9 | A6/9, one chord per 2 s bar) so swipes stay in time and in
key; each slide gets its own arrangement. Every visual event is a musical note, a soft chime, a swell or a
round boom: no ticks, beeps, glitches or cymbals. Event times are read off the slides' update(t).
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools' / 'audio'))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from audiolib import Bus, stereo, write_wav, to_webm, report
from soft_audio import (bed, master, pad, keys, pluck, chime, sparkle, boom, swell, bloop, verb,
                        CHORDS, PENTA)

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
SEC = 8.0


def addbed(bus, x):
    bus.x[:len(x)] += x


def chord_keys(bar, up=12, level=1.0, dec=1.6):
    return stereo(keys([m + up for m in CHORDS[bar][1]], level, dec, 1.0))


# ================================================================ 01 SMILE
def smile():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad"}, pad_level=0.55, pump=0))
    # the laser cuts in at 1.0: the groove starts on the cut, fades as the laser dies at 6.6
    addbed(bus, bed({"bass", "kick"}, bass_level=0.4, kick_level=0.5, from_t=1.0, to_t=6.6, pump=0.15))
    addbed(bus, bed({"arp"}, arp="dream", arp_level=0.16, from_t=3.0, to_t=6.6, pump=0))
    bus.add(swell(0.8, 0.5, 300, 2400, "in"), 0.2)
    bus.add(stereo(boom(0.8)), 1.0)
    bus.add(chord_keys(0, 12, 0.5), 1.0)
    bus.add(swell(1.2, 0.35, 300, 2200, "out"), 1.0)
    # S-M-I-L-E land one at a time, up the pentatonic
    for j, m in enumerate([74, 76, 78, 81, 83]):
        bus.add(verb(stereo(pluck(m, 0.55, 0.5), -0.5 + j * 0.25), 0.25), 1.16 + j * 0.24 + 0.78)
    bus.add(verb(stereo(chime(86, 0.3)), 0.35), 2.95)
    # 4.0 the word lifts; 5.6 settles
    bus.add(swell(0.6, 0.35, 300, 2000, "in"), 3.4)
    bus.add(verb(stereo(chime(81, 0.25)), 0.35), 4.0)
    bus.add(swell(0.8, 0.25, 250, 1500, "out"), 5.6)
    # 6.6 the laser dies: a soft fall
    bus.add(swell(0.9, 0.3, 200, 1400, "out"), 6.6)
    return master(bus)


# ================================================================ 02 ALIGNERS
def aligners():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad", "bass", "kick", "arp"}, arp="sparse", arp_level=0.2, pad_level=0.5,
                              bass_level=0.36, kick_level=0.45, pump=0.15))
    # the laser hits the tray: a glass shimmer
    bus.add(sparkle(81, 4, 0.05, 0.45), 1.05)
    # pearls: low glass notes drifting around
    for k, (t, m) in enumerate(((0.75, 78), (2.75, 74), (4.75, 83), (6.75, 81))):
        bus.add(verb(stereo(chime(m - 12, 0.22, 1.0), 0.5 - k * 0.3), 0.4), t)
    # 4.0 scan pulse through the plastic
    bus.add(swell(0.6, 0.4, 300, 2400, "in"), 3.4)
    bus.add(stereo(boom(0.65)), 4.0)
    bus.add(chord_keys(2, 12, 0.45), 4.0)
    bus.add(swell(1.0, 0.3, 300, 2200, "out"), 4.0)
    # callouts retract at 5.8 and draw back in at 6.8 + k*0.2
    bus.add(swell(0.6, 0.18, 300, 1500, "out"), 5.8)
    for k, m in enumerate([76, 78, 81, 83]):
        bus.add(verb(stereo(pluck(m, 0.4, 0.4), 0.5), 0.3), 6.8 + k * 0.2)
    return master(bus)


# ================================================================ 03 IMPLANT
def implant():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad", "bass", "kick", "brush", "keys"}, pad_level=0.42, bass_level=0.42,
                              kick_level=0.5, brush_level=0.16, keys_level=0.16, pump=0.15))
    # 3.9 explodes into crown / abutment / post
    bus.add(stereo(boom(0.6)), 3.9)
    bus.add(swell(1.0, 0.35, 300, 2400, "out"), 3.9)
    for k, m in enumerate([74, 78, 81]):          # labels pop in
        bus.add(verb(stereo(pluck(m, 0.45, 0.45), 0.5 if k % 2 == 0 else -0.5), 0.3), 4.32 + k * 0.08)
    # 5.6 screwed home: a soft rising run, then the snap on the downbeat at 6.0
    bus.add(swell(0.4, 0.35, 300, 2400, "in"), 5.6)
    for k, m in enumerate([66, 69, 71, 74, 76, 78, 81]):
        bus.add(stereo(pluck(m, 0.22 + 0.03 * k, 0.25), -0.3 + 0.1 * k), 5.6 + k * 0.055)
    bus.add(stereo(boom(0.85)), 6.0)
    bus.add(chord_keys(3, 12, 0.5), 6.0)
    return master(bus)


# ================================================================ 04 WHITENING
def _pointer_steps():
    """Times the shade pointer moves (matches s4_white.js: idx = round(2 + 5 * prog))."""
    def ease(x):
        return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
    ts, last = [], 2
    for t in np.arange(1.0, 2.0, 1 / 600):
        idx = round(2 + 5 * ease((t - 1.0) / 1.0))
        if idx != last:
            ts.append(float(t)); last = idx
    return ts


def whitening():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad", "bass", "kick", "arp"}, arp="lift", arp_level=0.14, pad_level=0.5,
                              bass_level=0.34, kick_level=0.42, pump=0.12))
    # 1.0-2.0 the scan bar: a swell, one note up the scale per shade
    bus.add(swell(1.0, 0.3, 300, 2600, "in"), 1.0)
    for k, t in enumerate(_pointer_steps()):
        bus.add(verb(stereo(pluck([76, 78, 81, 83, 86][min(k, 4)], 0.45, 0.4), -0.4 + 0.2 * k), 0.25), t)
    # 2.0 bright: a shimmer + chord, glints as soft chimes
    bus.add(sparkle(83, 5, 0.045, 0.5), 2.0)
    bus.add(chord_keys(1, 12, 0.4), 2.0)
    bus.add(stereo(boom(0.35)), 2.0)
    for t, m, lv in ((2.3, 88, 0.2), (2.55, 86, 0.18), (6.9, 86, 0.2), (7.15, 88, 0.16)):
        bus.add(verb(stereo(chime(m, lv, 1.0)), 0.4), t)
    # 3.0 the shade tabs burst apart into zero-g
    bus.add(stereo(boom(0.5)), 3.0)
    bus.add(swell(1.2, 0.35, 300, 2400, "out"), 3.0)
    # magnetic locks, two tabs per beat
    for k, (t, pan, m) in enumerate(((5.0, -0.5, 74), (5.5, -0.2, 78), (6.0, 0.3, 81), (6.5, 0.5, 86))):
        bus.add(swell(0.4, 0.2, 300, 1800, "in"), t - 0.4)
        bus.add(stereo(bloop(0.5), pan), t)
        bus.add(verb(stereo(pluck(m, 0.45, 0.45), pan), 0.25), t)
    # 7.45 the scan rewinds: a soft run back down
    for k, m in enumerate([86, 83, 81, 78, 76]):
        bus.add(stereo(pluck(m, 0.28, 0.3), 0.4 - 0.2 * k), 7.45 + k * 0.08)
    return master(bus)


# ================================================================ 05 SHINE
def shine():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad", "bass", "kick", "brush", "arp"}, arp="flow", arp_level=0.15, pad_level=0.5,
                              bass_level=0.38, kick_level=0.48, brush_level=0.12, pump=0.15))
    for t, m in ((2.0, 86), (6.0, 83), (7.0, 88)):
        bus.add(verb(stereo(chime(m, 0.18, 1.0)), 0.4), t)
    # riser into the glint
    bus.add(swell(0.9, 0.45, 300, 2800, "in"), 3.1)
    # 4.0 THE GLINT: a lush chord, a shimmer run, a round boom
    bus.add(stereo(boom(0.8, big=True)), 4.0)
    bus.add(chord_keys(2, 12, 0.6, 2.2), 4.0)
    bus.add(pad([m + 12 for m in CHORDS[2][1]], 1.6, 1.0, 2600), 4.0, 0.25)
    bus.add(sparkle(81, 6, 0.05, 0.6), 4.02)
    bus.add(swell(1.4, 0.3, 400, 2800, "out"), 4.0)
    bus.add(swell(0.4, 0.2, 300, 1600, "in"), 5.6)
    return master(bus)


# ================================================================ 06 BOOK
def book():
    bus = Bus(SEC + 4)
    addbed(bus, bed({"pad", "bass", "kick", "brush", "keys", "arp"}, arp="flow", arp_level=0.13,
                              pad_level=0.48, bass_level=0.4, kick_level=0.5, brush_level=0.14, keys_level=0.12, pump=0.15))
    # a piece reaches the ring every 2 s
    for k in range(4):
        bus.add(swell(0.9, 0.18, 250, 1600, "in"), k * 2.0 + 0.7)
    bus.add(swell(0.9, 0.45, 300, 2800, "in"), 3.1)
    # 4.0 the ring pulses: FREE slams
    bus.add(stereo(boom(0.9, big=True)), 4.0)
    bus.add(chord_keys(2, 12, 0.6, 2.0), 4.0)
    bus.add(verb(stereo(chime(86, 0.35, 1.4)), 0.4), 4.0)
    bus.add(sparkle(78, 5, 0.05, 0.4), 4.05)
    # 6.5 booking ping: a soft two-note chime
    bus.add(verb(stereo(chime(86, 0.3, 1.0), -0.3), 0.35), 6.5)
    bus.add(verb(stereo(chime(81, 0.3, 1.2), 0.3), 0.35), 6.68)
    return master(bus)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, fn in [("01-smile", smile), ("02-aligners", aligners), ("03-implant", implant),
                     ("04-whitening", whitening), ("05-shine", shine), ("06-book", book)]:
        x = fn()
        write_wav(OUT / f"{name}.wav", x)
        to_webm(OUT / f"{name}.wav", HERE.parent / "src" / "assets" / "audio" / f"{name}.webm", 128)
        report(name, x)
