#!/usr/bin/env python3
"""metrics: is this carousel sound easy on the ears, and does it loop? (numpy + ffmpeg)

  metrics.py audio/out/*.wav            or any audio/video files (MP4s with sound work too)
  metrics.py --json renders/*.mp4       machine-readable
  metrics.py --music audio/out/*.wav    a real music track with drums: allow a few HF transients (≤ 8 per second)

Per file: length, RMS and peak (dBFS), share of energy above 4 kHz and 6 kHz, HF spikes (5 ms windows where
the >3 kHz band jumps 12 dB over its median: ticks, clicks, crashes), the loudest 10 ms of the >3 kHz band, and
the loop seam (the jump from the last sample to the first, relative to the file's normal sample-to-sample motion;
judged on WAVs only, because AAC inside an MP4 blurs the first and last few milliseconds).
Targets for a soft carousel bed: RMS -16..-19 dBFS, >4 kHz 0.2-1 %, >6 kHz < 0.4 %, HF spikes 0, seam ratio < 1.
Exit code 1 if any file misses a target, so scripts can use it as a check.
"""
import json
import subprocess
import sys

import numpy as np

SR = 48000


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    # in a video, the audio track is padded to whole AAC frames: measure it over the picture's length (the loop)
    v = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True).stdout.strip()
    try:
        x = x[: int(round(float(v) * SR))]
    except ValueError:
        pass
    return x


def measure(x):
    m = x.mean(axis=1)
    X = np.abs(np.fft.rfft(m)) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    tot = X.sum() or 1e-12
    Y = np.fft.irfft(np.fft.rfft(m) * (f > 3000), len(m))
    win = int(0.005 * SR)
    e = np.sqrt(np.convolve(Y ** 2, np.ones(win) / win, "same"))[::win] + 1e-7
    spikes = int(np.sum(e > np.median(e) * 4))
    win2 = int(0.01 * SR)
    e2 = np.sqrt(np.convolve(Y ** 2, np.ones(win2) / win2, "same"))[::win2] + 1e-9
    step = np.abs(np.diff(x, axis=0)).max(axis=1)
    normal = float(np.percentile(step, 99.9)) or 1e-9
    seam = float(np.abs(x[0] - x[-1]).max())
    return {
        "sec": round(len(x) / SR, 3),
        "rms_db": round(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9), 1),
        "peak": round(float(np.abs(x).max()), 3),
        "hf4_pct": round(100 * X[f > 4000].sum() / tot, 2),
        "hf6_pct": round(100 * X[f > 6000].sum() / tot, 3),
        "hf_spikes": spikes,
        "hf3k_peak10ms_db": round(20 * np.log10(e2.max()), 1),
        "seam_ratio": round(seam / normal, 2),
    }


def verdict(r, music=False, wav=True):
    bad = []
    if not -20.5 <= r["rms_db"] <= -14: bad.append("level")
    if r["hf4_pct"] > 1.2: bad.append(">4k bright")
    if r["hf6_pct"] > 0.5: bad.append(">6k bright")
    if r["hf_spikes"] > (8 * r["sec"] if music else 0): bad.append("HF spikes")
    if wav and r["seam_ratio"] > 1.0: bad.append("loop seam")   # AAC in an MP4 blurs its own ends: judge seams on the WAVs
    return bad


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    js = "--json" in sys.argv
    rows, fail = {}, False
    for p in args:
        x = load(p)
        if not len(x):
            print(f"{p}: no audio"); fail = True; continue
        r = measure(x)
        r["issues"] = verdict(r, "--music" in sys.argv, p.lower().endswith(".wav"))
        fail |= bool(r["issues"])
        rows[p] = r
        if not js:
            name = p.split("/")[-1]
            print(f"{name:28s} {r['sec']:5.2f}s  rms {r['rms_db']:6.1f}  peak {r['peak']:.2f}  >4k {r['hf4_pct']:5.2f}%  "
                  f">6k {r['hf6_pct']:6.3f}%  HF spikes {r['hf_spikes']:3d}  seam x{r['seam_ratio']:.2f}  "
                  + ("ok" if not r["issues"] else "CHECK: " + ", ".join(r["issues"])))
    if js:
        print(json.dumps(rows, indent=1))
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
