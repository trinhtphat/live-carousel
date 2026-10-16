// Bundles everything (three.js, code, fonts, images, the GLB boot, the sound) into ONE self-contained HTML file.
import { build } from 'esbuild';
import fs from 'fs';

const CFG = JSON.parse(fs.readFileSync('carousel.json', 'utf8'));   // slide names + output file
const NAMES = CFG.slides;

const b64 = f => fs.readFileSync(f).toString('base64');
const uri = (f, mime) => `data:${mime};base64,${b64(f)}`;
const manifest = JSON.parse(fs.readFileSync('src/assets/manifest.json', 'utf8'));
const assets = {
  img: Object.fromEntries(Object.keys(manifest).map(k => [k, uri(`src/assets/${k}.webp`, 'image/webp')])),
  bootGlb: b64('src/assets/boot.glb'),
  fraktur: JSON.parse(fs.readFileSync('src/assets/fraktur.json', 'utf8')),
  audio: NAMES.map(n => (fs.existsSync(`src/assets/audio/${n}.webm`) ? b64(`src/assets/audio/${n}.webm`) : null)),
};
fs.writeFileSync('src/assets.gen.js', `export const ASSETS = ${JSON.stringify(assets)};\nexport const MANIFEST = ${JSON.stringify(manifest)};\n`);

await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, target: 'es2020', outfile: 'dist/app.js', logLevel: 'warning' });

const font = (fam, file, mime, extra = '') => `@font-face{font-family:${fam};src:url(${uri(file, mime)});font-display:block;${extra}}`;
const fonts = [
  font('Anton', 'fonts/Anton.woff2', 'font/woff2'),
  font('JBM', 'fonts/JetBrainsMono-Var.woff2', 'font/woff2', 'font-weight:100 800;'),
  font('Anybody', 'fonts/Anybody-Var.woff2', 'font/woff2', 'font-weight:100 900;font-stretch:50% 150%;'),
  font('Fraktur', 'fonts/UnifrakturCook-Bold.ttf', 'font/ttf', 'font-weight:700;'),
  font('Marker', 'fonts/PermanentMarker-Regular.ttf', 'font/ttf'),
  font('Stencil', 'fonts/SairaStencilOne-Regular.ttf', 'font/ttf'),
  font('Archivo', 'fonts/Archivo-Var.ttf', 'font/ttf', 'font-weight:100 900;font-stretch:62% 125%;'),
  font('Doto', 'fonts/Doto-Var.ttf', 'font/ttf', 'font-weight:100 900;'),
].join('\n');
const js = fs.readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*FONTS*/', () => fonts)
  .replace('/*APP*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(CFG.html, html);
console.log(CFG.html, (html.length / 1e6).toFixed(2), 'MB');
