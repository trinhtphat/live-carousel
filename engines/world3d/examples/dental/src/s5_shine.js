// SLIDE 5 — SHINE. Electric-cyan world. The model laughs in front of a giant SHINE, with an afterglow trail;
// sparkles rise past her. On the drop (4.0) her smile fires a lens-flare glint: a four-point star, an
// anamorphic streak that crosses into slides 4 and 6, a white bloom; the light stream pours into slide 6.
import { THREE, W, H, TAU, mix, seg, smooth, eOutCubic, eInOut, eOutExpo, pulse, wobble, beatEnv, flick, sprite, textTexture, prepTex } from './core.js';
import { bgQuad, hexv4 } from './gl.js';
import { rise, stream } from './particles.js';

const I = 4;
const HERO = { x: 560, y: 716, h: 1200 };
const MOUTH = { u: 0.40, v: 0.195 };
const ECHO = 4;

const jolt = t => (t >= 4.0 ? eOutExpo(seg(t, 4.0, 4.16)) * (1 - eInOut(seg(t, 4.35, 5.6))) : 0);

function starTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), m = S / 2;
  const core = g.createRadialGradient(m, m, 0, m, m, m);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.025, 'rgba(255,255,255,0.85)');
  core.addColorStop(0.1, 'rgba(160,235,255,0.2)'); core.addColorStop(1, 'rgba(120,220,255,0)');
  g.fillStyle = core; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  for (const [a, len, wd] of [[0, 1, 0.022], [Math.PI / 2, 1, 0.022], [Math.PI / 4, 0.42, 0.012], [-Math.PI / 4, 0.42, 0.012]]) {
    g.save(); g.translate(m, m); g.rotate(a);
    const L = m * len, Wd = S * wd;
    const grd = g.createLinearGradient(-L, 0, L, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -Wd, L, 0); g.quadraticCurveTo(0, Wd, -L, 0); g.fill();
    g.restore();
  }
  return prepTex(new THREE.CanvasTexture(c));
}
function streakTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64;
  const g = c.getContext('2d'), img = g.createImageData(1024, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 1024; x++) {
    const dx = (x - 512) / 512, dy = (y - 32) / 32;
    const a = Math.exp(-dy * dy * 18) * Math.pow(1 - Math.abs(dx), 1.6) + 0.35 * Math.exp(-dy * dy * 3) * Math.pow(1 - Math.abs(dx), 3);
    const k = (y * 1024 + x) * 4;
    img.data[k] = 210; img.data[k + 1] = 245; img.data[k + 2] = 255; img.data[k + 3] = Math.min(255, a * 255);
  }
  g.putImageData(img, 0, 0);
  return prepTex(new THREE.CanvasTexture(c), { mips: false });
}

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uBeat; uniform float uFlash; uniform float uGlint;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.06, 0.58, 0.98), vec3(0.01, 0.10, 0.24), smoothstep(0., 1350., p.y));
    col = mix(col, vec3(0.02, 0.26, 0.55), smoothstep(250., 1150., length(p - vec2(${HERO.x}., 560.))) * 0.5);
    // light rays from the smile
    vec2 r = p - vec2(480., 350.);
    float a = atan(r.y, r.x);
    float rays = pow(fbm(vec2(a * 6.0, 0.5) + loopv(t) * 0.9), 2.2);
    add += vec3(0.60, 0.93, 1.0) * rays * (0.28 + 0.9 * uGlint) * smoothstep(1500., 120., length(r)) * (0.8 + 0.4 * uBeat);
    add += vec3(0.85, 0.98, 1.0) * exp(-abs(p.y - 1350.) / 120.) * 0.08;
    vec2 pr = sp - vec2(${5 * W + 540}., 430.);
    add += vec3(0.10, 0.45, 0.85) * exp(-length(pr * vec2(1., 2.2)) / 520.) * 0.5;
    col *= mix(0.8, 1.0, smoothstep(0., 220., p.y));
    add += uFlash * vec3(0.8, 0.95, 1.0);
  `, { uBeat: { value: 0 }, uFlash: { value: 0 }, uGlint: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#7fd4f2', 1);
  bg.u.uSeamR.value = hexv4('#0d3a5c', 1);
  ctx.bgScene.add(bg);

  // SHINE: solid ink + an outlined echo
  const T = textTexture(['SHINE'], { size: 640, ls: -4 });
  const TS = textTexture(['SHINE'], { size: 640, ls: -4, stroke: 7 });
  const tw = 1010, th = tw * T.h / T.w, tsw = tw * TS.w / T.w, tsh = tsw * TS.h / TS.w;
  const word = sprite(T.tex, tw, th, { order: -40 });
  word.u.uTint.value.set('#03192b'); word.u.uTintAmt.value = 1; word.u.uOpacity.value = 0.92;
  const wordO = sprite(TS.tex, tsw, tsh, { order: -41 });
  wordO.u.uTint.value.set('#c9f4ff'); wordO.u.uTintAmt.value = 1; wordO.u.uOpacity.value = 0.55;
  ctx.bgScene.add(wordO, word);

  // hero + afterglow echoes
  const A = ctx.assets.hero;
  const hw = HERO.h * A.w / A.h;
  const hero = sprite(A.tex, hw, HERO.h, { order: 46, segs: 8 });
  hero.u.uRim.value.set('#bff1ff'); hero.u.uRimAmt.value = 0.35; hero.u.uRimDir.value.set(0.9, 0.3);
  const echoes = [];
  for (let k = 0; k < ECHO; k++) {
    const e = sprite(A.tex, hw, HERO.h, { order: 44 - k * 0.1, segs: 2 });
    e.u.uTint.value.set(k % 2 ? '#7dffcb' : '#1fc8ff'); e.u.uTintAmt.value = 0.9;
    echoes.push(e);
  }
  ctx.seamScene.add(hero, ...echoes);
  const streaks = rise(); ctx.seamScene.add(streaks);
  const acc = stream(); ctx.seamScene.add(acc);
  ctx.accStream = acc;

  // the glint: star + anamorphic streak (additive, crosses both seams)
  const star = sprite(starTexture(), 900, 900, { order: 60, additive: true });
  const streak = sprite(streakTexture(), 3000, 70, { order: 59, additive: true });
  const bloom = sprite(ctx.radialTex, 820, 820, { order: 58, additive: true });
  bloom.u.uTint.value.set('#9fe9ff'); bloom.u.uTintAmt.value = 1;
  ctx.seamScene.add(bloom, streak, star);
  const mouth = (hx, hy) => [hx + (MOUTH.u - 0.5) * hw, hy + (MOUTH.v - 0.5) * HERO.h];

  const el = ctx.dom[I];
  const white = el.querySelector('.whiteout');
  const g = el.querySelector('.s5-g b');
  const look = el.querySelector('.s5-look');

  return {
    update(t) {
      const j = jolt(t);
      const big = pulse(t, 4.0, 0.32);
      const small = Math.max(pulse(t, 2.0, 0.12), pulse(t, 6.0, 0.12), pulse(t, 7.0, 0.1) * 0.6);
      bg.u.uBeat.value = beatEnv(t, 0.18) + pulse(t, 4.0, 0.3);
      bg.u.uFlash.value = 0.3 * pulse(t, 4.0, 0.05);
      bg.u.uGlint.value = big;
      // SHINE breathes, kicks on the drop
      const dy = 338 + 22 * wobble(t, 4.0, 1.6, 4);
      word.position.set(I * W + 540, H - dy, 0); word.scale.set(1 + 0.05 * pulse(t, 4.0, 0.25), 1, 1);
      wordO.position.set(I * W + 540 + 10, H - dy - 24, 0); wordO.scale.copy(word.scale);
      // hero: a slow laugh-bob, a lift on the drop
      const bob = Math.sin(TAU * t / 4) * 10;
      const hx = HERO.x + Math.sin(TAU * t / 8) * 8;
      const hy = HERO.y + bob - 40 * j;
      hero.position.set(I * W + hx, H - hy, 0);
      hero.u.uRoll.value = Math.sin(TAU * t / 8 + 0.4) * 0.02 + 0.025 * wobble(t, 4.0, 1.4, 4);
      hero.u.uYaw.value = Math.sin(TAU * t / 8) * 0.05;
      hero.u.uTime.value = t;
      hero.u.uBright.value = 1.04 + 0.12 * big;
      const gap = 10 + 46 * j + 4 * beatEnv(t, 0.2);
      echoes.forEach((e, k) => {
        e.position.set(I * W + hx + (k + 1) * gap * 0.9 * (k % 2 ? -1 : 1), H - (hy + (k + 1) * 4), 0);
        e.u.uRoll.value = hero.u.uRoll.value * (1 + k * 0.3);
        e.u.uOpacity.value = (0.3 - k * 0.065) * (0.35 + 0.65 * Math.min(1, j * 2 + 0.3 * beatEnv(t, 0.25)));
        e.scale.set(1 + k * 0.012, 1 + k * 0.012, 1);
      });
      // glint
      const [mx, my] = mouth(hx, hy);
      const gk = Math.max(big, 0.35 * small);
      star.position.set(I * W + mx, H - my, 0);
      star.scale.setScalar(0.06 + 0.95 * gk);
      star.u.uRoll.value = 0.35 * t + 0.6 * eOutCubic(seg(t, 4.0, 4.6));
      star.u.uOpacity.value = Math.min(1, gk * 1.3);
      streak.position.set(I * W + mx, H - my, 0);
      streak.scale.set(0.3 + 0.9 * big + 0.2 * small, 0.6 + 0.6 * big, 1);
      streak.u.uOpacity.value = Math.min(1, 1.2 * big + 0.3 * small);
      bloom.position.set(I * W + mx, H - my, 0);
      bloom.u.uOpacity.value = 0.4 * big + 0.12 * small;
      streaks.u.uTime.value = t; streaks.u.uFlip.value = 0;
      acc.u.uTime.value = t; acc.u.uBoost.value = pulse(t, 4.0, 0.4);
      white.style.setProperty('--gx', (mx / W * 100).toFixed(1) + '%');
      white.style.setProperty('--gy', (my / H * 100).toFixed(1) + '%');
      white.style.opacity = 0.55 * pulse(t, 4.0, 0.07);
      const blinding = t >= 4.0 && t < 6.0;
      g.textContent = blinding ? 'BLINDING' : 'ON';
      g.classList.toggle('alt', blinding);
      look.style.transform = `translateY(${-10 * j}px)`;
    },
  };
}
