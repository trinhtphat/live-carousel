# ENCORE: sound notes

**Take: seed7** (ACE-Step 1.5, local, $0). Of the four takes it has the least top end (full mix >4 kHz 1.37%,
>6 kHz 0.61%; seed31 4.39%, seed64 2.81%, seed113 1.70%), a dead-steady grid (119.98 BPM, downbeat residual
< 0.5 ms) and even bar loudness through bar 20. seed64 and seed113 have real singing in the demucs vocal
stem; seed7's vocal stem is only a short shout around bars 18-19 at -30 dB, and it is left out of every mix
(mixes are rebuilt from drums + bass + other). In seed7 the drums drop out after bar 20 (breakdown), so the
usable full-band run is bars 1-20.

Resampled x1.00017 so a bar is exactly 2.000 s. Stems: `audio/stems4/htdemucs/seed7/`.

| slide | bars | what plays | RMS dBFS | >4 kHz | >6 kHz | peak |
|---|---|---|---|---|---|---|
| 01-frontman | 13-16 | guitars/organ only, low-passed 700 Hz + room (filter opens to 2.5 kHz 4.0-6.0), a little sub bass | -25.0 | 0.00% | 0.000% | 0.34 |
| 02-drums | 1-4 | drums (+ ghost guitars at -20 dB, low-passed) | -21.0 | 0.74% | 0.250% | 0.56 |
| 03-bass | 5-8 | drums + bass | -20.0 | 0.39% | 0.113% | 0.44 |
| 04-guitar | 9-12 | full band | -18.5 | 0.55% | 0.106% | 0.48 |
| 05-full-band | 13-16 | full band + felt low whump at 4.0 (pyro) | -17.5 | 0.41% | 0.124% | 0.58 |
| 06-encore | 17-20 | full band (the loudest bars) + soft swell 3.0-4.0 into a low thump at 4.0 | -17.5 | 0.47% | 0.135% | 0.62 |

Slides 2-6 play the song straight through (bars 1-20); the cover previews slide 5's riff through the wall.
Loop seams: all < 0.02 sample jump (normal sample-to-sample motion here is up to ~0.06), no clicks.
For comparison the accepted OFFSHORE v2 had >4 kHz 0.73-0.94% and a louder >3 kHz peak (-20.9 vs -22.4..-27 dBFS here).

## Beat grid
Every chunk is shifted so the kicks (beats 1 and 3, the whole seconds) rise ~3 ms after t = 0, 1, 2 ... 7
(measured on the rendered WAVs: +1..+6 ms). Beats land on t = 0, 0.5, 1.0 ... 7.5 in every loop.
The snare/clap backbeats (t = 0.5, 1.5 ...) are laid back: their attacks rise 10-22 ms after the grid.
That is under one frame at 30 fps, so visual hits on the 0.5 grid read as in sync.

Accent times: 05 whump at 4.0 (about +2 dB over the same beat a bar earlier), 06 swell 3.0-4.0 + thump at 4.0.
Nothing else is added: no ticks, clicks, glitches, crashes or beeps.

## Rebuild
```
audio/make_audio.py seed7   (record only: needs the take + stems, not shipped)
for n in 01-frontman 02-drums 03-bass 04-guitar 05-full-band 06-encore; do
  ffmpeg -y -i audio/out/$n.wav -c:a libopus -b:a 160k src/assets/audio/$n.webm; done
```
`audio/out/preview-swipe-through.wav` is all six back to back (48 s). The webms decode to 8.008 s (Opus
frame padding, same as OFFSHORE); the HTML loop should use loopEnd = 8.0.
