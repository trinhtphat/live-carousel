#!/usr/bin/env python3
"""soft_bed: soft, musical, loop-exact sound for motion carousels (numpy + ffmpeg only, $0).

Every carousel gets its own little piece of music: a key, a chord progression, an instrument set and a groove
picked from a seed (the topic or brand name), all at 120 BPM so every slide is whole 2-second bars. Slides are
consecutive windows of the same song, so swiping plays it straight through, and each window loops seamlessly.
Visual events become musical events: notes up the scale, soft chimes, round booms, low-passed swells.
There are no hats, cymbals, ticks, clicks, beeps, glitches or whines; every attack is at least 3 ms and the
master rolls the top off, so nothing is sharp on the ears.

As a CLI:
  soft_bed.py spec.json --out audio/out                  one WAV per slide (see SPEC below)
  soft_bed.py --slides 6 --loop 8 --seed "Pearl Lab" --mood bright --out audio/out     a bed only
  soft_bed.py --demo --out /tmp/softbed                  a 4-slide demo with events
  add --song take.wav to use a music file (an ACE-Step take, or a track you have the rights to) instead of
  the synthesized bed: it is retimed to exact 2.000 s bars and cut into one chunk per slide.

SPEC (JSON):
  {"seed": "topic or brand", "mood": "bright", "key": "D", "arrangement": "build",
   "song": null | {"file": "take.wav", "bpm": 120},
   "slides": [{"name": "01-hook", "dur": 8, "level": 0.5,
               "events": [{"t": 1.0, "kind": "boom"}, {"t": 2.0, "kind": "land"}, ...]}, ...]}
  moods: bright warm calm dreamy pop lift night   (night = soft minor, for dark themes)
  arrangement: build (each slide adds a part, the last ones are full) | steady (all slides full) | sparse
  level: 0..1 per slide overrides the arrangement (0.15 = pad only, 1 = everything)
  enter / exit: per slide, the groove (all but the pad) plays only between these slide times
  event kinds: boom big swell bloom chime sparkle land run fall chord lock tok whoosh pop
    (aliases kept for older slide code: hit=boom, impact=boom, sweep/shine=sparkle, tick/click/key=tok)
  event fields: t (s, slide time), kind, level (1), pan (-1..1), dur (swell/bloom length), n + step (runs)

As a module:
  from soft_bed import Kit, render_slides, master, write_wav
  kit = Kit("pearl lab", mood="bright")
  x = kit.slide(dur=8, song_t=0, level=0.6, events=[{"t": 4.0, "kind": "big"}])   # float32 stereo, loop-exact
"""
import argparse
import json
import subprocess
import sys
import wave
import zlib
from pathlib import Path

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT


# ================================================================ io
def write_wav(path, x, sr=SR):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def read_audio(path):
    """Any audio/video file -> float64 stereo at SR (decoded by ffmpeg)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


# ================================================================ dsp (FFT, zero-phase)
def _filt(x, resp):
    n = len(x)
    N = 1 << int(np.ceil(np.log2(max(2, 2 * n))))
    f = np.maximum(np.fft.rfftfreq(N, 1 / SR), 1e-6)
    H = resp(f)
    X = np.fft.rfft(x, N, axis=0)
    return np.fft.irfft(X * (H[:, None] if x.ndim == 2 else H), N, axis=0)[:n]


def lp(x, fc, order=2):
    return _filt(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def hp(x, fc, order=2):
    return _filt(x, lambda f: 1 / np.sqrt(1 + (fc / f) ** (2 * order)))


def bp(x, lo, hi, order=2):
    return _filt(x, lambda f: 1 / np.sqrt((1 + (lo / f) ** (2 * order)) * (1 + (f / hi) ** (2 * order))))


def convolve(a, b):
    n = len(a) + len(b) - 1
    N = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(a, N) * np.fft.rfft(b, N), N)[:n]


def T(sec):
    return np.arange(int(sec * SR)) / SR


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(a) * 1.414, x * np.sin(a) * 1.414], axis=1)


def att(t, a):
    """Soft attack ramp (raised cosine) of a seconds: never a click."""
    return np.where(t < a, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1)), 1.0)


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self, sec):
        self.x = np.zeros((int(sec * SR), 2))

    def add(self, sig, t, gain=1.0, pan=0.0):
        sig = stereo(np.asarray(sig, dtype=np.float64), pan)
        i = int(round(t * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(len(self.x), i + len(sig))
        if j > i:
            self.x[i:j] += sig[: j - i] * gain


# ================================================================ harmony
NOTE = {"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
QUAL = {  # pad voicing above the chord root (semitones)
    "maj9": [4, 7, 11, 14], "m9": [3, 7, 10, 14], "maj7": [4, 7, 11], "m7": [3, 7, 10], "69": [4, 7, 9, 14],
    "add9": [4, 7, 14], "sus": [5, 7, 14], "m11": [3, 7, 10, 17], "maj": [4, 7, 12],
}
MOODS = {  # (degree in semitones above the key, quality) x 4 bars; minor=True uses the minor pentatonic
    "bright": ([(0, "maj9"), (9, "m9"), (5, "maj9"), (7, "69")], False),     # I  vi  IV  V
    "warm":   ([(0, "maj7"), (4, "m7"), (5, "maj7"), (7, "sus")], False),    # I  iii IV  Vsus
    "calm":   ([(0, "add9"), (5, "maj7"), (9, "m7"), (5, "69")], False),     # I  IV  vi  IV
    "dreamy": ([(0, "maj9"), (2, "maj"), (9, "m9"), (5, "maj9")], False),    # I  II  vi  IV (lydian lift)
    "pop":    ([(0, "add9"), (7, "add9"), (9, "m7"), (5, "maj7")], False),   # I  V   vi  IV
    "lift":   ([(5, "maj9"), (7, "69"), (4, "m7"), (9, "m9")], False),       # IV V   iii vi
    "night":  ([(0, "m9"), (8, "maj7"), (3, "maj9"), (10, "69")], True),     # i  VI  III VII (soft minor)
}
THEME_MOOD = {"cobalt": "bright", "tomato": "warm", "forest": "calm", "noir": "night"}
KEYS = ["C", "D", "Eb", "F", "G", "A", "Bb"]
ARPS = {
    "flow": [0, 2, 1, 3, 2, 4, 3, 1], "sparse": [0, None, 2, None, 4, None, 3, None],
    "lift": [0, 1, 2, 3, 4, 3, 2, 1], "dream": [4, None, 2, 3, None, 1, None, 2],
    "skip": [0, None, None, 2, None, 4, 3, None],
}
LEADS = ["marimba", "kalimba", "vibes", "glass"]
FEELS = ["straight", "halftime", "lilt"]


def seed_int(seed):
    if isinstance(seed, int):
        return seed
    return zlib.crc32(str(seed).strip().lower().encode()) & 0x7FFFFFFF


# ================================================================ the kit
class Kit:
    """One carousel's sound: key, progression, lead instrument, groove feel, all derived from the seed."""

    def __init__(self, seed="carousel", mood=None, key=None, arp=None, lead=None, feel=None):
        s = seed_int(seed)
        r = np.random.default_rng(s)
        self.mood = mood or THEME_MOOD.get(str(seed).lower(), list(MOODS)[s % len(MOODS)])
        if self.mood not in MOODS:
            raise ValueError(f"unknown mood '{self.mood}' (use one of: {', '.join(MOODS)})")
        self.key = key or KEYS[int(r.integers(len(KEYS)))]
        self.arp = arp or list(ARPS)[int(r.integers(len(ARPS)))]
        self.lead = lead or LEADS[int(r.integers(len(LEADS)))]
        self.feel = feel or FEELS[int(r.integers(len(FEELS)))]
        self.rng = np.random.default_rng(s + 1)
        prog, minor = MOODS[self.mood]
        k = NOTE[self.key]
        self.chords = []
        for deg, q in prog:
            root = 36 + (k + deg) % 12                      # bass root, C2..B2
            voicing = [root + 12 + iv for iv in [0] + QUAL[q]]  # pad around C3..E4
            self.chords.append((root, voicing[1:]))
        base = [0, 3, 5, 7, 10] if minor else [0, 2, 4, 7, 9]
        self.scale = sorted({60 + (k + d) % 12 + 12 * o for o in range(3) for d in base})
        self.scale = [m for m in self.scale if 66 <= m <= 88]    # plucks/chimes: ~370 Hz .. 1.3 kHz fundamentals
        self.IR = self._ir()

    def describe(self):
        return f"{self.key} {self.mood}, {self.lead} lead, {self.arp} arp, {self.feel} feel"

    # ------------------------------------------------ space
    def _ir(self, sec=2.2, damp=2.4, bright=3200):
        n = int(sec * SR)
        t = np.arange(n) / SR
        ir = np.stack([self.rng.standard_normal(n), self.rng.standard_normal(n)], axis=1) * np.exp(-damp * t)[:, None]
        ir = lp(ir, bright)
        ir[: int(0.018 * SR)] = 0
        return ir / np.sqrt(np.sum(ir ** 2))

    def verb(self, x, wet=0.3):
        x = stereo(x)
        y = np.stack([convolve(x[:, c], self.IR[:, c])[: len(x) + int(1.2 * SR)] for c in range(2)], axis=1)
        out = np.zeros_like(y)
        out[: len(x)] += x
        return out + wet * y

    # ------------------------------------------------ instruments (all soft)
    def pad(self, notes, dur, cutoff=3800, a=0.45, r=0.9):
        t = T(dur + r)
        env = att(t, a) * np.where(t > dur, np.exp(-(t - dur) / (r / 3)), 1.0)
        out = np.zeros((len(t), 2))
        for k, m in enumerate(notes):
            f0 = m2f(m)
            for d, pan in ((-7, -0.6), (0, 0.0), (6, 0.6)):
                f = f0 * 2 ** (d / 1200)
                v = np.zeros(len(t))
                for h in range(1, 8):
                    if f * h > 7000:
                        break
                    v += np.sin(2 * np.pi * f * h * t + self.rng.uniform(0, 6.28)) / h ** 1.15
                out += stereo(v * env, pan * (0.6 + 0.1 * k))
        return lp(out, cutoff, 2) / (len(notes) * 3)

    def keys(self, notes, dec=1.4, bright=0.8):
        """Soft FM electric piano."""
        t = T(dec * 3)
        out = np.zeros(len(t))
        for m in notes:
            f = m2f(m)
            out += np.sin(2 * np.pi * f * t + (0.3 + bright * np.exp(-t / 0.3)) * np.sin(2 * np.pi * f * t))
        return lp(out * att(t, 0.005) * np.exp(-t / dec) / max(1, len(notes)), 5500, 2)

    def pluck(self, m, dec=0.45):
        """The lead voice for notes: marimba, kalimba, vibes or glass (set by the seed). Round, no click."""
        f, t = m2f(m), T(dec * 4)
        if self.lead == "marimba":
            x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.2 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.06)
        elif self.lead == "kalimba":
            x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05)
        elif self.lead == "vibes":
            x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.3)) * np.exp(-t / (dec * 2))
            x *= 1 - 0.18 * (0.5 - 0.5 * np.cos(2 * np.pi * 5.5 * t))
        else:  # glass
            x = np.sin(2 * np.pi * f * t) * np.exp(-t / (dec * 1.6)) + 0.12 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / dec)
        return lp(x * att(t, 0.004), 6500, 2)

    def chime(self, m, dec=1.2):
        f, t = m2f(m), T(dec * 4)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / (dec * 0.45))
        return lp(x * att(t, 0.008), 8000, 2)

    def bass(self, m, dur):
        f, t = m2f(m), T(dur + 0.15)
        env = att(t, 0.018) * np.where(t > dur, np.exp(-(t - dur) / 0.05), 1.0) * (0.75 + 0.25 * np.exp(-t / 0.2))
        x = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t)
        return lp(np.tanh(1.3 * x) * env, 480, 2)

    def kick(self):
        t = T(0.5)
        f = 46 + 60 * np.exp(-t * 30)
        return lp(np.tanh(1.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.003) * np.exp(-t / 0.22)), 250, 2)

    def brush(self):
        """Low, soft backbeat (a felt brush, no snare crack)."""
        t = T(0.4)
        n = bp(self.rng.standard_normal(len(t)), 300, 1400, 2) * att(t, 0.006) * np.exp(-t / 0.08)
        return 0.45 * n + 0.6 * np.sin(2 * np.pi * 180 * t) * att(t, 0.003) * np.exp(-t / 0.07)

    def tok(self, m=None):
        """A soft low wooden tap (instead of a tick): counters, steps, typing."""
        f, t = m2f(m if m is not None else 64), T(0.25)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.045) + 0.3 * np.sin(2 * np.pi * f * 2.6 * t) * np.exp(-t / 0.02)
        return lp(x * att(t, 0.003), 1600, 2)

    def boom(self, big=False):
        t = T(2.4 if big else 1.6)
        f = 34 + (62 if big else 54) * np.exp(-t * 7)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.006) * np.exp(-t * (1.6 if big else 2.4))
        rum = lp(self.rng.standard_normal(len(t)), 160, 2) * att(t, 0.02) * np.exp(-t * 2.2) * 0.5
        return lp(np.tanh(1.2 * (x + rum)), 800, 2)

    def swell(self, dur=1.0, lo=250, hi=3200, shape="in"):
        """Airy low-passed noise swell: 'in' rises into its end, 'out' blooms then fades."""
        t = T(dur)
        noise = self.rng.standard_normal((len(t), 2))
        ph = t / dur
        K = 8
        pos = (ph if shape == "in" else 1 - ph) * (K - 1)
        x, wsum = np.zeros_like(noise), np.zeros(len(t))
        for k in range(K):
            fc = lo * (hi / lo) ** (k / (K - 1))
            w = np.exp(-((pos - k) ** 2) / 0.8)
            x += bp(noise, fc * 0.6, fc * 1.4, 1) * w[:, None]
            wsum += w
        x /= wsum[:, None]
        env = ph ** 2.2 if shape == "in" else att(t, 0.03) * (1 - ph) ** 1.8
        return lp(x, 5000, 2) * env[:, None] * 0.35

    def bloop(self):
        t = T(0.3)
        f = 120 + 160 * np.exp(-t * 30)
        return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) * att(t, 0.004) * np.exp(-t / 0.09), 900, 2)

    # ------------------------------------------------ the bed
    def chord_at(self, song_t):
        return self.chords[int(np.floor(song_t / BAR + 1e-6)) % len(self.chords)]

    def bed(self, dur, song_t=0.0, level=1.0, enter=0.0, exit=None):
        """The music for one slide: bars [song_t, song_t + dur) of the song, as a (dur + tail) buffer.
        level 0..1 decides the arrangement: pad → + plucks → + bass → + kick/brush → + keys.
        enter / exit (slide seconds): everything but the pad plays only inside [enter, exit) — e.g. the
        groove drops in on a slam at 2.5 s and drains out at 4.5 s."""
        exit = dur if exit is None else exit
        on = lambda tt: enter - 1e-6 <= tt < exit
        bus = Bus(dur + 3.5)
        parts = {"pad"}
        if level >= 0.25: parts.add("arp")
        if level >= 0.4: parts.add("bass")
        if level >= 0.55: parts.add("kick")
        if level >= 0.7: parts.add("brush")
        if level >= 0.85: parts.add("keys")
        nb = int(round(dur / BAR))
        for b in range(nb):
            t0 = b * BAR
            root, voicing = self.chord_at(song_t + t0)
            bus.add(self.pad(voicing, BAR + 0.05), t0, 0.5)
            bus.add(self.pad([m + 24 for m in voicing[1:]], BAR + 0.05, 10000, a=0.6, r=1.0), t0, 0.42)  # air: brightness with no attack
            if "bass" in parts:
                pat = ((0.0, 0.7), (1.5 * BEAT, 0.2), (2 * BEAT, 0.7), (3.5 * BEAT, 0.2)) if self.feel != "halftime" else ((0.0, 1.3), (3 * BEAT, 0.4))
                for at, ln in pat:
                    if on(t0 + at):
                        bus.add(self.bass(root + 12, ln), t0 + at, 0.38)
            for q in range(4):
                tq = t0 + q * BEAT
                kick_on = q in ((0,) if self.feel == "halftime" else (0, 2))
                brush_on = q in ((2,) if self.feel == "halftime" else (1, 3))
                if not on(tq):
                    continue
                if "kick" in parts and kick_on:
                    bus.add(self.kick(), tq, 0.48)
                if "brush" in parts and brush_on:
                    bus.add(self.verb(self.brush(), 0.35), tq, 0.15)
                if "keys" in parts and q in (1, 3):
                    bus.add(stereo(self.keys(voicing[1:], 0.6, 0.5), 0.2), tq + BEAT / 2, 0.12)
            if "arp" in parts:
                tones = sorted(self.scale, key=lambda m: min(abs((m - n) % 12) for n in voicing))[:5]
                tones = sorted(tones)
                for s, idx in enumerate(ARPS[self.arp]):
                    if idx is None:
                        continue
                    ts = t0 + s * BEAT / 2 + (0.035 if self.feel == "lilt" and s % 2 else 0.0)
                    if not on(ts):
                        continue
                    bus.add(stereo(self.pluck(tones[idx % len(tones)], 0.42), -0.45 + 0.9 * idx / 4), ts, 0.17 * (1.0 if s % 2 == 0 else 0.75))
        x = bus.x
        if "kick" in parts:  # smooth sidechain dip on the beat (no gain step = no click), only while the kick plays
            tt = np.arange(len(x)) / SR
            dip = 0.15 * np.exp(-(tt % BEAT) / 0.12) * (1 - np.exp(-(tt % BEAT) / 0.008)) / 0.93
            x = x * (1 - dip * ((tt >= enter) & (tt < exit + 0.4)))[:, None]
        return x * (0.85 + 0.15 * level)

    # ------------------------------------------------ events
    def event(self, bus, ev, song_t=0.0, state=None):
        """Turn one visual event into sound on bus. ev: {t, kind, level, pan, dur, n, step}."""
        state = state if state is not None else {}
        k = {"hit": "boom", "impact": "boom", "drop": "big", "sweep": "sparkle", "shine": "sparkle", "tick": "tok",
             "click": "tok", "key": "tok", "type": "tok", "riser": "swell", "whoosh": "whoosh", "glint": "sparkle"}.get(ev.get("kind"), ev.get("kind"))
        t, lv, pan = float(ev["t"]), float(ev.get("level", 1.0)), float(ev.get("pan", 0.0))
        _, voicing = self.chord_at(song_t + t)
        sc = self.scale
        top = lambda: sc[min(len(sc) - 1, 4 + (state.get("land", 0) % 5))]
        if k == "boom":
            bus.add(self.boom(), t, 0.75 * lv)
            bus.add(self.swell(0.5, 250, 2000, "in"), t - 0.5, 0.35 * lv)
        elif k == "big":
            bus.add(self.swell(0.9, 300, 2600, "in"), t - 0.9, 0.45 * lv)
            bus.add(self.boom(big=True), t, 0.85 * lv)
            bus.add(stereo(self.keys([m + 12 for m in voicing], 2.0, 1.0)), t, 0.5 * lv)
            self.event(bus, {"t": t + 0.02, "kind": "sparkle", "level": 0.8 * lv}, song_t, state)
            bus.add(self.swell(1.3, 300, 2400, "out"), t, 0.3 * lv)
        elif k == "swell":
            d = float(ev.get("dur", 0.8))
            bus.add(self.swell(d, 250, 2800, "in"), t - d, 0.45 * lv)
        elif k == "bloom":
            bus.add(self.swell(float(ev.get("dur", 1.0)), 250, 2200, "out"), t, 0.35 * lv)
        elif k == "whoosh":
            d = float(ev.get("dur", 0.4))
            bus.add(self.swell(d, 300, 2400, "in"), t - d * 0.8, 0.3 * lv, pan)
        elif k == "chime":
            bus.add(self.verb(stereo(self.chime(ev.get("note", top()), 1.1), pan), 0.35), t, 0.3 * lv)
        elif k == "sparkle":
            n, step = int(ev.get("n", 5)), float(ev.get("step", 0.045))
            i0 = int(ev.get("from", 3))
            for j in range(n):
                m = sc[min(len(sc) - 1, i0 + j)]
                bus.add(self.verb(stereo(self.chime(m, 0.9), -0.5 + j / max(1, n - 1)), 0.3), t + j * step, 0.22 * lv * (1 - 0.08 * j))
        elif k == "land":
            m = top()
            state["land"] = state.get("land", 0) + 1
            bus.add(self.verb(stereo(self.pluck(m, 0.5), pan), 0.25), t, 0.5 * lv)
        elif k in ("run", "fall"):
            n, step = int(ev.get("n", 5)), float(ev.get("step", 0.06))
            seq = sc[2:2 + n] if k == "run" else sc[2:2 + n][::-1]
            for j, m in enumerate(seq):
                bus.add(stereo(self.pluck(m, 0.3), pan - 0.3 + 0.6 * j / max(1, n - 1)), t + j * step, 0.3 * lv)
        elif k == "chord":
            bus.add(stereo(self.keys([m + 12 for m in voicing], 1.6, 1.0), pan), t, 0.45 * lv)
        elif k == "lock":
            bus.add(self.bloop(), t, 0.5 * lv, pan)
            bus.add(self.verb(stereo(self.pluck(top(), 0.4), pan), 0.25), t, 0.3 * lv)
        elif k == "tok":
            bus.add(self.tok(ev.get("note")), t, 0.35 * lv, pan)
        elif k == "pop":
            bus.add(self.bloop(), t, 0.4 * lv, pan)
            bus.add(stereo(self.pluck(top(), 0.3), pan), t, 0.25 * lv)
        else:
            raise ValueError(f"unknown sound event kind '{ev.get('kind')}'")

    # ------------------------------------------------ one slide
    def slide(self, dur, song_t=0.0, level=0.8, events=(), music=None, rms_db=-17.5, enter=0.0, exit=None):
        """A loop-exact mix for one slide (float32 stereo, exactly dur seconds)."""
        bus = Bus(dur + 4.0)
        if music is not None:
            bus.x[: len(music)] += music[: len(bus.x)]
        else:
            b = self.bed(dur, song_t, level, enter, exit)
            bus.x[: len(b)] += b[: len(bus.x)]
        state = {}
        for ev in sorted(events, key=lambda e: float(e["t"])):
            self.event(bus, ev, song_t, state)
        return master(bus, dur, rms_db, verb=self.verb)


# ================================================================ master
def master(bus, sec, rms_db=-17.5, verb=None, knee=0.7):
    """Fold the tail into the start (seamless loop), a little room, roll off the top and the rumble with a
    loop-periodic filter (the file is one period, so the seam stays continuous), set the loudness, soft knee."""
    x = bus.x if hasattr(bus, "x") else bus
    n = int(round(sec * SR))
    out = x[:n].copy()
    tail = x[n:]
    while len(tail):
        m = min(len(tail), n)
        out[:m] += tail[:m]
        tail = tail[m:]
    if verb is not None:
        wet = verb(out, 0.14)
        out = wet[:n].copy()
        rest = wet[n:]
        while len(rest):
            m = min(len(rest), n)
            out[:m] += rest[:m]
            rest = rest[m:]
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1e-6)
    H = (1 / np.sqrt(1 + (f / 11000) ** 2)) * (1 / np.sqrt(1 + (32 / f) ** 4))
    out = np.fft.irfft(np.fft.rfft(out, axis=0) * H[:, None], n, axis=0)
    out *= 10 ** (rms_db / 20) / (np.sqrt(np.mean(out ** 2)) or 1e-9)
    a = np.abs(out)
    over = a > knee
    out[over] = np.sign(out[over]) * (knee + (1 - knee) * np.tanh((a[over] - knee) / (1 - knee)))
    return out.astype(np.float32)


# ================================================================ a music file instead of the synth bed
def measure_grid(x, bpm=120.0):
    """(beat period s, first downbeat s) of a track that is roughly at bpm. Spectral flux (30 Hz - 11 kHz), a fine
    comb search for period + phase near bpm, then the downbeat = the beat slot with the most kick (30-150 Hz) flux."""
    m = x.mean(axis=1)[::2]
    sr, n, hop = SR // 2, 1024, 256
    mag = np.abs(np.fft.rfft(np.lib.stride_tricks.sliding_window_view(m, n)[::hop] * np.hanning(n), axis=1))
    fps, f = sr / hop, np.fft.rfftfreq(n, 1 / sr)

    def flux(lo, hi):
        mm = mag[:, (f >= lo) & (f < hi)]
        return np.maximum(np.diff(mm, axis=0, prepend=mm[:1]), 0).sum(axis=1)

    full, kick = flux(30, 11000), flux(30, 150)
    z = (full - full.mean()) / (full.std() + 1e-9)
    dur = len(m) / sr
    best = (-1e9, 60 / bpm, 0.0)
    for per in np.linspace(60 / bpm * 0.97, 60 / bpm * 1.03, 151):
        base = np.arange(0, dur, per)
        for ph in np.arange(0, per, 0.004):
            idx = np.round((ph + base) * fps).astype(int)
            sc = z[idx[idx < len(z)]].mean()
            if sc > best[0]:
                best = (sc, per, ph)
    _, per, ph = best
    beats = ph + np.arange(0, dur - ph, per)

    def strength(t):
        i = int(round(t * fps))
        return kick[max(0, i - 2): i + 3].max() if i < len(kick) else 0

    slot = [sum(strength(b) for b in beats[k::4]) for k in range(4)]
    return float(per), float(beats[int(np.argmax(slot))])


def shelf(x, fc=5000, db=-5.0):
    """Gentle high shelf (zero-phase): tames cymbals and hats in a music file."""
    g = 10 ** (db / 20)
    return _filt(x, lambda f: 1 + (g - 1) * f ** 2 / (f ** 2 + fc ** 2))


def song_chunks(path, durs, bpm=120.0, downbeat=None):
    """Cut a track into one loop-exact chunk per slide (consecutive, whole 2.000 s bars), so swiping plays the
    song straight through. The track is retimed so a bar is exactly 2.000 s; the loudest steady run is used."""
    x = read_audio(path)
    per, d0 = measure_grid(x, bpm)
    if downbeat is not None:
        d0 = float(downbeat)
    rate = (4 * per) / BAR
    n_out = int(len(x) / rate)
    src = np.arange(n_out) * rate
    y = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
    d0 /= rate
    total = sum(durs)
    nbar = int(round(total / BAR))

    def bar_db(t0):
        s = y[int(t0 * SR): int((t0 + BAR) * SR)]
        return 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9) if len(s) else -120

    starts = []
    b = 0
    while d0 + (b + nbar) * BAR + 0.1 <= len(y) / SR:
        starts.append(d0 + b * BAR)
        b += 1
    if starts:
        t_start = max(starts, key=lambda t0: min(bar_db(t0 + j * BAR) for j in range(nbar)))
    else:  # short track: loop it
        t_start = d0
        reps = int(np.ceil((total + 1) * SR / max(1, len(y) - int(d0 * SR)))) + 1
        y = np.concatenate([y[: int(d0 * SR)]] + [y[int(d0 * SR):]] * reps)
    y = shelf(y)
    y = y / (np.sqrt(np.mean(y[int(t_start * SR): int((t_start + total) * SR)] ** 2)) or 1e-9) * 10 ** (-20 / 20)
    chunks, t = [], t_start
    for d in durs:
        n, xf = int(round(d * SR)), int(0.06 * SR)
        seg = y[int(t * SR): int(t * SR) + n + xf]
        seg = np.concatenate([seg, np.zeros((max(0, n + xf - len(seg)), 2))])
        out = seg[:n].copy()
        a = np.sin(np.linspace(0, np.pi / 2, xf)) ** 2   # the next bar cross-fades into the start: seamless
        out[:xf] = out[:xf] * a[:, None] + seg[n: n + xf] * (1 - a)[:, None]
        chunks.append(out)
        t += d
    print(f"song: {Path(path).name}  {240 / (4 * per):.2f} BPM -> retimed x{1 / rate:.4f} to 120.00, bars {t_start:.2f}-{t_start + total:.2f}s")
    return chunks


# ================================================================ many slides
def render_slides(spec, out_dir, verbose=True):
    """spec: see the module docstring. Writes <out_dir>/<name>.wav for every slide, returns {name: array}."""
    kit = Kit(spec.get("seed", "carousel"), spec.get("mood"), spec.get("key"), spec.get("arp"), spec.get("lead"), spec.get("feel"))
    slides = spec["slides"]
    n = len(slides)
    arr = spec.get("arrangement", "build")
    durs = [float(s.get("dur", 8)) for s in slides]
    for d in durs:
        if abs(d / BAR - round(d / BAR)) > 1e-6:
            raise ValueError(f"slide length {d}s is not a whole number of 2 s bars (120 BPM)")
    music = None
    if spec.get("song") and spec["song"].get("file"):
        music = song_chunks(spec["song"]["file"], durs, spec["song"].get("bpm", 120), spec["song"].get("downbeat"))
    if verbose:
        print(f"sound: {kit.describe()}" + ("  (music file)" if music else ""))
    out, song_t = {}, 0.0
    for i, s in enumerate(slides):
        if "level" in s:
            level = float(s["level"])
        elif arr == "steady":
            level = 1.0
        elif arr == "sparse":
            level = 0.45
        else:  # build: the cover is light, the middle grows, the last two are full
            level = [0.35, 0.55, 0.75, 0.9, 1.0, 1.0, 1.0, 1.0][min(i, 7)] if n > 2 else 0.8
        x = kit.slide(durs[i], song_t, level, s.get("events", []), music[i] if music else None, spec.get("rms_db", -17.5),
                      float(s.get("enter", 0.0)), s.get("exit"))
        write_wav(Path(out_dir) / f"{s['name']}.wav", x)
        out[s["name"]] = x
        if verbose:
            r = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
            print(f"  {s['name']}: {durs[i]:.0f}s  level {level:.2f}  {len(s.get('events', []))} events  rms {r:.1f} dBFS  peak {np.abs(x).max():.2f}")
        song_t += durs[i]
    return out


DEMO = {
    "seed": "demo", "arrangement": "build",
    "slides": [
        {"name": "01", "dur": 6, "events": [{"t": 0.5, "kind": "big"}, {"t": 1.5, "kind": "run"}, {"t": 4.0, "kind": "chime"}]},
        {"name": "02", "dur": 8, "events": [{"t": 1.0, "kind": "land"}, {"t": 1.5, "kind": "land"}, {"t": 2.0, "kind": "boom"}, {"t": 4.0, "kind": "sparkle"}]},
        {"name": "03", "dur": 8, "events": [{"t": 2.0, "kind": "lock"}, {"t": 4.0, "kind": "big"}, {"t": 6.0, "kind": "tok"}]},
        {"name": "04", "dur": 8, "events": [{"t": 1.0, "kind": "pop"}, {"t": 3.0, "kind": "chord"}, {"t": 4.0, "kind": "sparkle"}]},
    ],
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec", nargs="?", help="spec JSON (see the docstring)")
    ap.add_argument("--out", default="audio/out")
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--slides", type=int, help="bed only: number of slides")
    ap.add_argument("--loop", type=float, default=8.0, help="bed only: seconds per slide (whole 2 s bars)")
    ap.add_argument("--seed", default=None)
    ap.add_argument("--mood", default=None, choices=list(MOODS))
    ap.add_argument("--key", default=None, choices=list(NOTE))
    ap.add_argument("--arrangement", default=None, choices=["build", "steady", "sparse"])
    ap.add_argument("--song", default=None, help="a music file to cut into slide chunks instead of the synth bed")
    ap.add_argument("--song-bpm", type=float, default=120.0)
    a = ap.parse_args()
    if a.demo:
        spec = json.loads(json.dumps(DEMO))
    elif a.spec:
        spec = json.loads(Path(a.spec).read_text())
    elif a.slides:
        spec = {"slides": [{"name": f"{i + 1:02d}", "dur": a.loop} for i in range(a.slides)]}
    else:
        ap.error("give a spec JSON, --slides N, or --demo")
    for k in ("seed", "mood", "key", "arrangement"):
        if getattr(a, k) is not None:
            spec[k] = getattr(a, k)
    if a.song:
        spec["song"] = {"file": a.song, "bpm": a.song_bpm}
    render_slides(spec, a.out)


if __name__ == "__main__":
    main()
