// ================================================================== THE WORLD (continuous across all six slides)
const BGK = [ // [top, bottom] colour of each slide's world
  ['#030202', '#070302'], ['#0c0807', '#1d0e08'], ['#1c0c03', '#3f1b06'],
  ['#1e0403', '#4d0a07'], ['#060303', '#180705'], ['#a2250b', '#e5520f'],
];
const BAND = [300, 320, 320, 320, 190]; // half-width of the colour blend at each edge
let BGC = null;
function bakeBG() {
  const sc = 6, w = Math.ceil(WORLD / sc), h = Math.ceil(H / sc);
  BGC = mk(w, h); const g = BGC.getContext('2d'), im = g.createImageData(w, h);
  const T = BGK.map(([a, b]) => [hex2rgb(a), hex2rgb(b)]);
  for (let x = 0; x < w; x++) {
    const xw = (x + 0.5) * sc, top = T[0][0].slice(), bot = T[0][1].slice();
    for (let s = 1; s < N; s++) {
      const k = smooth(s * W - BAND[s - 1], s * W + BAND[s - 1], xw); if (k <= 0) continue;
      for (let c = 0; c < 3; c++) { top[c] = lerp(top[c], T[s][0][c], k); bot[c] = lerp(bot[c], T[s][1][c], k); }
    }
    for (let y = 0; y < h; y++) {
      const v = (((y + 0.5) * sc) / H) ** 1.25, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) im.data[i + c] = lerp(top[c], bot[c], v);
      im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
}
// slide 1 starts pitch black: world light there follows its fire
const worldLight = (xw, t) => lerp(S1.fire(t), 1, smooth(W - 280, W + 160, xw));

const FG = {};
function onionClump(g, cx, cy, sc, seed) {
  g.lineCap = 'round';
  for (let k = 0; k < 13; k++) {
    const th = hash(seed, k) * PI, len = (30 + 34 * hash(seed, k + 9)) * sc, x = cx + (hash(seed, k + 20) - 0.5) * 50 * sc, y = cy + (hash(seed, k + 30) - 0.5) * 34 * sc;
    const dx = Math.cos(th) * len / 2, dy = Math.sin(th) * len / 2, px = -dy * 1.4 * (hash(seed, k + 40) - 0.5), py = dx * 1.4 * (hash(seed, k + 40) - 0.5);
    const path = () => { g.beginPath(); g.moveTo(x - dx, y - dy); g.bezierCurveTo(x - dx * 0.3 + px, y - dy * 0.3 + py, x + dx * 0.3 - px, y + dy * 0.3 - py, x + dx, y + dy); };
    path(); g.strokeStyle = '#4a1d07'; g.lineWidth = 10 * sc; g.stroke();
    g.strokeStyle = mixHex('#a85618', '#e3a245', hash(seed, k + 50)); g.lineWidth = 6.5 * sc; g.stroke();
    g.strokeStyle = 'rgba(255,226,160,0.65)'; g.lineWidth = 1.8 * sc; g.save(); g.translate(0, -2 * sc); path(); g.stroke(); g.restore();
  }
}
function buildFG() {
  let c = mk(150, 150), g = c.getContext('2d'); jalSlice(g, 75, 75, 58, 0.82, 0.3); FG.jalS = soften(c, 1);
  c = mk(200, 200); g = c.getContext('2d'); g.translate(100, 96); g.rotate(0.5);
  g.beginPath(); g.moveTo(-62, -58); g.lineTo(58, -64); g.quadraticCurveTo(70, 0, 50, 34); g.quadraticCurveTo(40, 52, 46, 78);
  g.arc(36, 80, 10, 0, PI); g.quadraticCurveTo(26, 56, 6, 52); g.quadraticCurveTo(-40, 56, -60, 46); g.quadraticCurveTo(-70, 0, -62, -58); g.closePath();
  let cg = g.createLinearGradient(0, -64, 0, 90); cg.addColorStop(0, '#ffd75a'); cg.addColorStop(0.5, '#ffad24'); cg.addColorStop(1, '#e4800c');
  g.fillStyle = cg; g.fill(); g.strokeStyle = 'rgba(170,80,6,0.7)'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,248,210,0.8)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-48, -46); g.lineTo(30, -50); g.stroke();
  FG.onS = soften(c, 0.8);
  c = mk(300, 300); g = c.getContext('2d'); jalSlice(g, 150, 150, 120, 0.85, 0.6); FG.jalB = blurred(c, 7);
  c = mk(320, 280); g = c.getContext('2d'); onionClump(g, 160, 140, 2.1, 19); FG.onB = blurred(c, 7);
  c = mk(110, 130); g = c.getContext('2d');
  g.beginPath(); g.moveTo(55, 8); g.bezierCurveTo(70, 40, 98, 64, 92, 92); g.bezierCurveTo(86, 122, 24, 122, 18, 92); g.bezierCurveTo(12, 64, 40, 40, 55, 8); g.closePath();
  let gr = g.createRadialGradient(42, 70, 4, 55, 85, 60); gr.addColorStop(0, '#ff5636'); gr.addColorStop(0.5, '#c4180c'); gr.addColorStop(1, '#5e0603');
  g.fillStyle = gr; g.fill(); g.fillStyle = 'rgba(255,215,200,0.85)'; g.beginPath(); g.ellipse(40, 70, 9, 14, -0.4, 0, TAU); g.fill();
  FG.drop = soften(c, 0.8);
  c = mk(130, 130); g = c.getContext('2d'); g.translate(65, 65); g.beginPath();
  for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, r = 40 + 14 * hash(k, 8); k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); gr = g.createRadialGradient(-6, -6, 4, 0, 0, 58); gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(0.35, '#c8380c'); gr.addColorStop(0.75, '#5a1206'); gr.addColorStop(1, '#2a0804'); g.fillStyle = gr; g.fill();
  g.strokeStyle = '#ff8a2a'; g.lineWidth = 4; g.stroke();
  g.strokeStyle = '#ffd27a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-26, -6); g.lineTo(-4, 6); g.lineTo(14, -12); g.moveTo(-4, 6); g.lineTo(4, 30); g.stroke();
  FG.coal = soften(c, 0.7);
}
// ingredients floating in zero-g across each edge (persistent, so a swipe always lines up)
const FLOAT = [
  ['jalS', 2 * W + 46, 540, 1.0], ['onS', 2 * W - 66, 600, 0.7],
  ['jalS', 3 * W - 34, 856, 1.15], ['onS', 3 * W + 62, 936, 0.6], ['jalS', 3 * W + 14, 1004, 0.62],
  ['drop', 4 * W - 40, 560, 0.85], ['drop', 4 * W + 72, 646, 0.55], ['drop', 4 * W + 6, 728, 0.4],
  ['coal', 5 * W - 18, 770, 0.95], ['coal', 5 * W + 64, 852, 0.55],
];
function drawWorldBack(g, t, x0, x1) {
  g.fillStyle = '#050303'; g.fillRect(x0 - 300, -300, x1 - x0 + 600, H + 600);
  g.drawImage(BGC, 0, 0, WORLD, H);
  // floor: darker surface, horizon light, receding rows
  g.fillStyle = LG(g, 'floor', 0, FLOOR, 0, H, [[0, 'rgba(0,0,0,0.22)'], [0.06, 'rgba(0,0,0,0.42)'], [1, 'rgba(0,0,0,0.78)']]);
  g.fillRect(x0 - 300, FLOOR, x1 - x0 + 600, H - FLOOR + 300);
  const cw = 120, c0 = Math.floor(x0 / cw), c1 = Math.ceil(x1 / cw);
  for (let c = c0; c <= c1; c++) {
    const xc = (c + 0.5) * cw, wl = worldLight(xc, t); if (wl < 0.02) continue;
    g.fillStyle = `rgba(255,190,120,${0.2 * wl})`; g.fillRect(c * cw, FLOOR - 1, cw, 2);
    g.fillStyle = `rgba(255,200,150,${0.045 * wl})`;
    for (let j = 1; j < 8; j++) g.fillRect(c * cw, FLOOR + 10 * (1.55 ** j - 1), cw, 1.5);
  }
  // far bokeh (slow, big, behind everything)
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 80; i++) {
    const u = frac(t / LOOP + hash(i, 701)), xb = hash(i, 702) * WORLD, x = xb + 46 * Math.sin(u * TAU + i);
    if (x < x0 - 80 || x > x1 + 80) continue;
    const y = H + 60 - (H + 120) * u, s = 22 + 46 * hash(i, 703), wl = worldLight(x, t);
    g.globalAlpha = (0.08 + 0.14 * hash(i, 704)) * Math.sin(PI * u) * wl;
    g.drawImage(xb > 5 * W - 100 ? SPR.cream : SPR.orange, x - s, y - s, s * 2, s * 2);
  }
  g.restore();
}
function drawWorldFront(g, t, x0, x1) {
  for (const [key, x, y, s, ] of FLOAT) {
    const img = FG[key], i = x * 0.01 + y * 0.003, ww = img.width * s, hh = img.height * s;
    if (x + ww < x0 || x - ww > x1) continue;
    const px = x + 9 * Math.sin(t * OM(1) + i), py = y + 18 * Math.sin(t * OM(1) + i * 2.1);
    if (key === 'coal') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 + 0.25 * Math.sin(t * OM(8) + i); g.drawImage(SPR.orange, px - 120 * s, py - 120 * s, 240 * s, 240 * s); g.restore(); }
    g.save(); g.translate(px, py); g.rotate(0.4 * Math.sin(t * OM(1) + i * 3) + i); g.drawImage(img, -ww / 2, -hh / 2, ww, hh); g.restore();
  }
  // smoke band across the sauce | reveal edge (always there, so the swipe always matches)
  puffs(g, t, { n: 22, seed: 720, life: 4, sprites: SPR.smoke, x: () => 4 * W - 200, y: () => 900, spread: 760, yspread: 560, rise: 300, drift: 90, size: [260, 620], alpha: 0.26 });
  puffs(g, t, { n: 8, seed: 730, life: 4, sprites: SPR.smokeLit, comp: 'lighter', x: () => 4 * W - 160, y: () => 880, spread: 640, yspread: 400, rise: 260, drift: 90, size: [260, 560], alpha: 0.12 });
  // near embers (fast, big, streaky)
  embers(g, t, { n: 70, seed: 740, life: 2, x0: -200, x1: WORLD + 200, y0: H + 40, y1: H - 200, rise: 1500, wind: 90, size: [5, 15], alpha: 0.75, streak: true, wig: 50, inten: (tb, x) => worldLight(x, t) * (x > 5 * W ? 0.6 : 1) });
  // huge out-of-focus glows drifting up
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const u = frac(t / LOOP + hash(i, 751)), x = hash(i, 752) * WORLD + 120 * Math.sin(u * TAU);
    const s = 160 + 160 * hash(i, 753); if (x + s < x0 || x - s > x1) continue;
    const y = H + 300 - (H + 600) * u;
    g.globalAlpha = 0.09 * Math.sin(PI * u) * worldLight(x, t); g.drawImage(SPR.orange, x - s, y - s, s * 2, s * 2);
  }
  g.restore();
}
// everything the engine calls once fonts are loaded (sprites, background, chrome)
function projectBuild() { bakeBG(); buildFG(); buildChrome(); buildBrand(); }
