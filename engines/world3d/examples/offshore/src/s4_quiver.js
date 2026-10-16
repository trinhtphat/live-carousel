// SLIDE 4 — THE QUIVER. A sun-bleached shaping room. Four boards stand racked in a row, scatter on
// 3.0 like a wipeout (crossing into slides 3 and 5), then fly back and lock into the rack one per beat.
import { THREE, W, H, TAU, mix, seg, smooth, eInCubic, eOutExpo, pulse, wobble, beatEnv, sprite, textTexture } from './core.js';
import { bgQuad, hexv4 } from './gl.js';

const I = 3;
const BASE = 1235;           // tails rest on this line (slide y)
const LONG_H = 960;
// x: slide centre; out: burst target + roll; land: lock time
const PIECES = [
  { key: 'longboard', x: 172, ox: 80, oy: 40, or: -1.05, land: 6.0, order: 31, size: '9\'4"', name: 'LONGBOARD' },
  { key: 'egg', x: 420, ox: 330, oy: 1320, or: 0.5, land: 5.0, order: 32, size: '7\'0"', name: 'MID / EGG' },
  { key: 'fish', x: 671, ox: 1150, oy: 860, or: -1.2, land: 5.5, order: 33, size: '5\'8"', name: 'TWIN FISH' },
  { key: 'short2', x: 916, ox: 1070, oy: 470, or: 0.9, land: 6.5, order: 34, size: '6\'2"', name: 'SHORTBOARD' },
];
const BURST = 3.0, TRAVEL = 0.42;
const sweep = (t, a) => (t >= a && t < a + 1.1 ? -0.6 + 2.6 * (t - a) / 1.1 : -3);

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uScanY; uniform float uScanA; uniform float uFlash; uniform float uBeat;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.975, 0.958, 0.925), vec3(0.83, 0.79, 0.71), smoothstep(120., 1150., length((p - vec2(540., 620.)) * vec2(1., 0.78))));
    col += vec3(0.035, 0.03, 0.02) * (fbm(p * 0.006 + loopv(t) * 0.4) - 0.5);
    vec2 g1 = abs(fract(p / 54.) - 0.5) * 54.;
    float l1 = 1. - smoothstep(0.35, 1.2, min(g1.x, g1.y));
    vec2 g2 = abs(fract(p / 270.) - 0.5) * 270.;
    float l2 = 1. - smoothstep(0.45, 1.5, min(g2.x, g2.y));
    col -= vec3(0.026, 0.028, 0.03) * l1 + vec3(0.05, 0.052, 0.055) * l2;
    // the rack: a shelf line the tails rest on
    col -= vec3(0.30, 0.32, 0.30) * exp(-abs(p.y - ${BASE + 8}.) / 1.6) * smoothstep(20., 80., p.x) * smoothstep(1060., 1000., p.x);
    col -= vec3(0.06) * exp(-max(p.y - ${BASE + 8}., 0.) / 40.) * step(${BASE + 8}., p.y);
    vec2 cm = abs(mod(p - vec2(270., 270.), vec2(540., 540.)) - 270.);
    col -= vec3(0.25) * (1. - smoothstep(0.6, 1.6, min(cm.x, cm.y))) * step(max(cm.x, cm.y), 14.);
    float sc = exp(-abs(p.y - uScanY) / 2.2) * uScanA;
    col = mix(col, vec3(0.05, 0.62, 0.66), clamp(sc, 0., 1.) * 0.85);
    col = mix(col, vec3(0.30, 0.80, 0.80), exp(-abs(p.y - uScanY) / 90.) * uScanA * 0.16);
    col = mix(col, vec3(0.55, 0.90, 0.88), uFlash);
    // the waterline arriving from slide 3
    add += vec3(-0.42, -0.10, -0.08) * exp(-abs(p.y - 940.) / 1.4) * smoothstep(620., 0., p.x) * 0.9;
  `, { uScanY: { value: -100 }, uScanA: { value: 0 }, uFlash: { value: 0 }, uBeat: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#5b6d6c', 1);
  bg.u.uSeamR.value = hexv4('#86d6d2', 1);
  ctx.bgScene.add(bg);

  // giant outline type behind the rack
  const T1 = textTexture(['PICK'], { size: 620, ls: 4, stroke: 5 });
  const T2 = textTexture(['ONE.'], { size: 620, ls: 4, stroke: 5 });
  const kT = 1010 / Math.max(T1.w, T2.w);
  const mkType = (T, y, order) => {
    const w = T.w * kT, h = T.h * kT;
    const m = sprite(T.tex, w, h, { order });
    m.u.uTint.value.set('#071a2b'); m.u.uTintAmt.value = 1; m.u.uOpacity.value = 0.8;
    m.position.set(I * W + 540, H - y, 0);
    ctx.bgScene.add(m);
    return { m, w, h, y };
  };
  const type1 = mkType(T1, 372, -50), type2 = mkType(T2, 935, -49);

  // boards + soft shadows, true relative lengths from the source photo
  const longSrc = ctx.assets.longboard.srcH;
  const items = PIECES.map(P => {
    const A = ctx.assets[P.key];
    const h = LONG_H * A.srcH / longSrc, w = h * A.w / A.h;
    const y = BASE - h * (0.5 - 0.028);   // the webp carries a 2.8% pad: rest the real tail on the rack
    const s = sprite(A.tex, w, h, { order: P.order, segs: 8 });
    s.u.uShade.value = 0.3;
    s.u.uRim.value.set('#19c3c9');
    s.u.uRimDir.value.set(0.8, 0.45);
    const sh = sprite(A.tex, w * 1.03, h * 1.03, { order: 30, segs: 8 });
    sh.u.uTint.value.set('#3a2c1e'); sh.u.uTintAmt.value = 1; sh.u.uBias.value = 4.5; sh.u.uOpacity.value = 0.26;
    ctx.seamScene.add(sh, s);
    return { P: { ...P, y }, s, sh, w, h };
  });

  // DOM labels: size above each nose
  const el = ctx.dom[I];
  const svg = el.querySelector('svg.fitlines');
  const NS = 'http://www.w3.org/2000/svg';
  const labels = items.map(it => {
    const line = document.createElementNS(NS, 'polyline'); svg.append(line);
    const d = document.createElement('div'); d.className = 'q-label';
    d.innerHTML = `<b>${it.P.size}</b><span>${it.P.name}</span>`; el.append(d);
    return { it, line, d };
  });
  const status = el.querySelector('.s4-status b');

  const state = (P, t) => {
    const bob = Math.sin(TAU * t / 4 + P.x * 0.004) * 5;
    const home = { x: P.x, y: P.y + bob, r: 0 };
    const out = { x: P.ox, y: P.oy, r: P.or };
    const start = P.land - TRAVEL;
    if (t < BURST || t >= P.land) {
      const sq = wobble(t, P.land, 2.4, 7);
      return { ...home, r: 0.035 * sq, k: 1, sq };
    }
    if (t < start) {
      const a = eOutExpo(seg(t, BURST, BURST + 0.7));
      const drift = 1 + 0.10 * smooth(seg(t, BURST + 0.5, start));
      const spin = 0.4 * seg(t, BURST, start) * Math.sign(P.or);
      return { x: mix(home.x, mix(home.x, out.x, drift), a), y: mix(home.y, mix(home.y, out.y, drift), a), r: out.r * a + spin, k: 1 - a, sq: 0 };
    }
    const b = eInCubic(seg(t, start, P.land));
    const fromX = mix(home.x, out.x, 1.10), fromY = mix(home.y, out.y, 1.10), fromR = out.r + 0.4 * Math.sign(P.or);
    return { x: mix(fromX, home.x, b), y: mix(fromY, home.y, b), r: mix(fromR, 0, b), k: b * 0.6, sq: 0 };
  };

  return {
    update(t) {
      let scanY = -100, scanA = 0, fl = 0;
      items.forEach(it => {
        const st = state(it.P, t);
        const hit = pulse(t, it.P.land, 0.12);
        it.s.position.set(I * W + st.x, H - st.y, 0);
        it.s.u.uRoll.value = -st.r;
        it.s.u.uYaw.value = 0.2 * Math.sin(TAU * t / 8 + it.P.x * 0.01) * (1 - st.k * 0.7);
        it.s.u.uPitch.value = 0.06 * Math.sin(TAU * t / 4 + it.P.y * 0.01);
        it.s.u.uTime.value = t;
        const sx = 1 + 0.05 * st.sq, sy = 1 - 0.03 * st.sq;
        it.s.scale.set(sx, sy, 1);
        it.s.u.uRimAmt.value = 0.5 * hit + 0.06;
        it.s.u.uShineAmt.value = 0.4;
        it.s.u.uShine.value = sweep(t, 0.9) > -2 ? sweep(t, 0.9) : sweep(t, 6.7);
        const lifted = 1 - st.k;
        it.sh.position.set(I * W + st.x + 16 + 60 * lifted, H - st.y - 22 - 70 * lifted, 0);
        it.sh.u.uRoll.value = -st.r; it.sh.u.uYaw.value = it.s.u.uYaw.value;
        it.sh.u.uOpacity.value = 0.24 * (1 - lifted);
        it.sh.u.uBias.value = 4.0;
        it.sh.scale.copy(it.s.scale);
        const dt = ((t - it.P.land) % 8 + 8) % 8;
        if (dt < 0.45) { scanY = st.y - it.h * 0.5; scanA = Math.exp(-dt / 0.12); }
        fl = Math.max(fl, 0.2 * pulse(t, it.P.land, 0.05));
      });
      fl = Math.max(fl, 0.28 * pulse(t, BURST, 0.06));
      bg.u.uScanY.value = scanY; bg.u.uScanA.value = scanA; bg.u.uFlash.value = fl;
      const kick = wobble(t, BURST, 1.8, 4);
      [type1, type2].forEach((T, k) => {
        T.m.position.y = H - T.y + (k ? -1 : 1) * 30 * kick;
        T.m.scale.set(1 + 0.02 * pulse(t, 6.5, 0.2), 1, 1);
      });
      labels.forEach(L => {
        const st = state(L.it.P, t);
        const vis = smooth(seg(st.k, 0.85, 1));
        const nose = st.y - L.it.h * (0.5 - 0.028);
        const ly = nose - 30;
        L.line.setAttribute('points', `${st.x},${nose - 8} ${st.x},${ly}`);
        L.line.style.opacity = vis;
        L.d.style.opacity = vis;
        L.d.style.left = (st.x - 100) + 'px';
        L.d.style.top = (ly - 72 + (1 - vis) * 16) + 'px';
      });
      const inAir = t >= BURST && t < 6.5;
      status.textContent = inAir ? (t < 4.58 ? 'WIPEOUT // SCATTERED' : 'RE-RACKING') : '4 BOARDS // RACKED';
    },
  };
}
