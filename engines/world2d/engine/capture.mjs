// Frame-exact capture of carousel.html through headless Chrome (no npm dependencies, Node 22+).
//   node tools/capture.mjs frames renders/qa "1:0.5,2:2.3"   one JPEG per slide:time
//   node tools/capture.mjs sheet  renders/qa                  contact sheet: every slide at 5 moments + loop seam pairs
//   node tools/capture.mjs seams  renders/qa "2.5,5"           close-ups across every slide edge in the strip
//   node tools/capture.mjs video  renders "all" [fps]          slide-01.mp4 … (H.264, yuv420p, one exact loop each)
//   node tools/capture.mjs hits   audio                       each slide's impact times → audio/hits.json (for add_sound.py)
//   node tools/capture.mjs bench  renders/qa                   ms per frame (strip and single)
// Set CHROME=/path/to/chrome if Chrome is not found automatically.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(here, '..', 'carousel.html');
const [mode, outArg = 'renders/qa', list = '', fpsArg] = process.argv.slice(2);
const outDir = path.resolve(outArg);
const FPS = parseInt(fpsArg || '30', 10);
if (!fs.existsSync(HTML)) { console.error(`No carousel.html next to tools/. Run: python3 build.py`); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME && fs.existsSync(process.env.CHROME)) return process.env.CHROME;
  const c = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  ];
  return c.find((p) => fs.existsSync(p));
}
const CHROME = findChrome();
if (!CHROME) { console.error('Chrome/Chromium/Edge not found. Install Google Chrome or set CHROME=/path/to/chrome'); process.exit(1); }
const hasFF = spawnSync('ffmpeg', ['-version']).status === 0;

const port = 9400 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--window-size=1600,1000', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 120; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/new?${pathToFileURL(HTML).href}?paused=1`, { method: 'PUT' }); target = await r.json(); break; } catch { await sleep(150); }
}
if (!target) { console.error('Could not start headless Chrome'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0, pageErrors = 0; const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') { pageErrors++; console.error('PAGE EXCEPTION:', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); }
  else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) console.error('PAGE', m.params.type, m.params.args.map((a) => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalv = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await send('Runtime.enable');
let ok = false;
for (let i = 0; i < 200; i++) { if (await evalv('!!(window.EB && EB.ready())').catch(() => false)) { ok = true; break; } await sleep(100); }
const done = (code = 0) => { ws.close(); chrome.kill('SIGKILL'); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(code); }, 300); };
if (!ok) { console.error('The page never became ready (a JS error in a slide build() is the usual cause).'); done(1); }
const N = await evalv('EB.N'), LOOP = await evalv('EB.LOOP');
const jpg = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
const frame = async (k, t, q = 0.9) => jpg(await evalv(`EB.frame(${k - 1}, ${t}, 'image/jpeg', ${q})`));
const ffmpeg = (args) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]); if (r.status) console.error(String(r.stderr)); return r.status === 0; };

try {
  if (mode === 'frames') {
    for (const item of list.split(',').filter(Boolean)) {
      const [k, t] = item.split(':').map(Number);
      const f = path.join(outDir, `s${k}_${t.toFixed(2)}.jpg`); fs.writeFileSync(f, await frame(k, t)); console.log(f);
    }
  } else if (mode === 'sheet') {
    // rows = slides; columns = loop start, 25%, 50%, 75%, last frame (last|first must look continuous)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-sheet-')); let n = 0;
    const ts = [0, LOOP * 0.25, LOOP * 0.5, LOOP * 0.75, LOOP - 1 / 30];
    for (let k = 1; k <= N; k++) for (const t of ts) fs.writeFileSync(path.join(tmp, `f_${String(n++).padStart(3, '0')}.jpg`), await frame(k, t, 0.85));
    const out = path.join(outDir, 'contact-sheet.jpg');
    if (hasFF && ffmpeg(['-i', path.join(tmp, 'f_%03d.jpg'), '-vf', `scale=300:-1,tile=5x${N}:padding=6:color=0x111111`, '-frames:v', '1', '-q:v', '3', out])) console.log(out, `(rows = slides 1-${N}; columns = 0, 25%, 50%, 75%, last frame)`);
    else { for (const f of fs.readdirSync(tmp)) fs.copyFileSync(path.join(tmp, f), path.join(outDir, f)); console.log('ffmpeg missing: wrote single frames to', outDir); }
    fs.rmSync(tmp, { recursive: true, force: true });
  } else if (mode === 'seams') {
    const times = (list || `${LOOP * 0.3},${LOOP * 0.6}`).split(',').map(Number);
    for (const t of times) {
      const strip = path.join(outDir, `strip_${t.toFixed(2)}.jpg`); fs.writeFileSync(strip, jpg(await evalv(`EB.strip(${t}, 0.5)`)));
      if (!hasFF) { console.log(strip); continue; }
      const crops = [];
      for (let s = 1; s < N; s++) { const c = path.join(outDir, `_seam${s}.jpg`); ffmpeg(['-i', strip, '-vf', `crop=360:675:${s * 540 - 180}:0`, c]); crops.push(c); }
      const out = path.join(outDir, `seams_${t.toFixed(2)}.jpg`);
      ffmpeg([...crops.flatMap((c) => ['-i', c]), '-filter_complex', `${crops.map((_, i) => `[${i}:v]pad=372:675:6:0:color=0x111111[v${i}]`).join(';')};${crops.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${crops.length}`, '-q:v', '3', out]);
      crops.forEach((c) => fs.rmSync(c)); console.log(out, '(each panel is centred on one slide edge)');
    }
  } else if (mode === 'video') {
    if (!hasFF) throw new Error('ffmpeg is needed for video');
    const frames = Math.round(LOOP * FPS), slides = list && list !== 'all' ? list.split(',').map(Number) : [...Array(N).keys()].map((i) => i + 1);
    for (const k of slides) {
      const out = path.join(outDir, `slide-${String(k).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-g', String(FPS), '-profile:v', 'high', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let f = 0; f < frames; f++) { const buf = await frame(k, f / FPS, 0.95); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); }
      ff.stdin.end(); await new Promise((r) => ff.on('close', r));
      console.log(out, `${frames} frames, ${LOOP}s loop, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  } else if (mode === 'hits') {
    // every slide's impact moments (shakes / flashes) → <out>/hits.json, for scripts/add_sound.py
    const hits = await evalv('EB.hits()');
    const out = path.join(outDir, 'hits.json'); fs.writeFileSync(out, JSON.stringify(hits, null, 1)); console.log(out, `${hits.slides.length} slides`);
  } else if (mode === 'bench') {
    console.log('strip  ms/frame', (await evalv('EB.bench(30, true, 0.4)')).toFixed(1));
    console.log('single ms/frame', (await evalv('EB.bench(30, false, 1)')).toFixed(1));
  } else { console.error('mode must be frames | sheet | seams | video | hits | bench'); process.exitCode = 1; }
} catch (e) { console.error('ERROR', e.message); process.exitCode = 1; }
if (pageErrors) { console.error(`${pageErrors} page error(s) above: fix them in src/ and rebuild.`); process.exitCode = 1; }
done(process.exitCode || 0);
