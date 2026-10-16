// Full-size screenshots: node tools/shots.mjs [out=qa] [view:t,view:t …]   view = strip | 1..N   e.g. "strip:0,3:4.15"
// Prints any page error or console error (an empty list = clean).
import fs from 'fs';
import { launch, open, go } from './chrome.mjs';

const out = process.argv[2] || 'qa';
const shots = (process.argv[3] || 'strip:0').split(',').map(s => s.split(':'));
fs.mkdirSync(out, { recursive: true });
const browser = await launch();
const errs = [];
for (const [view, t] of shots) {
  const strip = view === 'strip';
  const page = await open(browser, { view, t, width: strip ? 2592 : 1080, height: strip ? 540 : 1350 });
  await go(page, view, Number(t));
  const f = `${out}/${view}_${String(t).replace('.', 'p')}.png`;
  await page.screenshot({ path: f });
  console.log(f);
  errs.push(...page.__errs);
  await page.close();
}
await browser.close();
console.log(errs.length ? [...new Set(errs)].join('\n') : 'no page errors');
