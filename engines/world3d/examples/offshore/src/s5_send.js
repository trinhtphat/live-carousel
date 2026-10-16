// SLIDE 5 — SEND. A towering teal wave face with water racing up it and a foam lip on top. The surfer
// hangs in the air with a spray echo trail; a giant SEND sits behind her. On the drop (4.0) she boosts:
// a spray burst off the tail, the echoes stretch, the frame flashes foam-white; at 6.0 she lands it.
import { THREE, W, H, TAU, mix, seg, smooth, eOutCubic, eInOut, eOutExpo, pulse, wobble, beatEnv, flick, sprite, textTexture } from './core.js';
import { bgQuad, hexv4 } from './gl.js';
import { rise, stream, splash } from './particles.js';

const I = 4;
const HERO = { x: 548, y: 712, h: 1190 };
const ECHO = 4;

// the boost: up fast on 4.0, hangs, settles; a smaller kick when she lands at 6.0
const air = t => (t >= 4.0 && t < 6.0 ? eOutExpo(seg(t, 4.0, 4.18)) * (1 - eInOut(seg(t, 4.4, 5.85))) : 0)
  + (t >= 6.0 ? -0.25 * eOutExpo(seg(t, 6.0, 6.1)) * (1 - eInOut(seg(t, 6.15, 6.9))) : 0);

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uBeat; uniform float uFlash; uniform float uLip;
    float flowN(vec2 q, float t){
      float ph = fract(t / 8. * 2.), pb = fract(ph + 0.5);
      float wa = 1. - abs(2. * ph - 1.);
      return fbm(q + vec2(0., ph * 1.6)) * wa + fbm(q + vec2(5.2, pb * 1.6)) * (1. - wa);
    }`, /* glsl */`
    float t = uTime;
    float y = p.y / 1350.;
    // the wave face: glassy teal, deeper toward the trough, lighter under the lip
    col = mix(vec3(0.03, 0.48, 0.55), vec3(0.004, 0.085, 0.14), smoothstep(0.28, 1.0, y));
    col = mix(col, vec3(0.16, 0.74, 0.74), (1. - smoothstep(0.04, 0.34, y)) * 0.75);
    // water racing up the face
    float s1 = flowN(vec2(p.x * 0.0055, p.y * 0.0011), t);
    float s2 = flowN(vec2(p.x * 0.013 + 3.0, p.y * 0.0024), t + 1.0);
    col += vec3(0.20, 0.72, 0.72) * pow(s1, 3.0) * 0.55;
    col += vec3(0.75, 1.0, 1.0) * pow(s2, 7.0) * 0.55 * (1. - y);
    // the foam lip: a ragged white band throwing over the top
    float edge = 120. + 40. * sin(p.x * 0.011 + TAU * t / 8. * 2.) + 30. * fbm(vec2(p.x * 0.01, 0.) + loopv(t)) * 2. + uLip * 70.;
    float foamN = fbm(p * 0.012 + loopv(t) * 1.4);
    float foam = (1. - smoothstep(edge - 40., edge + 30., p.y)) * smoothstep(0.32, 0.62, foamN + 0.25 * (1. - p.y / max(edge, 1.)));
    col = mix(col, vec3(0.93, 0.99, 1.0), clamp(foam, 0., 1.) * 0.92);
    // morning sun from the upper right
    vec2 r = p - vec2(980., -260.);
    float a = atan(r.x, r.y);
    float rays = pow(fbm(vec2(a * 6.0, 0.5) + loopv(t) * 0.8), 2.6);
    add += vec3(1.0, 0.78, 0.52) * rays * 0.26 * smoothstep(1700., 300., length(r)) * (0.75 + 0.5 * uBeat);
    add += vec3(0.75, 1.0, 1.0) * exp(-length((p - vec2(${HERO.x}., 600.)) * vec2(1., 0.8)) / 420.) * 0.14;
    // the sun of slide 6 bleeds in from the right seam
    vec2 sn = sp - vec2(${5 * W + 540}., 468.);
    add += vec3(1.0, 0.45, 0.18) * exp(-length(sn * vec2(1., 2.0)) / 520.) * 0.42;
    col *= mix(0.8, 1.0, smoothstep(0., 220., p.y));
    add += uFlash * vec3(0.9, 1.0, 1.0);
  `, { uBeat: { value: 0 }, uFlash: { value: 0 }, uLip: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#86d6d2', 1);
  bg.u.uSeamR.value = hexv4('#3f5a7a', 1);
  ctx.bgScene.add(bg);

  // SEND: solid ink + an outlined echo
  const T = textTexture(['SEND'], { size: 640, ls: -4 });
  const TS = textTexture(['SEND'], { size: 640, ls: -4, stroke: 7 });
  const tw = 1000, th = tw * T.h / T.w, tsw = tw * TS.w / T.w, tsh = tsw * TS.h / TS.w;
  const send = sprite(T.tex, tw, th, { order: -40 });
  send.u.uTint.value.set('#03222c'); send.u.uTintAmt.value = 1; send.u.uOpacity.value = 0.92;
  const sendO = sprite(TS.tex, tsw, tsh, { order: -41 });
  sendO.u.uTint.value.set('#bff6f2'); sendO.u.uTintAmt.value = 1; sendO.u.uOpacity.value = 0.55;
  ctx.bgScene.add(sendO, send);

  // surfer + spray echoes
  const A = ctx.assets.hero;
  const hw = HERO.h * A.w / A.h;
  const hero = sprite(A.tex, hw, HERO.h, { order: 46, segs: 8 });
  hero.u.uRim.value.set('#ffd2a0'); hero.u.uRimAmt.value = 0.3; hero.u.uRimDir.value.set(-0.6, 0.8);
  const echoes = [];
  for (let k = 0; k < ECHO; k++) {
    const e = sprite(A.tex, hw, HERO.h, { order: 44 - k * 0.1, segs: 2 });
    e.u.uTint.value.set(k % 2 ? '#e8ffff' : '#2ee0e0'); e.u.uTintAmt.value = 0.9;
    echoes.push(e);
  }
  ctx.seamScene.add(hero, ...echoes);
  const streaks = rise(); ctx.seamScene.add(streaks);
  const acc = stream(); ctx.seamScene.add(acc);
  // tail of the board in the hero image ~ (0.43, 0.85): spray off it on the boost, a splash on the landing
  const tailX = I * W + HERO.x + (0.40 - 0.5) * hw, tailY = H - (HERO.y + (0.86 - 0.5) * HERO.h);
  const boost = splash(260, [tailX, tailY], 4.0, { spread: 1.15, up: 1.0, life: 1.5 });
  const land = splash(200, [I * W + HERO.x + 40, 90], 6.0, { spread: 0.8, up: 0.8, life: 1.2 });
  ctx.seamScene.add(boost, land);

  const el = ctx.dom[I];
  const fl = el.querySelector('.flash');
  const g = el.querySelector('.s5-g b');
  const look = el.querySelector('.s5-look');

  return {
    update(t) {
      const j = air(t);
      bg.u.uBeat.value = beatEnv(t, 0.18) + pulse(t, 4.0, 0.3);
      bg.u.uFlash.value = 0.3 * pulse(t, 4.0, 0.05) + 0.2 * pulse(t, 6.0, 0.05);
      bg.u.uLip.value = pulse(t, 4.0, 0.4);
      // SEND punches on the boost
      const dy = 330 + 24 * wobble(t, 4.0, 1.6, 4);
      const sc = 1 + 0.05 * pulse(t, 4.0, 0.25) + 0.015 * beatEnv(t, 0.2);
      send.position.set(I * W + 540, H - dy, 0); send.scale.set(sc, sc, 1);
      sendO.position.set(I * W + 540 + 10, H - dy - 24, 0); sendO.scale.copy(send.scale);
      // surfer
      const bob = Math.sin(TAU * t / 4) * 12;
      const hx = HERO.x + Math.sin(TAU * t / 8) * 8;
      const hy = HERO.y + bob - 95 * j;
      hero.position.set(I * W + hx, H - hy, 0);
      hero.u.uRoll.value = Math.sin(TAU * t / 8 + 0.4) * 0.025 - 0.06 * j + 0.03 * wobble(t, 6.0, 1.4, 4);
      hero.u.uYaw.value = Math.sin(TAU * t / 8) * 0.06;
      hero.u.uTime.value = t;
      hero.u.uBright.value = 1.03 + 0.22 * pulse(t, 4.0, 0.08);
      const gap = 24 + 140 * Math.max(0, j) + 6 * beatEnv(t, 0.2);
      echoes.forEach((e, k) => {
        e.position.set(I * W + hx - (k + 1) * 10, H - (hy + (k + 1) * gap), 0);
        e.u.uRoll.value = hero.u.uRoll.value * (1 + k * 0.3);
        e.u.uOpacity.value = (0.40 - k * 0.08) * (0.5 + 0.5 * Math.min(1, Math.max(0, j) * 2 + 0.35 + 0.3 * beatEnv(t, 0.25)));
        e.scale.set(1 + k * 0.012, 1 + k * 0.012, 1);
      });
      streaks.u.uTime.value = t;
      acc.u.uTime.value = t; acc.u.uBoost.value = pulse(t, 4.0, 0.4);
      boost.u.uTime.value = t; land.u.uTime.value = t;
      fl.style.opacity = 0.55 * flick(t, [[4.0, 0.067]]) + 0.3 * flick(t, [[6.0, 0.034]]);
      const ft = t >= 4.0 && t < 6.0 ? (4.2 * eOutCubic(seg(t, 4.0, 4.35))).toFixed(1) : '0.0';
      g.textContent = `${ft} FT`;
      g.classList.toggle('alt', t >= 4.0 && t < 6.0);
      look.style.transform = `translateY(${-10 * Math.max(0, j)}px)`;
    },
  };
}
