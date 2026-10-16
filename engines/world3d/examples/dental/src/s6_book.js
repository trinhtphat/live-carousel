// SLIDE 6 — BOOK. A giant iridescent pearl hangs in space inside a ring of light; the stream from slide 5
// and the treatments (implant, aligner, veneers, tooth) spiral into the ring. The Higgsfield 3D molar tumbles
// on a wide orbit in front. On the drop (4.0) the ring pulses and FREE slams.
import { THREE, W, H, TAU, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, beatEnv, sprite } from './core.js';
import { bgQuad, hexv4 } from './gl.js';
import { BH, bhPath } from './particles.js';

const I = 5;
const C = { x: 540, y: H - BH.y };      // slide-local, y down

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uHor; uniform float uLens; uniform float uFlash; uniform float uBeat;
    vec3 stars(vec2 q, float t){
      vec3 c = vec3(0.);
      for (int k = 0; k < 2; k++){
        float sc = k == 0 ? 0.05 : 0.11;
        vec2 g = q * sc; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
        float h = hash12(id + float(k) * 17.);
        vec2 o = vec2(hash12(id + 3.1), hash12(id + 7.7)) - 0.5;
        float d = length(f - o * 0.6);
        float tw = 0.55 + 0.45 * sin(TAU * t / 8. * (1. + floor(h * 3.)) + h * 20.);
        c += vec3(0.85, 0.96, 1.0) * smoothstep(0.075, 0.0, d) * step(0.80, h) * tw * (k == 0 ? 1.0 : 0.55);
      }
      return c;
    }`, /* glsl */`
    float t = uTime;
    vec2 c0 = vec2(${C.x}., ${C.y}.);
    vec2 d = p - c0; float r = length(d) + 1e-3;
    float rs = ${BH.rs}. * uHor;
    float lens = rs * rs * 1.6 * uLens / r;
    vec2 lp = p + d / r * lens;
    vec3 sky = mix(vec3(0.07, 0.24, 0.40), vec3(0.03, 0.11, 0.20), smoothstep(0., 1350., p.y)) + stars(lp, t) * 0.8;
    sky += vec3(0.05, 0.22, 0.36) * pow(fbm(lp * 0.0021 + loopv(t) * 0.35), 3.0) * 1.6;
    // far side of the ring, bent over the top of the pearl
    float ang = atan(d.y, d.x) + TAU * t / 8. * 2.;
    float turb2 = fbm(vec2(cos(ang), sin(ang)) * 2.4 + r * 0.012);
    float arc = smoothstep(rs * 1.02, rs * 1.16, r) * smoothstep(rs * 2.1, rs * 1.3, r);
    float above = smoothstep(rs * 0.4, -rs * 0.9, d.y) * 0.85 + 0.22;
    sky += mix(vec3(0.10, 0.60, 1.0), vec3(0.92, 1.0, 1.0), smoothstep(rs * 1.7, rs * 1.05, r)) * arc * above * (0.45 + 0.85 * turb2) * 1.1;
    col = sky;
    // the pearl: lit sphere, soft iridescence, a window highlight
    if (r < rs) {
      vec3 n = vec3(d.x / rs, -d.y / rs, sqrt(max(0., 1. - r * r / (rs * rs))));
      vec3 L = normalize(vec3(-0.5, 0.6, 0.65));
      float diff = max(dot(n, L), 0.);
      float fr = pow(1. - n.z, 2.2);
      vec3 irid = 0.5 + 0.5 * cos(TAU * (fr * 1.4 + n.x * 0.3 + t / 8. + vec3(0.0, 0.33, 0.67)));
      vec3 base = vec3(0.86, 0.90, 0.92) * (0.28 + 0.8 * diff);
      base = mix(base, base * (0.75 + 0.5 * irid), 0.55);
      base += vec3(0.25, 0.75, 1.0) * fr * 0.55;
      vec3 h = reflect(-L, n);
      base += vec3(1.0) * pow(max(h.z, 0.), 60.) * 1.2;
      base += vec3(0.3, 0.85, 1.0) * pow(max(dot(n, normalize(vec3(0.7, -0.4, 0.4))), 0.), 6.) * 0.35;
      float edge = smoothstep(rs, rs * 0.985, r);
      col = mix(col, base, edge);
    }
    col += vec3(0.75, 0.97, 1.0) * exp(-pow((r - rs * 1.02) / 2.3, 2.)) * 0.9;
    // the ring (inclined); near half passes in front of the pearl
    float incl = 0.19;
    vec2 dd = vec2(d.x, d.y / incl);
    float rr = length(dd);
    float da = atan(dd.y, dd.x) + TAU * t / 8. * 2.;
    float turb = fbm(vec2(cos(da), sin(da)) * 2.6 + vec2(rr * 0.011, 0.));
    float band = smoothstep(rs * 1.4, rs * 1.95, rr) * smoothstep(rs * 5.4, rs * 2.4, rr);
    float heat = smoothstep(rs * 4.6, rs * 1.5, rr);
    vec3 dcol = mix(vec3(0.05, 0.50, 1.0), vec3(0.94, 1.0, 1.0), heat * heat);
    float dop = 1.0 + 0.6 * (-d.x / max(rr, 1.));
    float front = (d.y > 0. || r > rs * 1.02) ? 1. : 0.;
    add += dcol * band * (0.4 + 0.95 * turb) * dop * 1.25 * front;
    add += vec3(0.05, 0.40, 0.75) * exp(-max(r - rs, 0.) / 170.) * 0.45;
    // light waves on every beat
    float bp = fract(t / 0.5);
    add += vec3(0.30, 0.85, 1.0) * exp(-pow((r - (rs * 1.5 + bp * 560.)) / 5., 2.)) * (1. - bp) * 0.22;
    col *= mix(0.9, 1.0, smoothstep(1350., 1000., p.y));
    add += uFlash * vec3(0.5, 0.9, 1.0);
  `, { uHor: { value: 1 }, uLens: { value: 1 }, uFlash: { value: 0 }, uBeat: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#0d3a5c', 1);
  ctx.bgScene.add(bg);

  // the treatments spiral in from slide 5
  const keys = ['implant', 'aligner', 'arch', 'molar'];
  const items = keys.map((k, j) => {
    const A = ctx.assets[k];
    const h = { implant: 220, aligner: 110, arch: 80, molar: 170 }[k], w = h * A.w / A.h;
    const s = sprite(A.tex, w, h, { order: 41 });
    s.u.uRim.value.set('#9fe9ff'); s.u.uRimAmt.value = 0.5; s.u.uRimDir.value.set(0.9, 0.2);
    ctx.seamScene.add(s);
    return { s, ph: j / keys.length, th0: Math.PI + (j - 1.5) * 0.12, r0: 1060 + j * 25 };
  });

  // 3D molar (Higgsfield GLB) tumbling on a wide orbit, in front of the ring
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  let tooth = null;
  if (ctx.assets.molarGltf) {
    const g = ctx.assets.molarGltf.scene;
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    g.position.sub(ctr);
    const s = 230 / size.y;
    tooth = new THREE.Group(); const inner = new THREE.Group();
    inner.scale.setScalar(s); inner.add(g); tooth.add(inner);
    g.traverse(o => { if (o.isMesh) { o.material.envMapIntensity = 1.1; } });
    scene.add(tooth);
    const key = new THREE.DirectionalLight(0xe6fbff, 2.4); key.position.set(0.5, 1, 1).multiplyScalar(1000);
    const rimL = new THREE.DirectionalLight(0x1fc8ff, 3.0); rimL.position.set(-1, 0.3, -0.6).multiplyScalar(1000);
    scene.add(key, rimL, new THREE.AmbientLight(0x1a3a4a, 0.8));
  }

  const el = ctx.dom[I];
  const free = el.querySelector('.s6-free');
  const first = el.querySelector('.s6-first');
  const live = el.querySelector('.s6-cta i');
  const flash = el.querySelector('.flash');

  return {
    update(t) {
      const drop = pulse(t, 4.0, 0.35);
      const hor = 1 + 0.16 * (t >= 4.0 ? eOutCubic(seg(t, 4.0, 4.12)) * (1 - eInOut(seg(t, 4.2, 5.2))) : 0) + 0.035 * beatEnv(t, 0.15);
      bg.u.uHor.value = hor;
      bg.u.uLens.value = 1 + 1.2 * drop;
      bg.u.uFlash.value = 0.4 * pulse(t, 4.0, 0.06);
      items.forEach((it, j) => {
        const s = (t / 8 + it.ph) % 1;
        const [x, y, r, th] = bhPath(s, it.th0, it.r0);
        it.s.position.set(x, y, 0);
        const near = 1 - smooth(seg(r, BH.rs * 1.05, 520));
        const sc = mix(1, 0.22, Math.pow(s, 0.9));
        it.s.scale.set(sc * (1 + 1.2 * near), sc * (1 - 0.5 * near), 1);
        it.s.u.uRoll.value = th * 0.9 + j;
        it.s.u.uOpacity.value = smooth(seg(s, 0, 0.06)) * (1 - smooth(seg(s, 0.9, 1)));
        it.s.u.uBright.value = 1 + 0.4 * near;
        it.s.u.uTint.value.set('#c9f4ff'); it.s.u.uTintAmt.value = 0.5 * near;
      });
      if (tooth) {
        const a = -TAU * t / 8 + 0.7;
        const R = 420;
        // near side (sin a > 0) passes low and large in front of the ring; far side high and small
        tooth.position.set(Math.cos(a) * R + Math.sin(a) * 150, 675 - C.y + 70 - Math.sin(a) * 120, Math.sin(a) * 240 + 60);
        tooth.rotation.set(0.35 * Math.sin(TAU * t / 8), TAU * t / 8, 0.25 * Math.cos(TAU * t / 8));
        tooth.scale.setScalar(0.78 + 0.22 * Math.sin(a));
      }
      const slam = t >= 4.0 && t < 5 ? 1 + 0.35 * Math.exp(-(t - 4.0) / 0.07) : 1;
      free.style.transform = `scale(${slam})`;
      free.classList.toggle('rgb', t >= 4.0 && t < 4.12);
      first.style.transform = `translateY(${8 * wobble(t, 4.0, 2, 6)}px)`;
      live.style.opacity = 0.3 + 0.7 * beatEnv(t, 0.2);
      flash.style.opacity = 0.35 * pulse(t, 4.0, 0.05);
    },
  };
}
