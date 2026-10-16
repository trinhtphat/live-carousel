// ================================================================== THE BURGER
// Drawn in local units: origin = centre of the bottom bun's floor contact, y up = negative.
// Every topping lives at a material angle around the vertical axis, so B.rot turns the
// whole burger like a turntable (used in the reveal).
const PERS = 0.16; // ellipse ry/rx (camera slightly above)
const BUN = { rx: 248, h: 110 }, PAT = { rx: 270, h: 40 }, TOPB = { rx: 256, h: 198 };
const Y = { bunTop: -110, p1b: -104, p2b: -140, ch: -179, pile: -182, sauce: -211, topB: -218 };

const NP = 96, PX = new Float32Array(NP), PZ = new Float32Array(NP);
function pattyRadii(seed) {
  const r = new Float32Array(NP);
  const ks = [2, 3, 5, 7, 9, 13, 17, 23, 29, 37, 47];
  const am = [0.012, 0.02, 0.016, 0.012, 0.01, 0.009, 0.008, 0.008, 0.01, 0.009, 0.008];
  const ph = ks.map((_, i) => hash(seed, i) * TAU);
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * TAU; let v = 1;
    for (let j = 0; j < ks.length; j++) v += am[j] * Math.sin(ks[j] * a + ph[j]);
    r[i] = v + (hash(seed + 5, i) - 0.5) * 0.022;
  }
  return r;
}
const PR1 = pattyRadii(11), PR2 = pattyRadii(23);

const BUNB_PATH = (() => {
  const p = new Path2D(), rx = BUN.rx, top = Y.bunTop, ry = rx * PERS;
  const tr = rx * 0.965;
  p.moveTo(-tr, top);
  p.bezierCurveTo(-rx * 1.015, top + 20, -rx * 1.02, -52, -rx + 8, -32);
  p.quadraticCurveTo(-rx + 22, -12, -rx + 60, -8);
  p.quadraticCurveTo(0, 14, rx - 60, -8);
  p.quadraticCurveTo(rx - 22, -12, rx - 8, -32);
  p.bezierCurveTo(rx * 1.02, -52, rx * 1.015, top + 20, tr, top);
  p.ellipse(0, top, tr, tr * PERS, 0, 0, PI, false); p.closePath();
  return p;
})();
const TOP_PATH = (() => {
  const p = new Path2D(), rx = TOPB.rx, hh = TOPB.h, b = Y.topB, ry = rx * PERS;
  p.moveTo(-rx, b);
  p.bezierCurveTo(-rx, b - hh * 0.62, -rx * 0.6, b - hh, 0, b - hh);
  p.bezierCurveTo(rx * 0.6, b - hh, rx, b - hh * 0.62, rx, b);
  p.ellipse(0, b, rx, ry, 0, 0, PI, false); p.closePath();
  return p;
})();
const DOME_EDGE = (() => {
  const p = new Path2D(), rx = TOPB.rx, hh = TOPB.h, b = Y.topB;
  p.moveTo(-rx, b + 10);
  p.bezierCurveTo(-rx, b - hh * 0.62, -rx * 0.6, b - hh, 0, b - hh);
  p.bezierCurveTo(rx * 0.6, b - hh, rx, b - hh * 0.62, rx, b + 10);
  return p;
})();
const rimGrad = (g) => LG(g, 'rim', -300, 0, 300, 0, [[0, 'rgba(255,196,96,1)'], [0.13, 'rgba(255,128,36,0.45)'], [0.3, 'rgba(255,96,20,0)'], [0.7, 'rgba(255,96,20,0)'], [0.87, 'rgba(255,128,36,0.45)'], [1, 'rgba(255,196,96,1)']]);
function rimStroke(g, path, rim, w = 7) {
  if (!(rim > 0)) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rimGrad(g);
  g.globalAlpha = rim; g.lineWidth = w; g.stroke(path);
  g.globalAlpha = rim * 0.3; g.lineWidth = w * 4; g.stroke(path);
  g.restore();
}
function aoOn(g, y, rx, a) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = clamp(a); g.drawImage(SPR.dark, -rx * 1.05, y - rx * PERS * 1.5, rx * 2.1, rx * PERS * 3); g.restore();
}
function withLayer(g, Lr, base, fn) {
  g.save();
  if (Lr.dy) g.translate(0, Lr.dy);
  if (Lr.st) { g.translate(0, base); g.scale(1 - Lr.st * 0.45, 1 + Lr.st); g.translate(0, -base); }
  fn(); g.restore();
}
const approach = (Lr) => 1 - clamp(-(Lr.dy || 0) / 520);

// ---------------------------------------------------------------- bottom bun
const CRUMB = Array.from({ length: 70 }, (_, i) => ({ a: hash(541, i) * TAU, r: Math.sqrt(hash(542, i)) * 0.85, s: 2 + 5 * hash(543, i), d: hash(544, i) < 0.6 }));
function drawBunB(g, B) {
  const rx = BUN.rx, top = Y.bunTop, ry = rx * PERS;
  g.fillStyle = LG(g, 'bunSide', -rx, 0, rx, 0, [[0, '#4a1c07'], [0.07, '#8e4114'], [0.22, '#cf7a30'], [0.4, '#eba552'], [0.56, '#de8a38'], [0.78, '#a04a17'], [0.93, '#62270b'], [1, '#421806']]);
  g.fill(BUNB_PATH);
  g.fillStyle = LG(g, 'bunShade', 0, top + 30, 0, 14, [[0, 'rgba(40,10,0,0)'], [0.5, 'rgba(40,10,0,0.1)'], [1, 'rgba(26,5,0,0.6)']]);
  g.fill(BUNB_PATH);
  // toasted cut face with crumb
  const tr = rx * 0.965;
  g.beginPath(); g.ellipse(0, top, tr, tr * PERS, 0, 0, TAU);
  g.fillStyle = RG(g, 'bunCut', -30, top - 6, 10, 0, top, tr * 1.02, [[0, '#f8deaa'], [0.45, '#f0c47e'], [0.78, '#dc9540'], [0.93, '#b8661f'], [1, '#8a4512']]);
  g.fill();
  g.save(); g.clip();
  for (const q of CRUMB) {
    const a = q.a + (B.rot || 0), x = Math.sin(a) * q.r * tr, y = top + Math.cos(a) * q.r * tr * PERS;
    g.fillStyle = q.d ? 'rgba(150,80,25,0.32)' : 'rgba(255,240,205,0.4)'; g.beginPath(); g.ellipse(x, y, q.s, q.s * 0.4, 0, 0, TAU); g.fill();
  }
  g.restore();
  g.strokeStyle = 'rgba(110,45,8,0.5)'; g.lineWidth = 2.5; g.stroke();
  // soft sheen
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16;
  g.drawImage(SPR.cream, -rx * 0.75, top + 4, rx * 0.8, 58); g.restore();
  rimStroke(g, BUNB_PATH, B.rim, 6);
}

// ---------------------------------------------------------------- smash patty (lacy, crispy, extruded)
const PSPECK = Array.from({ length: 54 }, (_, i) => ({ a: hash(501, i) * TAU, h: hash(502, i), r: 1.2 + 2.6 * hash(503, i), d: hash(504, i) < 0.6 }));
const PCHAR = Array.from({ length: 30 }, (_, i) => ({ a: hash(511, i) * TAU, rho: Math.sqrt(hash(512, i)) * 0.9, r: 5 + 12 * hash(513, i) }));
const PLACE = Array.from({ length: 34 }, (_, i) => ({ a: hash(521, i) * TAU, rr: 1.02 + 0.05 * hash(522, i), r: 3 + 5 * hash(523, i) }));
function drawPatty(g, yb, rad, B, t, seed) {
  const rx = PAT.rx, ry = rx * PERS, h = PAT.h, rot = B.rot || 0, steps = 7;
  for (let i = 0; i < NP; i++) { const a = (i / NP) * TAU + rot; PX[i] = Math.sin(a) * rad[i] * rx; PZ[i] = Math.cos(a) * rad[i] * ry; }
  const c = gcache(g);
  if (!c.patSide) {
    c.patSide = [];
    for (let s = 0; s < steps; s++) {
      const k = s / (steps - 1);
      const mid = mixHex('#311207', '#7f3c18', k), hi = mixHex('#43190a', '#ad5d2a', k), edge = mixHex('#140703', '#40190a', k);
      const gr = g.createLinearGradient(-rx * 1.06, 0, rx * 1.06, 0);
      gr.addColorStop(0, edge); gr.addColorStop(0.22, mid); gr.addColorStop(0.42, hi); gr.addColorStop(0.62, mid); gr.addColorStop(0.9, edge); gr.addColorStop(1, edge);
      c.patSide.push(gr);
    }
  }
  for (let s = 0; s < steps; s++) {
    const y = yb - h * (s / (steps - 1)) * 0.92;
    g.beginPath();
    for (let i = 0; i < NP; i++) { const yy = y + PZ[i]; if (i) g.lineTo(PX[i], yy); else g.moveTo(PX[i], yy); }
    g.closePath(); g.fillStyle = c.patSide[s]; g.fill();
  }
  // side specks (crust texture)
  for (const p of PSPECK) {
    const a = p.a + rot, cz = Math.cos(a); if (cz < 0.15) continue;
    const x = Math.sin(a) * rx * 1.0, y = yb - h * p.h * 0.9 + cz * ry;
    g.fillStyle = p.d ? 'rgba(18,6,2,0.55)' : 'rgba(190,110,55,0.45)';
    g.beginPath(); g.ellipse(x, y, p.r * 1.4, p.r, 0, 0, TAU); g.fill();
  }
  // top face
  const yt = yb - h;
  g.beginPath();
  for (let i = 0; i < NP; i++) { const yy = yt + PZ[i]; if (i) g.lineTo(PX[i], yy); else g.moveTo(PX[i], yy); }
  g.closePath();
  g.save(); g.translate(0, yt);
  g.fillStyle = RG(g, 'patTop', -50, -8, 20, 0, 0, rx * 1.02, [[0, '#7c3d1b'], [0.55, '#5c2b13'], [0.85, '#4a200d'], [1, '#2e1306']]);
  g.fill(); g.restore();
  g.strokeStyle = 'rgba(196,112,46,0.95)'; g.lineWidth = 3.5; g.stroke();
  g.strokeStyle = 'rgba(236,166,100,0.45)'; g.lineWidth = 1.2; g.stroke();
  for (const p of PCHAR) {
    const a = p.a + rot, x = Math.sin(a) * p.rho * rx, y = yt + Math.cos(a) * p.rho * ry;
    g.fillStyle = 'rgba(28,10,4,0.3)'; g.beginPath(); g.ellipse(x, y, p.r, p.r * 0.32, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,200,150,0.12)'; g.beginPath(); g.ellipse(x - p.r * 0.6, y - 2, p.r * 0.5, p.r * 0.14, 0, 0, TAU); g.fill();
  }
  // crispy lace bits around the rim
  g.fillStyle = 'rgba(150,78,30,0.95)';
  for (const p of PLACE) {
    const a = p.a + rot, cz = Math.cos(a); if (cz < -0.2) continue;
    const x = Math.sin(a) * p.rr * rx, y = yt + 4 + cz * p.rr * ry;
    g.beginPath(); g.ellipse(x, y, p.r, p.r * 0.6, a, 0, TAU); g.fill();
  }
  // sizzle glints
  if (B.glint > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 16; m++) {
      const a = hash(531 + seed, m) * 2.6 - 1.3 + rot * 0, cz = Math.cos(a);
      const f = Math.max(0, pnoise(t + m * 0.37, 64, seed * 50 + m)); if (f < 0.15) continue;
      const x = Math.sin(a) * rx * 0.98, y = yt + cz * ry * 0.98 + 2;
      g.globalAlpha = B.glint * f * f; g.drawImage(SPR.cream, x - 9, y - 9, 18, 18);
    }
    g.restore();
  }
  if (B.rim > 0) {
    g.beginPath();
    for (let i = 0; i < NP; i++) { const yy = yb - h * 0.5 + PZ[i]; if (i) g.lineTo(PX[i], yy); else g.moveTo(PX[i], yy); }
    g.closePath();
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rimGrad(g); g.globalAlpha = B.rim * 0.9; g.lineWidth = 6; g.stroke(); g.restore();
  }
}

// ---------------------------------------------------------------- melted cheddar (a square slice draping over a round patty)
const CHS = { A: 262, phi0: 0.42, n: 128 };
const CHR = new Float32Array(CHS.n), CXa = new Float32Array(CHS.n), CYa = new Float32Array(CHS.n), CZa = new Float32Array(CHS.n);
for (let i = 0; i < CHS.n; i++) { const a = (i / CHS.n) * TAU - CHS.phi0; CHR[i] = CHS.A / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); }
const CDRIP = [
  [-1.12, 46, 30, 0.0], [-0.66, 40, 21, 0.3], [-0.22, 70, 25, 0.1], [0.1, 30, 18, 0.5],
  [0.46, 54, 32, 0.0], [0.8, 62, 22, 0.2], [1.22, 34, 19, 0.4],
].map(([a, len, w, d], i) => ({ a, len, w, d, i }));
function cheeseAt(phi, rr, rot, flop, melt) {
  const R = PAT.rx * 0.99, ps = phi + rot, cz = Math.cos(ps), sx = Math.sin(ps);
  const o = rr - R; let rho, dv = 0;
  if (o > 0) {
    const front = smooth(-0.2, 0.3, cz);
    rho = lerp(rr, R + o * 0.1, flop);
    dv = o * (0.2 + 0.55 * melt) * flop * front;
  } else rho = rr + 10 * melt * flop;
  return { x: rho * sx, y: rho * cz * PERS + dv, cz };
}
function drawCheese(g, B, t) {
  const C = B.cheese, rot = B.rot || 0, yc = Y.ch;
  const flop = C.flop, melt = C.melt;
  g.beginPath();
  for (let i = 0; i < CHS.n; i++) {
    const p = cheeseAt((i / CHS.n) * TAU, CHR[i], rot, flop, melt);
    CXa[i] = p.x; CYa[i] = yc + p.y; CZa[i] = p.cz;
    if (i) g.lineTo(CXa[i], CYa[i]); else g.moveTo(CXa[i], CYa[i]);
  }
  g.closePath();
  const fill = LG(g, 'cheese', 0, yc - 50, 0, yc + 170, [[0, '#ffdb63'], [0.3, '#ffb829'], [0.62, '#f7961a'], [1, '#dc720a']]);
  g.fillStyle = fill; g.fill();
  g.strokeStyle = 'rgba(176,80,6,0.6)'; g.lineWidth = 2; g.stroke();
  // drips
  const grow = C.grow || 0;
  g.beginPath();
  const tips = [];
  for (const d of CDRIP) {
    const gi = clamp(grow * 1.35 - d.d * 0.35); if (gi <= 0) continue;
    const ps = d.a + rot, cz = Math.cos(ps); if (cz < 0.08) continue;
    const idx = Math.round(((((d.a % TAU) + TAU) % TAU) / TAU) * CHS.n) % CHS.n;
    const p = cheeseAt(d.a, CHR[idx], rot, flop, melt);
    const wob = 1 + 0.06 * Math.sin(t * OM(2) + d.i * 1.3);
    const len = d.len * E.ioS(gi) * wob, w = d.w * Math.sqrt(cz);
    dripPath(g, p.x, yc + p.y - 3, w, len); tips.push([p.x, yc + p.y - 3, w, len]);
  }
  g.fillStyle = fill; g.fill();
  // gloss
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,240,190,0.5)'; g.lineWidth = 2.5; g.lineCap = 'round';
  g.beginPath(); let on = false;
  for (let i = 0; i < CHS.n; i++) {
    if (CZa[i] > 0.25) { if (!on) { g.moveTo(CXa[i], CYa[i] - 2); on = true; } else g.lineTo(CXa[i], CYa[i] - 2); } else on = false;
  }
  g.stroke();
  for (const [x, y, w, len] of tips) { g.beginPath(); g.moveTo(x - w * 0.22, y + 6); g.lineTo(x - w * 0.22, y + len - w * 0.5); g.stroke(); }
  g.globalAlpha = 0.22 * melt; g.drawImage(SPR.gold, -150, yc - 40, 300, 60);
  g.restore();
}

// ---------------------------------------------------------------- crispy onions (strands) & jalapeños (slices)
const ON = Array.from({ length: 74 }, (_, i) => {
  const rho = 300 * (0.3 + 0.7 * Math.sqrt(hash(302, i)));
  return {
    a: hash(301, i) * TAU, rho: i < 64 ? rho : 60 + 150 * hash(313, i), z: i < 64 ? 28 * (1 - (rho / 310) ** 2) + 5 * hash(303, i) + (rho > 270 ? -6 : 0) : 46 + 6 * hash(303, i),
    th: (hash(304, i) - 0.5) * PI, len: 20 + 22 * hash(305, i), curl: (hash(306, i) - 0.5) * 2.4, curl2: (hash(312, i) - 0.5) * 2.4,
    w: 4 + 2.8 * hash(307, i), col: hash(308, i), td: i < 64 ? (i / 64) * 1.3 + hash(309, i) * 0.12 : 3.55 + (i - 64) * 0.05, fd: 0.42 + 0.16 * hash(310, i),
    spin: (hash(311, i) - 0.5) * 9,
  };
});
const ONORD = ON.map((_, i) => i), ONZ = new Float32Array(ON.length);
const JA = Array.from({ length: 10 }, (_, i) => {
  const edge = i >= 7, a = edge ? [-0.55, 0.25, 0.95][i - 7] : -1.3 + (i / 6) * 2.6 + (hash(401, i) - 0.5) * 0.3;
  return {
    a, rho: edge ? 262 + 10 * hash(402, i) : 120 + 120 * hash(402, i), z: edge ? 12 : 26 + 10 * hash(403, i), tilt: edge ? 0.62 + 0.2 * hash(404, i) : 0.5 + 0.3 * hash(404, i),
    ang: (hash(405, i) - 0.5) * (edge ? 0.6 : 1.1), r: 32 + 9 * hash(406, i), td: [0, 0.13, 0.25, 0.36, 0.47, 0.57, 0.66, 0.74, 0.82, 0.9][i], fd: 0.5, spin: 2 + 3 * hash(407, i),
  };
});
function drawOnions(g, B, t) {
  const T = B.onT, rot = B.rot || 0;
  for (let k = 0; k < ON.length; k++) { const o = ON[k]; ONZ[k] = o.rho * Math.cos(o.a + rot); }
  ONORD.sort((a, b) => ONZ[a] - ONZ[b]);
  g.lineCap = 'round';
  for (const k of ONORD) {
    const o = ON[k], tau = T - o.td;
    if (tau < -o.fd) continue;
    let yoff = 0, th = o.th;
    if (tau < 0) { const u = (tau + o.fd) / o.fd; yoff = -1150 * (1 - u * u); th += o.spin * (1 - u); }
    else { yoff = -18 * Math.abs(Math.sin(tau * 15)) * Math.exp(-tau * 7); th += 0.3 * kick(tau, 18, 8); }
    const x = o.rho * Math.sin(o.a + rot), y = Y.pile - o.z + ONZ[k] * PERS + yoff;
    const cx = Math.cos(th) * o.len * 0.5, cy = Math.sin(th) * o.len * 0.5, px = -Math.sin(th) * o.len * 0.5, py = Math.cos(th) * o.len * 0.5;
    const ax = x - cx, ay = y - cy, bx = x + cx, by = y + cy;
    const c1x = ax + cx * 0.7 + px * o.curl, c1y = ay + cy * 0.7 + py * o.curl, c2x = bx - cx * 0.7 + px * o.curl2, c2y = by - cy * 0.7 + py * o.curl2;
    g.beginPath(); g.moveTo(ax, ay); g.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by);
    g.strokeStyle = '#4a1d07'; g.lineWidth = o.w + 2.6; g.stroke();
    g.strokeStyle = o.col < 0.5 ? mixHex('#9a4d16', '#c97a2a', o.col * 2) : mixHex('#c97a2a', '#e6a648', (o.col - 0.5) * 2);
    g.lineWidth = o.w; g.stroke();
    g.strokeStyle = 'rgba(255,222,150,0.6)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(ax, ay - 1.5); g.bezierCurveTo(c1x, c1y - 1.5, c2x, c2y - 1.5, bx, by - 1.5); g.stroke();
  }
}
function jalSlice(g, x, y, r, tilt, ang) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(1, tilt);
  g.fillStyle = '#14491a'; g.beginPath(); g.arc(0, 2.5 / tilt, r, 0, TAU); g.fill();       // thickness
  g.fillStyle = '#237a26'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = '#86c440'; g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.fill();
  g.fillStyle = '#cfe59a'; g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.fill();
  g.fillStyle = '#eef5cc'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
  g.fillStyle = '#f7f0cf'; g.strokeStyle = 'rgba(160,150,90,0.8)'; g.lineWidth = 1;
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * TAU + 0.4; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.13, r * 0.08, a, 0, TAU); g.fill(); g.stroke();
  }
  g.strokeStyle = 'rgba(200,255,170,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r - 4, -2.6, -1.3); g.stroke();
  g.restore();
}
function drawJalas(g, B, t) {
  const T = B.jaT, rot = B.rot || 0;
  const order = JA.map((j, i) => [j.rho * Math.cos(j.a + rot), i]).sort((a, b) => a[0] - b[0]);
  for (const [zz, i] of order) {
    const j = JA[i], tau = T - j.td;
    if (tau < -j.fd) continue;
    let yoff = 0, tilt = j.tilt, ang = j.ang;
    if (tau < 0) { const u = (tau + j.fd) / j.fd; yoff = -1200 * (1 - u * u); tilt = j.tilt * Math.max(0.15, Math.abs(Math.cos(j.spin * (1 - u) * 3))); ang += j.spin * (1 - u) * 0.6; }
    else { yoff = -36 * Math.abs(Math.sin(tau * 13)) * Math.exp(-tau * 6); tilt *= 1 - 0.22 * damp(tau, 22, 8); }
    const x = j.rho * Math.sin(j.a + rot), y = Y.pile - j.z + zz * PERS + yoff;
    jalSlice(g, x, y, j.r, tilt, ang);
  }
}

// ---------------------------------------------------------------- smoky chili sauce (zig-zag drizzle + drips)
const SZ_N = 80;
const SZM = Array.from({ length: SZ_N + 1 }, (_, j) => {
  const s = j / SZ_N, R = 268, xm = lerp(-0.84, 0.84, s) * R;
  return [xm, 0.62 * R * Math.sin(s * PI * 4.5) * Math.sqrt(Math.max(0, 1 - (xm / R) ** 2))];
});
const SDRIP = [[-0.78, 44, 22, 0.1], [-0.18, 62, 26, 0], [0.4, 38, 20, 0.3], [0.92, 52, 22, 0.15]];
function drawSauce(g, B, t) {
  const S = B.sauce, rot = B.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
  // drips first (they run down the front, over cheese & patties)
  if (S.drip > 0) {
    g.beginPath(); const tips = [];
    SDRIP.forEach(([a, len, w, d], i) => {
      const gi = clamp(S.drip * 1.3 - d * 0.3); if (gi <= 0) return;
      const ps = a + rot, cz = Math.cos(ps); if (cz < 0.1) return;
      const R = 262, x = Math.sin(ps) * R, y0 = Y.sauce + 10 + cz * R * PERS;
      const ln = len * E.ioS(gi) * (1 + 0.05 * Math.sin(t * OM(2) + i)), ww = w * Math.sqrt(cz);
      dripPath(g, x, y0, ww, ln); tips.push([x, y0, ww, ln]);
    });
    g.fillStyle = LG(g, 'sauceDrip', 0, -220, 0, -60, [[0, '#d42412'], [0.6, '#a5120a'], [1, '#7a0905']]); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,150,120,0.55)'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (const [x, y, w, len] of tips) { g.beginPath(); g.moveTo(x - w * 0.2, y + 4); g.lineTo(x - w * 0.2, y + len - w * 0.55); g.stroke(); }
    g.restore();
  }
  const n = Math.floor(S.d * SZ_N); if (n < 1) return;
  g.beginPath();
  for (let j = 0; j <= n; j++) {
    const [xm, zm] = SZM[j], x = xm * cr + zm * sr, z = zm * cr - xm * sr, y = Y.sauce + z * PERS;
    if (j) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#4e0604'; g.lineWidth = 17; g.stroke();
  g.strokeStyle = '#c3170b'; g.lineWidth = 12; g.stroke();
  g.save(); g.translate(0, -3); g.strokeStyle = 'rgba(255,128,96,0.8)'; g.lineWidth = 3.5; g.stroke(); g.restore();
}

// ---------------------------------------------------------------- top bun (glossy brioche, branded)
const BLOT = Array.from({ length: 12 }, (_, i) => ({ a: hash(601, i) * TAU, h: 0.15 + 0.7 * hash(602, i), r: 16 + 26 * hash(603, i), l: hash(604, i) < 0.5 }));
let BRAND = null;
function drawBunT(g, B) {
  const rx = TOPB.rx, hh = TOPB.h, b = Y.topB, rot = B.rot || 0;
  g.fillStyle = RG(g, 'bunTop', -rx * 0.32, b - hh * 0.72, 8, -rx * 0.1, b - hh * 0.45, rx * 1.32,
    [[0, '#ffe6b4'], [0.1, '#f9b25a'], [0.34, '#dc7a2a'], [0.62, '#a8461a'], [0.86, '#682409'], [1, '#3e1304']]);
  g.fill(TOP_PATH);
  g.save(); g.clip(TOP_PATH);
  for (const p of BLOT) {
    const a = p.a + rot, cz = Math.cos(a); if (cz < 0.1) continue;
    const rr = Math.sqrt(1 - p.h * p.h);
    const x = Math.sin(a) * rx * 0.92 * rr, y = b - hh * p.h + cz * rx * PERS * rr * 0.6;
    g.globalAlpha = 0.11 * cz; g.fillStyle = p.l ? '#ffe2a8' : '#5a1e06';
    g.beginPath(); g.ellipse(x, y, p.r * (0.5 + 0.5 * cz), p.r * 0.6, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // bottom edge shade + cut crumb line
  g.fillStyle = LG(g, 'bunTopShade', 0, b - 40, 0, b + 42, [[0, 'rgba(40,8,0,0)'], [1, 'rgba(40,8,0,0.55)']]);
  g.fillRect(-rx - 4, b - 40, rx * 2 + 8, 90);
  // seared brand
  const cz = Math.cos(rot);
  if (BRAND && cz > 0.12) {
    const x = Math.sin(rot) * rx * 0.74, y = b - hh * 0.47;
    g.save(); g.translate(x, y); g.rotate(-Math.sin(rot) * 0.18); g.scale(cz * 0.95, 0.92); g.globalAlpha = 0.6 * Math.min(1, cz * 1.6);
    g.drawImage(BRAND, -BRAND.width / 2, -BRAND.height / 2); g.restore();
  }
  g.restore();
  // speculars (fixed to the light)
  g.save(); g.globalCompositeOperation = 'lighter';
  g.translate(-rx * 0.36, b - hh * 0.75); g.rotate(-0.42); g.globalAlpha = 0.5;
  g.drawImage(SPR.cream, -120, -36, 240, 72);
  g.globalAlpha = 0.9; g.drawImage(SPR.glow, -40, -10, 64, 18);
  g.rotate(0.42); g.globalAlpha = 0.22; g.drawImage(SPR.cream, rx * 0.55, hh * 0.16, 150, 40);
  g.restore();
  rimStroke(g, DOME_EDGE, B.rim, 7);
}

// ---------------------------------------------------------------- assemble
function drawBurger(g, B, t) {
  g.save();
  g.translate(B.x, B.y);
  if (B.lean) g.rotate(B.lean);
  const sq = B.sq || 0;
  g.scale(B.s * (1 + sq * 0.6) * (B.sx || 1), B.s * (1 - sq));
  if (B.bunB) withLayer(g, B.bunB, 0, () => drawBunB(g, B));
  if (B.p1) { aoOn(g, Y.p1b + 4, PAT.rx * 0.95, 0.5 * approach(B.p1)); withLayer(g, B.p1, Y.p1b, () => drawPatty(g, Y.p1b, PR1, B, t, 1)); }
  if (B.p2) { aoOn(g, Y.p2b + 4, PAT.rx * 0.95, 0.5 * approach(B.p2)); withLayer(g, B.p2, Y.p2b, () => drawPatty(g, Y.p2b, PR2, B, t, 2)); }
  if (B.cheese) withLayer(g, B.cheese, Y.ch, () => drawCheese(g, B, t));
  if (B.onT != null) drawOnions(g, B, t);
  if (B.jaT != null) drawJalas(g, B, t);
  if (B.sauce) drawSauce(g, B, t);
  if (B.bunT) { aoOn(g, Y.topB + 8, TOPB.rx * 1.04, 0.55 * approach(B.bunT)); withLayer(g, B.bunT, Y.topB, () => drawBunT(g, B)); }
  g.restore();
}
function burgerOnScreen(B) { const r = 340 * B.s * (B.sx || 1); return vis(B.x - r, B.x + r); }
function floorShadow(g, B, lift = 0, warm = 0.3) {
  const k = clamp(1 - lift / 1500), w = 700 * B.s * (0.55 + 0.45 * k), h = 74 * B.s * (0.55 + 0.45 * k);
  g.save();
  g.globalAlpha = 0.8 * k; g.drawImage(SPR.dark, B.x - w / 2, B.y - h / 2 + 4, w, h);
  if (warm > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = warm; g.drawImage(SPR.orange, B.x - w * 0.7, B.y + 6, w * 1.4, h * 1.6); }
  g.restore();
}
function buildBrand() {
  const G = glyph('E&B', FONT.wide, 46, { fill: '#2a0b03' });
  const c = mk(G.w + 8, G.h + 8), g = c.getContext('2d');
  g.globalAlpha = 0.5; g.drawImage(G.c, 4, 6);
  g.globalAlpha = 0.9; g.drawImage(G.c, 4, 4);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,40,8,0.5)'; g.fillRect(0, (G.h + 8) * 0.55, G.w + 8, G.h);
  BRAND = soften(c, 1.3);
}
