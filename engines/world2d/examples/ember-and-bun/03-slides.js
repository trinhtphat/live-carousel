// ================================================================== SLIDES
// Each slide = { back, mid, front } drawn in slide-local coords (0..W), plus camera
// impacts (shakes / zooms / flashes). Neighbours are also drawn into each slide's view,
// so anything that crosses an edge (smoke, embers, the conveyor whip) is continuous.

// ---------------------------------------------------------------- shared timing helpers
const WHIP0 = 7.3, WHIP1 = 7.9;   // conveyor whip: each burger slides into the next slide
// Rest pose of the burger in each slide (index 1..5 = slides 2..6)
const POSE = [null, { x: 540, y: FLOOR, s: 1.1 }, { x: 540, y: FLOOR, s: 1.1 }, { x: 540, y: FLOOR, s: 1.04 }, { x: 540, y: FLOOR, s: 1.04 }, { x: 540, y: FLOOR - 8, s: 0.68 }];
function whip(k, t) {
  const P0 = POSE[k], P1 = POSE[Math.min(k + 1, 5)];
  const u = seg(t, WHIP0, WHIP1), o = { x: P0.x, y: P0.y, s: P0.s, sx: 1, lean: 0, u };
  if (u > 0) {
    const p = E.ioBack(u, 1.1);
    o.x = lerp(P0.x, W + P1.x, p); o.y = lerp(P0.y, P1.y, clamp(p)); o.s = lerp(P0.s, P1.s, clamp(p));
    const sp = Math.sin(PI * u); o.sx = 1 + 0.12 * sp * sp; o.lean = -0.08 * Math.sin(TAU * u);
    if (u >= 1) { const a = arrive(t); o.lean += a.lean; o.sq = a.sq; }
  }
  return o;
}
function arrive(t) { // settle after a whip-in (wraps over the loop start)
  const dt = wrapT(t - WHIP1);
  return dt < 1.3 ? { lean: 0.055 * kick(dt, 12, 5), sq: 0.06 * kick(dt, 20, 7) } : { lean: 0, sq: 0 };
}
// fall from height h0 (px above rest) between t0..t1, then little bounces
function fallY(t, t0, t1, h0, bounce = 0.06) {
  if (t < t0) return { vis: false, y: h0, st: 0, v: 0 };
  if (t < t1) { const u = (t - t0) / (t1 - t0); return { vis: true, y: h0 * (1 - u * u), st: 0.16 * u * u, v: u }; }
  const dt = t - t1, T = t1 - t0, hb = h0 * bounce, tb = 2 * T * Math.sqrt(bounce);
  let y = 0;
  if (dt < tb) { const v = dt / tb; y = hb * 4 * v * (1 - v); }
  else if (dt < tb * 1.55) { const v = (dt - tb) / (tb * 0.55); y = hb * 0.28 * 4 * v * (1 - v); }
  return { vis: true, y, st: -0.24 * damp(dt, 25, 8), v: 0 };
}
const beat = (t, off = 0) => decay(frac((t - off) / 1) * 1, 6.5); // every second (8 per loop)

// ---------------------------------------------------------------- labels, chrome
function pill(text, size = 21) {
  const track = 2.6; SCR.font = fstr(FONT.mono, size);
  let tw = 0; for (const ch of text) tw += SCR.measureText(ch).width + track; tw -= track;
  const padL = 46, padR = 24, h = size + 28, w = tw + padL + padR;
  const c = mk(w + 8, h + 8), g = c.getContext('2d'); g.translate(4, 4);
  g.beginPath(); rrect(g, 0, 0, w, h, h / 2); g.fillStyle = 'rgba(14,8,6,0.92)'; g.fill();
  g.strokeStyle = 'rgba(255,214,160,0.9)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ff6a13'; g.beginPath(); g.arc(25, h / 2, 6.5, 0, TAU); g.fill();
  g.font = SCR.font; g.fillStyle = '#fff1d6'; g.textBaseline = 'middle';
  let x = padL; for (const ch of text) { g.fillText(ch, x, h / 2 + 1); x += SCR.measureText(ch).width + track; }
  c.pw = w; c.ph = h; return c;
}
function drawLabel(g, t, P, t0, t1, ax, ay) {
  const sOut = seg(t, t1, t1 + 0.22);
  const s = E.outBack(seg(t, t0, t0 + 0.42), 2.6) * (1 - E.inBack(sOut, 2)); if (s <= 0.002) return;
  const x = P.x, y = P.y + 5 * Math.sin(t * OM(2) + P.x * 0.013);
  const lp = E.outC(seg(t, t0 + 0.14, t0 + 0.6)) * (1 - E.outC(sOut));
  if (lp > 0.001) {
    const sy = ay > y ? y + P.c.ph / 2 : y - P.c.ph / 2;
    g.save(); g.strokeStyle = 'rgba(255,232,196,0.95)'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, sy); g.lineTo(lerp(x, ax, lp), lerp(sy, ay, lp)); g.stroke();
    if (lp > 0.9) {
      const q = frac(t / 0.8);
      g.fillStyle = '#ff7a1c'; g.beginPath(); g.arc(ax, ay, 7, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,170,90,${(1 - q) * 0.9})`; g.lineWidth = 2; g.beginPath(); g.arc(ax, ay, 8 + 16 * q, 0, TAU); g.stroke();
    }
    g.restore();
  }
  g.save(); g.translate(x, y); g.scale(s, s); g.drawImage(P.c, -P.c.width / 2, -P.c.height / 2); g.restore();
}
const CH = {};
function buildChrome() {
  const size = 20, track = 5, text = PROJECT.mark; SCR.font = fstr(FONT.mono, size);
  let tw = 0; for (const ch of text) tw += SCR.measureText(ch).width + track;
  const c = mk(tw + 60, 44), g = c.getContext('2d');
  g.save(); g.translate(14, 36); g.scale(0.11, 0.11); g.drawImage(SPR.flame, -64, -256); g.restore();
  g.font = SCR.font; g.fillStyle = '#fff1d6'; g.textBaseline = 'alphabetic';
  let x = 34; for (const ch of text) { g.fillText(ch, x, 29); x += SCR.measureText(ch).width + track; }
  CH.mark = c;
  const pad = (n) => String(n).padStart(2, '0');
  CH.count = PROJECT.counters.map((nm, k) => {
    const s = `${pad(k + 1)} / ${pad(N)}  ·  ${nm}`; SCR.font = fstr(FONT.mono, 18);
    let w = 0; for (const ch of s) w += SCR.measureText(ch).width + 3;
    const cc = mk(w + 10, 34), gg = cc.getContext('2d'); gg.font = SCR.font; gg.fillStyle = 'rgba(255,236,210,0.62)';
    let xx = 2; for (const ch of s) { gg.fillText(ch, xx, 24); xx += SCR.measureText(ch).width + 3; }
    return cc;
  });
}
function chrome(g, k, t, a = 1) {
  if (!vis(0, 520)) return;
  g.save(); g.globalAlpha = a * 0.92; g.drawImage(CH.mark, 62, 66);
  g.globalAlpha = a; g.drawImage(CH.count[k], 72, 1270); g.restore();
}
// title styles
const ST = {
  cream: { fill: [[0, '#fff8e8'], [1, '#f2d2a0']], ext: [10, '#2a0c04'], shine: 0.22 },
  creamHot: { fill: [[0, '#ffffff'], [0.5, '#fff2b8'], [1, '#ffc23a']], glow: ['rgba(255,120,20,0.95)', 26] },
  fire: { fill: [[0, '#ffe680'], [0.35, '#ffa126'], [0.72, '#f0460e'], [1, '#a3160a']], ext: [15, '#300a03'], shine: 0.3 },
  fireHot: { fill: [[0, '#ffffff'], [0.6, '#fff0a0'], [1, '#ffb830']], glow: ['rgba(255,100,10,1)', 40] },
  cheddar: { fill: [[0, '#fff3a6'], [0.4, '#ffc631'], [1, '#ec8a0c']], ext: [14, '#3a1604'], shine: 0.35 },
};

// ================================================================== 01 · HOOK — "SOMETHING HOT IS COMING"
const S1 = {
  fire: (t) => E.outC(seg(t, 0.5, 0.72)) * (1 - E.ioS(seg(t, 6.95, 7.75))),
  shakes: [[0.55, 22], [1.85, 9], [2.15, 10], [2.45, 16], [5.0, 7]],
  zooms: [[0.55, 0.05], [1.85, 0.012], [2.15, 0.012], [2.45, 0.028], [5.0, 0.018]],
  flashes: [[0.55, 0.6, '255,170,90'], [1.85, 0.12, '255,150,60'], [2.15, 0.12, '255,150,60'], [2.45, 0.22, '255,160,70'], [5.0, 0.14, '255,140,50']],
  SURGE: 5.0,
  tA: (i) => 1.0 + i * 0.075, tB: [1.85, 2.15, 2.45], tC: (i) => 2.85 + i * 0.07,
  tOut: (i, ln) => 6.8 + hash(i + ln * 20, 71) * 0.42,
  lines: [430, 770, 962],
};
S1.build = () => {
  const sA = fitSize('SOMETHING', FONT.anton, 182, 860, 8), sC = fitSize('IS COMING', FONT.anton, 182, 860, 8);
  const s = Math.min(sA, sC), sB = fitSize('HOT', FONT.wide, 330, 880, 10);
  S1.A = word('SOMETHING', FONT.anton, s, ST.cream, 8); S1.Ah = word('SOMETHING', FONT.anton, s, ST.creamHot, 8);
  S1.C = word('IS COMING', FONT.anton, s, ST.cream, 8); S1.Ch = word('IS COMING', FONT.anton, s, ST.creamHot, 8);
  S1.B = word('HOT', FONT.wide, sB, ST.fire, 10); S1.Bh = word('HOT', FONT.wide, sB, ST.fireHot, 10);
  const sw = word('SWIPE', FONT.mono, 24, { fill: '#fff1d6' }, 7); S1.swipe = sw;
};
S1.flameH = (t) => {
  let h = 270 + 820 * decay(t - 0.55, 3.2) * seg(t, 0.5, 0.6);
  for (const tb of S1.tB) h += 170 * decay(t - tb, 4.5) * (t >= tb ? 1 : 0);
  h += 260 * decay(t - S1.SURGE, 2.8) * seg(t, S1.SURGE - 0.08, S1.SURGE);
  return h * S1.fire(t);
};
S1.letterFx = (g, t, W0, Wh, base, ts, ln, punch) => {
  const left = 540 - W0.width / 2;
  W0.items.forEach((it, i) => {
    if (!it.g) return;
    const t0 = typeof ts === 'function' ? ts(i) : ts[i];
    if (t < t0) return;
    const c = letterCenter(it, left, base), seed = i + ln * 13, dur = punch ? 0.3 : 0.42;
    const pin = seg(t, t0, t0 + dur);
    const s = punch ? 1.4 - 0.4 * E.outBack(seg(t, t0, t0 + 0.34), 2.6) : 1 + 0.07 * (1 - E.outC(pin));
    const dy = (punch ? -26 : -12) * (1 - E.outC(pin));
    const tout = S1.tOut(i, ln);
    if (t >= tout) { const e = E.inQ(seg(t, tout, tout + 0.5)); burnLetter(g, it.g, c.x, c.y + dy, e, t, seed, s); return; }
    if (pin < 1) { burnLetter(g, Wh.items[i].g, c.x, c.y + dy, 1 - E.outC(pin), t, seed, s); return; }
    drawLetter(g, it, left, base, { s, dy });
    const heat = 1 - seg(t, t0 + dur, t0 + dur + 1.1) + 0.2 * Math.max(0, pnoise(t, 40, seed + 5)) + 0.85 * decay(t - S1.SURGE - i * 0.03, 3.5) * (t >= S1.SURGE + i * 0.03 ? 1 : 0);
    if (heat > 0.01) drawLetter(g, Wh.items[i], left, base, { s, dy, alpha: clamp(heat) * (punch ? 0.75 : 0.9) });
  });
};
S1.back = (g, t) => {
  const f = S1.fire(t);
  if (f > 0 && vis(-300, W + 300)) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.9 * f * (0.85 + 0.15 * pnoise(t, 40, 3)); g.drawImage(SPR.orange, -320, 760, 1720, 1150);
    g.globalAlpha = 0.4 * f; g.drawImage(SPR.red, -520, 260, 2120, 1600);
    // glow behind HOT
    const hb = seg(t, 1.85, 2.6) * f;
    g.globalAlpha = 0.55 * hb * (0.8 + 0.2 * pnoise(t, 32, 9)); g.drawImage(SPR.orange, 60, 400, 960, 520);
    g.restore();
  }
  // flame licks rising off the tops of H-O-T (behind the letters)
  if (t > 2.0 && t < 7.3 && vis(0, W)) {
    const B = S1.B, left = 540 - B.width / 2, top = S1.lines[1] - B.cap + 18;
    const a = seg(t, 2.0, 2.6) * (1 - seg(t, 6.75, 7.1));
    B.items.forEach((it, i) => {
      const x0 = left + it.pen + 10, x1 = left + it.pen + it.adv - 10;
      flames(g, t, x0, x1, top + 30, 120 * a, { spacing: 24, width: 46, seed: 300 + i, alpha: 0.9, layers: 1, bed: false, env: (x) => smooth(x0 - 4, x0 + 30, x) * smooth(x1 + 4, x1 - 30, x) });
    });
  }
};
S1.mid = () => {};
S1.front = (g, t) => {
  const f = S1.fire(t), inView = vis(0, W);
  // the spark: three strikes, a glowing seed, then IGNITION
  if (inView && t < 1.4) {
    for (const ts of [0.12, 0.27, 0.4]) burst(g, t, ts, { n: 12, seed: 11 + ts * 100, x: 540, y: 1238, ang: [-PI * 0.95, -PI * 0.05], spd: [260, 980], life: [0.12, 0.38], g: 1500, drag: 2, size: [1.6, 3.2], kind: 'spark', wrap: false });
    const a = seg(t, 0.36, 0.55) * (1 - seg(t, 0.62, 1.1));
    if (a > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const s = lerp(16, 120, E.inQ(seg(t, 0.36, 0.56))) * (0.85 + 0.15 * Math.sin(t * OM(90)));
      g.globalAlpha = a; g.drawImage(SPR.ember, 540 - s, 1238 - s, s * 2, s * 2);
      g.globalAlpha = a * 0.6; g.drawImage(SPR.glow, 540 - s * 0.4, 1238 - s * 0.4, s * 0.8, s * 0.8);
      g.restore();
    }
    for (const ts of [0.12, 0.27, 0.4]) {
      const fl = decay(t - ts, 30) * (t >= ts ? 1 : 0);
      if (fl > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = fl * 0.8; g.drawImage(SPR.orange, 540 - 160, 1238 - 160, 320, 320); g.restore(); }
    }
  }
  // words burn in letter by letter
  if (inView) {
    S1.letterFx(g, t, S1.A, S1.Ah, S1.lines[0], S1.tA, 0, false);
    S1.letterFx(g, t, S1.B, S1.Bh, S1.lines[1], S1.tB, 1, true);
    S1.letterFx(g, t, S1.C, S1.Ch, S1.lines[2], S1.tC, 2, false);
  }
  // flame wall (bursts on ignition and on every H-O-T slam)
  const fh = S1.flameH(t);
  if (fh > 4) flames(g, t, -60, W + 60, H + 40, fh, { spacing: 38, width: 96, seed: 7, alpha: 0.95, env: (x) => smooth(W + 70, W - 120, x) * smooth(-80, 40, x) });
  // embers
  embers(g, t, { n: 90, seed: 101, life: 2, x0: -40, x1: W + 80, y0: 1330, y1: 1150, rise: 1100, wind: 38, size: [3, 11], inten: (tb) => S1.fire(tb), alpha: 0.95, wig: 40 });
  if (inView) {
    burst(g, t, 0.55, { n: 120, seed: 21, x: 540, y: 1250, sx: 380, ang: [-PI * 0.93, -PI * 0.07], spd: [700, 2300], life: [0.5, 1.5], g: 1100, drag: 1.3, size: [2, 4.6], kind: 'spark', wrap: false });
    burst(g, t, 0.55, { n: 60, seed: 22, x: 540, y: 1260, sx: 600, ang: [-PI * 0.85, -PI * 0.15], spd: [300, 1200], life: [0.8, 2.2], g: -60, drag: 1.2, size: [4, 12], wrap: false });
    ring(g, t, 0.55, 540, 1255, { r0: 40, r1: 1400, flat: 0.16, dur: 0.95, w: 20, color: 'rgba(255,186,96,1)', soft: true });
    ring(g, t, 0.56, 540, 1150, { r0: 60, r1: 1100, dur: 0.7, w: 34, color: 'rgba(255,200,140,1)', alpha: 0.22 });
    // HOT slams
    S1.tB.forEach((tb, i) => {
      const it = S1.B.items[i], c = letterCenter(it, 540 - S1.B.width / 2, S1.lines[1]);
      burst(g, t, tb, { n: 40, seed: 40 + i, x: c.x, y: c.y + 60, sx: 120, ang: [-PI * 0.95, -PI * 0.05], spd: [400, 1400], life: [0.4, 1.0], g: 900, drag: 1.6, size: [1.8, 3.8], kind: 'spark', wrap: false });
      burst(g, t, tb, { n: 22, seed: 50 + i, x: c.x, y: c.y, sx: 160, sy: 160, ang: [-PI, 0], spd: [100, 500], life: [0.8, 1.8], g: -80, drag: 1, size: [4, 11], wrap: false });
      ring(g, t, tb, c.x, c.y, { r0: 60, r1: 420, dur: 0.5, w: 6, color: 'rgba(255,200,120,1)', alpha: 0.55 });
    });
    // letter-arrival embers
    [[S1.A, S1.tA, 0], [S1.C, S1.tC, 2]].forEach(([Wd, ts, ln]) => Wd.items.forEach((it, i) => {
      if (!it.g) return; const c = letterCenter(it, 540 - Wd.width / 2, S1.lines[ln]);
      burst(g, t, ts(i), { n: 7, seed: 60 + i + ln * 20, x: c.x, y: c.y + 50, sx: 60, ang: [-PI * 0.8, -PI * 0.2], spd: [120, 420], life: [0.5, 1.2], g: -120, drag: 1.2, size: [2.5, 7], wrap: false });
    }));
    // ash when the words burn away
    [[S1.A, 0], [S1.B, 1], [S1.C, 2]].forEach(([Wd, ln]) => Wd.items.forEach((it, i) => {
      if (!it.g) return; const c = letterCenter(it, 540 - Wd.width / 2, S1.lines[ln]);
      burst(g, t, S1.tOut(i, ln), { n: ln === 1 ? 26 : 12, seed: 80 + i + ln * 20, x: c.x, y: c.y, sx: it.adv * 0.8, sy: Wd.cap, ang: [-PI * 0.75, -PI * 0.25], spd: [60, 260], life: [0.7, 1.6], g: -160, drag: 0.8, size: [2.5, 8], delay: (j, r) => r(9) * 0.45, delayMax: 0.45, wrap: true });
    }));
  }
  // swipe cue: chevrons + a fuse that runs across the edge into slide 2
  const aIn = seg(t, 3.55, 3.95), aOut = 1 - seg(t, 6.8, 7.15), aa = aIn * aOut;
  if (aa > 0) {
    if (vis(700, W)) {
      const sw = S1.swipe, sl = 838 - sw.width;
      sw.items.forEach((it, i) => drawLetter(g, it, sl, 1222, { alpha: seg(t, 3.55 + i * 0.05, 3.62 + i * 0.05) * aOut * 0.92 }));
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        const p = Math.max(0, Math.sin(TAU * (t * 1.25 - i * 0.17))) ** 2;
        const x = 872 + i * 50 + 8 * p, y = 1212, a = seg(t, 3.6 + i * 0.08, 3.85 + i * 0.08) * aOut * (0.3 + 0.7 * p);
        g.globalAlpha = a; g.strokeStyle = '#ffb347'; g.lineWidth = 9;
        g.beginPath(); g.moveTo(x - 14, y - 22); g.lineTo(x + 8, y); g.lineTo(x - 14, y + 22); g.stroke();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.6; g.drawImage(SPR.orange, x - 50, y - 50, 100, 100); g.globalCompositeOperation = 'source-over';
      }
      g.restore();
    }
    // fuse line + travelling spark (period 1 s)
    g.save(); g.globalCompositeOperation = 'lighter';
    const fx0 = 1000, fx1 = W + 330, fy = 1212;
    const lg = g.createLinearGradient(fx0, 0, fx1, 0); lg.addColorStop(0, 'rgba(255,150,60,0.6)'); lg.addColorStop(1, 'rgba(255,120,40,0)');
    g.globalAlpha = aa; g.strokeStyle = lg; g.lineWidth = 3; g.beginPath(); g.moveTo(fx0, fy); g.lineTo(fx1, fy); g.stroke();
    const q = frac(t / 1), sx = lerp(fx0, fx1, E.inQ(q)), sa = aa * Math.sin(PI * q);
    g.globalAlpha = sa; g.drawImage(SPR.ember, sx - 22, fy - 22, 44, 44);
    for (let k = 1; k < 6; k++) { g.globalAlpha = sa * (1 - k / 6) * 0.6; const tx = sx - k * 18 * (0.5 + q); g.drawImage(SPR.ember, tx - 10, fy - 10, 20, 20); }
    g.restore();
  }
  chrome(g, 0, t, seg(t, 0.7, 1.1) * (1 - seg(t, 7.2, 7.6)) * (0.85 + 0.15 * pnoise(t, 30, 2)));
};

// ================================================================== 02 · THE BUILD — bun drop + double smash
const S2 = {
  shakes: [[0.55, 9], [1.5, 24], [2.25, 32], [3.7, 5], [5.1, 6], [6.3, 5]],
  flares: [3.7, 5.1, 6.3],
  zooms: [[0.55, 0.012], [1.5, 0.035], [2.25, 0.05]],
  flashes: [[1.5, 0.42, '255,190,120'], [2.25, 0.55, '255,200,140']],
  slams: [1.5, 2.25],
};
S2.burger = (t) => {
  const P = whip(1, t), s = P.s;
  const bun = fallY(t, 0.05, 0.55, 1300, 0.07), p1 = fallY(t, 1.24, 1.5, 980, 0.025), p2 = fallY(t, 1.99, 2.25, 980, 0.025);
  const sq = 0.15 * damp(t - 1.5, 27, 7.5) + 0.18 * damp(t - 2.25, 27, 7.5) + (P.sq || 0);
  return {
    x: P.x, y: P.y, s, sx: P.sx, lean: P.lean, sq, rot: 0, rim: 0.3, glint: seg(t, 1.5, 1.9), lift: bun.y,
    bunB: bun.vis ? { dy: -bun.y / s, st: bun.st } : null,
    p1: p1.vis ? { dy: -p1.y / s, st: p1.st } : null,
    p2: p2.vis ? { dy: -p2.y / s, st: p2.st } : null,
  };
};
S2.build = () => {
  const sA = fitSize('THE BUILD', FONT.anton, 150, 760, 6), sB = fitSize('BEGINS', FONT.wide, 200, 900, 6);
  S2.A = word('THE BUILD', FONT.anton, sA, ST.cream, 6);
  S2.B = word('BEGINS', FONT.wide, sB, ST.fire, 6);
  const sm = fitSize('SMASH', FONT.wide, 320, 1000);
  S2.smash = glyph('SMASH', FONT.wide, sm, { stroke: ['rgba(255,236,210,1)', 4] });
  S2.lblBun = { c: pill('TOASTED BRIOCHE'), x: 200, y: 770 };
  S2.lblPat = { c: pill('DOUBLE SMASH PATTY'), x: 858, y: 800 };
};
S2.titleLetter = (g, t, Wd, base, j0) => {
  const left = 540 - Wd.width / 2;
  Wd.items.forEach((it, i) => {
    if (!it.g) return;
    const j = j0 + i, ti = 0.04 + j * 0.045, fd = 0.3;
    if (t < ti) return;
    let dy, sx = 1, sy = 1, rot = 0, alpha = 1;
    if (t < ti + fd) { const u = (t - ti) / fd; dy = -560 * (1 - u * u); sy = 1 + 0.25 * u; sx = 1 - 0.1 * u; }
    else {
      const dt = t - ti - fd;
      dy = -30 * Math.abs(Math.sin(dt * 14)) * Math.exp(-dt * 7);
      const q = damp(dt, 24, 8); sy = 1 - 0.28 * q; sx = 1 + 0.2 * q;
      for (const ts of S2.slams) { const k = kick(t - ts - j * 0.02, 17, 7); dy -= 40 * Math.max(0, k); }
    }
    const te = 7.0 + j * 0.018;
    if (t > te) { const u = t - te; dy += 3600 * u * u; rot = (hash(j, 77) - 0.5) * 7 * u; alpha = 1 - seg(t, te + 0.25, te + 0.4); }
    drawLetter(g, it, left, base, { dy, sx, sy, rot, alpha, piv: 1 });
  });
};
S2.back = (g, t) => {
  if (!vis(-400, W + 400)) return;
  const heat = seg(t, 1.5, 1.8) * (1 - seg(t, 7.3, 7.9)) * 0.6 + 0.4;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.5 * heat; g.drawImage(SPR.orange, 540 - 700, FLOOR - 380, 1400, 760);
  g.globalAlpha = 0.18; g.drawImage(SPR.red, -200, 200, 1480, 1200);
  g.restore();
  // grill flare-ups licking up behind the patties
  S2.flares.forEach((tf, i) => {
    const env = E.outC(seg(t, tf, tf + 0.14)) * (1 - E.ioS(seg(t, tf + 0.2, tf + 1.0)));
    if (env <= 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * env; g.drawImage(SPR.orange, 540 - 520, FLOOR - 420, 1040, 640); g.restore();
    flames(g, t, 150, 930, FLOOR - 40, 600 * env * (0.85 + 0.15 * i), { spacing: 32, width: 110, seed: 900 + i * 17, alpha: 1, bed: false, env: (x) => smooth(140, 300, x) * smooth(940, 780, x) * (0.75 + 0.25 * Math.cos((x - 540) / 140)) });
  });
  // background "SMASH" stamps (parallax)
  const a = seg(t, 1.5, 1.62) * (1 - seg(t, 6.9, 7.3));
  if (a > 0) {
    const sc = 1 + 0.5 * (1 - E.outExpo(seg(t, 1.5, 1.85))), x = 540 - 14 * (t - 1.5);
    drawSprite(g, S2.smash, x, 820, { s: sc, alpha: 0.13 * a });
    const e = seg(t, 2.25, 2.9);
    if (e > 0 && e < 1) drawSprite(g, S2.smash, x, 820, { s: 1 + 0.35 * E.outC(e), alpha: 0.3 * (1 - e) });
    if (t > 2.25) drawSprite(g, S2.smash, x + 18, 838, { alpha: 0.07 * a });
  }
  // floor shockwaves (behind the stack)
  ring(g, t, 0.55, 540, FLOOR, { r0: 80, r1: 600, flat: 0.16, dur: 0.6, w: 8, color: 'rgba(255,200,140,1)', alpha: 0.5 });
  for (const ts of S2.slams) {
    ring(g, t, ts, 540, FLOOR, { r0: 120, r1: 1500, flat: 0.15, dur: 0.85, w: 24, color: 'rgba(255,160,70,1)', soft: true });
    ring(g, t, ts + 0.06, 540, FLOOR, { r0: 100, r1: 1000, flat: 0.15, dur: 0.7, w: 10, color: 'rgba(255,230,190,1)', alpha: 0.7 });
  }
};
S2.mid = (g, t) => {
  const B = S2.burger(t); if (!B.bunB || !burgerOnScreen(B)) return;
  floorShadow(g, B, B.lift, 0.22 + 0.25 * B.glint);
  // speed streaks behind falling patties
  for (const [t0, t1, key] of [[1.24, 1.5, 'p1'], [1.99, 2.25, 'p2']]) {
    const u = seg(t, t0, t1); if (u <= 0 || u >= 1 || !B[key]) continue;
    const yT = B.y + (B[key].dy + Y.p1b - 40) * B.s;
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,220,180,0.5)'; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = B.x + (i / 8 - 0.5) * 520 * B.s; g.globalAlpha = 0.35 * u; g.lineWidth = 3 + 3 * hash(i, 5); g.beginPath(); g.moveTo(x, yT - 40); g.lineTo(x, yT - 260 * u - 60 * hash(i, 6)); g.stroke(); }
    g.restore();
  }
  drawBurger(g, B, t);
};
S2.front = (g, t) => {
  const inView = vis(0, W);
  // sizzle steam rising off the patties, trailing the burger when it whips away
  puffs(g, t, { n: 46, seed: 210, life: 2, sprites: SPR.wisp, aspect: 1.9, inten: (tb) => seg(tb, 1.5, 1.9) * (1 - seg(tb, 6.4, 7.2)), x: (tb) => whip(1, tb).x, y: () => FLOOR - 190, spread: 470, rise: 640, drift: 60, size: [80, 300], alpha: 0.2 });
  if (inView) {
    S2.titleLetter(g, t, S2.A, 250, 0);
    S2.titleLetter(g, t, S2.B, 448, 9);
    drawLabel(g, t, S2.lblBun, 0.85, 6.9, 300, 1040);
    drawLabel(g, t, S2.lblPat, 2.6, 6.95, 800, 950);
  }
  const B = S2.burger(Math.min(t, 7.2));
  // bun landing puff
  burst(g, t, 0.55, { n: 16, seed: 230, x: 540, y: FLOOR - 10, sx: 500, ang: [-PI, 0], spd: [80, 360], life: [0.5, 1.1], g: 120, drag: 2, size: [40, 90], kind: 'puff', sprites: SPR.smoke, comp: 'source-over', alpha: 0.35, grow: 1.5, wrap: false });
  for (const [i, ts] of S2.slams.entries()) {
    const yTop = FLOOR + (i ? Y.p2b - 40 : Y.p1b - 40) * B.s;
    burst(g, t, ts, { n: 70, seed: 240 + i, x: 540, y: yTop, sx: 560, ang: [-PI * 1.02, 0.02], spd: [600, 2000], life: [0.35, 0.95], g: 1600, drag: 1.5, size: [1.8, 4.2], kind: 'spark', wrap: false });
    burst(g, t, ts, { n: 34, seed: 250 + i, x: 540, y: yTop + 10, sx: 520, ang: [-PI * 0.98, -PI * 0.02], spd: [500, 1500], life: [0.6, 1.3], g: 2600, drag: 0.9, size: [3, 7], kind: 'drop', color: '#c27a2e', hi: 'rgba(255,240,200,0.7)', floor: FLOOR + 40, comp: 'source-over', fade: 2, wrap: false });
    burst(g, t, ts, { n: 14, seed: 260 + i, x: 540, y: yTop, sx: 500, ang: [-PI, 0], spd: [300, 900], life: [0.7, 1.6], g: -40, drag: 2.2, size: [80, 160], kind: 'puff', sprites: SPR.steam, comp: 'source-over', alpha: 0.4, grow: 1.6, wrap: false });
    ring(g, t, ts, 540, yTop, { r0: 60, r1: 900, dur: 0.6, w: 8, color: 'rgba(255,240,220,1)', alpha: 0.45 });
  }
  S2.flares.forEach((tf, i) => burst(g, t, tf, { n: 30, seed: 280 + i, x: 540, y: FLOOR - 140, sx: 520, ang: [-PI * 0.9, -PI * 0.1], spd: [300, 1100], life: [0.4, 1.0], g: 700, drag: 1.4, size: [1.6, 3.4], kind: 'spark', wrap: false }));
  // grease pops while it sizzles
  if (inView) for (let j = 0; j < 46; j++) {
    const tp = 2.35 + hash(j, 5) * 4.8, a = (hash(j, 6) - 0.5) * 2.4;
    burst(g, t, tp, { n: 4, seed: 300 + j, x: 540 + Math.sin(a) * 280 * 1.1, y: FLOOR + (Y.p2b - 40 + Math.cos(a) * 40) * 1.1, ang: [-PI * 0.85, -PI * 0.15], spd: [180, 560], life: [0.2, 0.45], g: 1400, drag: 1.5, size: [1.4, 2.6], kind: 'spark', wrap: false });
  }
  chrome(g, 1, t);
};

// ================================================================== 03 · LAYERS — cheddar melt, onions & jalapeños rain
const S3 = {
  shakes: [[0.62, 5], [2.0, 3], [3.35, 4], [3.9, 6]],
  zooms: [[0.62, 0.01]],
  flashes: [],
};
S3.burger = (t) => {
  const P = whip(2, t), s = P.s, A = t < 1.5 ? arrive(t) : { lean: 0, sq: 0 };
  const ch = fallY(t, 0.32, 0.62, 720, 0);
  const flop = t < 0.62 ? 0 : 1 - damp(t - 0.62, 15, 5.2);
  return {
    x: P.x, y: P.y, s, sx: P.sx, lean: P.lean + A.lean, sq: (P.sq || 0) + A.sq, rot: 0, rim: 0.3, glint: 0.8 * (1 - seg(t, 0.6, 1.4)),
    bunB: {}, p1: {}, p2: {},
    cheese: ch.vis ? { dy: -ch.y / s, flop, melt: E.ioS(seg(t, 0.7, 3.8)), grow: seg(t, 0.95, 4.6) } : null,
    onT: t - 1.95, jaT: t - 3.3,
  };
};
S3.build = () => {
  const sz = fitSize('LAYERS', FONT.wide, 220, 900, 4);
  S3.T = glyph('LAYERS', FONT.wide, sz, ST.cheddar); S3.Tw = word('LAYERS', FONT.wide, sz, ST.cheddar, 0);
  S3.sub = word('CHEDDAR · ONIONS · JALAPEÑOS', FONT.mono, 26, { fill: '#fff1d6' }, 4);
  S3.lblCh = { c: pill('MELTED CHEDDAR'), x: 196, y: 760 };
  S3.lblOn = { c: pill('CRISPY ONIONS'), x: 880, y: 690 };
  S3.lblJa = { c: pill('JALAPEÑOS'), x: 168, y: 640 };
  S3.drips = [];
  const left = 540 - S3.Tw.width / 2;
  S3.Tw.items.forEach((it, i) => { const G = it.g; S3.drips.push([left + it.pen + it.adv * 0.28, 16 + 6 * hash(i, 3), i * 2], [left + it.pen + it.adv * 0.72, 12 + 5 * hash(i, 4), i * 2 + 1]); });
};
S3.title = (g, t) => {
  const Tw = S3.Tw, left = 540 - Tw.width / 2, base = 330, NS = 5;
  const G0 = Tw.items[0].g, top = base - Tw.cap - 6, sh = (Tw.cap + 24) / NS;
  Tw.items.forEach((it, i) => {
    const G = it.g, ox = left + it.pen - G.bx;
    for (let j = NS - 1; j >= 0; j--) {
      const order = NS - 1 - j, ti = 0.04 + order * 0.07 + i * 0.035, fd = 0.22;
      if (t < ti) continue;
      let dy = 0, dx = 0;
      if (t < ti + fd) { const u = (t - ti) / fd; dy = -380 * (1 - u * u); }
      else dy = -10 * Math.abs(Math.sin((t - ti - fd) * 18)) * Math.exp(-(t - ti - fd) * 9);
      const te = 6.95 + order * 0.03 + i * 0.012;
      if (t > te) dx = (j % 2 ? 1 : -1) * 1500 * E.inC(seg(t, te, te + 0.32));
      const syS = (top - (base - G.by)) + j * sh; // slice y in sprite coords
      const y0 = Math.max(0, syS), y1 = Math.min(G.h, syS + sh + 0.6);
      if (y1 <= y0) continue;
      g.drawImage(G.c, 0, y0, G.w, y1 - y0, ox + dx, base - G.by + y0 + dy, G.w, y1 - y0);
    }
  });
  // cheddar drips hanging from the letters
  const a = seg(t, 0.9, 1.3) * (1 - seg(t, 6.95, 7.05));
  if (a > 0) {
    g.save(); g.globalAlpha = a; g.beginPath();
    for (const [x, w, i] of S3.drips) {
      const len = (8 + 46 * (0.5 - 0.5 * Math.cos(t * OM(1 + (i % 2)) + i * 1.9))) * seg(t, 0.9 + i * 0.03, 1.6 + i * 0.03);
      dripPath(g, x, base - 4, w, len);
    }
    g.fillStyle = LG(g, 's3drip', 0, base - 10, 0, base + 70, [[0, '#f59a18'], [1, '#e07a0c']]); g.fill();
    g.restore();
  }
  // subtitle types on
  const sub = S3.sub, sl = 540 - sub.width / 2;
  const nIn = Math.floor(seg(t, 0.6, 1.4) * sub.items.length), nOut = Math.floor(seg(t, 6.9, 7.15) * sub.items.length);
  sub.items.forEach((it, i) => { if (i < nIn && i >= nOut) drawLetter(g, it, sl, 448, { alpha: 0.9 }); });
  if (nIn < sub.items.length && t > 0.6 && frac(t * 4) < 0.6) { const it = sub.items[nIn]; g.fillStyle = '#ff7a1c'; g.fillRect(sl + it.pen, 426, 14, 26); }
};
S3.back = (g, t) => {
  if (!vis(-400, W + 400)) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.55 + 0.1 * pnoise(t, 16, 4); g.drawImage(SPR.gold, 540 - 760, 380, 1520, 1100);
  g.globalAlpha = 0.25; g.drawImage(SPR.orange, -300, -200, 1680, 900);
  // big soft cheddar bokeh drifting (back parallax)
  for (let i = 0; i < 9; i++) {
    const ph = hash(i, 801), x = 1080 * hash(i, 802) + 60 * Math.sin(t * OM(1) + ph * 9), y = 200 + 900 * hash(i, 803) - 40 * Math.sin(t * OM(1) + ph * 5);
    const r = 70 + 120 * hash(i, 804);
    g.globalAlpha = 0.1 + 0.08 * Math.sin(t * OM(2) + i); g.drawImage(SPR.gold, x - r, y - r, r * 2, r * 2);
  }
  g.restore();
};
S3.mid = (g, t) => {
  const B = S3.burger(t); if (!burgerOnScreen(B)) return;
  floorShadow(g, B, 0, 0.3);
  drawBurger(g, B, t);
};
S3.front = (g, t) => {
  const inView = vis(0, W);
  puffs(g, t, { n: 30, seed: 310, life: 2, sprites: SPR.wisp, aspect: 1.9, inten: (tb) => (0.3 + 0.7 * (1 - seg(tb, 0.3, 2.4))) * (1 - seg(tb, 7.0, 7.4)), x: (tb) => whip(2, tb).x, y: () => FLOOR - 240, spread: 440, rise: 560, drift: 50, size: [80, 280], alpha: 0.17 });
  if (inView) {
    S3.title(g, t);
    drawLabel(g, t, S3.lblCh, 1.05, 6.85, 300, 958);
    drawLabel(g, t, S3.lblOn, 2.8, 6.9, 752, 905);
    drawLabel(g, t, S3.lblJa, 4.05, 6.95, 418, 890);
  }
  // landing crumbs for jalapeños
  JA.forEach((j, i) => {
    const tl = 3.3 + j.td; const x = 540 + j.rho * Math.sin(j.a) * 1.04, y = FLOOR + (Y.pile - j.z + j.rho * Math.cos(j.a) * PERS) * 1.04;
    burst(g, t, tl, { n: 6, seed: 330 + i, x, y, ang: [-PI * 0.9, -PI * 0.1], spd: [120, 380], life: [0.25, 0.5], g: 1600, drag: 1.2, size: [2.5, 5], kind: 'dot', color: '#d68b34', comp: 'source-over', wrap: false });
  });
  // out-of-focus ingredients falling past the lens (foreground parallax)
  for (const [img, x, t0, s, sp] of [[FG.onB, 165, 2.15, 1.2, 1.2], [FG.jalB, 930, 3.5, 1.15, -1.6], [FG.onB, 760, 4.5, 0.85, 2]]) {
    const u = seg(t, t0, t0 + 0.55); if (u <= 0 || u >= 1) continue;
    const y = lerp(-260, H + 260, u), w = img.width * s;
    g.save(); g.translate(x, y); g.rotate(sp * u * 3); g.globalAlpha = 0.95; g.drawImage(img, -w / 2, -w / 2, w, w); g.restore();
  }
  chrome(g, 2, t);
};

// ================================================================== 04 · THE SAUCE — liquid swirl, pour, crown drop, smoke
const S4 = {
  shakes: [[3.35, 22], [5.45, 8]], zooms: [[3.35, 0.035], [5.45, 0.015]], flashes: [[3.35, 0.32, '255,120,90']],
  TB: 3.35, HOP: 5.45,
};
S4.burger = (t) => {
  const P = whip(3, t), s = P.s, A = t < 1.5 ? arrive(t) : { lean: 0, sq: 0 };
  const top = fallY(t, 3.05, S4.TB, 940, 0.04), hu = seg(t, S4.HOP - 0.32, S4.HOP), hop = 4 * hu * (1 - hu) * (hu > 0 && hu < 1 ? 1 : 0);
  const pre = -0.07 * Math.sin(PI * seg(t, S4.HOP - 0.46, S4.HOP - 0.32));
  return {
    x: P.x, y: P.y - 46 * hop, s, sx: P.sx, lean: P.lean + A.lean, sq: 0.16 * damp(t - S4.TB, 21, 6.5) + 0.11 * damp(t - S4.HOP, 22, 7) - 0.05 * hop - pre + (P.sq || 0) + A.sq, rot: 0, rim: 0.35, glint: 0,
    bunB: {}, p1: {}, p2: {}, cheese: { flop: 1, melt: 1, grow: 1 }, onT: 99, jaT: 99,
    sauce: { d: E.ioS(seg(t, 1.72, 2.55)), drip: E.outC(seg(t, 2.2, 4.6)) },
    bunT: top.vis ? { dy: -top.y / s, st: top.st } : null, lift: top.y,
  };
};
// swirl path: swoops in from slide 3, wraps 1.25 turns round the stack, pours onto the top
S4.path = (() => {
  const pts = [], cx = 540, y0 = 470, y1 = 880, R0 = 430, Rend = 20;
  const b = [[-330, 30], [-40, -30], [cx - R0 - 30, y0 - 260], [cx - R0, y0]];
  for (let i = 0; i < 46; i++) {
    const u = i / 46, v = 1 - u;
    const x = v * v * v * b[0][0] + 3 * v * v * u * b[1][0] + 3 * v * u * u * b[2][0] + u * u * u * b[3][0];
    const y = v * v * v * b[0][1] + 3 * v * v * u * b[1][1] + 3 * v * u * u * b[2][1] + u * u * u * b[3][1];
    pts.push([x, y, 0.5]);
  }
  for (let i = 0; i <= 170; i++) {
    const u = i / 170, th = lerp(-PI / 2, 2 * PI, u), R = lerp(R0, Rend, u ** 1.5);
    pts.push([cx + R * Math.sin(th), lerp(y0, y1, E.ioS(u)) + Math.cos(th) * R * PERS * 1.6, Math.cos(th)]);
  }
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = len[len.length - 1];
  return { pts, len: len.map((l) => l / tot) };
})();
S4.headAt = (t) => E.ioS(seg(t, 0.2, 1.75));
S4.tailAt = (t) => E.inQ(seg(t, 1.05, 2.5));
S4.pathPt = (f) => {
  const { pts, len } = S4.path; let lo = 0, hi = len.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] < f) lo = m; else hi = m; }
  const u = (f - len[lo]) / Math.max(1e-6, len[hi] - len[lo]);
  return [lerp(pts[lo][0], pts[hi][0], u), lerp(pts[lo][1], pts[hi][1], u), lerp(pts[lo][2], pts[hi][2], u), lo];
};
S4.ribbon = (g, t, front) => {
  const hf = S4.headAt(t), tf = S4.tailAt(t); if (hf <= tf + 0.002 || t > 2.7) return;
  const { pts, len } = S4.path;
  let i0 = 0; while (i0 < len.length - 1 && len[i0] < tf) i0++;
  let i1 = i0; while (i1 < len.length - 1 && len[i1] < hf) i1++;
  const span = Math.max(1e-4, hf - tf);
  const runs = []; let cur = null;
  for (let i = i0; i <= i1; i++) {
    const f = pts[i][2] >= 0;
    if (!cur || cur.f !== f) { if (cur) cur.b = i; cur = { f, a: Math.max(i0, i - 1), b: i }; runs.push(cur); } else cur.b = i;
  }
  for (const r of runs) {
    if (r.f !== front || r.b - r.a < 1) continue;
    const L0 = [], R0 = [];
    for (let i = r.a; i <= r.b; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      let dx = q[0] - o[0], dy = q[1] - o[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const k = (len[i] - tf) / span, taper = smooth(0, 0.18, k) * (0.8 + 0.35 * smooth(0.85, 1, k));
      const w = 54 * taper * (0.8 + 0.2 * p[2]) * (1 + 0.16 * Math.sin(i * 0.35 - t * OM(30)));
      L0.push([p[0] - dy * w / 2, p[1] + dx * w / 2]); R0.push([p[0] + dy * w / 2, p[1] - dx * w / 2]);
    }
    g.beginPath(); L0.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = R0.length - 1; i >= 0; i--) g.lineTo(R0[i][0], R0[i][1]); g.closePath();
    g.fillStyle = front ? '#7d0b05' : '#4a0603'; g.fill();
    g.strokeStyle = front ? 'rgba(50,3,1,0.85)' : 'rgba(30,2,1,0.8)'; g.lineWidth = 2; g.stroke();
    // inner body: lighter core shifted toward the light = round, glossy liquid
    g.beginPath(); L0.forEach(([x, y], i) => { const [rx, ry] = R0[i], mx = lerp(x, rx, 0.62) - 3, my = lerp(y, ry, 0.62) - 5; i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
    for (let i = R0.length - 1; i >= 0; i--) { const [x, y] = L0[i], [rx, ry] = R0[i]; g.lineTo(lerp(x, rx, 0.12) - 3, lerp(y, ry, 0.12) - 5); }
    g.closePath(); g.fillStyle = front ? '#c81c0d' : '#6e0905'; g.fill();
    if (front) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); for (let i = r.a; i <= r.b; i++) { const p = pts[i]; if (i === r.a) g.moveTo(p[0] - 8, p[1] - 11); else g.lineTo(p[0] - 8, p[1] - 11); }
      g.strokeStyle = 'rgba(255,80,50,0.5)'; g.lineWidth = 15; g.stroke();
      g.strokeStyle = 'rgba(255,205,185,0.75)'; g.lineWidth = 3.5; g.stroke();
      g.restore();
    }
  }
  // head glob
  const [hx, hy, hz] = S4.pathPt(hf);
  if ((hz >= 0) === front && hf < 0.999) { g.fillStyle = front ? '#b5160b' : '#5c0905'; g.beginPath(); g.arc(hx, hy, 30, 0, TAU); g.fill(); if (front) { g.fillStyle = 'rgba(255,190,170,0.7)'; g.beginPath(); g.ellipse(hx - 6, hy - 8, 6, 4, -0.5, 0, TAU); g.fill(); } }
};
S4.build = () => {
  S4.get = word('GET', FONT.anton, 124, ST.cream, 6);
  const sz = fitSize('SAUCED', FONT.wide, 210, 920, 0);
  S4.back0 = glyph('SAUCED', FONT.wide, sz, { fill: 'rgba(30,4,3,0.82)', ext: [13, '#120201'], stroke: ['rgba(255,226,196,0.95)', 5] });
  S4.mask = glyph('SAUCED', FONT.wide, sz, { fill: '#fff' });
  S4.edge = glyph('SAUCED', FONT.wide, sz, { stroke: ['rgba(255,236,214,1)', 5], shine: 0 });
  // align all three to the same box
  S4.LQ = mk(S4.mask.w, S4.mask.h); S4.LQX = S4.LQ.getContext('2d');
  S4.lblSa = { c: pill('SMOKY CHILI SAUCE'), x: 846, y: 700 };
  S4.lblTop = { c: pill('BRIOCHE CROWN'), x: 196, y: 620 };
};
S4.title = (g, t) => {
  // GET — jelly pop
  const gl = 540 - S4.get.width / 2;
  S4.get.items.forEach((it, i) => {
    const ti = 0.05 + i * 0.07, s = E.outElastic(seg(t, ti, ti + 0.8)) * (1 - E.inBack(seg(t, 7.0 + i * 0.04, 7.2 + i * 0.04)));
    const w = 1 + 0.08 * damp(t - S4.TB - i * 0.03, 20, 6);
    drawLetter(g, it, gl, 196, { sx: s * w, sy: s * (2 - w), piv: 1 });
  });
  // SAUCED — glass letters that fill with sloshing chili sauce
  const M = S4.mask, base = 410, cx = 540;
  const wob = 0.07 * damp(t - S4.TB, 19, 5) + 0.04 * damp(t - S4.HOP, 19, 5);
  const lv = 0.86 * E.ioS(seg(t, 0.4, 2.8)) * (1 - E.inQ(seg(t, 7.0, 7.32)));
  const amp = 5 + 34 * decay(t - S4.TB, 2.6) * (t >= S4.TB ? 1 : 0) + 20 * decay(t - S4.HOP, 2.8) * (t >= S4.HOP ? 1 : 0) + 10 * Math.sin(PI * seg(t, 0.4, 2.8));
  const tilt = 0.09 * kick(t - S4.TB, 8, 2.8) - 0.05 * kick(t - S4.HOP, 8, 2.8);
  g.save(); g.translate(cx, base); g.scale(1 + wob, 1 - wob); g.translate(-cx, -base);
  drawSprite(g, S4.back0, cx, base);
  if (lv > 0.002) {
    const X = S4.LQX, w = M.w, h = M.h, top = M.by - M.cap - 8, bot = M.by + 6;
    X.globalCompositeOperation = 'source-over'; X.clearRect(0, 0, w, h); X.drawImage(M.c, 0, 0);
    X.globalCompositeOperation = 'source-in';
    const yl = lerp(bot, top, lv);
    X.beginPath(); X.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y = yl + amp * Math.sin(x * 0.02 + t * OM(7)) + amp * 0.45 * Math.sin(x * 0.051 - t * OM(11) + 1.3) + tilt * (x - w / 2);
      X.lineTo(x, y);
    }
    X.lineTo(w, h); X.closePath();
    const gr = X.createLinearGradient(0, yl - 40, 0, bot);
    gr.addColorStop(0, '#ff5a2c'); gr.addColorStop(0.18, '#d71f0e'); gr.addColorStop(1, '#6e0804');
    X.fillStyle = gr; X.fill();
    X.globalCompositeOperation = 'source-atop';
    X.strokeStyle = 'rgba(255,170,140,0.9)'; X.lineWidth = 4; X.beginPath();
    for (let x = 0; x <= w; x += 12) { const y = yl + 3 + amp * Math.sin(x * 0.02 + t * OM(7)) + amp * 0.45 * Math.sin(x * 0.051 - t * OM(11) + 1.3) + tilt * (x - w / 2); x ? X.lineTo(x, y) : X.moveTo(x, y); }
    X.stroke();
    for (let k = 0; k < 14; k++) { // bubbles
      const u = frac(t / 2 + hash(k, 41)), bx = hash(k, 42) * w, by = lerp(bot, yl + 10, u);
      if (by < yl + 8) continue; X.fillStyle = 'rgba(255,140,110,0.45)'; X.beginPath(); X.arc(bx, by, 3 + 4 * hash(k, 43), 0, TAU); X.fill();
    }
    X.globalCompositeOperation = 'source-over';
    g.drawImage(S4.LQ, cx - M.cx, base - M.cap / 2 - M.cy);
  }
  drawSprite(g, S4.edge, cx, base, { alpha: 0.9 });
  g.restore();
};
S4.back = (g, t) => {
  if (vis(-400, W + 400)) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 + 0.1 * pnoise(t, 20, 6); g.drawImage(SPR.red, 540 - 820, 300, 1640, 1200);
    g.globalAlpha = 0.3; g.drawImage(SPR.orange, 540 - 600, FLOOR - 300, 1200, 600);
    g.restore();
  }
  S4.ribbon(g, t, false);
};
S4.mid = (g, t) => {
  const B = S4.burger(t); if (!burgerOnScreen(B)) return;
  floorShadow(g, B, 0, 0.3);
  if (B.bunT && B.lift > 0) { // crown shadow on the stack
    const k = clamp(1 - B.lift / 900); g.save(); g.globalAlpha = 0.5 * k; g.drawImage(SPR.dark, B.x - 260 * B.s, B.y + (Y.topB - 30) * B.s, 520 * B.s, 70 * B.s); g.restore();
  }
  drawBurger(g, B, t);
};
S4.front = (g, t) => {
  const inView = vis(0, W);
  // the smoke river: drifts right, across the edge into the reveal
  puffs(g, t, { n: 48, seed: 440, life: 4, sprites: SPR.smoke, inten: (tb) => 0.4 + 0.6 * seg(tb, 1.8, 3.0) * (tb < WHIP1 ? 1 : 0), x: (tb) => whip(3, tb).x, y: () => FLOOR - 290, spread: 460, yspread: 160, rise: 380, drift: 185, size: [200, 600], alpha: 0.42 });
  puffs(g, t, { n: 10, seed: 450, life: 4, sprites: SPR.smokeLit, comp: 'lighter', inten: (tb) => seg(tb, 1.8, 3.0), x: (tb) => whip(3, tb).x, y: () => FLOOR - 300, spread: 300, rise: 380, drift: 160, size: [200, 520], alpha: 0.18 });
  S4.ribbon(g, t, true);
  if (inView) {
    // droplets flung off the swirl
    for (let j = 0; j < 34; j++) {
      const te = 0.45 + j * 0.042, a = t - te; if (a < 0 || a > 1.1) continue;
      const [hx, hy, hz] = S4.pathPt(S4.headAt(te)); if (hz < -0.2) continue;
      const vx = (hx - 540) * 0.9 + (hash(j, 1) - 0.5) * 500, vy = -250 - 500 * hash(j, 2);
      const x = hx + vx * a, y = hy + vy * a + 0.5 * 2200 * a * a, r = 4 + 6 * hash(j, 3);
      g.globalAlpha = 1 - seg(a, 0.7, 1.1); g.fillStyle = '#b8150b'; g.beginPath(); g.ellipse(x, y, r * 1.3, r, Math.atan2(vy + 2200 * a, vx), 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,200,180,0.7)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    S4.title(g, t);
    drawLabel(g, t, S4.lblSa, 2.5, 6.9, 708, 985);
    drawLabel(g, t, S4.lblTop, 3.75, 6.95, 360, 790);
    // crown impact: sauce splash, smoke ring, embers
    const yI = FLOOR + Y.topB * 1.04;
    burst(g, t, S4.TB, { n: 44, seed: 410, x: 540, y: yI + 20, sx: 520, ang: [-PI * 1.05, 0.05], spd: [500, 1500], life: [0.5, 1.1], g: 2400, drag: 0.8, size: [4, 9], kind: 'drop', color: '#b5150b', hi: 'rgba(255,190,170,0.7)', comp: 'source-over', floor: FLOOR + 30, fade: 2.5, wrap: false });
    burst(g, t, S4.TB, { n: 22, seed: 420, x: 540, y: yI + 30, sx: 560, sy: 30, ang: [-PI * 1.1, 0.1], spd: [400, 1100], life: [1.0, 2.2], g: -60, drag: 2.4, size: [90, 170], kind: 'puff', sprites: SPR.smoke, comp: 'source-over', alpha: 0.55, grow: 1.8, wrap: true });
    burst(g, t, S4.TB, { n: 40, seed: 430, x: 540, y: yI, sx: 500, ang: [-PI * 0.95, -PI * 0.05], spd: [300, 1300], life: [0.5, 1.4], g: 300, drag: 1.4, size: [3, 8], wrap: false });
    ring(g, t, S4.TB, 540, yI + 30, { r0: 200, r1: 900, flat: 0.2, dur: 0.7, w: 14, color: 'rgba(255,140,100,1)', soft: true });
    ring(g, t, S4.HOP, 540, FLOOR, { r0: 200, r1: 760, flat: 0.16, dur: 0.6, w: 10, color: 'rgba(255,150,110,1)', alpha: 0.7 });
    burst(g, t, S4.HOP, { n: 14, seed: 425, x: 540, y: FLOOR - 20, sx: 560, ang: [-PI * 1.05, 0.05], spd: [200, 700], life: [0.8, 1.6], g: -40, drag: 2.4, size: [80, 150], kind: 'puff', sprites: SPR.smoke, comp: 'source-over', alpha: 0.4, grow: 1.6, wrap: false });
    burst(g, t, S4.HOP, { n: 18, seed: 426, x: 540, y: yI + 60, sx: 480, ang: [-PI * 0.95, -PI * 0.05], spd: [400, 1100], life: [0.4, 0.9], g: 2400, drag: 0.8, size: [3, 7], kind: 'drop', color: '#b5150b', hi: 'rgba(255,190,170,0.7)', comp: 'source-over', floor: FLOOR + 30, fade: 2.5, wrap: false });
  }
  chrome(g, 3, t);
};

// ================================================================== 05 · THE REVEAL — hero float, ring of fire, title slam
const S5 = {
  TS: 1.55,
  shakes: [[1.55, 36], [0.85, 7]], zooms: [[1.55, 0.06], [0.85, 0.015]],
  flashes: [[1.55, 0.85, '255,236,200'], [0.85, 0.25, '255,150,60']],
};
S5.hero = (t) => E.ioC(seg(t, 0.12, 1.15)) * (1 - E.ioC(seg(t, 6.75, 7.25)));
S5.halo = (t) => E.outC(seg(t, 0.78, 1.1)) * (1 - E.ioS(seg(t, 6.7, 7.25)));
S5.burger = (t) => {
  const P = whip(4, t), A = t < 1.5 ? arrive(t) : { lean: 0, sq: 0 }, h = S5.hero(t);
  const bob = 12 * Math.sin(t * OM(3));
  return {
    x: P.x, y: lerp(P.y, FLOOR - 70, h) + bob * h, s: lerp(P.s, 1.26, h), sx: P.sx, lean: P.lean + A.lean + 0.02 * h * Math.sin(t * OM(2)),
    sq: (P.sq || 0) + A.sq + 0.03 * damp(t - S5.TS, 20, 6), rot: h * 0.62 * Math.sin(TAU * seg(t, 0.12, 7.25)),
    rim: 0.35 + 0.95 * h, glint: 0, bunB: {}, p1: {}, p2: {}, cheese: { flop: 1, melt: 1, grow: 1 }, onT: 99, jaT: 99,
    sauce: { d: 1, drip: 1 }, bunT: {}, h,
  };
};
S5.build = () => {
  S5.the = word('THE', FONT.anton, 104, ST.cream, 10);
  const sz = fitSize('INFERNO', FONT.blk, 230, 980, 0);
  S5.T = glyph('INFERNO', FONT.blk, sz, { ...ST.fire, ext: [18, '#2a0803'], glow: ['rgba(255,90,10,0.85)', 30] });
  S5.Tw = word('INFERNO', FONT.blk, sz, { ...ST.fire, ext: [18, '#2a0803'] }, 0);
  S5.Tr = glyph('INFERNO', FONT.blk, sz, { fill: 'rgba(255,40,0,1)' });
  S5.Ty = glyph('INFERNO', FONT.blk, sz, { fill: 'rgba(255,214,0,1)' });
  S5.tag = word('DOUBLE SMASH · CHEDDAR · JALAPEÑO · CHILI', FONT.mono, 24, { fill: '#fff1d6' }, 3);
};
S5.titleBase = 432;
S5.title = (g, t) => {
  const TS = S5.TS, base = S5.titleBase, cx = 540;
  // THE
  const tl = 540 - S5.the.width / 2;
  S5.the.items.forEach((it, i) => {
    const ti = 1.12 + i * 0.05; if (t < ti) return;
    const u = seg(t, ti, ti + 0.24), dy = -160 * (1 - E.outQ(u)) - 16 * Math.abs(Math.sin((t - ti - 0.24) * 14)) * decay(t - ti - 0.24, 7) * (u >= 1 ? 1 : 0);
    const te = 6.55 + i * 0.05;
    if (t > te) { burnLetter(g, it.g, letterCenter(it, tl, 236).x, 236 - it.g.cap / 2, E.inQ(seg(t, te, te + 0.45)), t, 90 + i); return; }
    drawLetter(g, it, tl, 236, { dy, alpha: u > 0 ? 1 : 0 });
  });
  if (t < TS - 0.22) return;
  const T = S5.T;
  if (t < 6.5) {
    // slam: rushes in from huge, hits, rings out; then heat shimmer
    let sc = 1, al = 1;
    if (t < TS) { const u = seg(t, TS - 0.22, TS); sc = lerp(3.4, 1, E.inQ(u)); al = u; }
    else sc = 1 + 0.07 * damp(t - TS, 24, 7);
    const dt = t - TS;
    g.save(); g.translate(cx, base - T.cap / 2); g.scale(sc, sc);
    if (dt > 0 && dt < 0.6) { // chromatic ghosts
      const off = 22 * decay(dt, 6), ga = 0.75 * decay(dt, 4);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga;
      g.drawImage(S5.Tr.c, -S5.Tr.cx - off, -S5.Tr.cy); g.drawImage(S5.Ty.c, -S5.Ty.cx + off, -S5.Ty.cy + off * 0.3); g.restore();
    }
    g.globalAlpha = al;
    const amp = (2.2 + 9 * decay(dt, 3)) * (1 - seg(t, 6.0, 6.45));
    const strip = 4;
    for (let y = 0; y < T.h; y += strip) {
      const off = amp * (Math.sin(y * 0.09 + t * OM(64)) * 0.7 + Math.sin(y * 0.031 - t * OM(36)) * 0.6) * smooth(T.h, T.h * 0.4, y);
      g.drawImage(T.c, 0, y, T.w, strip + 0.5, -T.cx + off, -T.cy + y, T.w, strip + 0.5);
    }
    g.restore();
    // pulsing hot glow
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.15 * Math.sin(t * OM(8));
    g.drawImage(SPR.orange, cx - 560, base - T.cap - 120, 1120, T.cap + 260); g.restore();
  } else {
    // burns away letter by letter
    const left = cx - S5.Tw.width / 2;
    S5.Tw.items.forEach((it, i) => {
      const te = 6.5 + hash(i, 501) * 0.3, c = letterCenter(it, left, base);
      burnLetter(g, it.g, c.x, c.y, E.inQ(seg(t, te, te + 0.42)), t, 70 + i);
      burst(g, t, te, { n: 14, seed: 520 + i, x: c.x, y: c.y, sx: it.adv * 0.8, sy: S5.Tw.cap, ang: [-PI * 0.8, -PI * 0.2], spd: [60, 260], life: [0.6, 1.4], g: -180, drag: 0.8, size: [2.5, 8], delay: (j, r) => r(9) * 0.4, delayMax: 0.4, wrap: true });
    });
  }
};
S5.back = (g, t) => {
  if (vis(-500, W + 500)) {
    const h = S5.halo(t), cx = 540, cy = 690;
    g.save(); g.globalCompositeOperation = 'lighter';
    // god rays (18 wedges, rotate exactly two wedges per loop)
    if (h > 0) {
      g.save(); g.translate(cx, cy); g.rotate((t / LOOP) * (TAU / 9));
      g.fillStyle = 'rgba(255,200,140,1)';
      for (let k = 0; k < 18; k += 2) {
        const a0 = (k / 18) * TAU, a1 = ((k + 1) / 18) * TAU;
        g.globalAlpha = 0.05 * h; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1500, a0, a1); g.closePath(); g.fill();
      }
      g.restore();
    }
    g.globalAlpha = 0.25 + 0.75 * h; g.drawImage(SPR.orange, cx - 760, cy - 700, 1520, 1400);
    g.globalAlpha = 0.5 * h; g.drawImage(SPR.red, cx - 900, cy - 800, 1800, 1600);
    // ring of fire
    if (h > 0.01) {
      const R = 400, ign = decay(t - 0.8, 3) * (t >= 0.8 ? 1 : 0);
      g.globalAlpha = 0.9 * h; g.strokeStyle = 'rgba(255,160,60,1)'; g.lineWidth = 8;
      g.beginPath(); g.ellipse(cx, cy, R, R * 0.96, 0, 0, TAU); g.stroke();
      g.globalAlpha = 0.25 * h; g.lineWidth = 40; g.stroke();
      for (let k = 0; k < 46; k++) {
        const a = (k / 46) * TAU, n = 0.5 + 0.5 * pnoise(t + k * 0.13, 24, k * 7 + 3);
        const len = (60 + 120 * n + 160 * ign) * h, w = 46 + 20 * hash(k, 9);
        g.save(); g.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.96); g.rotate(a + PI / 2 + 0.38);
        g.globalAlpha = 0.8; g.drawImage(SPR.flame, -w / 2, -len, w, len);
        g.rotate(-0.2); g.globalAlpha = 0.5; g.drawImage(SPR.flame, -w * 0.35, -len * 0.55, w * 0.7, len * 0.55); g.restore();
      }
    }
    g.restore();
  }
};
S5.mid = (g, t) => {
  const B = S5.burger(t); if (!burgerOnScreen(B)) return;
  const h = B.h;
  // heroic back glow + floor
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 * h;
  g.drawImage(SPR.gold, B.x - 420 * B.s, B.y - 560 * B.s, 840 * B.s, 640 * B.s); g.restore();
  floorShadow(g, { x: B.x, y: FLOOR, s: B.s }, (FLOOR - B.y) * 6, 0.35);
  drawBurger(g, B, t);
};
S5.front = (g, t) => {
  const inView = vis(0, W);
  // orbiting embers around the hero
  const h = S5.hero(t);
  if (inView && h > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const a = hash(i, 601) * TAU + t * OM(1 + (i % 3)), R = 360 + 160 * hash(i, 602), yy = 650 + 380 * (hash(i, 603) - 0.5) + 30 * Math.sin(t * OM(2) + i);
      const x = 540 + Math.cos(a) * R, y = yy + Math.sin(a) * R * 0.22, s = (3 + 7 * hash(i, 604)) * (0.7 + 0.3 * Math.sin(a));
      g.globalAlpha = h * (0.45 + 0.4 * Math.sin(a)) * (0.75 + 0.25 * Math.sin(t * OM(40) + i)); g.drawImage(SPR.ember, x - s * 2, y - s * 2, s * 4, s * 4);
    }
    g.restore();
  }
  if (inView) S5.title(g, t);
  // slam: ember explosion (crosses into neighbours), shockwave, sparks
  const cy = S5.titleBase - 80;
  burst(g, t, S5.TS, { n: 150, seed: 540, x: 540, y: cy, sx: 700, sy: 120, ang: [-PI, PI], spd: [400, 2400], life: [0.8, 2.2], g: 140, drag: 1.4, size: [3, 11], wrap: true });
  burst(g, t, S5.TS, { n: 80, seed: 550, x: 540, y: cy, sx: 800, sy: 80, ang: [-PI, PI], spd: [900, 2800], life: [0.3, 0.8], g: 800, drag: 1.8, size: [2, 4], kind: 'spark', wrap: false });
  if (inView) {
    ring(g, t, S5.TS, 540, cy, { r0: 120, r1: 1300, dur: 0.75, w: 22, color: 'rgba(255,220,170,1)', soft: true });
    ring(g, t, S5.TS + 0.08, 540, cy, { r0: 80, r1: 900, dur: 0.6, w: 8, color: 'rgba(255,140,60,1)', alpha: 0.8 });
    ring(g, t, 0.85, 540, 690, { r0: 380, r1: 900, dur: 0.6, w: 16, color: 'rgba(255,170,80,1)', alpha: 0.8 });
    // tagline decodes on
    const tg = S5.tag, tl = 540 - tg.width / 2, gl = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*0123456789';
    tg.items.forEach((it, i) => {
      const ti = 2.0 + i * 0.022, te = 6.5 + i * 0.008; if (t < ti || t > te + 0.25 || !it.g) return;
      const solved = t > ti + 0.3 && t < te;
      if (solved) { drawLetter(g, it, tl, 1180, { alpha: 0.92 }); return; }
      g.save(); g.font = fstr(FONT.mono, 24); g.fillStyle = '#ff9a3c';
      g.fillText(gl[Math.floor(hash(Math.floor(t * 24), i) * gl.length)], tl + it.pen, 1180); g.restore();
    });
  }
  embers(g, t, { n: 60, seed: 560, life: 2, x0: -40, x1: W + 40, y0: 1350, y1: 1200, rise: 1000, wind: 30, size: [3, 10], alpha: 0.9, inten: (tb, x) => 0.5 + 0.5 * S5.halo(tb) });
  chrome(g, 4, t);
};

// ================================================================== 06 · THE DROP — price, availability, order button
const S6 = {
  TI: 1.64,
  shakes: [[1.64, 28]], zooms: [[1.64, 0.045]], flashes: [[1.64, 0.38, '255,244,220']],
};
S6.burger = (t) => {
  const P = whip(5, t), A = t < 1.5 ? arrive(t) : { lean: 0, sq: 0 };
  return {
    x: P.x, y: P.y, s: P.s, sx: P.sx, lean: P.lean + A.lean, sq: (P.sq || 0) + A.sq + 0.05 * damp(t - S6.TI, 22, 7), rot: 0, rim: 0.6 + 0.3 * beat(t), glint: 0,
    bunB: {}, p1: {}, p2: {}, cheese: { flop: 1, melt: 1, grow: 1 }, onT: 99, jaT: 99, sauce: { d: 1, drip: 1 }, bunT: {},
  };
};
S6.build = () => {
  const priceSt = { fill: [[0, '#fffaf0'], [1, '#ffe0a8']], ext: [18, '#250703'], stroke: ['#250703', 6], shine: 0.2 };
  S6.big = [], S6.small = [];
  for (let d = 0; d < 10; d++) { S6.big.push(glyph(String(d), FONT.wide, 262, priceSt)); S6.small.push(glyph(String(d), FONT.wide, 132, priceSt)); }
  S6.dollar = glyph('$', FONT.wide, 132, priceSt); S6.dot = glyph('.', FONT.wide, 132, priceSt);
  SCR.font = fstr(FONT.wide, 262); S6.cwB = Math.max(...'0123456789'.split('').map((c) => SCR.measureText(c).width));
  SCR.font = fstr(FONT.wide, 132); S6.cwS = Math.max(...'0123456789'.split('').map((c) => SCR.measureText(c).width));
  S6.dotW = SCR.measureText('.').width; S6.dolW = SCR.measureText('$').width;
  const total = S6.dolW + 10 + S6.cwB * 2 + S6.dotW + S6.cwS * 2;
  let x = 540 - total / 2; S6.px = {};
  S6.px.dol = x + S6.dolW / 2; x += S6.dolW + 10;
  S6.px.d1 = x + S6.cwB / 2; x += S6.cwB; S6.px.d2 = x + S6.cwB / 2; x += S6.cwB;
  S6.px.dot = x + S6.dotW / 2; x += S6.dotW;
  S6.px.d3 = x + S6.cwS / 2; x += S6.cwS; S6.px.d4 = x + S6.cwS / 2;
  S6.capB = S6.big[0].cap; S6.capS = S6.small[0].cap;
  S6.logo = glyph('EMBER & BUN', FONT.wide, fitSize('EMBER & BUN', FONT.wide, 74, 760), { fill: [[0, '#fff8e8'], [1, '#ffe2b8']], ext: [9, '#250703'], shine: 0.2 });
  S6.logoGlow = glyph('EMBER & BUN', FONT.wide, fitSize('EMBER & BUN', FONT.wide, 74, 760), { fill: 'rgba(255,230,140,1)', glow: ['rgba(255,220,120,1)', 24] });
  S6.tag = glyph('THE INFERNO · DOUBLE SMASH', FONT.anton, 40, { fill: '#fff1d6' });
  S6.avail = word('AVAILABLE NOW', FONT.anton, 104, { fill: [[0, '#1c0503'], [1, '#2a0703']], shine: 0 }, 5);
  S6.availHot = word('AVAILABLE NOW', FONT.anton, 104, { fill: 'rgba(255,240,170,1)', glow: ['rgba(255,250,200,1)', 18] }, 5);
  // button
  const bt = glyph('ORDER NOW · LINK IN BIO', FONT.anton, 50, { fill: '#1a0503' });
  const bw = bt.adv + 170, bh = 116;
  const c = mk(bw + 20, bh + 20), g = c.getContext('2d'); g.translate(10, 10);
  g.beginPath(); rrect(g, 0, 0, bw, bh, bh / 2);
  const gr = g.createLinearGradient(0, 0, 0, bh); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#ffd9a0'); g.fillStyle = gr; g.fill();
  g.strokeStyle = '#250703'; g.lineWidth = 5; g.stroke();
  g.drawImage(bt.c, 50 - bt.bx, bh / 2 + bt.cap / 2 - bt.by + 1);
  S6.btn = c; S6.bw = bw; S6.bh = bh;
  S6.btnGlow = blurred((() => { const k = mk(bw + 20, bh + 20), kg = k.getContext('2d'); kg.translate(10, 10); kg.beginPath(); rrect(kg, 0, 0, bw, bh, bh / 2); kg.fillStyle = '#ffd36a'; kg.fill(); return k; })(), 22);
  // NEW badge
  const bd = mk(200, 200), bg = bd.getContext('2d'); bg.translate(100, 100); bg.beginPath();
  for (let k = 0; k < 32; k++) { const r = k % 2 ? 70 : 88, a = (k / 32) * TAU; k ? bg.lineTo(Math.cos(a) * r, Math.sin(a) * r) : bg.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  bg.closePath(); bg.fillStyle = '#ffd23f'; bg.fill(); bg.strokeStyle = '#250703'; bg.lineWidth = 5; bg.stroke();
  S6.badge = bd; S6.badgeTxt = glyph('NEW', FONT.anton, 54, { fill: '#250703' });
};
S6.priceScale = (t) => {
  if (t < 1.38) return 1 + 0.05 * E.outC(seg(t, 0.3, 0.45));
  if (t < 1.52) return lerp(1.05, 1.24, E.outC(seg(t, 1.38, 1.52)));
  if (t < S6.TI) return lerp(1.24, 1, E.inExpo(seg(t, 1.52, S6.TI)));
  return 1 - 0.06 * damp(t - S6.TI, 30, 9);
};
S6.reel = (g, t, x, base, digit, set, cw, stop, spins) => {
  const u = seg(t, 0.4, stop), r = digit - 10 * spins * (1 - E.outBack(u, 1.3));
  const cap = set[0].cap, cell = cap * 1.7, d0 = Math.floor(r), f = r - d0;
  const speed = u > 0 && u < 1 ? 1 - u : 0;
  g.save(); g.beginPath(); g.rect(x - cw / 2 - 14, base - cap - 30, cw + 28, cap + 58); g.clip();
  for (const [d, off] of [[d0, -f], [d0 + 1, 1 - f]]) {
    const G = set[((d % 10) + 10) % 10], yy = base + off * cell;
    g.drawImage(G.c, x - G.cx, yy - G.cap / 2 - G.cy);
    if (speed > 0.15) { g.globalAlpha = 0.35 * speed; g.drawImage(G.c, x - G.cx, yy - G.cap / 2 - G.cy - cell * 0.18); g.drawImage(G.c, x - G.cx, yy - G.cap / 2 - G.cy + cell * 0.18); g.globalAlpha = 1; }
  }
  g.restore();
};
S6.back = (g, t) => {
  if (!vis(-300, W + 300)) return;
  // sunburst (24 wedges, rotates exactly two wedges per loop)
  g.save(); g.translate(540, 470); g.rotate((t / LOOP) * (TAU / 12));
  g.fillStyle = 'rgba(110,8,0,0.16)'; g.beginPath();
  for (let k = 0; k < 24; k += 2) { const a0 = (k / 24) * TAU, a1 = ((k + 1) / 24) * TAU; g.moveTo(0, 0); g.arc(0, 0, 1700, a0, a1); g.closePath(); }
  g.fill(); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.2 * beat(t); g.drawImage(SPR.gold, 540 - 620, 470 - 380, 1240, 760); g.restore();
  // halftone that ripples
  g.save(); g.fillStyle = 'rgba(80,6,0,0.28)'; g.beginPath();
  for (let y = 980; y < H + 10; y += 24) for (let x = 0; x < W + 12; x += 24) {
    const k = (y - 980) / 370, r = (1 + 7 * k) * (0.6 + 0.4 * Math.sin(x * 0.02 - t * OM(2) + y * 0.01));
    if (r > 0.6) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
  }
  g.fill(); g.restore();
};
S6.mid = (g, t) => {
  const B = S6.burger(t); if (!burgerOnScreen(B)) return;
  floorShadow(g, B, 0, 0.25);
  drawBurger(g, B, t);
};
S6.front = (g, t) => {
  if (!vis(0, W)) return;
  // logo
  const lb = 170, la = 0.85 + 0.15 * pnoise(t, 40, 61);
  drawSprite(g, S6.logo, 540, lb);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 * la * (0.6 + 0.4 * beat(t)); drawSprite(g, S6.logoGlow, 540, lb); g.restore();
  // tag pill
  const tw = S6.tag.adv + 56; g.save(); g.beginPath(); rrect(g, 540 - tw / 2, 214, tw, 58, 29); g.fillStyle = 'rgba(28,6,3,0.9)'; g.fill(); g.restore();
  drawSprite(g, S6.tag, 540, 260);
  // price: digits roll like a slot machine, then the whole price stamps down
  const sc = S6.priceScale(t), base = 548, dy = -24 * E.outC(seg(t, 0.3, 0.45)) * (1 - seg(t, 1.38, 1.5));
  g.save(); g.translate(540, base - 120 + dy); g.scale(sc, sc); g.translate(-540, -(base - 120));
  const topB = base - S6.capB, sbase = topB + S6.capS;
  g.drawImage(S6.dollar.c, S6.px.dol - S6.dollar.cx, sbase - S6.dollar.cap / 2 - S6.dollar.cy);
  S6.reel(g, t, S6.px.d1, base, 1, S6.big, S6.cwB, 1.0, 2);
  S6.reel(g, t, S6.px.d2, base, 4, S6.big, S6.cwB, 1.12, 3);
  g.drawImage(S6.dot.c, S6.px.dot - S6.dot.cx, sbase - S6.dot.cap / 2 - S6.dot.cy);
  S6.reel(g, t, S6.px.d3, sbase, 9, S6.small, S6.cwS, 1.24, 3);
  S6.reel(g, t, S6.px.d4, sbase, 9, S6.small, S6.cwS, 1.36, 4);
  g.restore();
  burst(g, t, S6.TI, { n: 46, seed: 640, x: 540, y: 470, sx: 820, sy: 220, ang: [-PI, PI], spd: [300, 1200], life: [0.4, 0.9], g: 1200, drag: 2.2, size: [3, 9], kind: 'dot', color: 'rgba(37,7,3,0.9)', comp: 'source-over', wrap: false });
  burst(g, t, S6.TI, { n: 40, seed: 650, x: 540, y: 460, sx: 760, sy: 200, ang: [-PI, PI], spd: [300, 1500], life: [0.6, 1.4], g: 200, drag: 1.5, size: [3, 9], wrap: false });
  ring(g, t, S6.TI, 540, 450, { r0: 380, r1: 1000, flat: 0.5, dur: 0.6, w: 14, color: 'rgba(255,248,230,1)', alpha: 0.85, comp: 'source-over' });
  // AVAILABLE NOW — pops out while the price re-rolls, pops back in, then beats
  const av = S6.avail, al = 540 - av.width / 2, ab = 712, bt = beat(t);
  av.items.forEach((it, i) => {
    if (!it.g) return;
    const sOut = E.inBack(seg(t, 0.3 + i * 0.012, 0.46 + i * 0.012), 2), sIn = E.outBack(seg(t, 1.85 + i * 0.035, 2.2 + i * 0.035), 2.8);
    const s = t < 1.2 ? 1 - sOut : sIn; if (s <= 0.002) return;
    const ss = s * (1 + 0.045 * bt);
    drawLetter(g, it, al, ab, { s: ss });
    drawLetter(g, S6.availHot.items[i], al, ab, { s: ss, alpha: 0.42 * bt, comp: 'lighter' });
  });
  // NEW badge (16-point star, turns one point per loop)
  g.save(); g.translate(872, 868); g.rotate(-0.25 + (t / LOOP) * (TAU / 16)); const bs = 1 + 0.07 * bt; g.scale(bs, bs);
  g.drawImage(S6.badge, -100, -100); g.restore();
  g.save(); g.translate(872, 868); g.rotate(-0.22); g.scale(bs, bs); g.drawImage(S6.badgeTxt.c, -S6.badgeTxt.cx, -S6.badgeTxt.cy); g.restore();
  // order button: glow, press on the off-beat, ripple, shine sweep, nudging arrow
  const ob = beat(t, 0.5), bx = 540, by = 1204, bw = S6.bw, bh = S6.bh;
  const press = 1 - 0.035 * kick(frac(t - 0.5) * 1, 16, 7) + 0.03 * ob;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.45 * ob;
  g.drawImage(S6.btnGlow, bx - S6.btnGlow.width / 2, by - S6.btnGlow.height / 2); g.restore();
  for (let k = 0; k < 2; k++) {
    const q = frac((t - 0.5) / 1 + k * 0.5);
    g.save(); g.translate(bx, by); const rs = 1 + 0.32 * E.outC(q); g.scale(rs, 1 + (rs - 1) * 1.6);
    g.globalAlpha = 0.65 * (1 - q); g.strokeStyle = '#fff1d6'; g.lineWidth = 4 / rs; g.beginPath(); rrect(g, -bw / 2, -bh / 2, bw, bh, bh / 2); g.stroke(); g.restore();
  }
  g.save(); g.translate(bx, by); g.scale(press, press);
  g.drawImage(S6.btn, -S6.btn.width / 2, -S6.btn.height / 2);
  g.beginPath(); rrect(g, -bw / 2, -bh / 2, bw, bh, bh / 2); g.clip();
  const sx = lerp(-bw * 0.9, bw * 0.9, E.ioS(frac((t - 0.2) / 2)));
  const sg = g.createLinearGradient(sx - 90, 0, sx + 90, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sg; g.save(); g.transform(1, 0, -0.4, 1, 0, 0); g.fillRect(sx - 90, -bh, 180, bh * 2); g.restore();
  // arrow
  const ax = bw / 2 - 58 + 10 * kick(frac(t), 14, 6);
  g.strokeStyle = '#ff5a10'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(ax - 22, 0); g.lineTo(ax + 14, 0); g.moveTo(ax, -16); g.lineTo(ax + 16, 0); g.lineTo(ax, 16); g.stroke();
  g.restore();
  embers(g, t, { n: 50, seed: 660, life: 2, x0: -40, x1: W + 40, y0: 1350, y1: 1150, rise: 1000, wind: 24, size: [3, 9], alpha: 0.85 });
  g.save(); g.globalAlpha = 0.9; g.drawImage(CH.count[5], 72, 1290); g.restore();
};

const SL = [S1, S2, S3, S4, S5, S6];
