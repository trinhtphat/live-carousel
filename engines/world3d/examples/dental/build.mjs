// Bundles everything (three.js, code, fonts, images, GLB models) into ONE self-contained HTML file.
import { build } from 'esbuild';
import fs from 'fs';

const CFG = JSON.parse(fs.readFileSync('carousel.json', 'utf8'));   // slide names + output file
const NAMES = CFG.slides;

const b64 = f => fs.readFileSync(f).toString('base64');
const uri = (f, mime) => `data:${mime};base64,${b64(f)}`;
const assets = {
  implant: uri('src/assets/implant.webp', 'image/webp'),
  molar: uri('src/assets/molar.webp', 'image/webp'),
  aligner: uri('src/assets/aligner.webp', 'image/webp'),
  arch: uri('src/assets/arch.webp', 'image/webp'),
  hero: uri('src/assets/hero.webp', 'image/webp'),
  implantGlb: b64('src/assets/implant.glb'),
  molarGlb: b64('src/assets/molar.glb'),
  audio: NAMES.map(n => fs.existsSync(`src/assets/audio/${n}.webm`) ? b64(`src/assets/audio/${n}.webm`) : ''),
};
const manifest = JSON.parse(fs.readFileSync('src/assets/manifest.json', 'utf8'));
fs.writeFileSync('src/assets.gen.js', `export const ASSETS = ${JSON.stringify(assets)};\nexport const MANIFEST = ${JSON.stringify(manifest)};\n`);

await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, target: 'es2020', outfile: 'dist/app.js', logLevel: 'warning' });

const font = (fam, file, extra = '') => `@font-face{font-family:${fam};src:url(${uri(file, 'font/woff2')}) format('woff2');font-display:block;${extra}}`;
const fonts = [
  font('Anton', 'fonts/Anton.woff2'),
  font('JBM', 'fonts/JetBrainsMono-Var.woff2', 'font-weight:100 800;'),
  font('Anybody', 'fonts/Anybody-Var.woff2', 'font-weight:100 900;font-stretch:50% 150%;'),
].join('\n');
const js = fs.readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*FONTS*/', () => fonts)
  .replace('/*APP*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(CFG.html, html);
console.log(CFG.html, (html.length / 1e6).toFixed(2), 'MB');
