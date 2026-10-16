// SLIDE 2 — CLEAR ALIGNERS. The glass-clear tray floats weightless, lit by the scan laser from slide 1;
// iridescent pearls orbit it (crossing both seams); callout lines track the moving tray. At 4.0 a scan
// pulse rolls through the plastic and the orbit breathes out.
import { THREE, W, H, TAU, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, beatEnv, hash, sprite } from './core.js';
import { bgQuad, BEAM, hexv4 } from './gl.js';
import { beamState } from './s1_hook.js';

const I = 1;
export const TRAY = { cx: 540, cy: 560, w: 940 };         // slide-local, y down
const ORBIT = { cx: 540, cy: 560 };
const RINGS = [
  { R: 400, ry: 0.26, roll: -0.20, n: 18, turns: 1 },
  { R: 545, ry: 0.20, roll: 0.14, n: 24, turns: -1 },
  { R: 680, ry: 0.32, roll: -0.06, n: 16, turns: 1 },
];
// u, v on the tray image; label box at (lx, ly); side: which way the label reads
const CALLOUTS = [
  { u: 0.13, v: 0.22, title: 'INVISIBLE', sub: '0.5 MM CLEAR TRAY', lx: 64, ly: 196, side: -1 },
  { u: 0.88, v: 0.24, title: 'REMOVABLE', sub: 'EAT WHAT YOU LIKE', lx: 736, ly: 196, side: 1 },
  { u: 0.27, v: 0.66, title: 'PRINTED FOR YOU', sub: 'FROM YOUR 3D SCAN', lx: 64, ly: 880, side: -1 },
  { u: 0.66, v: 0.86, title: 'ZERO METAL', sub: 'NO WIRES. NO BRACKETS.', lx: 736, ly: 880, side: 1 },
];

export function init(ctx) {
  // ---------- background ----------
  const ringGLSL = RINGS.map(r => /* glsl */`{
      vec2 q = p - vec2(${ORBIT.cx.toFixed(1)}, ${ORBIT.cy.toFixed(1)});
      float c = cos(${(-r.roll).toFixed(3)}), s = sin(${(-r.roll).toFixed(3)});
      q = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
      vec2 e = vec2(q.x, q.y / ${r.ry.toFixed(3)});
      float rr = length(e) * uRing;
      float d = abs(rr - ${r.R.toFixed(1)}) * mix(${r.ry.toFixed(3)}, 1.0, abs(q.x) / max(length(e), 1.));
      float ang = atan(e.y, e.x);
      float dash = step(0.45, fract(ang / TAU * 90. - ${(r.turns > 0 ? '' : '-')}uTime / 8. * 3.));
      add += vec3(0.55, 0.80, 0.90) * (1. - smoothstep(0.6, 1.6, d)) * (0.09 + 0.07 * dash);
    }`).join('\n');
  const bg = bgQuad(I, BEAM + /* glsl */`uniform float uPulse; uniform float uRing;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.09, 0.28, 0.42), vec3(0.03, 0.12, 0.21), smoothstep(0., 1350., p.y));
    float d = length((p - vec2(${TRAY.cx}., ${TRAY.cy}.)) * vec2(0.8, 1.3));
    col += vec3(0.06, 0.12, 0.15) * exp(-d * d / (420. * 420.));
    col += vec3(0.02, 0.22, 0.38) * exp(-d * d / (620. * 620.)) * (0.32 + 0.35 * uPulse);
    col += vec3(0.01, 0.025, 0.03) * fbm(p * 0.004 + loopv(t));
    ${ringGLSL}
    add += beam(sp, t);
    // scan pulse: a horizontal band sweeping down through the tray at 4.0
    add += vec3(0.30, 0.85, 1.0) * uPulse * 0.07 * exp(-d * d / (300. * 300.));
    col *= mix(0.88, 1.0, smoothstep(0., 240., p.y)) * mix(0.85, 1.0, smoothstep(1350., 1080., p.y));
  `, { uBeam: { value: 0 }, uBeamCut: { value: 1 }, uPulse: { value: 0 }, uRing: { value: 1 } });
  bg.u.uSeamL.value = hexv4('#0f3552', 1);
  bg.u.uSeamR.value = hexv4('#164a6e', 1);
  ctx.bgScene.add(bg);

  // ---------- the tray ----------
  const A = ctx.assets.aligner;
  const tw = TRAY.w, th = TRAY.w * A.h / A.w;
  const tray = sprite(A.tex, tw, th, { segs: 64, order: 21 });
  tray.u.uBright.value = 1.15;
  tray.u.uRim.value.set('#7fe6ff');
  tray.u.uRimDir.value.set(-0.85, 0.5);
  ctx.seamScene.add(tray);
  // a second, additive copy = the glass glow
  const halo = sprite(A.tex, tw, th, { segs: 64, order: 22, additive: true });
  halo.u.uTint.value.set('#5fd8ff'); halo.u.uTintAmt.value = 0.55; halo.u.uBias.value = 3.0;
  ctx.seamScene.add(halo);
  const glow = sprite(ctx.radialTex, 1500, 900, { order: 19, additive: true });
  glow.u.uTint.value.set('#0f74a8'); glow.u.uTintAmt.value = 1; glow.u.uOpacity.value = 0.22;
  glow.position.set(I * W + TRAY.cx, H - TRAY.cy, 0);
  ctx.seamScene.add(glow);

  // ---------- pearl orbit ----------
  const parts = [];
  RINGS.forEach((r, k) => {
    for (let j = 0; j < r.n; j++) {
      const s = hash(k * 100 + j);
      const big = s > 0.86;
      parts.push({ ring: r, ph: (j / r.n) * TAU + (hash(k * 50 + j * 3) - 0.5) * 0.25, rj: (hash(j * 7 + k) - 0.5) * 40,
        size: big ? 15 + hash(j + 9) * 13 : 3 + hash(j * 3 + k * 7) * 9 });
    }
  });
  const sphGeo = new THREE.SphereGeometry(1, 32, 20);
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf6f4ef, metalness: 0, roughness: 0.22, envMap: ctx.envMap, envMapIntensity: 1.5,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 700], clearcoat: 1, clearcoatRoughness: 0.08,
    sheen: 0.4, sheenColor: new THREE.Color('#bdefff'),
  });
  const back = new THREE.InstancedMesh(sphGeo, pearl, parts.length);
  const front = new THREE.InstancedMesh(sphGeo, pearl, parts.length);
  back.renderOrder = 20; front.renderOrder = 23;
  back.frustumCulled = front.frustumCulled = false;
  ctx.seamScene.add(back, front);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();

  // ---------- DOM callouts ----------
  const el = ctx.dom[I];
  const svg = el.querySelector('svg.callouts');
  const NS = 'http://www.w3.org/2000/svg';
  const cos = CALLOUTS.map(c => {
    const g = document.createElementNS(NS, 'g');
    const line = document.createElementNS(NS, 'polyline');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 6);
    const ring = document.createElementNS(NS, 'circle'); ring.setAttribute('class', 'ring');
    g.append(line, ring, dot); svg.append(g);
    const lab = document.createElement('div');
    lab.className = 'co-label' + (c.side > 0 ? ' r' : '');
    lab.style.left = c.lx + 'px'; lab.style.top = c.ly + 'px';
    lab.innerHTML = `<b>${c.title}</b><span>${c.sub}</span>`;
    el.append(lab);
    return { c, line, dot, ring, lab };
  });
  const head = el.querySelector('.s2-head');

  // project a tray uv point the same way the vertex shader does (ignoring ripple)
  const proj = (u, v, cx, cy, yaw, pitch, roll) => {
    let x = (u - 0.5) * tw, y = (0.5 - v) * th, z = 0;
    let c = Math.cos(pitch), s = Math.sin(pitch); [y, z] = [c * y - s * z, s * y + c * z];
    c = Math.cos(yaw); s = Math.sin(yaw); [x, z] = [c * x + s * z, -s * x + c * z];
    c = Math.cos(roll); s = Math.sin(roll); [x, y] = [c * x - s * y, s * x + c * y];
    const k = 1800 / (1800 - z);
    return [cx + x * k, cy - y * k];   // slide-local, y down
  };

  return {
    update(t) {
      const bs = beamState(t);
      const burst = t < 4 ? 0 : eOutCubic(seg(t, 4.0, 4.28)) * (1 - eInOut(seg(t, 4.55, 5.8)));
      bg.u.uBeam.value = bs.beam; bg.u.uBeamCut.value = bs.cut;
      bg.u.uPulse.value = pulse(t, 4.0, 0.35) + 0.25 * beatEnv(t, 0.18);
      bg.u.uRing.value = 1 / (1 + 0.3 * burst);

      // weightless drift + slow tumble, all periodic
      const cx = TRAY.cx + Math.sin(TAU * t / 8) * 16;
      const cy = TRAY.cy + Math.cos(TAU * t / 8 + 0.6) * 14 - 22 * wobble(t, 4.0, 1.6, 3.5);
      const yaw = Math.sin(TAU * t / 8) * 0.22;
      const pitch = 0.1 + Math.sin(TAU * t / 4 + 1.0) * 0.07;
      const roll = Math.sin(TAU * t / 8 + 0.5) * 0.04 + 0.03 * wobble(t, 4.0, 1.2, 3);
      [tray, halo].forEach(m => {
        m.position.set(I * W + cx, H - cy, 0);
        m.u.uTime.value = t;
        m.u.uYaw.value = yaw; m.u.uPitch.value = pitch; m.u.uRoll.value = roll;
        m.u.uPulse.value = 0.6 * Math.exp(-Math.max(0, t - 4.0) * 2.2) * (t >= 4.0 ? 1 : 0);
        m.u.uPulseR.value = (t - 4.0) * 1100;
      });
      // shine sweeps: one on the laser hit (1.0), one on the pulse (4.0)
      const sw = (a) => (t >= a && t < a + 0.9 ? -0.6 + 2.6 * (t - a) / 0.9 : -3);
      tray.u.uShine.value = sw(1.05) > -2 ? sw(1.05) : sw(4.0);
      tray.u.uShineAmt.value = 0.55;
      tray.u.uRimAmt.value = 0.2 + 0.6 * Math.min(1.3, bs.beam);
      tray.u.uBright.value = 1.1 + 0.1 * Math.min(1, bs.beam) + 0.3 * pulse(t, 4.0, 0.12);
      halo.u.uOpacity.value = 0.18 + 0.12 * Math.min(1, bs.beam) + 0.35 * pulse(t, 4.0, 0.3) + 0.05 * beatEnv(t, 0.2);
      glow.u.uOpacity.value = 0.18 + 0.14 * pulse(t, 4.0, 0.4) + 0.05 * beatEnv(t, 0.2);

      // orbit
      let nb = 0, nf = 0;
      const beat = 1 + 0.03 * beatEnv(t, 0.15);
      parts.forEach(pt => {
        const r = pt.ring;
        const a = pt.ph + TAU * r.turns * t / 8;
        const R = (r.R + pt.rj) * (1 + 0.32 * burst) * beat;
        let x = R * Math.cos(a), y = R * Math.sin(a) * r.ry, z = R * Math.sin(a) * Math.sqrt(1 - r.ry * r.ry);
        const c = Math.cos(r.roll), s = Math.sin(r.roll);
        [x, y] = [c * x - s * y, s * x + c * y];
        const persp = 1800 / (1800 - z);
        const sx = I * W + ORBIT.cx + x * persp, sy = H - ORBIT.cy - y * persp;
        const sz = pt.size * persp * (1 + 0.25 * burst);
        V.set(sx, sy, z); Sc.set(sz, sz, sz); Q.identity();
        M.compose(V, Q, Sc);
        if (z < 0) back.setMatrixAt(nb++, M); else front.setMatrixAt(nf++, M);
      });
      back.count = nb; front.count = nf;
      back.instanceMatrix.needsUpdate = front.instanceMatrix.needsUpdate = true;

      // callouts: draw in at 6.8-7.9, hold through the loop point, retract at 5.8
      cos.forEach((o, k) => {
        let pr = 1;
        if (t >= 5.8 && t < 6.8) pr = 1 - eInOut(seg(t, 5.8 + (3 - k) * 0.09, 6.12 + (3 - k) * 0.09));
        else if (t >= 6.8) pr = eOutCubic(seg(t, 6.8 + k * 0.2, 7.3 + k * 0.2));
        const [ax, ay] = proj(o.c.u, o.c.v, cx, cy, yaw, pitch, roll);
        const top = o.c.ly < ay;                         // label above the anchor → line runs up to its baseline
        const ly = top ? o.c.ly + 64 : o.c.ly - 14;
        const lx = o.c.side > 0 ? o.c.lx + 280 : o.c.lx;
        const ex = o.c.side > 0 ? Math.min(ax + 30, lx - 20) : Math.max(ax - 30, lx + 20);
        const pts = [[ax, ay], [ax + (ex - ax) * 0.2, ly], [lx, ly]];
        const len = Math.hypot(pts[1][0] - ax, ly - ay) + Math.abs(lx - pts[1][0]);
        o.line.setAttribute('points', pts.map(p => p.join(',')).join(' '));
        o.line.style.strokeDasharray = `${len}`;
        o.line.style.strokeDashoffset = `${len * (1 - seg(pr, 0, 0.75))}`;
        o.dot.setAttribute('cx', ax); o.dot.setAttribute('cy', ay);
        o.dot.style.opacity = seg(pr, 0, 0.2);
        const be = beatEnv((t + k * 0.125) % 8, 0.3);
        o.ring.setAttribute('cx', ax); o.ring.setAttribute('cy', ay);
        o.ring.setAttribute('r', 8 + 18 * (1 - be));
        o.ring.style.opacity = seg(pr, 0, 0.2) * be * 0.9;
        const lp = seg(pr, 0.55, 1);
        o.lab.style.opacity = lp;
        o.lab.style.transform = `translateX(${(1 - lp) * 18 * -o.c.side}px)`;
        o.lab.style.clipPath = o.c.side > 0 ? `inset(0 0 0 ${(1 - lp) * 100}%)` : `inset(0 ${(1 - lp) * 100}% 0 0)`;
      });
      head.style.transform = `translateY(${-6 * wobble(t, 4.0, 2, 5)}px)`;
    },
  };
}
