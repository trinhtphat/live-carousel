// Puts each slide's loop-exact sound on its video: renders/slide-<name>.mp4 → renders/final/slide-<name>.mp4
// Only normalized pipeline output with separate BGM/SFX stems is eligible.
import { execFileSync } from 'child_process';
import fs from 'fs';
import { pickSlides, NAMES, LOOP } from './chrome.mjs';

const draft = process.argv.includes('--draft');
const slides = pickSlides(process.argv[2]);
if (draft && (slides.length !== 1 || !Number.isInteger(slides[0]) || slides[0] < 1 || slides[0] > NAMES.length)) {
  throw new Error('A draft requires exactly one valid slide index');
}
const outDir = draft ? 'renders/draft' : 'renders/final';
fs.mkdirSync(outDir, { recursive: true });
for (const s of slides) {
  const n = NAMES[s - 1], v = `renders/slide-${n}.mp4`;
  if (!fs.existsSync(v)) { console.log('skip (not rendered):', v); continue; }
  const a = `audio/out/${n}.wav`;
  for (const file of [a, `audio/out/${n}.bgm.wav`, `audio/out/${n}.sfx.wav`]) {
    if (!fs.existsSync(file)) throw new Error(`Missing normalized pipeline output: ${file}; run python tools/make_audio.py`);
  }
  const out = `${outDir}/slide-${n}.mp4`;
  const args = ['-y', '-loglevel', 'error', '-i', v];
  if (a) args.push('-i', a, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'alimiter=limit=0.95:level=false', '-c:a', 'aac', '-b:a', '256k', '-t', String(LOOP));
  else args.push('-c', 'copy');
  execFileSync('ffmpeg', [...args, '-movflags', '+faststart', out]);
  console.log(out, a ? `(sound: ${a})` : '(NO SOUND: make audio/out/' + n + '.wav first)');
}
