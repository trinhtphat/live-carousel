// SLIDE 2 — THE 6'2". The shortboard floats in an underwater studio: caustics crawl over the backdrop
// and the board, the sunrise flare from slide 1 rim-lights it, water droplets orbit it (crossing both
// seams), and callout lines track the moving board. A swell pulse rolls through on 4.0.
import { THREE, W, H, TAU, CAUSTIC, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, beatEnv, hash, sprite } from './core.js';
import { bgQuad, FLARE, hexv4 } from './gl.js';
import { flareState } from './s1_swell.js';

const I = 1;
export const BOARD = { cx: 318, cy: 688, h: 1160 };       // slide-local, y down
const ORBIT = { cx: 470, cy: 690 };
const RINGS = [
  { R: 360, ry: 0.30, roll: -0.30, n: 18, turns: 1 },
  { R: 505, ry: 0.22, roll: 0.15, n: 24, turns: -1 },
  { R: 640, ry: 0.36, roll: -0.08, n: 16, turns: 1 },
];
const CALLOUTS = [
  { u: 0.469, v: 0.036, title: 'NOSE', sub: 'PULLED-IN · LOW ENTRY', y: 300 },
  { u: 0.83, v: 0.46, title: 'RAILS', sub: 'TUCKED · HAND-FOILED', y: 486 },
  { u: 0.469, v: 0.62, title: 'STRINGER', sub: '1/8" RED CEDAR', y: 664 },
  { u: 0.693, v: 0.905, title: 'FINS', sub: 'THRUSTER · FCS II', y: 842 },
];
const LABEL_X = 812;

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
      add += vec3(0.45, 0.85, 0.88) * (1. - smoothstep(0.6, 1.6, d)) * (0.09 + 0.07 * dash);
    }`).join('\n');
  const bg = bgQuad(I, FLARE + CAUSTIC + /* glsl */`uniform float uPulse; uniform float uRing; uniform float uWave;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.090, 0.400, 0.450), vec3(0.020, 0.150, 0.200), smoothstep(0., 1350., p.y));
    float d = length((p - vec2(${BOARD.cx}., ${BOARD.cy - 40}.)) * vec2(1., 0.8));
    col += vec3(0.10, 0.32, 0.32) * exp(-d * d / (440. * 440.)) * (0.8 + 0.4 * uPulse);
    // light shafts from the surface above
    vec2 r = p - vec2(620., -500.);
    float a = atan(r.x, r.y);
    float rays = pow(fbm(vec2(a * 9.0, 0.3) + loopv(t) * 0.7), 2.6);
    col += vec3(0.30, 0.75, 0.80) * rays * 0.22 * smoothstep(1500., 300., length(r));
    // caustics projected on the backdrop, strongest near the top
    float cs = caustic(p * 0.9, TAU * t / 8.);
    col += vec3(0.35, 0.95, 1.0) * cs * 0.16 * smoothstep(1350., 150., p.y);
    ${ringGLSL}
    add += flare(sp, t);
    // the swell pulse: one ring of light rolls out from the board on 4.0
    if (uWave > 0.0) add += vec3(0.55, 0.95, 1.0) * exp(-pow((d - uWave * 1300.) / 16., 2.)) * (1. - uWave) * 0.7;
    add += vec3(0.4, 0.95, 1.0) * uPulse * 0.07 * exp(-d * d / (300. * 300.));
    col *= mix(0.9, 1.0, smoothstep(0., 240., p.y)) * mix(0.85, 1.0, smoothstep(1350., 1060., p.y));
  `, { uFlare: { value: 0 }, uFlareCut: { value: 1 }, uSunY: { value: 640 }, uPulse: { value: 0 }, uRing: { value: 1 }, uWave: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#0f4656', 1);
  bg.u.uSeamR.value = hexv4('#0b3644', 1);
  ctx.bgScene.add(bg);

  // ---------- the board ----------
  const A = ctx.assets.shortboard;
  const bw = BOARD.h * A.w / A.h;
  const board = sprite(A.tex, bw, BOARD.h, { segs: 48, order: 21 });
  board.u.uShade.value = 0.55;
  board.u.uBright.value = 1.04;
  board.u.uRim.value.set('#ffb070');
  board.u.uRimDir.value.set(-0.9, 0.35);
  board.u.uCaustic.value = 0.32;
  board.u.uCausticOff.value.set(310, 120);
  ctx.seamScene.add(board);
  const glow = sprite(ctx.radialTex, 1300, 1300, { order: 19, additive: true });
  glow.u.uTint.value.set('#0f8f99'); glow.u.uTintAmt.value = 1; glow.u.uOpacity.value = 0.2;
  glow.position.set(I * W + BOARD.cx, H - BOARD.cy, 0);
  ctx.seamScene.add(glow);

  // ---------- droplet orbit ----------
  const parts = [];
  RINGS.forEach((r, k) => {
    for (let j = 0; j < r.n; j++) {
      const s = hash(k * 100 + j);
      const big = s > 0.86;
      parts.push({ ring: r, ph: (j / r.n) * TAU + (hash(k * 50 + j * 3) - 0.5) * 0.25, rj: (hash(j * 7 + k) - 0.5) * 40,
        size: big ? 14 + hash(j + 9) * 12 : 3 + hash(j * 3 + k * 7) * 8 });
    }
  });
  const sphGeo = new THREE.SphereGeometry(1, 32, 20);
  const water = new THREE.MeshStandardMaterial({ color: 0xc8fbff, metalness: 1, roughness: 0.06, envMap: ctx.envMap, envMapIntensity: 1.35, transparent: true, depthWrite: true, depthTest: true });
  const back = new THREE.InstancedMesh(sphGeo, water, parts.length);
  const front = new THREE.InstancedMesh(sphGeo, water, parts.length);
  back.renderOrder = 20; front.renderOrder = 22;
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
    lab.className = 'co-label';
    lab.style.left = LABEL_X + 'px'; lab.style.top = (c.y - 26) + 'px';
    lab.innerHTML = `<b>${c.title}</b><span>${c.sub}</span>`;
    el.append(lab);
    return { c, line, dot, ring, lab };
  });
  const head = el.querySelector('.s2-head');

  // project a board uv point the same way the vertex shader does (ignoring the pulse)
  const proj = (u, v, cx, cy, yaw, pitch, roll) => {
    let x = (u - 0.5) * bw, y = (0.5 - v) * BOARD.h, z = 0;
    let c = Math.cos(pitch), s = Math.sin(pitch); [y, z] = [c * y - s * z, s * y + c * z];
    c = Math.cos(yaw); s = Math.sin(yaw); [x, z] = [c * x + s * z, -s * x + c * z];
    c = Math.cos(roll); s = Math.sin(roll); [x, y] = [c * x - s * y, s * x + c * y];
    const k = 1800 / (1800 - z);
    return [cx + x * k, cy - y * k];
  };

  return {
    update(t) {
      const fs = flareState(t);
      const burst = t < 4 ? 0 : eOutCubic(seg(t, 4.0, 4.28)) * (1 - eInOut(seg(t, 4.55, 5.8)));
      bg.u.uFlare.value = fs.flare; bg.u.uFlareCut.value = fs.cut; bg.u.uSunY.value = fs.sunY;
      bg.u.uPulse.value = pulse(t, 4.0, 0.35) + 0.25 * beatEnv(t, 0.18);
      bg.u.uRing.value = 1 / (1 + 0.3 * burst);
      bg.u.uWave.value = t >= 4.0 && t < 5.0 ? seg(t, 4.0, 5.0) : 0;

      // bob + turn, all periodic; a swell lifts it on 4.0
      const cx = BOARD.cx + Math.sin(TAU * t / 8) * 16;
      const cy = BOARD.cy + Math.cos(TAU * t / 8 + 0.6) * 14 - 30 * wobble(t, 4.0, 1.4, 3.2);
      const yaw = Math.sin(TAU * t / 8) * 0.32;
      const pitch = Math.sin(TAU * t / 4 + 1.0) * 0.05;
      const roll = Math.sin(TAU * t / 8 + 0.5) * 0.035 + 0.035 * wobble(t, 4.0, 1.2, 3);
      board.position.set(I * W + cx, H - cy, 0);
      board.u.uTime.value = t;
      board.u.uYaw.value = yaw; board.u.uPitch.value = pitch; board.u.uRoll.value = roll;
      board.u.uPulse.value = 0.35 * Math.exp(-Math.max(0, t - 4.0) * 2.4) * (t >= 4.0 ? 1 : 0);
      board.u.uPulseR.value = (t - 4.0) * 1100;
      board.u.uRimAmt.value = 0.12 + 0.55 * Math.min(1.3, fs.flare);
      board.u.uBright.value = 0.94 + 0.05 * Math.min(1, fs.flare) + 0.2 * pulse(t, 4.0, 0.12);
      board.u.uCaustic.value = 0.2 + 0.3 * pulse(t, 4.0, 0.5);
      board.u.uShineAmt.value = 0.28;
      board.u.uShine.value = t >= 4.0 && t < 5.1 ? -0.6 + 2.6 * (t - 4.0) / 1.1 : -3;
      glow.u.uOpacity.value = 0.16 + 0.12 * pulse(t, 4.0, 0.4) + 0.05 * beatEnv(t, 0.2);

      // orbit
      let nb = 0, nf = 0;
      const beat = 1 + 0.03 * beatEnv(t, 0.15);
      parts.forEach(pt => {
        const r = pt.ring;
        const a = pt.ph + TAU * r.turns * t / 8;
        const R = (r.R + pt.rj) * (1 + 0.34 * burst) * beat;
        let x = R * Math.cos(a), y = R * Math.sin(a) * r.ry, z = R * Math.sin(a) * Math.sqrt(1 - r.ry * r.ry);
        const c = Math.cos(r.roll), s = Math.sin(r.roll);
        [x, y] = [c * x - s * y, s * x + c * y];
        const persp = 1800 / (1800 - z);
        const sx = I * W + ORBIT.cx + x * persp, sy = H - ORBIT.cy - y * persp;
        const sz = pt.size * persp * (1 + 0.25 * burst);
        V.set(sx, sy, z); Sc.set(sz, sz * (1 + 0.12 * burst), sz); Q.identity();
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
        const ex = Math.max(ax + 40, LABEL_X - 70), ly = o.c.y;
        const pts = [[ax, ay], [ex, ly], [LABEL_X - 14, ly]];
        const len = Math.hypot(ex - ax, ly - ay) + Math.abs(LABEL_X - 14 - ex);
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
        o.lab.style.transform = `translateX(${(1 - lp) * 18}px)`;
        o.lab.style.clipPath = `inset(0 ${(1 - lp) * 100}% 0 0)`;
      });
      head.style.transform = `translateY(${-6 * wobble(t, 4.0, 2, 5)}px)`;
    },
  };
}
