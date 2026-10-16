// Frame-exact MP4s (video only): node tools/render.mjs [slides=all] [fps=30]  → renders/slide-<name>.mp4
// Steps t = frame / fps through one loop, screenshots 1080×1350 JPEGs, pipes them into ffmpeg. Then: node tools/mux.mjs
import { spawn } from 'child_process';
import fs from 'fs';
import { launch, open, go, pickSlides, NAMES, LOOP } from './chrome.mjs';

const slides = pickSlides(process.argv[2]);
const FPS = Number(process.argv[3] || 30), FRAMES = Math.round(FPS * LOOP);
fs.mkdirSync('renders', { recursive: true });
const browser = await launch();
let failed = false;
for (const s of slides) {
  const page = await open(browser, { view: s });
  const out = `renders/slide-${NAMES[s - 1]}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out]);
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    await go(page, s, f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) failed = true;
  if (page.__errs.length) { console.log([...new Set(page.__errs)].join('\n')); failed = true; }
  console.log(out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
