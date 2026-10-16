"""One real track → one loop-exact 8 s chunk per slide, so swiping plays the song straight through.

  <engine>/scripts/py tools/audio/song_loops.py <track.wav|mp3> [--bpm 120] [--start auto|<seconds>] [--events audio/events.json]
  → audio/out/<slide>.wav + src/assets/audio/<slide>.webm, a report, and audio/take.json (what was used).

The track should be an instrumental near 120 BPM in 4/4: an ACE-Step take made for the carousel (song.json with
"bpm": 120, see references/sound.md) or a royalty-free track the user owns. The script finds the beat grid and the
downbeats, resamples so a bar is exactly 2.000 s, picks the run of bars whose quietest bar is loudest (skips intros
and outros), gives slide N bars 4N-3..4N, cross-fades the bar after each chunk into its start (seamless loop), adds
soft accents from events.json (same kinds as soft_bed.py) and masters at -17.5 dB RMS with a gentle top roll-off.
"""
import argparse, json, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audiolib import SR, Bus, read_audio, write_wav, to_webm, report, stereo, lp  # noqa: E402
import soft  # noqa: E402
from soft import keys, pluck, chime, sparkle, boom, swell, bloop, verb  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('track'); ap.add_argument('--bpm', type=float, default=120)
ap.add_argument('--start', default='auto'); ap.add_argument('--events', default='audio/events.json')
ap.add_argument('--rms', type=float, default=-17.5)
a = ap.parse_args()
cfg = json.load(open('carousel.json'))
NAMES, SEC = cfg['slides'], float(cfg.get('loop', 8))
BAR, N, NS = SEC / 4, len(cfg['slides']), int(SEC * SR)
EV = json.load(open(a.events)) if Path(a.events).exists() else {}

# ---------------------------------------------------------------- beat grid (numpy only)
x = read_audio(a.track)
ASR = 11025
mono = np.interp(np.arange(0, len(x) - 1, SR / ASR), np.arange(len(x)), x.mean(axis=1))
n, hop = 1024, 128
frames = np.lib.stride_tricks.sliding_window_view(np.pad(mono, (0, n)), n)[::hop] * np.hanning(n)
mag = np.abs(np.fft.rfft(frames, axis=1)); fps = ASR / hop
C0 = n / 2 / ASR   # a frame's time is its window CENTRE
freqs = np.fft.rfftfreq(n, 1 / ASR)
flux_of = lambda lo, hi: np.maximum(np.diff(mag[:, (freqs >= lo) & (freqs < hi)], axis=0, prepend=0), 0).sum(axis=1)
flux, kick = flux_of(30, 5000), flux_of(30, 160)
f = (flux - flux.mean()) / (flux.std() + 1e-9)
dur = len(x) / SR
best = (-1e9, a.bpm, 0.0)
for bpm in np.arange(a.bpm * 0.96, a.bpm * 1.04, 0.02):
    period = 60 / bpm
    base = np.arange(0, dur - period, period)
    for ph in np.arange(C0, C0 + period, 0.004):
        idx = np.round((ph + base - C0) * fps).astype(int); idx = idx[(idx >= 0) & (idx < len(f))]
        s = f[idx].mean()
        if s > best[0]: best = (s, bpm, ph)
_, bpm, ph = best
period = 60 / bpm
beats = ph + np.arange(0, dur - ph, period)
def kstr(t):
    i = int(round((t - C0) * fps))
    return kick[max(0, i - 2): i + 3].max() if 0 <= i < len(kick) else 0
slot = int(np.argmax([sum(kstr(b) for b in beats[k::4]) for k in range(4)]))
d0 = beats[slot]
pbar = 4 * period
rate = pbar / BAR
print(f'{Path(a.track).name}: {bpm:.2f} BPM, first downbeat {d0:.3f}s → resampled x{rate:.5f} so a bar is {BAR:.3f}s')
n_out = int(len(x) / rate)
src = np.arange(n_out) * rate
y = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
d0 /= rate

# ---------------------------------------------------------------- the window
def bar_db(t0):
    s = y[int(t0 * SR): int((t0 + BAR) * SR)]
    return 20 * np.log10(float(np.sqrt(np.mean(s ** 2))) + 1e-9) if len(s) else -120
end = len(y) / SR
# musical end: last bar louder than (loudest - 30 dB)
loud = [bar_db(d0 + b * BAR) for b in range(int((end - d0) // BAR))]
top = max(loud) if loud else -120
while loud and loud[-1] < top - 30: loud.pop()
mend = d0 + len(loud) * BAR
need = N * 4
if a.start != 'auto':
    t_start = float(a.start)
else:
    cands = [(min(bar_db(d0 + (b + j) * BAR) for j in range(need)) + (0.5 if b % 4 == 0 else 0), d0 + b * BAR)
             for b in range(0, max(0, len(loud) - need) + 1)]
    t_start = max(cands)[1] if cands else d0
starts = [t_start + i * SEC for i in range(N)]
if starts[-1] + SEC > mend + 0.05:
    print(f'note: the track is short ({mend - d0:.1f}s of music after the first downbeat); later slides reuse earlier bars')
    k = max(1, int((mend - d0) // SEC))
    starts = [d0 + (i % k) * SEC for i in range(N)]
print('slides start at', ', '.join(f'{s:.2f}' for s in starts), '(resampled seconds)')


def loop_chunk(t0, xf=0.06):
    i0, m = int(t0 * SR), int(xf * SR)
    seg = y[i0: i0 + NS + m].copy()
    if len(seg) < NS + m: seg = np.concatenate([seg, np.zeros((NS + m - len(seg), 2))])
    out = seg[:NS].copy()
    w = np.sin(np.linspace(0, np.pi / 2, m)) ** 2
    out[:m] = out[:m] * w[:, None] + seg[NS: NS + m] * (1 - w)[:, None]
    return out


def event(bus, kind, t, level=1.0):
    k = {'boom': lambda: stereo(boom(0.6 * level)), 'bigboom': lambda: stereo(boom(0.75 * level, big=True)),
         'swell': lambda: swell(0.8, 0.4 * level, 300, 2400, 'in'), 'bloom': lambda: swell(1.0, 0.28 * level, 300, 2000, 'out'),
         'chime': lambda: verb(stereo(chime(soft.PENTA[6], 0.25 * level)), 0.35), 'sparkle': lambda: sparkle(soft.PENTA[8], 4, 0.05, 0.35 * level),
         'pluck': lambda: verb(stereo(pluck(soft.PENTA[5], 0.4 * level, 0.5)), 0.25), 'bloop': lambda: stereo(bloop(0.45 * level)),
         'keys': lambda: stereo(keys([m + 12 for m in soft.CHORDS[int(t // 2) % 4][1]], 0.35 * level, 1.6, 1.0))}[kind]()
    bus.add(k, t - (0.8 if kind == 'swell' else 0))


def finish(z):
    """Loop-periodic top roll-off + low cut, -17.5 dB RMS, soft knee above 0.7 (no squash)."""
    F = np.fft.rfftfreq(NS, 1 / SR)
    H = (1 / np.sqrt(1 + (F / 9000) ** 2)) * (1 / np.sqrt(1 + (28 / np.maximum(F, 1e-6)) ** 4))
    z = np.fft.irfft(np.fft.rfft(z, axis=0) * H[:, None], NS, axis=0)
    z *= 10 ** (a.rms / 20) / (np.sqrt(np.mean(z ** 2)) or 1e-9)
    s, m = np.sign(z), np.abs(z); k = 0.7
    z = np.where(m > k, s * (k + (1 - k) * np.tanh((m - k) / (1 - k))), z)
    return z.astype(np.float32)


for i, name in enumerate(NAMES):
    bus = Bus(SEC + 4)
    bus.x[:NS] += loop_chunk(starts[i])
    for e in EV.get(name, []):
        event(bus, e['kind'], float(e['t']), float(e.get('level', 1.0)))
    z = bus.x[:NS].copy(); tail = bus.x[NS:]; z[: min(len(tail), NS)] += tail[: min(len(tail), NS)]  # accents' tails wrap to the start
    out = finish(z)
    wav = Path('audio/out') / f'{name}.wav'
    write_wav(wav, out); to_webm(wav, Path('src/assets/audio') / f'{name}.webm')
    report(name, out)
Path('audio').mkdir(exist_ok=True)
json.dump({'track': str(a.track), 'bpm': round(float(bpm), 3), 'first_downbeat': round(float(d0 * rate), 3), 'resample': round(float(rate), 6),
           'starts_resampled': [round(float(s), 3) for s in starts]}, open('audio/take.json', 'w'), indent=1)
print('wrote audio/take.json; next: node build.mjs, then node tools/mux.mjs after rendering')
