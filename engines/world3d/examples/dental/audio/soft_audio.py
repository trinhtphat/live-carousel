"""soft_audio: a gentle, musical sound kit for the PEARL LAB carousel (the same kit as tools/audio/soft.py, fixed in D major).

No ticks, beeps, glitches, whines, hats or cymbals. Every sound has a soft attack (>= 3 ms) and is rolled off
above ~8 kHz, so nothing is sharp on the ears. The bed is a bright D-major progression at 120 BPM
(4 bars = the 8 s loop, one chord per bar) so swipes stay in time and in key across all six slides:

    Dmaj9 | Bm9 | Gmaj9 | A6/9
"""
import numpy as np

from audiolib import SR, Bus, lp, hp, bp, stereo, convolve

BEAT = 0.5
BAR = 2.0
rng = np.random.default_rng(11)


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def T(sec):
    return np.arange(int(sec * SR)) / SR


def att(t, a):
    """Soft attack ramp (raised cosine), a in seconds."""
    return np.where(t < a, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1)), 1.0)


# ---------------------------------------------------------------- harmony
CHORDS = [  # (bass, pad voicing, arp tones) in MIDI
    (38, [54, 57, 61, 64], [74, 78, 81, 85, 88]),   # Dmaj9
    (35, [57, 61, 62, 66], [71, 74, 78, 81, 85]),   # Bm9
    (31, [54, 57, 59, 62], [67, 71, 74, 78, 81]),   # Gmaj9
    (33, [59, 61, 64, 66], [69, 73, 76, 78, 83]),   # A6/9
]
PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88]  # D major pentatonic


def bar_of(t):
    return int(t // BAR) % 4


# ---------------------------------------------------------------- warm reverb
def _ir(sec=2.4, damp=2.3, bright=3200):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], axis=1) * np.exp(-damp * t)[:, None]
    ir = lp(ir, bright)
    pre = int(0.02 * SR)
    ir[:pre] = 0
    return ir / np.sqrt(np.sum(ir ** 2))


IR = _ir()


def verb(x, wet=0.3):
    if x.ndim == 1:
        x = stereo(x)
    y = np.stack([convolve(x[:, c], IR[:, c])[: len(x) + int(1.5 * SR)] for c in range(2)], axis=1)
    out = np.zeros_like(y)
    out[: len(x)] += x
    return out + wet * y


# ---------------------------------------------------------------- instruments
def pad(notes, dur, level=1.0, cutoff=3000, a=0.45, r=0.9):
    t = T(dur + r)
    env = att(t, a) * np.where(t > dur, np.exp(-(t - dur) / (r / 3)), 1.0)
    out = np.zeros((len(t), 2))
    for k, m in enumerate(notes):
        f0 = m2f(m)
        for d, pan in ((-7, -0.6), (0, 0.0), (6, 0.6)):
            f = f0 * 2 ** (d / 1200)
            v = np.zeros(len(t))
            for h in range(1, 9):
                if f * h > 7000:
                    break
                v += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / h ** 1.15
            out += stereo(v * env, pan * (0.6 + 0.1 * k))
    out = lp(out, cutoff, 2)
    return out * level / (len(notes) * 3)


def keys(notes, level=1.0, dec=1.4, bright=1.0):
    """Soft FM electric piano chord."""
    t = T(dec * 3)
    out = np.zeros(len(t))
    for m in notes:
        f = m2f(m)
        idx = (0.35 + 1.1 * bright * np.exp(-t / 0.3))
        out += np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    out *= att(t, 0.004) * np.exp(-t / dec) / max(1, len(notes))
    return lp(out, 5000, 2) * level


def pluck(m, level=1.0, dec=0.5):
    """Marimba / kalimba-like note: round, no click."""
    f = m2f(m)
    t = T(dec * 4)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.22 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.07)
         + 0.12 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (dec * 0.5)))
    x *= att(t, 0.003)
    return lp(x, 5500, 2) * level


def chime(m, level=1.0, dec=1.3):
    """Soft glass chime (not a high ting): fundamental + gentle octave."""
    f = m2f(m)
    t = T(dec * 4)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / dec)
         + 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (dec * 0.45))
         + 0.1 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t / (dec * 0.25)))
    x *= att(t, 0.008)
    return lp(x, 7500, 2) * level


def sparkle(m0=81, n=5, step=0.045, level=1.0):
    """A quick soft pentatonic run of chimes (for glints)."""
    i0 = PENTA.index(m0) if m0 in PENTA else 3
    seq = [PENTA[min(len(PENTA) - 1, i0 + k)] for k in range(n)]
    out = np.zeros((int((step * n + 5) * SR), 2))
    for k, m in enumerate(seq):
        c = stereo(chime(m, 0.5 * (1 - 0.08 * k), 1.0), -0.5 + k / max(1, n - 1))
        i = int(k * step * SR)
        out[i:i + len(c)] += c
    return out * level


def bass(m, dur, level=1.0):
    f = m2f(m)
    t = T(dur + 0.15)
    env = att(t, 0.018) * np.where(t > dur, np.exp(-(t - dur) / 0.05), 1.0) * (0.75 + 0.25 * np.exp(-t / 0.2))
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return lp(np.tanh(1.4 * x) * env, 500, 2) * level


def kick(level=1.0):
    t = T(0.5)
    f = 46 + 64 * np.exp(-t * 32)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.003) * np.exp(-t / 0.22)
    return lp(np.tanh(1.3 * x), 260, 2) * level


def brush(level=1.0):
    """Soft, low snare-ish brush on 2 and 4 (no crack)."""
    t = T(0.4)
    n = bp(rng.standard_normal(len(t)), 300, 1600, 2) * att(t, 0.006) * np.exp(-t / 0.09)
    b = np.sin(2 * np.pi * 185 * t) * att(t, 0.003) * np.exp(-t / 0.07) * 0.6
    return (0.5 * n + b) * level


def boom(level=1.0, big=False):
    """Deep, round impact: no crack, no cymbal."""
    t = T(2.4 if big else 1.6)
    f = 34 + (62 if big else 54) * np.exp(-t * 7)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.006) * np.exp(-t * (1.6 if big else 2.4))
    rum = lp(rng.standard_normal(len(t)), 160, 2) * att(t, 0.02) * np.exp(-t * 2.2) * 0.5
    return lp(np.tanh(1.2 * (x + rum)), 900, 2) * level


def swell(dur=1.0, level=1.0, lo=250, hi=4000, shape="in"):
    """Airy noise swell (lowpassed: never hissy). 'in' rises into its end, 'out' blooms then fades."""
    t = T(dur)
    noise = rng.standard_normal((len(t), 2))
    ph = t / dur
    # sweep = crossfade between fixed bands along the curve (smooth, no segment clicks)
    K = 8
    pos = (ph if shape == "in" else 1 - ph) * (K - 1)
    x = np.zeros_like(noise)
    wsum = np.zeros(len(t))
    for k in range(K):
        fc = lo * (hi / lo) ** (k / (K - 1))
        w = np.exp(-((pos - k) ** 2) / 0.8)
        x += bp(noise, fc * 0.6, fc * 1.4, 1) * w[:, None]
        wsum += w
    x /= wsum[:, None]
    env = ph ** 2.2 if shape == "in" else att(t, 0.03) * (1 - ph) ** 1.8
    return lp(x, 6500, 2) * env[:, None] * level * 0.35


def bloop(level=1.0):
    """Round magnetic 'lock': a soft pitched thump."""
    t = T(0.3)
    f = 120 + 160 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.004) * np.exp(-t / 0.09)
    return lp(x, 900, 2) * level


# ---------------------------------------------------------------- the bed
ARPS = {
    "flow": [0, 2, 1, 3, 2, 4, 3, 1],
    "sparse": [0, None, 2, None, 4, None, 3, None],
    "lift": [0, 1, 2, 3, 4, 3, 2, 1],
    "dream": [4, None, 2, 3, None, 1, None, 2],
}


def bed(parts, arp=None, arp_level=0.22, arp_oct=0, pad_level=0.5, bass_level=0.4, kick_level=0.5,
        brush_level=0.0, keys_level=0.0, from_t=0.0, to_t=8.0, pad_cut=3800, pump=0.18, air=0.4):
    """The shared progression. parts: set of 'pad','bass','kick','brush','keys','arp'."""
    bus = Bus(11.0)
    for b in range(4):
        t0 = b * BAR
        root, voicing, tones = CHORDS[b]
        if "pad" in parts:
            bus.add(pad(voicing, BAR + 0.05, 1.0, pad_cut), t0, pad_level)
            if air:   # a soft high shimmer two octaves up: brightness without any attack
                bus.add(pad([m + 24 for m in voicing[1:]], BAR + 0.05, 1.0, 9000, a=0.6, r=1.0), t0, air)
        if "bass" in parts:
            for at, ln in ((0.0, 0.7), (1.5 * BEAT, 0.2), (2 * BEAT, 0.7), (3.5 * BEAT, 0.2)):
                if from_t <= t0 + at < to_t:
                    bus.add(stereo(bass(root + 12, ln)), t0 + at, bass_level)
        if "keys" in parts:
            for at in (0.5 * BEAT, 2.5 * BEAT):
                if from_t <= t0 + at < to_t:
                    bus.add(stereo(keys(voicing[1:], 1.0, 0.6, 0.6), 0.2), t0 + at, keys_level)
        for q in range(4):
            tq = t0 + q * BEAT
            if "kick" in parts and q in (0, 2) and from_t <= tq < to_t:
                bus.add(stereo(kick()), tq, kick_level)
            if "brush" in parts and q in (1, 3) and from_t <= tq < to_t:
                bus.add(verb(brush(), 0.35), tq, brush_level)
        if "arp" in parts and arp:
            for s, idx in enumerate(ARPS[arp]):
                ts = t0 + s * BEAT / 2
                if idx is None or not (from_t <= ts < to_t):
                    continue
                pan = -0.45 + 0.9 * (idx / 4)
                bus.add(stereo(pluck(tones[idx] + 12 * arp_oct, 1.0, 0.42), pan), ts, arp_level * (1.0 if s % 2 == 0 else 0.75))
    x = bus.x
    if pump:
        tt = np.arange(len(x)) / SR
        tb = tt % BEAT   # smooth dip (no instant gain step on the beat = no click)
        duck = 1 - pump * np.exp(-tb / 0.12) * (1 - np.exp(-tb / 0.008)) / 0.93
        x = x * duck[:, None]
    return x


def master(bus, sec=8.0, rms_db=-17.5):
    """Wrap the tail into the start (seamless), warm reverb, roll off the top, gentle glue."""
    x = bus.x
    n = int(sec * SR)
    out = x[:n].copy()
    tail = x[n:]
    m = min(len(tail), n)
    out[:m] += tail[:m]
    wet = verb(out, 0.16)
    out = wet[:n].copy()
    out[: len(wet) - n] += wet[n:][: n]
    # loop-periodic (circular) filtering: the 8 s file is one period, so the seam stays continuous
    f = np.fft.rfftfreq(n, 1 / SR)
    H = (1 / np.sqrt(1 + (f / 11000) ** 2)) * (1 / np.sqrt(1 + (30 / np.maximum(f, 1e-6)) ** 4))
    out = np.fft.irfft(np.fft.rfft(out, axis=0) * H[:, None], n, axis=0)
    rms = np.sqrt(np.mean(out ** 2)) or 1e-9
    out *= 10 ** (rms_db / 20) / rms
    out = 0.85 * np.tanh(out / 0.85)
    return out.astype(np.float32)
