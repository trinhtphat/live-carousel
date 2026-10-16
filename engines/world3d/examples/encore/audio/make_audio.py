# REFERENCE ONLY: this is how the shipped sound (src/assets/audio/*.webm) was made. It needs the ACE-Step take seed7 and its demucs stems (~100 MB, not shipped)
# and the old live-carousel audio helpers, so it does not run as-is. For a new carousel use tools/audio/song_loops.py
# (one track → per-slide loops) or tools/audio/soft_bed.py (no track needed); see references/sound.md.
"""ENCORE / THE CLOTHES ARE THE BAND: the sound. Every swipe brings one band member on stage.

One original rock-and-roll instrumental (ACE-Step 1.5, made locally, $0), split into stems with demucs
(drums / bass / other; the "vocals" stem is left out, so any stray shout is gone), resampled so every bar
is exactly 2.000 s (120 BPM), then cut into six 8 s loops (4 bars each):

    01-frontman  the guitar/organ stem only, low-passed with a little room, as if heard through the
                 backstage wall; the filter opens a little at 4.0-6.0 and closes again
    02-drums     drums alone (+ a low-passed ghost of the guitars)           <- the boots: ON DRUMS
    03-bass      drums + bass                                                <- the denim: ON BASS
    04-guitar    drums + bass + guitars = the full band                      <- the tee: ON GUITAR
    05-full-band the full band, loudest chunk, one felt low "whump" at 4.0   <- the pyro
    06-encore    the full band, next chunk, a soft swell into a low confetti-cannon thump at 4.0

Slides 2-6 play bars 1-20 of the song in order, so swiping plays it straight through; the cover previews
slide 5's riff (bars 13-16) through the wall. Each loop has the start of the following bar cross-faded
into its first 60 ms, so it repeats with no seam (slide 6 instead fades its end into the audio that leads
into its first bar, because the drums drop out after bar 20). Each chunk is shifted so the kicks on
beats 1 and 3 rise 3 ms after t = 0, 1, 2 ... (snares/claps on 2 and 4 sit ~10-20 ms behind, laid back).

Nothing bright: the drums get -4 dB above 3.5 kHz and another -5 dB above 7 kHz, the guitars -4 dB above
4.5 kHz, the master a soft shelf above ~8 kHz; accents
are low-passed with >= 6 ms attacks. No ticks, clicks, glitches, crashes or beeps. The master is a smooth
gain-envelope limiter (soft knee from 0.7), never a tanh squash. All filtering is loop-periodic (circular).

Run from the project folder:
    ~/.claude/skills/live-carousel/scripts/py audio/make_audio.py            # take from take.json, else seed7
Then encode for the HTML:
    for n in 01-frontman 02-drums 03-bass 04-guitar 05-full-band 06-encore; do
      ffmpeg -y -i audio/out/$n.wav -c:a libopus -b:a 160k src/assets/audio/$n.webm; done
"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lc_audio  # noqa: E402
from lc_audio import SR, read_audio, write_wav, lp, bp, stereo, IR, convolve  # noqa: E402

OUT = HERE / "out"
SEC = 8.0
BAR = 2.0
NS = int(SEC * SR)
XF = 0.06
R = np.random.default_rng(11)
TAKE = sys.argv[1] if len(sys.argv) > 1 else (json.load(open(HERE / "take.json"))["take"] if (HERE / "take.json").exists() else "seed7")
lc_audio.set_cache(HERE / ".cache" / TAKE)     # demucs stems share file names across takes: keep decodes apart

NAMES = ["01-frontman", "02-drums", "03-bass", "04-guitar", "05-full-band", "06-encore"]
# 1-based song bars each slide starts on (the cover previews slide 5's riff; 2-6 run straight through)
START_BAR = {1: 13, 2: 1, 3: 5, 4: 9, 5: 13, 6: 17}
# Slides whose following bar is a different section: slide 6 ends on bar 20 and the drums drop out in
# bar 21, so its loop end is cross-faded into the end of bar 16 (which really leads into bar 17) instead.
END_XF = {6}
TARGET_DB = {1: -25.0, 2: -21.0, 3: -20.0, 4: -18.5, 5: -17.5, 6: -17.5}


# ---------------------------------------------------------------- loop-periodic helpers
def circ(fn, x):
    """Apply a (linear, zero-phase) filter as if the loop repeats forever: filter 3 copies, keep the middle."""
    n = len(x)
    return fn(np.concatenate([x, x, x]))[n: 2 * n]


def shelf(x, fc, gain_db):
    """High shelf: everything above fc scaled by gain_db (zero-phase, loop-periodic)."""
    g = 10 ** (gain_db / 20)
    def f(z):
        lo = lp(z, fc, 2)
        return lo + (z - lo) * g
    return circ(f, x)


def env(points, n=NS):
    t = np.arange(n) / SR
    ts, vs = zip(*points)
    return np.interp(t, ts, vs)


def sweep_lp(x, cutoff):
    """Time-varying 2-pole state-variable low-pass (cutoff in Hz per sample). Run twice round the loop so
    the filter state at the loop point is the steady state (seamless)."""
    n = len(x)
    xx = np.concatenate([x, x])
    cc = np.concatenate([cutoff, cutoff])
    y = np.zeros_like(xx)
    q = 0.75                                 # gentle, no resonant peak
    for c in range(xx.shape[1]):
        lo = bd = 0.0
        f_all = 2 * np.sin(np.pi * np.minimum(cc, SR / 6) / SR)
        col = xx[:, c]
        out = y[:, c]
        for i in range(len(col)):
            f = f_all[i]
            lo += f * bd
            hi = col[i] - lo - q * bd
            bd += f * hi
            out[i] = lo
    return y[n:]


def room(x, wet=0.18):
    """A small room on a loop: the reverb tail of the end wraps into the start."""
    ir = IR[: int(0.9 * SR)] * np.exp(-np.arange(int(0.9 * SR)) / SR * 2.5)[:, None]
    ir = ir / np.sqrt(np.sum(ir ** 2))
    y = np.zeros_like(x)
    for c in range(2):
        full = convolve(x[:, c], ir[:, c])
        y[:, c] = full[: len(x)]
        tail = full[len(x):]
        y[: len(tail), c] += tail[: len(x)]
    return x + wet * y


def place(bus, sig, t):
    """Add with wrap-round, so anything ringing past 8 s lands at the start of the loop."""
    i = int(round(t * SR)) % NS
    idx = (np.arange(len(sig)) + i) % NS
    np.add.at(bus, idx, sig)


# ---------------------------------------------------------------- the music
def load_stems():
    """drums / bass / other of the take, resampled so a bar is exactly 2.000 s. Returns (stems, d0)."""
    tm = json.load(open(HERE / f"timing_{TAKE}.json")) if (HERE / f"timing_{TAKE}.json").exists() else json.load(open(HERE / "timing.json"))
    d = np.array(tm["downbeats"], dtype=float)
    k = np.arange(len(d))
    pbar, d0 = np.polyfit(k, d, 1)
    rate = pbar / BAR
    stems = {}
    for name in ("drums", "bass", "other"):
        x = read_audio(HERE / "stems4" / "htdemucs" / TAKE / f"{name}.wav")
        n_out = int(len(x) / rate)
        src = np.arange(n_out) * rate
        stems[name] = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
    print(f"take {TAKE}: bar {pbar:.5f}s ({240 / pbar:.2f} BPM) -> x{rate:.5f} = 120.00 BPM, first downbeat {d0 / rate:.3f}s")
    return stems, d0 / rate


def bar_t(d0, b):
    return d0 + (b - 1) * BAR


def onset_offset(drums, t0, lead=0.003):
    """How far (s) to shift the chunk so the drum attacks on the whole seconds (the kicks on beats 1 and 3)
    rise `lead` after t = 0, 1, 2 ... Broadband 2 ms RMS envelope, 50%-of-peak rise point per hit."""
    seg = drums.mean(axis=1)
    w = int(0.002 * SR)
    rises = []
    for j in range(8):
        c = int((t0 + j) * SR)
        lo, hi = c - int(0.08 * SR), c + int(0.08 * SR)
        e = np.sqrt(np.convolve(seg[lo:hi] ** 2, np.ones(w) / w, "same"))
        pk = e.max()
        if pk < 0.02:
            continue
        rises.append((np.argmax(e > 0.5 * pk) - int(0.08 * SR)) / SR)
    return (float(np.median(rises)) - lead if rises else 0.0), len(rises)


def chunk(y, t0, t_next=None):
    """8 s from t0, made to loop with no seam.
    Default: the start of the following bar (t0 + 8) is cross-faded into the loop's first 60 ms.
    With t_next=False (the bar after the chunk is a different section): the loop's last 60 ms are
    cross-faded into the audio that leads into t0 in the song, so the wrap is the song's own join."""
    i0 = int(round(t0 * SR))
    out = y[i0: i0 + NS].copy()
    if len(out) < NS:
        out = np.concatenate([out, np.zeros((NS - len(out), 2))])
    n = int(XF * SR)
    a = np.sin(np.linspace(0, np.pi / 2, n)) ** 2
    if t_next is False:
        pre = y[i0 - n: i0]
        out[-n:] = out[-n:] * (1 - a)[:, None] + pre * a[:, None]
    else:
        nxt = y[i0 + NS: i0 + NS + n]
        out[:n] = out[:n] * a[:, None] + nxt * (1 - a)[:, None]
    return out


# ---------------------------------------------------------------- soft accents (round, low, slow attacks)
def T(sec):
    return np.arange(int(sec * SR)) / SR


def whump(level=0.4):
    """Pyro: a felt low boom with a soft air push, no crack. Pitch falls 74 -> 36 Hz."""
    t = T(1.1)
    f = 36 + 38 * np.exp(-t * 9)
    att = np.minimum(1, t / 0.008)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.2) * att
    air = lp(R.standard_normal(len(t)), 320, 2) * np.exp(-t * 5.5) * att
    air = air / (np.max(np.abs(air)) or 1) * 0.35
    x = lp(body + air, 900, 2)
    return stereo(x / (np.max(np.abs(x)) or 1) * level)


def thump(level=0.35):
    """Confetti cannon: a short felt pop, low-passed, rounded attack."""
    t = T(0.55)
    f = 48 + 40 * np.exp(-t * 16)
    att = np.minimum(1, t / 0.006)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * att
    x += lp(R.standard_normal(len(t)), 600, 2) * np.exp(-t * 14) * att * 0.25
    x = lp(x, 1200, 2)
    return stereo(x / (np.max(np.abs(x)) or 1) * level)


def swell(dur=1.0, level=0.18):
    """Air rising into a hit: band-passed noise, ease-in envelope, low-passed so it never hisses."""
    t = T(dur)
    s = t / dur
    n = np.stack([bp(R.standard_normal(len(t)), 140, 1800), bp(R.standard_normal(len(t)), 140, 1800)], axis=1)
    e = (s ** 2.4) * (1 - np.exp(-(1 - s) * 60))   # rounded at both ends
    x = lp(n * e[:, None], 2200, 2)
    return x / (np.max(np.abs(x)) or 1) * level


# ---------------------------------------------------------------- slides
def slide(st, n, t0):
    tn = False if n in END_XF else None
    D = shelf(shelf(chunk(st["drums"], t0, tn), 3500, -4.0), 7000, -5.0)   # hats and claps rounded off
    B = chunk(st["bass"], t0, tn)
    O = shelf(chunk(st["other"], t0, tn), 4500, -4.0)                      # fuzz without fizz
    fx = np.zeros((NS, 2))
    if n == 1:
        # backstage: the riff through the wall; the door swings open a crack at 4.0-6.0, then closes
        cut = env([(0, 700), (3.6, 700), (4.6, 2500), (5.6, 2500), (6.6, 700), (8, 700)])
        m = room(sweep_lp(O, cut), 0.22)
        m = m + circ(lambda z: lp(z, 140, 2), B) * 0.18          # the bass felt through the floor
    elif n == 2:
        ghost = circ(lambda z: lp(z, 500, 2), O)
        ghost *= np.sqrt(np.mean(D ** 2)) * 10 ** (-20 / 20) / (np.sqrt(np.mean(ghost ** 2)) or 1)
        m = shelf(D, 3000, -3.0) + ghost         # drums alone are the most exposed: round them a bit more
    elif n == 3:
        m = D + B
    elif n == 4:
        m = D + B + O
    elif n == 5:
        m = D + B + O
        place(fx, whump(1.0), 4.0)
    else:
        m = D + B + O
        place(fx, swell(1.0, 0.55), 3.0)
        place(fx, thump(1.0), 4.0)
    return m, fx


def master(x, rms_db):
    """Soft high shelf, set the level, smooth gain-envelope limiting with a soft knee from 0.7."""
    x = x - np.mean(x, axis=0)
    x = shelf(x, 8000, -2.5)
    x *= 10 ** (rms_db / 20) / (np.sqrt(np.mean(x ** 2)) or 1e-9)
    thr, ceil = 0.7, 0.92
    a = np.max(np.abs(x), axis=1)
    over = np.maximum(a - thr, 0)
    target = np.where(a > thr, thr + (ceil - thr) * (1 - np.exp(-over / (ceil - thr))), a)
    g = np.where(a > 1e-9, target / np.maximum(a, 1e-9), 1.0)
    # look-ahead min over 6 ms, then a 6 ms Hann smoothing (window <= min span, so peaks stay under)
    w = int(0.006 * SR)
    gg = np.concatenate([g, g, g])
    from numpy.lib.stride_tricks import sliding_window_view
    gm = sliding_window_view(np.pad(gg, (w // 2, w - w // 2 - 1), mode="edge"), w).min(axis=1)
    h = np.hanning(w)
    gs = np.convolve(gm, h / h.sum(), "same")[len(g): 2 * len(g)]
    y = x * gs[:, None]
    pk = np.max(np.abs(y))
    if pk > 0.95:
        y *= 0.95 / pk
    return y.astype(np.float32)


def metrics(x):
    m = x.mean(axis=1)
    X = np.abs(np.fft.rfft(m)) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    return rms, X[f > 4000].sum() / X.sum() * 100, X[f > 6000].sum() / X.sum() * 100, float(np.max(np.abs(x)))


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    st, d0 = load_stems()
    notes = []
    outs = []
    for n, name in enumerate(NAMES, start=1):
        b0 = START_BAR[n]
        t0 = bar_t(d0, b0)
        off, nhits = onset_offset(st["drums"], t0)
        t0 += off                            # put the kick attacks exactly on t = 0, 0.5, 1.0 ...
        m, fx = slide(st, n, t0)
        if n in (5, 6):                      # accents peak a few dB over the music's RMS, about kick level
            mr = np.sqrt(np.mean(m ** 2))
            fr = np.max(np.abs(fx)) or 1
            fx *= (mr * (2.6 if n == 5 else 2.0)) / fr
        x = master(m + fx, TARGET_DB[n])
        write_wav(OUT / f"{name}.wav", x)
        outs.append(x)
        rms, h4, h6, pk = metrics(x)
        line = f"{name}: bars {b0}-{b0 + 3} (song {t0:.3f}s), grid offset {off * 1000:+.0f} ms over {nhits} beats, rms {rms:.1f} dBFS, >4k {h4:.2f}%, >6k {h6:.3f}%, peak {pk:.2f}"
        print(line)
        notes.append(line)
    write_wav(OUT / "preview-swipe-through.wav", np.concatenate(outs))
    json.dump({"take": TAKE, "start_bars": START_BAR, "first_downbeat": d0}, open(HERE / "take.json", "w"), indent=1)
    (OUT / "levels.txt").write_text("\n".join(notes) + "\n")
