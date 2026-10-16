// SLIDE 6 — ENCORE? The house curtain has come down. A chrome blackletter "Encore?" hangs in the follow-spot,
// the all-access pass swings off the truss, confetti is still falling from the last song. The crowd wants
// more: on 4.0 the curtain parts a crack, light and a burst of confetti pour through, then it falls shut.
// The drop: FRIDAY 8PM, comment ENCORE for early access.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, since, beatEnv, kickEnv, lnoise } from './core.js';
import { bgQuad } from './gl.js';
import { vu, needle, hit, confetti } from './kit.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const I = 5;
const PEEK = 4.0;
// the gap in the curtain: opens 4.0-4.35, holds, closes 5.4-6.6
const gapW = t => (t >= PEEK - 0.05 && t < 6.6 ? 230 * (t < PEEK + 0.35 ? eOutCubic(seg(t, PEEK - 0.05, PEEK + 0.35)) : 1 - eInOut(seg(t, 5.4, 6.6))) : 0);
const TXT = { x: 420, y: 480, w: 660 };

export function init(ctx) {
  const A = ctx.assets;
  // ---------- backdrop: the house curtain (with a swagged valance), blended into the backdrop at the seam ----------
  const bg = bgQuad(I, /* glsl */`uniform float uGap; uniform float uGlowIn;
vec3 house(vec2 p, float t){
  float dx = p.x - 540.;
  float side = sign(dx + 0.001);
  // panels gather toward the outer edges at the top: folds fan slightly
  float x = p.x + dx * 0.04 * (1. - p.y / 1100.);
  float sw = 0.6 * sin(TAU * t / 8. * 2. + p.y * 0.003) * (p.y / 1100.) + 3. * kickPulse(t) * (p.y / 1100.);
  float u = x / 74. + 0.3 * sin(x / 230. + 1.1) + sw * 0.02;
  float slope = cos(u * TAU) * 1.15;
  vec3 n = normalize(vec3(-slope * 1.3, 0., 1.));
  vec3 L = normalize(vec3(-0.25, 0.5, 0.83));
  float dif = clamp(dot(n, L), 0., 1.);
  float sheen = pow(max(1. - n.z, 0.), 1.6);
  vec3 c = mix(vec3(0.28, 0.01, 0.025), vec3(0.84, 0.06, 0.09), smoothstep(0.05, 0.95, dif)) + vec3(1., 0.32, 0.26) * sheen * 0.6;
  c *= 0.88 + 0.24 * fbm3(vec2(x * 0.05, p.y * 0.002));
  // valance: scalloped swags across the top with a gold fringe under them
  float sc = mod(p.x, 270.) - 135.;
  float swagY = 150. + 46. * (1. - sq(sc / 135.));
  if (p.y < swagY) {
    float v = p.y / swagY;
    float ring = sin(v * 18. - sq(sc / 135.) * 3.);
    c = mix(vec3(0.35, 0.015, 0.03), vec3(0.9, 0.08, 0.1), 0.5 + 0.5 * ring) * (0.75 + 0.25 * v);
  }
  float fr = smoothstep(swagY, swagY + 3., p.y) * (1. - smoothstep(swagY + 26., swagY + 34., p.y + 6. * sin(p.x * 0.9)));
  c = mix(c, vec3(1.0, 0.72, 0.28) * (0.75 + 0.35 * sin(p.x * 0.9)), fr);
  return c;
}
float kickPulse(float t){ return exp(-mod(t, 1.) / 0.12); }
`.replace('vec3 house(', 'float kickPulse(float t);\nvec3 house('), /* glsl */`
    col = stageColor(p, sp, t);
    if (p.y < FLOOR_Y + 6.) {
      vec3 wash = washAt(p.x);
      vec3 hc = house(p, t) * wash;
      // the follow-spot on the curtain, behind the logo
      vec2 q = (p - uSpot.xy) / uSpot.z;
      float s = exp(-sq(max(length(q * vec2(0.85, 1.)) - 0.7, 0.) / 0.18)) * smoothstep(1.25, 0.7, length(q));
      hc += house(p, t) * uSpotCol * s * uSpot.w * 1.25;
      hc *= 0.3 + 0.7 * smoothstep(20., 220., p.y);
      hc *= 1. - 0.5 * smoothstep(FLOOR_Y - 60., FLOOR_Y, p.y);
      // the crack: light pours through the parted centre
      float hg = uGap * 0.5 * (0.55 + 0.45 * smoothstep(150., 1100., p.y));
      float dx = abs(p.x - 540.);
      float inGap = 1. - smoothstep(hg - 2., hg + 2., dx);
      vec3 inside = vec3(1.0, 0.86, 0.66) * (1.3 - 0.4 * p.y / 1100.) * uGlowIn;
      float edge = exp(-abs(dx - hg) / 26.) * step(1., uGap);
      hc += vec3(1.0, 0.6, 0.35) * edge * uGlowIn * 0.8;
      hc = mix(hc, inside, inGap);
      float bl = smoothstep(40., 300., p.x);
      vec3 pl; vec3 bm = beams(sp, t, pl);
      col = mix(col, hc + bm * 0.7, bl);
    } else if (p.y < LIP_Y) {
      // light from the gap spills over the apron
      float spill = exp(-sq((p.x - 540.) / (40. + uGap * 0.9))) * smoothstep(FLOOR_Y + 160., FLOOR_Y, p.y);
      col += vec3(1.0, 0.8, 0.55) * spill * uGlowIn * 0.8 * step(1., uGap);
    }
  `, { uGap: { value: 0 }, uGlowIn: { value: 1 } });
  bg.u.uSpot.value.set(TXT.x, TXT.y + 10, 430, 0.95);
  ctx.bgScene.add(bg);

  // ---------- 3D: chrome "Encore?" ----------
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  const key = new THREE.SpotLight(0xfff2e0, 3.0, 0, 0.5, 0.6, 0); key.position.set(-300, 700, 1100); key.target.position.set(0, 100, 0);
  scene.add(key, key.target, new THREE.DirectionalLight(0xff4a3a, 1.4).translateX(700).translateZ(-500), new THREE.AmbientLight(0x502020, 0.6));
  const tg = new TextGeometry('Encore?', { font: A.fraktur, size: 150, depth: 30, curveSegments: 8, bevelEnabled: true, bevelThickness: 6, bevelSize: 3.2, bevelSegments: 3 });
  tg.computeBoundingBox();
  const bb = tg.boundingBox;
  tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, -15);
  const chrome = new THREE.MeshStandardMaterial({ color: 0xfff4ea, metalness: 1, roughness: 0.12, envMapIntensity: 1.8 });
  const logo = new THREE.Mesh(tg, chrome);
  const ks = TXT.w / (bb.max.x - bb.min.x);
  const holder = new THREE.Group(); holder.add(logo);
  holder.position.set(TXT.x - W / 2, H / 2 - TXT.y, 0);
  scene.add(holder);

  // ---------- confetti: still falling from the last song + the burst through the crack ----------
  const conf = confetti([{ x: I * W + 540, y: 1110, at: PEEK + 0.05, angle: 0, spread: 0.5, speed: 2000, life: 3.6 }],
    { count: 520, fall: 1, fallFrom: [I * W - 120, I * W + W + 40], order: 46, size: 0.62 });
  ctx.seamScene.add(conf);

  // ---------- lights: gold sweeps; on the peek they all dive into the crack ----------
  ctx.rig.setCue(I, (t, k) => {
    const sweep = [-0.3, 0.05, 0.35][k] + 0.28 * Math.sin(TAU * t / 8 + k * 2.2);
    const lock = t >= PEEK && t < 6.6 ? 1 - smooth(seg(t, 5.6, 6.6)) : smooth(seg(t, 3.7, 4.0)) * (t < PEEK ? 1 : 0);
    const toGap = [0.38, 0.0, -0.38][k];
    return { a: mix(sweep, toGap, lock), w: 0.065, I: 0.5 + 0.15 * beatEnv(t, 0.2) + 0.5 * lock, col: [1.0, 0.82, 0.5], pool: 0.5 };
  });

  // ---------- DOM ----------
  const dom = ctx.dom[I];
  const pass = dom.querySelector('.pass'), holo = dom.querySelector('.pass .holo');
  const drop = dom.querySelector('.s6-drop .d'), cta = dom.querySelector('.s6-cta');
  const meter = vu(dom.querySelector('.vu'), '11');

  return {
    bg,
    update(t) {
      bg.u.uTime.value = t;
      const g = gapW(t), hot = pulse(t, PEEK, 0.3), ke = kickEnv(t, 0.15);
      bg.u.uGap.value = g;
      bg.u.uGlowIn.value = 1.0 + 0.4 * hot;
      const wl = 0.92 + 0.08 * ke + 0.2 * clamp(g / 230);
      bg.u.uWash.value.set(1.0 * wl, 0.84 * wl, 0.74 * wl);
      bg.u.uSpot.value.w = 0.95 + 0.2 * hot;
      ctx.rig.fogU.uAmt.value[I] = 0.5 + 0.3 * clamp(g / 230);

      // the chrome logo turns gently in the spot; bounces on the peek
      const bounce = 1 + 0.06 * pulse(t, PEEK, 0.2) + 0.012 * ke;
      holder.rotation.y = 0.16 * Math.sin(TAU * t / 8) + 0.1 * wobble(t, PEEK, 1.1, 2.0);
      holder.rotation.x = 0.06 * Math.sin(TAU * t / 8 * 2 + 1);
      holder.scale.setScalar(ks * bounce);
      holder.position.y = H / 2 - TXT.y + 8 * Math.sin(TAU * t / 4);
      chrome.envMapIntensity = 1.7 + 0.8 * hot;

      conf.u.uTime.value = t;
      hit(ctx, I, t, PEEK, { zoom: 0.035, shake: 8, ca: 5, flash: 0.12, col: [1, 0.86, 0.66] });

      // the pass swings like a pendulum, kicked by the peek; the hologram glints across it
      const sw = 0.07 * Math.sin(TAU * t / 2) + 0.12 * wobble(t, PEEK, 0.55, 0.9);
      pass.style.transform = `rotate(${(sw * 57.3).toFixed(2)}deg) scale(0.74)`;
      holo.style.backgroundPosition = `${(100 - ((t / 4) % 1) * 300).toFixed(1)}% 0`;
      drop.style.transform = `scale(${(1 + 0.05 * hot + 0.01 * ke).toFixed(3)})`;
      cta.style.transform = `translateX(-50%) rotate(${(-2 + 1.2 * wobble(t, PEEK + 0.1, 1.4, 2.5)).toFixed(2)}deg)`;
      meter(needle(t, 0.92 + 0.12 * hot, 0.08, 0.06, 0.03), 0.8 + hot);
    },
  };
}
