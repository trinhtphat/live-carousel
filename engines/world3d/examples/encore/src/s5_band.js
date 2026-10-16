// SLIDE 5 — VOL 11: THE FULL BAND. Every piece on stage at once, like a band shot: the tee + guitar on the
// left, the boots in front of the kit, the jacket on the mic up front, the jeans on the right. LOUDER. burns
// across the top. 4.0: four flame jets roar up behind the band, confetti cannons fire from both wings (it
// drifts over the seam into the encore), the beams strobe and the VU pins.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, pulse, wobble, since, beatEnv, kickEnv, snareEnv, sprite, place, sizePx, posterText, dcol } from './core.js';
import { bgQuad, COMMON } from './gl.js';
import { vu, needle, staged, hit, flameJet, confetti, puffs } from './kit.js';

const I = 4;
const BOOM = 4.0;
const JETS = [70, 300, 780, 1010];
const flameLevel = t => {
  // the big burst at 4.0, short licks on 6.0 and 7.0 that are gone before the loop point
  const big = t >= BOOM && t < BOOM + 1.6 ? Math.min(1, since(t, BOOM) / 0.08) * (1 - smooth(seg(t, BOOM + 1.0, BOOM + 1.6))) : 0;
  const lick = at => (t >= at && t < at + 0.45 ? Math.min(1, (t - at) / 0.05) * (1 - smooth(seg(t, at + 0.15, at + 0.45))) * 0.55 : 0);
  return Math.max(big, lick(6.0), lick(7.0), lick(2.0));
};

export function init(ctx) {
  const A = ctx.assets;
  // ---------- backdrop: the heat of the jets lights the velvet ----------
  const bg = bgQuad(I, /* glsl */`uniform float uHeat;`, /* glsl */`
    col = stageColor(p, sp, t);
    float hz = exp(-sq((p.y - 980.) / 420.));
    col += vec3(1.0, 0.42, 0.08) * uHeat * hz * 0.55;
  `, { uHeat: { value: 0 } });
  bg.u.uSpot.value.set(560, 700, 520, 0.8);
  ctx.bgScene.add(bg);

  // flame jets behind the band
  const jets = JETS.map(x => flameJet(I, x, 1150, { w: 230, h: 900, order: -25 }));
  jets.forEach(j => ctx.bgScene.add(j));

  // LOUDER. — burning type
  const lt = posterText(['LOUDER.'], { size: 224, sx: 9, sy: 9 });
  const FIRE_H = 1.9;                               // quad is taller than the type: flames rise above it
  const fireMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, tText: { value: lt.tex }, uHeat: { value: 0.4 }, uBright: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: COMMON.replace('uniform float uTime; uniform float uOff;', 'uniform float uTime;') + /* glsl */`
uniform sampler2D tText; uniform float uHeat, uBright;
void main(){
  float t = uTime;
  vec2 tuv = vec2(vUv.x, vUv.y * ${FIRE_H.toFixed(2)});
  vec4 txt = tuv.y <= 1. ? texture2D(tText, tuv) : vec4(0.);
  float f = 0.;
  for (int k = 1; k <= 9; k++) {
    float fk = float(k);
    float dy = fk * 0.022;
    float wx = (fbm(vec2(vUv.x * 9., vUv.y * 5. - t * 2.)) - 0.5) * 0.012 * fk;
    vec2 q = vec2(vUv.x + wx, (vUv.y - dy) * ${FIRE_H.toFixed(2)});
    if (q.y > 0. && q.y < 1.) f += texture2D(tText, q).a * (1. - fk / 10.);
  }
  float n = fbm(vec2(vUv.x * 14., vUv.y * 6. - t * 3.) + loopv(t) * 0.4);
  f *= (0.3 + 0.9 * n) * uHeat * 0.26;
  f *= 1. - smoothstep(0.72, 1.0, vUv.y);
  vec3 fire = mix(vec3(0.7, 0.06, 0.0), vec3(1.0, 0.5, 0.08), smoothstep(0.1, 0.6, f));
  fire = mix(fire, vec3(1.0, 0.92, 0.7), smoothstep(0.7, 1.3, f));
  float fa = clamp(f, 0., 1.4);
  // the letters glow hot from the bottom up
  vec3 lc = txt.rgb;
  float hot = uHeat * smoothstep(0.55, 0.0, tuv.y) * txt.a;
  lc = mix(lc, vec3(1.0, 0.62, 0.22) * txt.a, clamp(hot * 0.5, 0., 0.6)) * uBright;
  gl_FragColor = vec4(lc + fire * fa * (1. - txt.a), txt.a);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const louder = new THREE.Mesh(new THREE.PlaneGeometry(lt.w, lt.h * FIRE_H), fireMat);
  louder.renderOrder = -15; louder.frustumCulled = false;
  ctx.bgScene.add(louder);
  const LOUDER_BASE = 512;     // slide y of the bottom of the type

  // ---------- the band ----------
  // the kit at the back (behind the boots), then the products
  const drum = sprite(A.kick.tex, A.kick.w, A.kick.h, { order: -12 });
  const DS = 330 / A.kick.h;
  ctx.bgScene.add(drum);
  const Tg = staged(ctx, ctx.seamScene, I, A.tee_guitar, 205, 1150, 520, { segs: 30, order: 12, reflect: 0.0, shadowW: 0.5 });
  Tg.refl.visible = false;
  const Dn = staged(ctx, ctx.seamScene, I, A.denim, 900, 1118, 560, { segs: 40, order: 12, reflect: 0.15, shadowW: 0.6 });
  const bootL = staged(ctx, ctx.seamScene, I, A.boot, 380, 1176, 170, { order: 13, reflect: 0.2, shadowW: 0.7 });
  const bootR = staged(ctx, ctx.seamScene, I, A.boot, 470, 1180, 170, { order: 13, reflect: 0.2, shadowW: 0.7 });
  bootL.main.u.uFlipX.value = -1; bootL.refl.u.uFlipX.value = -1;
  const Jk = staged(ctx, ctx.seamScene, I, A.jacket_mic, 640, 1212, 660, { segs: 50, order: 14, reflect: 0.2, shadowW: 0.4 });
  Jk.main.u.uWindMask.value.set(0.1, 0.6, 0.06, 0.32); Jk.main.u.uWindDir.value.set(-1, 0.15);
  Dn.main.u.uWindDir.value.set(1, 0.1);
  const prods = [Tg, Dn, bootL, bootR, Jk];
  prods.forEach(P => { P.main.u.uRimAmt.value = 0.45; P.main.u.uRimDir.value.set(0, 1); P.main.u.uRim.value = dcol(0xffb070); P.main.u.uGrad.value.set(1.02, 0.86); });
  // a chain for the jeans
  const chainTop = 1118 - 560 + 12;

  // ---------- confetti cannons from both wings; the shower drifts right over the seam ----------
  const conf = confetti([
    { x: I * W + 30, y: 1150, at: BOOM, angle: 0.32, spread: 0.32, speed: 2700, life: 4.4 },
    { x: I * W + 1050, y: 1150, at: BOOM, angle: -0.3, spread: 0.32, speed: 2700, life: 4.4 },
    { x: I * W + 540, y: 1150, at: BOOM + 0.02, angle: 0, spread: 0.7, speed: 2500, life: 4.0 },
  ], { count: 700, order: 46, size: 0.62 });
  ctx.seamScene.add(conf);
  const dust = puffs(JETS.map(x => ({ x: I * W + x, y: 1150, at: BOOM, k: 1.2 })), { per: 18, col: [0.9, 0.62, 0.5] });
  ctx.seamScene.add(dust);

  // ---------- lights: strobing chase, white and red ----------
  ctx.rig.setCue(I, (t, k) => {
    const chase = Math.floor(t * 4 + k) % 3 === 0 ? 1 : 0.35;
    const fan = [-0.55, 0, 0.55][k] + 0.32 * Math.sin(TAU * t + k * 2.1);
    const pre = smooth(seg(t, 3.0, 3.95)) * (t < BOOM ? 1 : 0);
    const a = mix(fan, [0.25, 0.0, -0.25][k], pre);
    const strobe = t >= BOOM && t < BOOM + 1.5 ? (Math.floor(since(t, BOOM) * 12) % 2 ? 1.2 : 0.2) : 0;
    const I0 = Math.max(0.45 + 0.45 * chase * beatEnv(t, 0.2), strobe, 0.5 + 0.5 * pre);
    return { a, w: 0.06, I: I0, col: k === 1 ? [1.0, 0.95, 0.85] : [1.0, 0.32, 0.25], pool: 0.55 };
  });

  // ---------- DOM ----------
  const dom = ctx.dom[I];
  const volEl = dom.querySelector('.s5-vol');
  const meter = vu(dom.querySelector('.vu'), '11');

  return {
    bg,
    update(t) {
      bg.u.uTime.value = t;
      const fl = flameLevel(t), hot = pulse(t, BOOM, 0.3), be = beatEnv(t, 0.14), ke = kickEnv(t, 0.14);
      bg.u.uHeat.value = fl;
      const wl = 0.95 + 0.12 * be + 0.2 * hot;
      bg.u.uWash.value.set(1.0 * wl, 0.8 * wl, 0.72 * wl);
      bg.u.uSpot.value.w = 0.75 + 0.3 * hot;
      bg.u.uSway.value = 0.06 + 0.2 * fl;
      ctx.rig.fogU.uAmt.value[I] = 0.55 + 0.2 * fl;

      jets.forEach((j, k) => {
        j.u.uTime.value = t;
        const stag = k % 2 ? 0.04 : 0;
        const lv = flameLevel(((t - stag) % 8 + 8) % 8);
        j.u.uAmt.value = lv;
        j.u.uLen.value = clamp(0.25 + 0.75 * lv + 0.08 * Math.sin(TAU * t * 3 + k));
      });
      fireMat.uniforms.uTime.value = t;
      fireMat.uniforms.uHeat.value = 0.55 + 0.35 * be + 0.9 * fl;
      const ls = 1 + 0.03 * hot + 0.01 * ke;
      louder.scale.set(ls, ls, 1);
      louder.position.set(I * W + 540, H - LOUDER_BASE + (lt.h * FIRE_H * ls) / 2 - lt.h * 0.06, 0);

      // the band moves: drum pumps, boots bounce on the kicks, the tee rocks, the jacket catches the jet wind
      place(drum, I, 425, 1050, DS * (1 + 0.012 * ke), 0.5, 1);
      drum.u.uBright.value = 0.92 + 0.15 * ke;
      const hop = s => 16 * Math.max(0, Math.sin(Math.PI * ((t + s) % 1)));
      place(bootL.main, I, 380, 1176 - hop(0.5), 170 / A.boot.h, 0.5, 1);
      place(bootR.main, I, 470, 1180 - hop(0), 170 / A.boot.h, 0.5, 1);
      Tg.main.u.uRoll.value = 0.03 * Math.sin(TAU * t) + 0.05 * wobble(t, BOOM, 1.2, 2);
      for (const P of prods) for (const m of [P.main, P.refl]) {
        m.u.uTime.value = t;
        m.u.uBright.value = 1 + 0.12 * hot + 0.25 * fl * 0.5;
      }
      Jk.main.u.uWind.value = 6 + 40 * fl; Jk.main.u.uFlutter.value = 0.15 + 0.4 * fl;
      Dn.main.u.uWind.value = 6 + 34 * fl + 8 * ke; Dn.main.u.uFlutter.value = 0.3 + 0.5 * fl; Dn.main.u.uRipple.value = 0.25;
      Tg.main.u.uWind.value = 3 + 14 * fl;
      conf.u.uTime.value = t;
      dust.u.uTime.value = t;

      hit(ctx, I, t, BOOM, { zoom: 0.06, shake: 18, ca: 9, flash: 0.22, col: [1, 0.72, 0.4], dur: 0.3 });
      for (let b = 0; b < 8; b++) hit(ctx, I, t, b, { zoom: 0.012, shake: 3, ca: 2, flash: 0, dur: 0.1 });
      volEl.style.transform = `scale(${(1 + 0.08 * hot).toFixed(3)})`;
      meter(needle(t, 0.86 + 0.2 * hot, 0.12, 0.08, 0.04), 0.6 + hot);
    },
  };
}
