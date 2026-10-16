// SLIDE 3 — ON BASS: THE DENIM. An 8x10 bass cab (photo) whose cones really pump with the low end, pressure
// rings rolling off it through the haze, and the jeans hanging from a chain off the truss, blown about by the
// air the cab moves. LOW END. ripples like a plucked string. 4.0 is the drop: every cone punches out, a
// shockwave rolls across the stage, the jeans whip, the beams snap onto the denim.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, pulse, wobble, since, kickEnv, snareEnv, lnoise, sprite, place, dcol } from './core.js';
import { bgQuad } from './gl.js';
import { vu, needle, staged, hit, puffs } from './kit.js';

const I = 2;
const DROP = 4.0;
const CAB = { x: 262, base: 1150, h: 690 };
const JEANS = { x: 735, base: 1112, h: 640 };
// cone centres in the cab image (px), radius
const CONES = [[271, 271], [604, 272], [268, 597], [602, 597], [268, 926], [601, 925], [271, 1253], [602, 1255]];
const CONE_R = 158;
// the bass: kicks on the whole seconds plus the riff's offbeat pushes
const bassEnv = t => Math.max(kickEnv(t, 0.26), 0.55 * Math.exp(-((t + 0.25) % 1) / 0.14), 1.6 * pulse(t, DROP, 0.3));

export function init(ctx) {
  const A = ctx.assets;
  const cs = CAB.h / A.cab.h;
  const cabTop = CAB.base - CAB.h, cabLeft = CAB.x - (A.cab.w * cs) / 2;
  const coneXY = CONES.map(([x, y]) => [cabLeft + x * cs, cabTop + y * cs]);

  // ---------- backdrop + pressure rings off the cones ----------
  const ringDecl = /* glsl */`uniform float uAge; uniform float uDrop; uniform vec2 uCones[8];`;
  const bg = bgQuad(I, ringDecl, /* glsl */`
    col = stageColor(p, sp, t);
    // the drop: a shockwave through the haze from the cab
    float dd = length((p - vec2(${CAB.x}., 760.)) * vec2(1., 1.15));
    col += vec3(1.0, 0.8, 0.55) * exp(-sq((dd - uDrop * 1500.) / 22.)) * exp(-uDrop * 2.2) * 0.8;
    // rings from each cone
    float rr = 0.;
    for (int k = 0; k < 8; k++) {
      float d = length(p - uCones[k]);
      rr += exp(-sq((d - ${(CONE_R * 0.74).toFixed(1)} - uAge * 520.) / 5.)) * exp(-uAge * 4.5);
    }
    col += vec3(1.0, 0.82, 0.62) * rr * 0.2 * smoothstep(0., 0.04, uAge);
  `, { uAge: { value: 9 }, uDrop: { value: 9 }, uCones: { value: coneXY.map(([x, y]) => new THREE.Vector2(x, y)) } });
  bg.u.uSpot.value.set(JEANS.x, 640, 420, 0.8);
  ctx.bgScene.add(bg);

  // ---------- the cab and its eight live cones ----------
  const cab = sprite(A.cab.tex, A.cab.w, A.cab.h, { order: -30 });
  place(cab, I, CAB.x, CAB.base, cs, 0.5, 1);
  cab.u.uRimAmt.value = 0.45; cab.u.uRimDir.value.set(0.4, 0.9); cab.u.uRim.value = dcol(0xffb070);
  cab.u.uGrad.value.set(1.0, 0.8);
  ctx.bgScene.add(cab);
  const cones = CONES.map(([x, y]) => {
    const c = sprite(A.cab.tex, CONE_R * 2, CONE_R * 2, { order: -29 });
    c.u.uUv.value.set((x - CONE_R) / A.cab.w, 1 - (y + CONE_R) / A.cab.h, (2 * CONE_R) / A.cab.w, (2 * CONE_R) / A.cab.h);
    c.u.uRound.value = 0.97;
    c.u.uGrad.value.set(1.0, 0.8);
    ctx.bgScene.add(c);
    return c;
  });
  // cab reflection + shadow on the deck
  const cabShadow = sprite(ctx.radialTex, 256, 256, { order: -31 });
  cabShadow.u.uTint.value.setRGB(0, 0, 0); cabShadow.u.uTintAmt.value = 1; cabShadow.u.uOpacity.value = 0.7;
  cabShadow.scale.set((A.cab.w * cs * 1.15) / 256, 50 / 256, 1); cabShadow.position.set(I * W + CAB.x, H - CAB.base - 4, 0);
  ctx.bgScene.add(cabShadow);

  // ---------- the jeans on a chain ----------
  const Jn = staged(ctx, ctx.seamScene, I, A.denim, JEANS.x, JEANS.base, JEANS.h, { segs: 70, order: 12, reflect: 0.18, shadowW: 0.6 });
  const ju = Jn.main.u;
  ju.uRimAmt.value = 0.35; ju.uRimDir.value.set(-0.6, 0.6); ju.uRim.value = dcol(0xffc890);
  ju.uGrad.value.set(1.08, 0.92); ju.uBright.value = 1.12; ju.uContrast.value = 1.05;
  ju.uWindDir.value.set(1, 0.08);
  // the chain from the truss down to the clips
  const chainC = document.createElement('canvas'); chainC.width = 24; chainC.height = 256;
  { const x = chainC.getContext('2d'); for (let k = 0; k < 8; k++) { x.strokeStyle = '#e9e2da'; x.lineWidth = 3.5; x.beginPath(); x.ellipse(12, 16 + k * 32, 6, 13, 0, 0, TAU); x.stroke(); } }
  const chainTex = new THREE.CanvasTexture(chainC); chainTex.colorSpace = THREE.NoColorSpace; chainTex.premultiplyAlpha = true;
  chainTex.wrapT = THREE.RepeatWrapping;
  const jTop = JEANS.base - JEANS.h + 14;
  const chain = sprite(chainTex, 24, jTop - 64, { order: 11 });
  chain.u.uUv.value.set(0, 0, 1, (jTop - 64) / 256);
  chain.u.uRimAmt.value = 0; chain.u.uBright.value = 0.9;
  ctx.seamScene.add(chain);

  // dust shaken off the deck under the cab on the drop
  const dust = puffs([{ x: I * W + CAB.x, y: CAB.base, at: DROP, k: 1.5 }, { x: I * W + JEANS.x, y: JEANS.base + 10, at: DROP + 0.05, k: 0.9 }], { per: 30 });
  ctx.seamScene.add(dust);

  // ---------- lights: slow amber sweeps (it's the bass), then they snap onto the denim ----------
  ctx.rig.setCue(I, (t, k) => {
    const sweep = [-0.25, 0.08, 0.3][k] + 0.35 * Math.sin(TAU * t / 8 + k * 2.4);
    const lockA = [0.42, 0.18, -0.12][k];             // toward the jeans at x 735
    const lock = t >= DROP ? 1 - smooth(seg(t, 5.8, 7.4)) : smooth(seg(t, 3.6, 3.95));
    const be = bassEnv(t);
    return { a: mix(sweep, lockA, lock), w: mix(0.08, 0.055, lock), I: 0.5 + 0.25 * be + 0.35 * lock, col: k === 1 ? [1.0, 0.9, 0.75] : [1.0, 0.7, 0.38], pool: 0.5 };
  });

  // ---------- DOM: LOW END. rippling like a string ----------
  const dom = ctx.dom[I];
  const low = dom.querySelector('.s3-low');
  low.innerHTML = [...'LOW END.'].map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  const letters = [...low.querySelectorAll('span')];
  const meter = vu(dom.querySelector('.vu'), '05');

  return {
    bg,
    update(t) {
      bg.u.uTime.value = t;
      const be = bassEnv(t), hot = pulse(t, DROP, 0.3), drop = since(t, DROP);
      bg.u.uAge.value = t % 1;
      bg.u.uDrop.value = drop;
      const wl = 0.92 + 0.1 * be + 0.25 * hot;
      bg.u.uWash.value.set(1.0 * wl, 0.84 * wl, 0.72 * wl);
      bg.u.uSpot.value.w = 0.75 + 0.2 * be + 0.4 * hot;
      bg.u.uSway.value = 0.05 + 0.05 * be + 0.15 * hot;
      ctx.rig.fogU.uAmt.value[I] = 0.5 + 0.2 * be;

      // cones: pump out with the bass (scale + a hot dust cap)
      cones.forEach((c, k) => {
        const [x, y] = coneXY[k];
        const out = 0.075 * be + 0.06 * hot + 0.012 * Math.sin(TAU * t * 8 + k);
        place(c, I, x, y, cs * (1 + out));
        c.u.uBright.value = 1 + 0.5 * out;
      });
      place(cab, I, CAB.x, CAB.base, cs * (1 + 0.004 * be), 0.5, 1);

      // jeans: blown by the cab (from the left), pendulum swing on the chain
      for (const m of [Jn.main, Jn.refl]) {
        m.u.uTime.value = t;
        m.u.uWind.value = 8 + 26 * be + 50 * hot;
        m.u.uFlutter.value = 0.35 + 0.6 * be + 0.8 * hot;
        m.u.uRipple.value = 0.25 + 0.4 * be;
        m.u.uPulse.value = 0.5 * be;
        m.u.uPulseR.value = (t % 1) * 600;
      }
      chain.position.set(I * W + JEANS.x, H - (64 + (jTop - 64) / 2), 0);

      dust.u.uTime.value = t;
      hit(ctx, I, t, DROP, { zoom: 0.05, shake: 16, ca: 8, flash: 0.12, dur: 0.3 });
      // a low-frequency wobble on every kick (the floor shakes)
      const p = ctx.punch[I];
      p.z += 3 * kickEnv(t, 0.12) * Math.sin(t * 60);

      letters.forEach((el, k) => {
        const wave = Math.sin(TAU * (t * 2) - k * 0.75) * (6 + 22 * be) + 30 * wobble(t, DROP + k * 0.03, 2.2, 3.5);
        const sy = 1 + 0.1 * be * Math.sin(k + t * 7);
        el.style.transform = `translateY(${wave.toFixed(1)}px) scaleY(${sy.toFixed(3)})`;
      });
      meter(needle(t, 0.5 + 0.3 * hot, 0.22, 0.1), 0.3 * be + hot);
    },
  };
}
