# REFERENCE ONLY: this is how the shipped sound (src/assets/audio/*.webm) was made. It needs the ACE-Step take seed11 + its timing analysis (not shipped)
# and the old live-carousel audio helpers, so it does not run as-is. For a new carousel use tools/audio/song_loops.py
# (one track → per-slide loops) or tools/audio/soft_bed.py (no track needed); see references/sound.md.
"""OFFSHORE / SWELL — v2 sound: one original surf-pop instrumental (ACE-Step 1.5, made locally, $0),
cut into six bar-aligned 8 s loops, one per slide. Slide N plays bars 4N-3..4N of the song, so swiping
through the carousel plays the track straight through instead of the same beat six times.

On top of the music: only soft, low-passed water accents on the big moments (no ticks, clicks,
glitches, cymbal crashes or bright noise), a gentle ocean bed, and a quiet, un-squashed master.

Run from the project folder (after run_music.sh + timing.py picked the take):
    ~/.claude/skills/live-carousel/scripts/py audio/make_audio.py seed23
"""
import json
import sys
from pathlib import Path

import numpy as np

from lc_audio import SR, Bus, read_audio, write_wav, lp, hp, bp, stereo, report

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
SEC = 8.0
BAR = 2.0                                   # 120 BPM, 4/4
NS = int(SEC * SR)
R = np.random.default_rng(5)
TAKE = sys.argv[1] if len(sys.argv) > 1 else json.load(open(HERE / "take.json"))["take"]


# ---------------------------------------------------------------- the music
def load_music():
    """The take resampled so its bars are exactly 2.000 s; returns (audio, first downbeat, phrase phase, end)."""
    tm = json.load(open(HERE / "timing.json"))
    x = read_audio(HERE / "takes" / f"{TAKE}.wav")
    d = np.array(tm["downbeats"], dtype=float)
    k = np.arange(len(d))
    pbar, d0 = np.polyfit(k, d, 1)          # measured bar period + phase
    rate = pbar / BAR                       # >1 = the take is slow: play it slightly faster
    n_out = int(len(x) / rate)
    src = np.arange(n_out) * rate
    y = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
    print(f"take {TAKE}: bar {pbar:.4f}s ({240 / pbar:.2f} BPM) -> resampled x{rate:.4f} to 120.00 BPM")
    anchor = tm.get("drop") or d0           # phrase anchor: the drop if timing found one
    phase = int(round((anchor - d0) / pbar)) % 4
    return y, d0 / rate, phase, float(tm.get("duration", len(x) / SR)) / rate


def pick_window(y, d0, phase, end, bars=24):
    """The 24-bar run whose quietest bar is loudest (skips intros/outros), inside the musical end.
    Any bar can start it (the chords cycle every 4 bars, so every 4-bar chunk loops); phrase-aligned
    starts get a small bonus."""
    def bar_rms(t0):
        s = y[int(t0 * SR): int((t0 + BAR) * SR)]
        return 20 * np.log10(float(np.sqrt(np.mean(s ** 2))) + 1e-9)
    cands = []
    b = 0
    while d0 + (b + bars) * BAR <= end + 0.05:
        t0 = d0 + b * BAR
        score = min(bar_rms(t0 + j * BAR) for j in range(bars)) + (0.5 if b % 4 == phase else 0)
        cands.append((score, t0))
        b += 1
    if not cands:                           # a short take: loop what there is
        n = max(1, int((end - d0) // SEC))
        return [d0 + (i % n) * SEC for i in range(6)]
    best = max(cands)[1]
    print(f"music window: {best:.2f}s .. {best + bars * BAR:.2f}s (musical end {end:.2f}s)")
    return [best + i * SEC for i in range(6)]


def loop_chunk(y, t0, xf=0.06):
    """8 s from t0; the bar that follows is cross-faded into the start, so the loop point is seamless."""
    i0 = int(t0 * SR)
    seg = y[i0: i0 + NS + int(xf * SR)].copy()
    if len(seg) < NS + int(xf * SR):
        seg = np.concatenate([seg, np.zeros((NS + int(xf * SR) - len(seg), 2))])
    out = seg[:NS].copy()
    n = int(xf * SR)
    a = np.sin(np.linspace(0, np.pi / 2, n)) ** 2
    out[:n] = out[:n] * a[:, None] + seg[NS: NS + n] * (1 - a)[:, None]
    return out


def env(points, n=NS):
    """Piecewise-linear automation [(t, v), ...] over one loop."""
    t = np.arange(n) / SR
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def filtered(x, open_env, lo=420):
    """Blend dry ↔ low-passed with an automation curve (1 = fully open). Three taps for a smooth sweep."""
    mid = lp(x, 1600, 2)
    low = lp(x, lo, 2)
    e = open_env[:, None]
    w_low = np.clip(1 - 2 * e, 0, 1)
    w_mid = 1 - np.abs(2 * e - 1)
    w_dry = np.clip(2 * e - 1, 0, 1)
    return low * w_low + mid * w_mid + x * w_dry


# ---------------------------------------------------------------- soft accents (nothing above ~4 kHz)
def T(sec):
    return np.arange(int(sec * SR)) / SR


def swoosh(dur=0.7, level=0.3, shape="swell", lo=140, hi=2400):
    """Air moving: band-passed noise with a smooth envelope, low-passed so it never hisses."""
    t = T(dur)
    s = t / dur
    n = bp(R.standard_normal(len(t)), lo, hi)
    e = np.sin(np.pi * s) ** 2 if shape == "swell" else (s ** 2.2 if shape == "in" else (1 - s) ** 2.2)
    x = lp(n * e, 3200)
    pan = np.linspace(-0.4, 0.4, len(t)) if shape != "out" else np.linspace(0.4, -0.4, len(t))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r], axis=1) * 1.414 * level / (np.max(np.abs(x)) or 1)


def splash(level=0.3, big=False):
    """Water: a soft wash with a rounded attack and a couple of low bubbles, low-passed at 3.5 kHz."""
    dur = 1.0 if big else 0.55
    t = T(dur)
    att = np.minimum(1, t / 0.008)
    n = R.standard_normal(len(t))
    x = bp(n, 220, 2800) * np.exp(-t * (6 if big else 10)) * att
    x += lp(n, 700) * np.exp(-t * (4 if big else 7)) * att * 0.7
    for k in range(3 if big else 2):
        f0 = 240 + R.random() * 220
        tt = T(0.09)
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.8 * tt / 0.09)) / SR) * np.exp(-tt * 30) * 0.5
        i = int((0.06 + R.random() * (0.4 if big else 0.2)) * SR)
        x[i: i + len(b)] += b[: max(0, min(len(b), len(x) - i))] * np.max(np.abs(x))
    x = lp(x, 3500)
    return stereo(x / (np.max(np.abs(x)) or 1) * level)


def thump(level=0.35):
    """A felt low boom: pitch-dropping sine, rounded attack, no click."""
    t = T(0.6)
    f = 42 + 30 * np.exp(-t * 18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * np.minimum(1, t / 0.006)
    return stereo(x * level)


def knock(level=0.3, pan=0.0):
    """A board seating in a wooden rack: two low partials, very short, no bright transient."""
    t = T(0.18)
    x = (np.sin(2 * np.pi * 165 * t) + 0.45 * np.sin(2 * np.pi * 342 * t)) * np.exp(-t * 34) * np.minimum(1, t / 0.002)
    x += lp(R.standard_normal(len(t)), 900) * np.exp(-t * 60) * 0.25
    return stereo(lp(x, 1500) * level, pan)


def bubbles(level=0.2, n=3):
    t = T(0.35)
    x = np.zeros(len(t))
    for k in range(n):
        f0 = 180 + R.random() * 160
        tt = T(0.12)
        b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * tt / 0.12)) / SR) * np.exp(-tt * 22)
        i = int(R.random() * 0.2 * SR)
        x[i: i + len(b)] += b[: len(x) - i]
    return stereo(lp(x, 1200) * level / (np.max(np.abs(x)) or 1))


def ocean(level=0.12, seed=3):
    """Two low waves per loop (every 4 s), periodic: the tail of the second wraps into the first."""
    rg = np.random.default_rng(seed)
    out = np.zeros((NS, 2))
    for t0 in (0.0, 4.0):
        n = int(4.6 * SR)
        s = np.arange(n) / n
        body = np.stack([lp(rg.standard_normal(n), 600), lp(rg.standard_normal(n), 600)], axis=1)
        crest = np.stack([bp(rg.standard_normal(n), 500, 1800), bp(rg.standard_normal(n), 500, 1800)], axis=1)
        w = body * (np.sin(np.pi * s) ** 1.6)[:, None] + crest * (np.exp(-((s - 0.45) / 0.18) ** 2))[:, None] * 0.35
        i = int(t0 * SR)
        idx = (np.arange(n) + i) % NS
        np.add.at(out, idx, w)
    return out * level / (np.max(np.abs(out)) or 1)


# ---------------------------------------------------------------- slides
def place(bus, sig, t):
    """Add with wrap-round, so anything ringing past 8 s lands at the start of the loop."""
    i = int(round(t * SR)) % NS
    n = len(sig)
    idx = (np.arange(n) + i) % NS
    np.add.at(bus, idx, sig)


def slide(music, n):
    fx = np.zeros((NS, 2))
    fx += ocean(0.10 if n not in (1, 5) else 0.14, seed=n)
    m = music
    if n == 1:
        # the sun cracks the horizon at 1.0: the song opens up out of the dark; it closes again as the sun drops
        e = env([(0, 0), (0.95, 0), (1.12, 1), (6.55, 1), (7.05, 0), (8, 0)])
        m = filtered(m, e) * (0.55 + 0.45 * e)[:, None]
        place(fx, swoosh(0.6, 0.22, "in", 200, 2600), 0.42)
        place(fx, thump(0.4), 1.0)
        for j in range(5):                              # the letters break the surface
            place(fx, splash(0.16, False) * [1 - 0.3 * (j - 2) / 2, 1 + 0.3 * (j - 2) / 2], 1.12 + j * 0.2 + 0.12)
        for j in range(5):                              # and sink back
            place(fx, bubbles(0.12), 6.2 + j * 0.09 + 0.4)
        place(fx, swoosh(0.7, 0.16, "out", 120, 1600), 6.55)
    elif n == 2:
        place(fx, swoosh(0.7, 0.2, "in", 160, 2200), 3.3)
        place(fx, thump(0.32), 4.0)
        place(fx, splash(0.18, True), 4.0)
    elif n == 3:
        place(fx, swoosh(0.5, 0.22, "out", 200, 2600), 3.9)
        place(fx, thump(0.28), 3.9)
        place(fx, swoosh(0.4, 0.2, "in", 200, 2600), 5.6)
        place(fx, thump(0.38), 6.0)
        place(fx, knock(0.28), 6.0)
        place(fx, splash(0.2, True), 6.0)
    elif n == 4:
        place(fx, swoosh(0.6, 0.24, "out", 160, 2400), 3.0)
        place(fx, thump(0.3), 3.0)
        for t, pan in ((5.0, -0.2), (5.5, 0.5), (6.0, -0.6), (6.5, 0.6)):
            place(fx, swoosh(0.35, 0.12, "in", 300, 2600), t - 0.35)
            place(fx, knock(0.32, pan), t)
    elif n == 5:
        # in the air (4.0-6.0) the song goes muffled, like hanging above the wave; it opens on the landing
        e = env([(0, 1), (3.98, 1), (4.06, 0.38), (5.85, 0.38), (6.0, 1), (8, 1)])
        m = filtered(m, e, lo=700)
        place(fx, swoosh(0.7, 0.22, "in", 200, 2600), 3.3)
        place(fx, thump(0.36), 4.0)
        place(fx, splash(0.24, True), 4.0)
        place(fx, splash(0.24, True), 6.0)
        place(fx, thump(0.32), 6.0)
    elif n == 6:
        place(fx, swoosh(1.0, 0.2, "in", 160, 2200), 3.0)
        place(fx, thump(0.42), 4.0)
        place(fx, swoosh(1.6, 0.12, "out", 140, 1600), 4.0)
    return m + fx


def master(x, rms_db=-17.0):
    """Gentle: tame the top end a touch, set the level, soft-limit only the peaks. Nothing squashed."""
    x = x - np.mean(x, axis=0)
    x = lp(x, 13000, 1) * 0.6 + x * 0.4               # a soft high shelf (about -2 dB up top)
    x *= 10 ** (rms_db / 20) / (np.sqrt(np.mean(x ** 2)) or 1e-9)
    thr = 0.7
    over = np.abs(x) > thr
    x[over] = np.sign(x[over]) * (thr + (1 - thr) * np.tanh((np.abs(x[over]) - thr) / (1 - thr)))
    return (x * 0.94).astype(np.float32)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    y, d0, phase, end = load_music()
    starts = pick_window(y, d0, phase, end)
    names = ["01-swell", "02-board", "03-build", "04-quiver", "05-send", "06-drop"]
    for n, (name, t0) in enumerate(zip(names, starts), start=1):
        x = master(slide(loop_chunk(y, t0), n))
        write_wav(OUT / f"{name}.wav", x)
        report(f"{name} (song {t0:.1f}-{t0 + SEC:.1f}s)", x)
    # the whole run, for listening straight through
    json.dump({"take": TAKE, "starts": starts}, open(HERE / "take.json", "w"))
