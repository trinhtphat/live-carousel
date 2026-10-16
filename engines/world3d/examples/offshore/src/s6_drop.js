// SLIDE 6 — THE DROP. Sunrise over the open sea: a huge sun on the horizon, god rays, a glitter path.
// The golden stream from slide 5 and the four boards spiral into the sun. On the drop (4.0) the sun
// flares and 6AM slams. The Higgsfield 3D board tumbles on a wide orbit in front of it.
import { THREE, W, H, TAU, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, beatEnv, sprite } from './core.js';
import { bgQuad, hexv4 } from './gl.js';
import { BH, bhPath } from './particles.js';

const I = 5;
const C = { x: 540, y: H - BH.y };      // the sun, slide-local, y down
const HZ = 592;                         // horizon

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uHor; uniform float uFlare; uniform float uFlash; uniform float uBeat;`, /* glsl */`
    float t = uTime;
    vec2 c0 = vec2(${C.x}., ${C.y}.);
    vec2 d = p - c0; float r = length(d) + 1e-3;
    float rs = ${BH.rs}. * uHor;
    if (p.y < ${HZ}.) {
      float sy = clamp(p.y / ${HZ}., 0., 1.);
      col = mix(vec3(0.10, 0.24, 0.50), vec3(0.62, 0.40, 0.52), smoothstep(0.0, 0.62, sy));
      col = mix(col, vec3(0.98, 0.42, 0.16), smoothstep(0.55, 1.0, sy) * 0.85);
      col += vec3(0.10, 0.03, 0.08) * pow(fbm(p * vec2(0.0016, 0.006) + loopv(t) * 0.3), 2.0) * 1.4 * (1. - sy);
      // god rays
      float ang = atan(d.x, -d.y);
      float rays = pow(fbm(vec2(ang * 5.0, 0.2) + loopv(t) * 0.6), 2.8);
      col += vec3(1.0, 0.62, 0.32) * rays * 0.55 * smoothstep(rs * 6.5, rs * 1.1, r) * (0.8 + 0.6 * uFlare);
      // halo + the disc + its limb
      col += vec3(1.0, 0.50, 0.20) * exp(-max(r - rs, 0.) / 160.) * 0.75;
      col += vec3(1.0, 0.78, 0.50) * exp(-max(r - rs, 0.) / 34.) * 0.55 * (1. + uFlare);
      vec3 disc = mix(vec3(1.0, 0.97, 0.88), vec3(1.0, 0.70, 0.36), smoothstep(0., rs, r) * 0.7);
      col = mix(col, disc * 1.25, smoothstep(rs + 1.5, rs - 1.5, r));
      // heat rings on every beat
      float bp = fract(t / 0.5);
      col += vec3(1.0, 0.65, 0.35) * exp(-pow((r - (rs * 1.15 + bp * 520.)) / 5., 2.)) * (1. - bp) * 0.18;
      // the sea swallows the bottom of the disc
    } else {
      float dy = p.y - ${HZ}.;
      float Z = 60000. / max(dy, 1.5);
      float X = (p.x - 540.) * Z / 900.;
      vec2 w = vec2(X * 0.009, Z * 0.022);
      float sw = sin(Z * 0.011 + TAU * t / 8. * 4.);
      float n = fbm(w + loopv(t) * 0.6);
      float n2 = fbm(w * 2.4 + vec2(3.1, 1.7) - loopv(t + 2.) * 0.5);
      float h = n * 0.6 + n2 * 0.4 + 0.18 * sw;
      float fres = 1. - smoothstep(0., 600., dy);
      col = mix(vec3(0.030, 0.150, 0.230), vec3(0.90, 0.46, 0.32), fres * (0.3 + 0.7 * h));
      col += vec3(0.02, 0.14, 0.17) * h;
      float px = abs(p.x - c0.x);
      float pathW = 70. + dy * 0.42;
      float glit = pow(clamp(n2 * 1.3 + 0.2 * sw, 0., 1.), 5.);
      float spark = step(0.86, hash12(floor(vec2(X * 0.05, Z * 0.04)) + floor(t * 12.) * 0.37));
      col += vec3(1.0, 0.70, 0.40) * exp(-px / pathW) * (glit * 2.6 + spark * 0.8 * exp(-px / (pathW * 0.6))) * (1. - 0.45 * smoothstep(80., 300., dy));
      col += vec3(1.0, 0.60, 0.30) * exp(-dy / 5.) * 0.6;
      // the sea behind the type sits darker so the date reads
      col *= 1. - 0.22 * smoothstep(90., 200., dy) * smoothstep(760., 560., dy);
    }
    col *= mix(0.9, 1.0, smoothstep(1350., 1050., p.y));
    add += uFlash * vec3(1.0, 0.75, 0.5);
  `, { uHor: { value: 1 }, uFlare: { value: 0 }, uFlash: { value: 0 }, uBeat: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#3f5a7a', 1);
  ctx.bgScene.add(bg);

  // a lens streak across the sun (additive), pulses on the drop
  const streak = sprite(ctx.radialTex, 1700, 46, { order: 39, additive: true });
  streak.u.uTint.value.set('#ffb56b'); streak.u.uTintAmt.value = 1;
  streak.position.set(I * W + C.x, H - C.y, 0);
  ctx.seamScene.add(streak);

  // the four boards paddle out from slide 5 and spiral into the sun
  const keys = ['longboard', 'egg', 'fish', 'short2'];
  const items = keys.map((k, j) => {
    const A = ctx.assets[k];
    const h = 230, w = h * A.w / A.h;
    const s = sprite(A.tex, w, h, { order: 41 });
    s.u.uRim.value.set('#ffd29a'); s.u.uRimAmt.value = 0.5; s.u.uRimDir.value.set(0.9, 0.2);
    ctx.seamScene.add(s);
    return { s, ph: j / keys.length, th0: Math.PI + (j - 1.5) * 0.12, r0: 1060 + j * 25 };
  });

  // 3D board (Higgsfield GLB) tumbling on a wide orbit, in front of the sun
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  let board3d = null;
  if (ctx.assets.boardGltf) {
    const g = ctx.assets.boardGltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    g.position.sub(ctr);
    const s = 330 / size.z;
    board3d = new THREE.Group(); const inner = new THREE.Group();
    inner.scale.setScalar(s); inner.add(g); board3d.add(inner);
    g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.metalness = 0; o.material.roughness = 0.5; o.material.envMapIntensity = 0.6; } });
    scene.add(board3d);
    const key = new THREE.DirectionalLight(0xffd9b0, 1.2); key.position.set(0.3, 0.6, 1).multiplyScalar(1000);
    const rimL = new THREE.DirectionalLight(0xff8a3d, 1.8); rimL.position.set(0, 0.2, -1).multiplyScalar(1000);
    const fillL = new THREE.DirectionalLight(0x3fd0d6, 0.6); fillL.position.set(-1, -0.4, 0.5).multiplyScalar(1000);
    scene.add(key, rimL, fillL, new THREE.AmbientLight(0x3a2430, 0.5));
  }

  const el = ctx.dom[I];
  const am = el.querySelector('.s6-6am');
  const sat = el.querySelector('.s6-sat');
  const live = el.querySelector('.s6-cta i');
  const flash = el.querySelector('.flash');

  return {
    update(t) {
      const drop = pulse(t, 4.0, 0.35);
      const hor = 1 + 0.14 * (t >= 4.0 ? eOutCubic(seg(t, 4.0, 4.12)) * (1 - eInOut(seg(t, 4.2, 5.2))) : 0) + 0.03 * beatEnv(t, 0.15);
      bg.u.uHor.value = hor;
      bg.u.uFlare.value = drop * 1.4 + 0.25 * beatEnv(t, 0.2);
      bg.u.uFlash.value = 0.42 * pulse(t, 4.0, 0.06);
      bg.u.uBeat.value = beatEnv(t, 0.2);
      streak.u.uOpacity.value = 0.32 + 0.6 * drop + 0.1 * beatEnv(t, 0.15);
      streak.scale.set(1 + 0.5 * drop, 1 + 0.6 * drop, 1);
      items.forEach((it, j) => {
        const s = (t / 8 + it.ph) % 1;
        const [x, y, r, th] = bhPath(s, it.th0, it.r0);
        it.s.position.set(x, y, 0);
        const near = 1 - smooth(seg(r, BH.rs * 1.05, 520));
        const sc = mix(1, 0.22, Math.pow(s, 0.9));
        it.s.scale.set(sc * (1 + 0.6 * near), sc * (1 - 0.4 * near), 1);
        it.s.u.uRoll.value = th * 0.9 + j;
        it.s.u.uOpacity.value = smooth(seg(s, 0, 0.06)) * (1 - smooth(seg(s, 0.88, 1)));
        it.s.u.uBright.value = 1 - 0.3 * near;
        it.s.u.uTint.value.set('#ffd9a8'); it.s.u.uTintAmt.value = 0.6 * near;
      });
      if (board3d) {
        const a = -TAU * t / 8 + 0.7;
        const R = 410;
        board3d.position.set(Math.cos(a) * R + Math.sin(a) * 120, H / 2 - C.y + 40 - Math.sin(a) * 110, Math.sin(a) * 240 + 60);
        board3d.rotation.set(0.5 + 0.35 * Math.sin(TAU * t / 8), TAU * t / 8, 0.3 * Math.cos(TAU * t / 8));
        board3d.scale.setScalar(0.78 + 0.22 * Math.sin(a));
      }
      const slam = t >= 4.0 && t < 5 ? 1 + 0.35 * Math.exp(-(t - 4.0) / 0.07) : 1;
      am.style.transform = `scale(${slam})`;
      am.classList.toggle('rgb', t >= 4.0 && t < 4.12);
      sat.style.transform = `translateY(${8 * wobble(t, 4.0, 2, 6)}px)`;
      live.style.opacity = 0.3 + 0.7 * beatEnv(t, 0.2);
      flash.style.opacity = 0.32 * pulse(t, 4.0, 0.05);
    },
  };
}
