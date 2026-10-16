# Harshness + loop check per WAV: share of energy above 4 / 8 kHz, HF spike windows (click-like), seam jump.
# <engine>/scripts/py tools/audio/metrics.py audio/out/*.wav   (aim: >4k ≈ 0.3–1 %, few spikes, seam jump < 0.02)
import sys, wave
import numpy as np
def read(p):
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels()) / 32768
    return x.mean(axis=1), w.getframerate()
for p in sys.argv[1:]:
    x, sr = read(p)
    X = np.abs(np.fft.rfft(x)) ** 2; f = np.fft.rfftfreq(len(x), 1 / sr); tot = X.sum()
    hf4 = X[f > 4000].sum() / tot; hf8 = X[f > 8000].sum() / tot
    # HF envelope in 5 ms windows; "clicks" = windows where >3 kHz energy jumps 12 dB over the local median
    Y = np.fft.irfft(np.fft.rfft(x) * (f > 3000), len(x))
    win = int(0.005 * sr); e = np.sqrt(np.convolve(Y ** 2, np.ones(win) / win, 'same'))[::win] + 1e-6
    med = np.median(e)
    clicks = int(np.sum(e > med * 4))
    seam = abs(x[-1] - x[0])
    print(f"{p.split('/')[-1]:22s} >4k {hf4*100:5.2f}%  >8k {hf8*100:5.3f}%  HF-spike windows {clicks:4d}  seam jump {seam:.4f}")
    # absolute: loudest 10 ms of the >3 kHz band, and the 99th percentile, in dBFS
    win2 = int(0.01 * sr); e2 = np.sqrt(np.convolve(Y ** 2, np.ones(win2) / win2, 'same'))[::win2] + 1e-9
    print(f"{'':22s} >3k band: peak10ms {20*np.log10(e2.max()):6.1f} dBFS  p99 {20*np.log10(np.percentile(e2,99)):6.1f}  median {20*np.log10(np.median(e2)):6.1f}")
