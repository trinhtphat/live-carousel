// Contact sheet, rows = slides, columns = times: node tools/sheet.mjs [out=qa/sheet.jpg] [times=0,2,3.6,4.15,5.2,7.95] [slides=all]
// Look at it yourself: frame 0 and the last column must match (seamless loop); the big moment is usually ~4.0.
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { launch, open, go, pickSlides } from './chrome.mjs';

const out = process.argv[2] || 'qa/sheet.jpg';
const times = (process.argv[3] || '0,2,3.6,4.15,5.2,7.95').split(',').map(Number);
const slides = pickSlides(process.argv[4]);
const browser = await launch();
const page = await open(browser, { view: slides[0] });
const tmp = path.join(path.dirname(out), 'tmp'); fs.mkdirSync(tmp, { recursive: true });
const files = [];
for (const s of slides) for (const t of times) {
  await go(page, s, t);
  const f = path.join(tmp, `s${s}_${t}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 80 });
  files.push(f);
}
await browser.close();
const cols = times.length, cw = 270, ch = 338;
const args = ['-y', '-loglevel', 'error'];
files.forEach(f => args.push('-i', f));
const scaled = files.map((_, k) => `[${k}:v]scale=${cw}:${ch}[v${k}]`).join(';');
const layout = files.map((_, k) => `${(k % cols) * cw}_${Math.floor(k / cols) * ch}`).join('|');
args.push('-filter_complex', `${scaled};${files.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${files.length}:layout=${layout}[o]`, '-map', '[o]', '-q:v', '3', out);
spawnSync('ffmpeg', args, { stdio: 'inherit' });
console.log(out, `${cols} times × ${slides.length} slides`, page.__errs.length ? '\n' + [...new Set(page.__errs)].join('\n') : '');
