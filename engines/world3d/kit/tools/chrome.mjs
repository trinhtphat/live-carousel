// Shared by every capture tool: reads carousel.json, finds Chrome (macOS / Windows / Linux), opens the built
// carousel in capture mode. The page exposes window.__go(view, t), window.__pan(pan, t), __ready / __error.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';

export const CFG = JSON.parse(fs.readFileSync('carousel.json', 'utf8'));
export const NAMES = CFG.slides;                  // ['01-hook', '02-…', …] in posting order
export const LOOP = CFG.loop || 8, FPS = CFG.fps || 30, W = 1080, H = 1350;
export const HTML = pathToFileURL(path.resolve(process.env.HTML || CFG.html)).href;

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
];

export async function launch() {
  const args = ['--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
  if (process.platform === 'darwin') args.push('--use-angle=metal');
  const exe = process.env.CHROME || CANDIDATES.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  try {
    return exe ? await chromium.launch({ executablePath: exe, headless: true, args }) : await chromium.launch({ channel: 'chrome', headless: true, args });
  } catch (e) {
    throw new Error(`Could not start Chrome (${e.message.split('\n')[0]}). Install Google Chrome, or set CHROME=/path/to/chrome.`);
  }
}

// open the carousel at a view ('strip' | 1..N) and time; collects page errors into page.__errs
export async function open(browser, { view = 1, t = 0, width = W, height = H, qs = '' } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.__errs = [];
  page.on('pageerror', e => page.__errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.__errs.push('console: ' + m.text().slice(0, 300)); });
  if (!fs.existsSync(path.resolve(process.env.HTML || CFG.html))) throw new Error(`${CFG.html} not found: run  node build.mjs  first`);
  await page.goto(`${HTML}?clean=1&capture=1&dpr=1&view=${view}&t=${t}${qs}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('the carousel failed to boot:\n' + err + (page.__errs.length ? '\n' + page.__errs.join('\n') : ''));
  return page;
}

export const go = (page, view, t) => page.evaluate(([v, tt]) => window.__go(v, tt), [view, t]);
export const pan = (page, p, t) => page.evaluate(([pp, tt]) => window.__pan(pp, tt), [p, t]);
// slides arg: "all" | "1,3,5" | "2-4"
export function pickSlides(arg) {
  if (!arg || arg === 'all') return NAMES.map((_, i) => i + 1);
  return arg.split(',').flatMap(s => { const [a, b] = s.split('-').map(Number); return b ? Array.from({ length: b - a + 1 }, (_, k) => a + k) : [a]; });
}
