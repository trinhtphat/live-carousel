// Seam check: the view centred on every slide edge (half of each neighbour), at a few times, tiled into one image.
// node tools/seams.mjs [out=qa/seams.jpg] [times=0,4.15]   rows = times, columns = seams 1|2, 2|3, …
// Things that cross a seam must line up on both sides at every moment (people swipe at random times).
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { launch, open, pan, NAMES, W } from './chrome.mjs';

const out = process.argv[2] || 'qa/seams.jpg';
const times = (process.argv[3] || '0,4.15').split(',').map(Number);
const browser = await launch();
const page = await open(browser, { view: 1 });
const tmp = path.join(path.dirname(out), 'tmp'); fs.mkdirSync(tmp, { recursive: true });
const files = [];
for (const t of times) for (let k = 1; k < NAMES.length; k++) {
  await pan(page, k * W - W / 2, t);
  const f = path.join(tmp, `seam${k}_${t}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 80 });
  files.push(f);
}
await browser.close();
const cols = NAMES.length - 1, cw = 324, ch = 405;
const args = ['-y', '-loglevel', 'error'];
files.forEach(f => args.push('-i', f));
const scaled = files.map((_, k) => `[${k}:v]scale=${cw}:${ch},drawbox=x=${cw / 2 - 1}:y=0:w=2:h=12:color=yellow@0.9:t=fill[v${k}]`).join(';');
const layout = files.map((_, k) => `${(k % cols) * cw}_${Math.floor(k / cols) * ch}`).join('|');
args.push('-filter_complex', `${scaled};${files.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${files.length}:layout=${layout}[o]`, '-map', '[o]', '-q:v', '3', out);
spawnSync('ffmpeg', args, { stdio: 'inherit' });
console.log(out, `${cols} seams × ${times.length} times (yellow tick = the seam)`);
