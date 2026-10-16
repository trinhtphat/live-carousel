// Swipe-through preview: every slide plays its loop, then the view slides along the world to the next one.
// node tools/swipe.mjs  → renders/final/preview-swipe-through.mp4 (N × loop seconds, with the slides' sound back to back)
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import { launch, open, pan, NAMES, LOOP, FPS, W } from './chrome.mjs';

const N = NAMES.length, SW_T = 0.4;
fs.mkdirSync('renders/final', { recursive: true });
const browser = await launch();
const page = await open(browser, { view: 1 });
const tmp = 'renders/_swipe_video.mp4';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', tmp]);
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
for (let f = 0; f < FPS * LOOP * N; f++) {
  const T = f / FPS, k = Math.floor(T / LOOP), t = T - k * LOOP;
  let p = k * W;
  if (k < N - 1 && t > LOOP - SW_T) p += W * ease((t - (LOOP - SW_T)) / SW_T);
  await pan(page, p, t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end(); await new Promise(r => ff.on('close', r));
await browser.close();
// the sound: each slide's loop, back to back
const parts = NAMES.map(n => [`audio/out/${n}.wav`, `src/assets/audio/${n}.webm`].find(f => fs.existsSync(f)));
const out = 'renders/final/preview-swipe-through.mp4';
if (parts.every(Boolean)) {
  const args = ['-y', '-loglevel', 'error', '-i', tmp];
  parts.forEach(p => args.push('-i', p));
  const cat = parts.map((_, k) => `[${k + 1}:a]atrim=0:${LOOP},asetpts=PTS-STARTPTS[a${k}]`).join(';') + ';' + parts.map((_, k) => `[a${k}]`).join('') + `concat=n=${parts.length}:v=0:a=1[a]`;
  execFileSync('ffmpeg', [...args, '-filter_complex', cat, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
} else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c', 'copy', '-movflags', '+faststart', out]);
fs.rmSync(tmp, { force: true });
console.log(out);
