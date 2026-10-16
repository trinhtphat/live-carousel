// SLIDE 2 — ON DRUMS: THE BOOTS. A real 3D boot pair (Higgsfield → Tripo) plays the kick drum: the right
// boot stomps every kick (the whole seconds), the left taps the backbeat. Each stomp pumps the kick drum's
// logo head, kicks dust off the deck and throws a ring across the boards. 3.5 both boots launch, spin 360°
// in the air and slam down together on 4.0 — the whole stage jolts and STOMP. squashes flat.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, eInCubic, eInOut, pulse, wobble, since, kickEnv, snareEnv, sprite, place, sizePx, posterText, dcol } from './core.js';
import { bgQuad } from './gl.js';
import { vu, needle, hit, puffs, drumHeadTex, glow } from './kit.js';

const I = 2 - 1;
const JUMP0 = 3.5, LAND = 4.0;
const GROUND = 1190;                 // slide y where the soles meet the deck
const BOOT_H = 420;
const BX = [395, 690];               // left boot, right boot (slide x)
const R_HITS = [0, 1, 2, 3, 5, 6, 7];
const L_HITS = [0.5, 1.5, 2.5, 4.5, 5.5, 6.5, 7.5];

// height above the deck for a boot that stomps on `hits` (list in [0, 8)), with the jump overriding.
function stompH(t, hits, lift) {
  if (t >= JUMP0 && t < LAND) return 0;            // the jump is handled separately
  const all = [...hits, JUMP0, LAND].sort((a, b) => a - b);
  let h0 = -1, h1 = 9;
  for (const h of all) { if (h <= t) h0 = h; else { h1 = h; break; } }
  if (h0 < 0) { h0 = all[all.length - 1] - 8; }
  if (h1 > 8) h1 = all[0] + 8;
  if (h1 === JUMP0) return 0;                       // settle before the jump
  const u = (t - h0) / (h1 - h0);
  return lift * (u < 0.62 ? eOutCubic(u / 0.62) : 1 - eInCubic((u - 0.62) / 0.38));
}
const jumpH = t => (t >= JUMP0 && t < LAND ? 300 * Math.pow(Math.sin(Math.PI * (t - JUMP0) / (LAND - JUMP0)), 0.85) : 0);
const jumpSpin = t => (t >= JUMP0 && t < LAND ? TAU * eInOut((t - JUMP0) / (LAND - JUMP0)) : 0);
const lastHit = (t, hits) => { let best = 99; for (const h of hits) best = Math.min(best, since(t, h)); return best; };

export function init(ctx) {
  const A = ctx.assets;
  // ---------- backdrop: the stage + rings across the boards ----------
  const bg = bgQuad(I, /* glsl */`uniform float uKick, uBig;`, /* glsl */`
    col = stageColor(p, sp, t);
    if (p.y > ${GROUND - 60}. && p.y < 1306.) {
      vec2 e = (p - vec2(540., ${GROUND}.)) * vec2(1., 3.6);
      float d = length(e);
      col += vec3(1.0, 0.72, 0.5) * exp(-sq((d - uKick * 900.) / 7.)) * exp(-uKick * 4.) * 0.55;
      col += vec3(1.0, 0.85, 0.65) * exp(-sq((d - uBig * 1500.) / 14.)) * exp(-uBig * 1.8) * 1.2;
    }
  `, { uKick: { value: 9 }, uBig: { value: 9 } });
  bg.u.uSpot.value.set(540, 600, 470, 0.75);
  ctx.bgScene.add(bg);

  // ---------- the kick drum (photo) + its printed head, behind everything ----------
  const drum = sprite(A.kick.tex, A.kick.w, A.kick.h, { order: -30 });
  const DS = 660 / A.kick.h;
  place(drum, I, 540, 580, DS);
  drum.u.uRimAmt.value = 0.6; drum.u.uBright.value = 0.9; drum.u.uRimDir.value.set(0, 1); drum.u.uGrad.value.set(1.0, 0.82);
  const headC = { x: 540 + (666 - A.kick.w / 2) * DS, y: 580 + (633 - A.kick.h / 2) * DS }, headR = 506 * DS;
  const ht = drumHeadTex();
  const head = sprite(ht.tex, ht.w, ht.h, { segs: 48, order: -29 });
  head.u.uPersp.value = 1400;
  const headS = (headR * 2 * 0.94) / ht.w;
  place(head, I, headC.x, headC.y, headS);
  const headGlow = glow(ctx, I, headC.x, headC.y, headR * 2.6, [1.0, 0.75, 0.5], -28);
  ctx.bgScene.add(drum, head, headGlow);
  // STOMP. sits between the drum and the boots
  const st = posterText(['STOMP.'], { size: 330, sx: 10, sy: 10 });
  const stomp = sprite(st.tex, st.w, st.h, { order: -20 });
  ctx.bgScene.add(stomp);
  const STOMP_BASE = 1040;

  // ---------- 3D boots ----------
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  const key = new THREE.SpotLight(0xfff0e0, 3.2, 0, 0.6, 0.6, 0); key.position.set(-200, 900, 900); key.target.position.set(0, -450, 0);
  const rimL = new THREE.DirectionalLight(0xff4a3a, 2.2); rimL.position.set(-800, 300, -600);
  const rimR = new THREE.DirectionalLight(0xffc890, 1.6); rimR.position.set(800, 400, -500);
  scene.add(key, key.target, rimL, rimR, new THREE.AmbientLight(0x502020, 0.8));
  const src = A.bootGltf.scene;
  const box = new THREE.Box3().setFromObject(src);
  const size = box.getSize(new THREE.Vector3()), cen = box.getCenter(new THREE.Vector3());
  const k = BOOT_H / size.y;
  src.traverse(o => {
    if (o.isMesh) {
      o.material.envMapIntensity = 1.0;
      o.material.roughness = Math.min(o.material.roughness ?? 0.5, 0.42);
      o.material.metalness = Math.min(o.material.metalness ?? 0, 0.25);
    }
  });
  const makeBoot = mirror => {
    const inner = src.clone(true);
    inner.position.set(-cen.x, -box.min.y, -cen.z);        // origin at the sole centre
    const pitch = new THREE.Group(); pitch.add(inner);       // heel-strike tilt
    const g = new THREE.Group(); g.add(pitch);
    g.scale.set(mirror ? -k : k, k, k);
    scene.add(g);
    return { g, pitch };
  };
  const boots = [makeBoot(true), makeBoot(false)];
  const YAW = [Math.PI - 0.55, Math.PI + 0.55];               // toes toward camera, angled out

  // contact shadows (drawn before the 3D, so they sit under the boots)
  const shadows = BX.map(x => {
    const s = sprite(ctx.radialTex, 256, 256, { order: -10 });
    s.u.uTint.value.setRGB(0, 0, 0); s.u.uTintAmt.value = 1;
    ctx.bgScene.add(s); return s;
  });

  // dust from every stomp
  const bursts = [
    ...R_HITS.map(at => ({ x: I * W + BX[1], y: GROUND, at, k: 0.8 })),
    ...L_HITS.map(at => ({ x: I * W + BX[0], y: GROUND, at, k: 0.45 })),
    { x: I * W + BX[0], y: GROUND, at: LAND, k: 1.6 }, { x: I * W + BX[1], y: GROUND, at: LAND, k: 1.6 },
  ];
  const dust = puffs(bursts, { per: 20 });
  ctx.seamScene.add(dust);

  // ---------- lights: red and white, everything snaps to the boots on the slam ----------
  ctx.rig.setCue(I, (t, kk) => {
    const toward = [0.2, 0, -0.2][kk];
    const sweep = [-0.35, 0.05, 0.4][kk] + 0.25 * Math.sin(TAU * t / 4 + kk * 1.9);
    const conv = smooth(seg(t, 3.3, 3.9)) * (t < LAND ? 1 : 0);
    const after = t >= LAND ? 1 - smooth(seg(t, 5.2, 7.2)) : 0;
    let a = mix(sweep, toward, conv);
    a = mix(a, [-0.7, 0, 0.7][kk] + 0.12 * Math.sin(TAU * t + kk), after);
    const red = kk === 1 ? 0 : 1;
    const kick = kickEnv(t, 0.18);
    const I0 = mix(0.45 + 0.4 * kick, 0.95, Math.max(conv, after)) + 0.3 * pulse(t, LAND, 0.25);
    return { a, w: mix(0.075, 0.05, conv), I: I0, col: red ? [1.0, 0.36, 0.3] : [1.0, 0.9, 0.78], pool: 0.5 };
  });

  // ---------- DOM ----------
  const dom = ctx.dom[I];
  const meter = vu(dom.querySelector('.vu'), '03');

  return {
    bg,
    update(t) {
      bg.u.uTime.value = t;
      const kAge = lastHit(t, R_HITS.concat([LAND])), big = since(t, LAND);
      bg.u.uKick.value = kAge; bg.u.uBig.value = big;
      const hot = pulse(t, LAND, 0.25), kick = Math.exp(-kAge / 0.12);
      const wl = 0.95 + 0.1 * kick + 0.22 * hot;
      bg.u.uWash.value.set(1.0 * wl, 0.8 * wl, 0.76 * wl);
      bg.u.uSpot.value.w = 0.7 + 0.2 * kick + 0.25 * hot;
      bg.u.uSway.value = 0.05 + 0.06 * hot;
      ctx.rig.fogU.uAmt.value[I] = 0.45 + 0.35 * clamp(1 - big / 2);

      // drum head pumps on every kick
      const hp = 1 + 0.018 * kick + 0.03 * hot;
      place(drum, I, 540, 580, DS * (1 + 0.006 * kick));
      place(head, I, headC.x, headC.y, headS * hp);
      head.u.uTime.value = t;
      head.u.uPulse.value = 0.55 * Math.exp(-kAge / 0.18);
      head.u.uPulseR.value = kAge * 900;
      head.u.uBright.value = 0.9 + 0.12 * kick;
      headGlow.u.uOpacity.value = 0.06 + 0.22 * kick + 0.25 * hot;

      // STOMP. squashes on each slam
      const sq = Math.max(0.6 * Math.exp(-kAge / 0.09), 1.4 * Math.exp(-big / 0.11));
      const wob = wobble(t, LAND, 2.6, 5) * 0.12;
      const sy = clamp(1 - 0.16 * sq + wob, 0.6, 1.2), sx = 1 + 0.05 * sq - wob * 0.4;
      stomp.scale.set(0.98 * sx, 0.98 * sy, 1);
      stomp.position.set(I * W + 540, H - STOMP_BASE + (st.h * 0.98 * sy) / 2 - 18, 0);
      stomp.u.uBright.value = 1 + 0.2 * hot;

      // boots
      const jh = jumpH(t), spin = jumpSpin(t);
      boots.forEach((b, s) => {
        const hits = s ? R_HITS : L_HITS;
        const lift = stompH(t, hits, s ? 64 : 30);
        const h = lift + jh;
        const landAge = Math.min(lastHit(t, hits), big);
        const squash = 1 - 0.09 * Math.exp(-landAge / 0.05);
        const x = BX[s] - W / 2, y = H / 2 - GROUND + h;
        b.g.position.set(x, y, 0);
        b.g.rotation.set(0, YAW[s] + spin * (s ? -1 : 1), 0);
        b.g.scale.y = k * squash;
        b.g.scale.x = (s ? 1 : -1) * k * (2 - squash);
        b.pitch.rotation.x = -0.32 * clamp(lift / 64) - 0.25 * Math.sin(Math.PI * clamp((t - JUMP0) / 0.5)) * (jh > 0 ? 1 : 0);
        const sh = shadows[s];
        sizePx(sh, 250 * (1 - 0.35 * clamp(h / 260)), 40 * (1 - 0.3 * clamp(h / 260)));
        sh.position.set(I * W + BX[s], H - GROUND - 6, 0);
        sh.u.uOpacity.value = 0.7 * (1 - 0.6 * clamp(h / 260));
      });
      dust.u.uTime.value = t;

      hit(ctx, I, t, LAND, { zoom: 0.06, shake: 14, ca: 7, flash: 0.14 });
      for (const r of R_HITS) hit(ctx, I, t, r, { zoom: 0.01, shake: 3, ca: 1.5, flash: 0, dur: 0.1 });
      meter(needle(t, 0.42 + 0.3 * hot, 0.26, 0.12), hot + 0.3 * kick);
    },
  };
}
