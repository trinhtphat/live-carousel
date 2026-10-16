"""audiolib: loop-exact audio helpers for live carousels (numpy + ffmpeg, nothing paid).

The basics every sound script uses: read any file, write WAV, zero-phase FFT filters, a reverb, a Bus that
places sounds at exact times, and a report. The SOUND itself lives in soft.py (a gentle musical kit) or comes
from a real track (song_loops.py). Deliberately absent: hats, ticks, beeps, glitches, crashes.
"""
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)
CACHE = Path.cwd() / '.audio-cache'


def set_cache(path):
    global CACHE
    CACHE = Path(path)


# ---------------------------------------------------------------- io
def write_wav(path, x, sr=SR):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(pcm.shape[1]); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


def read_audio(path):
    """Any audio file -> float stereo at SR (decoded through ffmpeg)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(Path(path).expanduser()), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def to_webm(wav, webm, kbps=160):
    """Opus copy for the in-browser preview (embedded in the HTML by build.mjs)."""
    Path(webm).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libopus', '-b:a', f'{kbps}k', str(webm)], check=True)


# ---------------------------------------------------------------- dsp (FFT based, zero-phase)
def _filt(x, resp):
    n = len(x)
    N = 1 << int(np.ceil(np.log2(max(2, 2 * n))))
    f = np.fft.rfftfreq(N, 1 / SR)
    H = resp(np.maximum(f, 1e-6))
    X = np.fft.rfft(x, N, axis=0)
    if x.ndim == 2:
        H = H[:, None]
    return np.fft.irfft(X * H, N, axis=0)[:n]


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
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], axis=1)


def make_ir(sec=1.6, damp=3.2, bright=5000):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], axis=1) * np.exp(-damp * t)[:, None]
    ir = lp(ir, bright)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt(np.sum(ir ** 2))


IR = make_ir()


def reverb(x, wet=0.25):
    y = np.stack([convolve(x[:, c], IR[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + wet * y


class Bus:
    """A mix buffer; add(sig, t) places a sound so it starts exactly at t seconds."""
    def __init__(self, sec):
        self.x = np.zeros((int(sec * SR), 2), dtype=np.float64)

    def add(self, sig, t, gain=1.0, pan=0.0, onset=0):
        if sig.ndim == 1:
            sig = stereo(sig, pan)
        i = int(round(t * SR)) - onset
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(len(self.x), i + len(sig))
        if j > i:
            self.x[i:j] += sig[: j - i] * gain


def report(name, x):
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    print(f'{name}: {len(x) / SR:.2f}s peak {np.max(np.abs(x)):.2f} rms {rms:.1f} dBFS')
