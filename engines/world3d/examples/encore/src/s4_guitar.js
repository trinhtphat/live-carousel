// SLIDE 4 — ON GUITAR: THE TEE. The tour tee floats as if an invisible guitarist is wearing it, an SG slung
// across it, rocking to the riff. Its six strings run on past the headstock as glowing wires, out of the slide
// and over the seam into slide 5, and they blur into vibrating bands on every strum. SOLO. stands behind
// it like a masthead. 4.0 is the power chord: the strings flare, a shower of sparks blows off the bridge,
// the beams converge and the shirt lifts. The tour board flips its dates in.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, pulse, wobble, since, beatEnv, kickEnv, snareEnv, lnoise, hash, sprite, place, posterText, dcol } from './core.js';
import { bgQuad, COMMON } from './gl.js';
import { vu, needle, staged, gerb, hit } from './kit.js';

const I = 3;
const CHORD = 4.0;
const TEE = { x: 470, base: 1150, h: 830 };
// guitar geometry in the image (px): bridge and nut centres
const BRIDGE = [480, 1280], NUT = [1320, 570];

const strumEnv = t => Math.max(0.55 * beatEnv(t, 0.16), 0.35 * Math.exp(-((t + 0.25) % 0.5) / 0.1), 1.4 * pulse(t, CHORD, 0.45));

export function init(ctx) {
  const A = ctx.assets;
  const s = TEE.h / A.tee_guitar.h;
  const left = TEE.x - (A.tee_guitar.w * s) / 2, top = TEE.base - TEE.h;
  const bx = left + BRIDGE[0] * s, by = top + BRIDGE[1] * s;
  const nx = left + NUT[0] * s, ny = top + NUT[1] * s;

  // ---------- backdrop ----------
  const bg = bgQuad(I, '', /* glsl */`col = stageColor(p, sp, t);`);
  bg.u.uSpot.value.set(TEE.x, 640, 470, 0.85);
  ctx.bgScene.add(bg);


  // ---------- the tee + guitar ----------
  const T = staged(ctx, ctx.seamScene, I, A.tee_guitar, TEE.x, TEE.base, TEE.h, { segs: 60, order: 12, reflect: 0.0, shadowW: 0.55 });
  T.refl.visible = false;
  const tu = T.main.u;
  tu.uRimAmt.value = 0.4; tu.uRimDir.value.set(-0.4, 0.9); tu.uRim.value = dcol(0xffe0b8);
  tu.uGrad.value.set(1.02, 0.9); tu.uContrast.value = 1.04;
  tu.uWindMask.value.set(0.04, 0.55, 0.2, 0.45);      // the sleeves and hem catch air, not the guitar
  tu.uWindDir.value.set(0.2, 1.0);

  // ---------- the strings: from the bridge, past the nut, off the slide and over the seam ----------
  const dir = new THREE.Vector2(nx - bx, ny - by); const neckLen = dir.length(); dir.normalize();
  // run on until they reach the truss (y = 64)
  const total = (by - 64) / -dir.y;
  const quadW = 1480, quadH = H;
  const strMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0 }, uGlow: { value: 0.5 }, uO: { value: new THREE.Vector2() }, uD: { value: dir.clone() }, uRock: { value: 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
#define TAU 6.28318530718
uniform float uTime, uAmp, uGlow; uniform vec2 uO, uD; varying vec2 vP;
void main(){
  // vP is strip px with y UP; work in y-down slide-ish coords relative to the bridge
  vec2 q = vec2(vP.x, ${H}. - vP.y) - uO;
  float s = dot(q, uD);
  if (s < 0. || s > ${total.toFixed(1)}) discard;
  float d = q.x * uD.y - q.y * uD.x;
  float nut = ${neckLen.toFixed(1)};
  // spacing: 26 px wide at the bridge, 18 at the nut, then they open out slowly beyond the headstock
  float spread = s < nut ? mix(13., 9., s / nut) : 9. + (s - nut) * 0.035;
  // vibration: on the neck the anchor points are bridge + nut; beyond, the far end is the truss
  float u = s < nut ? s / nut : (s - nut) / (${total.toFixed(1)} - nut);
  float env = sin(3.14159 * u);
  float acc = 0.;
  for (int k = 0; k < 6; k++) {
    float off = (float(k) - 2.5) / 2.5 * spread;
    float A = uAmp * env * (0.6 + 0.4 * float(5 - k) / 5.) * (s < nut ? 0.35 : 1.0);
    float dd = abs(d - off);
    float w = 1.1 + 0.4 * float(5 - k) / 5.;
    float core = exp(-dd * dd / (w * w)) * (1. / (1. + A * 0.35));
    float band = A > 0.5 ? (1. - smoothstep(A, A + 2.5, dd)) * (w / (A + w)) * 1.6 : 0.;
    acc += max(core, band) + 0.35 * exp(-dd / (6. + A));
  }
  float fade = smoothstep(0., 30., s) * (1. - smoothstep(${(total - 140).toFixed(1)}, ${total.toFixed(1)}, s));
  float onNeck = s < nut ? 0.45 : 1.;
  float a = acc * fade * onNeck * uGlow;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * a, 0.);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const strings = new THREE.Mesh(new THREE.PlaneGeometry(quadW, quadH), strMat);
  strings.position.set(I * W + quadW / 2, H / 2, 0); strings.renderOrder = 14; strings.frustumCulled = false;
  ctx.seamScene.add(strings);
  // the shape vertices are in local space; convert: we pass strip coords of the bridge and use world xy
  strings.onBeforeRender = () => {};
  const strU = strMat.uniforms;
  strU.uO.value.set(I * W + bx, by);
  // the quad is centred at (I*W + quadW/2, H/2): its local position.xy + centre = strip xy (y up)
  strMat.vertexShader = strMat.vertexShader.replace('vP = position.xy;', `vP = position.xy + vec2(${(I * W + quadW / 2).toFixed(1)}, ${H / 2}.);`);

  // power-chord sparks off the bridge, blowing up and out along the neck
  const sparks = gerb(I, bx, by, CHORD, CHORD + 0.35, { count: 420, speed: 1500, spread: 0.6, angle: 0.75, life: 1.2, gravity: 1300, size: 1.1 });
  const sparks2 = gerb(I, bx, by, CHORD, CHORD + 0.25, { count: 260, speed: 1100, spread: 0.9, angle: -0.35, life: 1.0, gravity: 1400 });
  ctx.seamScene.add(sparks, sparks2);

  // ---------- lights: cream scissors, then all on the shirt ----------
  ctx.rig.setCue(I, (t, k) => {
    const sc = Math.sin(TAU * t / 2) * [1, -1, 1][k];
    const scissor = [-0.2, 0, 0.2][k] + 0.45 * sc;
    const lock = t >= CHORD ? 1 - smooth(seg(t, 5.6, 7.4)) : smooth(seg(t, 3.55, 3.95));
    const onTee = [0.28, -0.07, -0.42][k];
    return { a: mix(scissor, onTee, lock), w: mix(0.07, 0.06, lock), I: 0.55 + 0.25 * beatEnv(t, 0.12) + 0.45 * lock, col: [1.0, 0.93, 0.8], pool: 0.45 };
  });

  // ---------- DOM: the tour board ----------
  const dom = ctx.dom[I];
  const flap = dom.querySelector('.s4-flap');
  const soloEl = dom.querySelector('.s4-solo');
  soloEl.innerHTML = [...'SOLO.'].map(c => `<span>${c}</span>`).join('');
  const soloL = [...soloEl.querySelectorAll('span')];
  const ROWS = ['LONDON  11.20', 'PARIS   11.22', 'BERLIN  11.25', 'TOKYO   12.02', 'NEW YORK 12.09', 'YOUR CITY  →'];
  flap.innerHTML = `<div class="hd">LOUD TOUR '26 — DATES</div>` + ROWS.map(r => `<div class="row">${[...r].map(() => '<span class="c"></span>').join('')}</div>`).join('');
  const cells = [...flap.querySelectorAll('.row')].map(r => [...r.querySelectorAll('.c')]);
  const GLY = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789';
  const meter = vu(dom.querySelector('.vu'), '07');

  return {
    bg,
    update(t) {
      bg.u.uTime.value = t;
      const se = strumEnv(t), hot = pulse(t, CHORD, 0.3), after = t >= CHORD ? 1 - smooth(seg(t, 5.5, 7.6)) : 0;
      const wl = 0.95 + 0.1 * beatEnv(t, 0.12) + 0.25 * hot;
      bg.u.uWash.value.set(1.0 * wl, 0.86 * wl, 0.8 * wl);
      bg.u.uSpot.value.w = 0.8 + 0.4 * hot;
      bg.u.uSway.value = 0.05 + 0.1 * hot;
      ctx.rig.fogU.uAmt.value[I] = 0.5 + 0.2 * after;

      // SOLO. shakes with vibrato on every strum, jumps on the chord
      soloL.forEach((el, k) => {
        const v = (3 + 9 * se) * Math.sin(TAU * t * 11 + k * 1.7);
        const j = -26 * pulse(t, CHORD + k * 0.04, 0.12);
        el.style.transform = `translate(${(v * 0.4).toFixed(1)}px, ${(j + v * 0.25).toFixed(1)}px) rotate(${(v * 0.12).toFixed(2)}deg)`;
      });

      // the invisible guitarist rocks with the riff; lifts on the chord
      const rock = 0.022 * Math.sin(TAU * t) + 0.012 * Math.sin(TAU * t * 2 + 1) + 0.05 * wobble(t, CHORD, 1.2, 2.2);
      const lift = 34 * eOutCubic(clamp(since(t, CHORD) / 0.25)) * after + 6 * Math.sin(TAU * t / 2);
      for (const m of [T.main]) {
        m.u.uTime.value = t;
        m.u.uRoll.value = rock;
        m.u.uWind.value = 4 + 26 * hot + 8 * se;
        m.u.uFlutter.value = 0.12 + 0.3 * se;
        m.u.uRipple.value = 0.18;
      }
      place(T.main, I, TEE.x, TEE.base - lift, s, 0.5, 1);
      T.shadow.u.uOpacity.value = 0.55 - 0.2 * clamp(lift / 40);
      // keep the strings riding on the guitar: rotate the bridge point with the roll around the sprite centre
      const cx = TEE.x, cy = TEE.base - lift - TEE.h / 2;
      const rx = bx - cx, ry = (by - lift) - cy, c = Math.cos(rock), sn = Math.sin(rock);
      strU.uO.value.set(I * W + cx + rx * c + ry * sn, cy - rx * sn + ry * c);
      strU.uD.value.set(dir.x * c + dir.y * sn, -dir.x * sn + dir.y * c);
      strU.uTime.value = t;
      strU.uAmp.value = 14 * se + 2;
      strU.uGlow.value = 0.35 + 0.5 * se + 0.6 * hot;

      sparks.u.uTime.value = sparks2.u.uTime.value = t;
      hit(ctx, I, t, CHORD, { zoom: 0.05, shake: 10, ca: 8, flash: 0.15 });

      // tour board: rows flip in staggered 0.2-1.8, hold; the last row blinks red on the chord; scramble 7.55-8
      cells.forEach((row, r) => {
        const text = ROWS[r];
        row.forEach((el, k) => {
          const settle = 0.25 + r * 0.24 + k * 0.035;
          const scramble = t < settle || t > 7.55 + k * 0.01;
          const ch = scramble ? GLY[Math.floor(hash(Math.floor(t * 24) + k * 7.3 + r * 13.1) * GLY.length)] : text[k];
          if (el.textContent !== ch) el.textContent = ch === ' ' ? ' ' : ch;
          el.style.color = r === ROWS.length - 1 && !scramble ? (hot > 0.05 || Math.floor(t * 2) % 2 ? '#ff4a3a' : '#ffd27a') : '';
        });
      });
      meter(needle(t, 0.6 + 0.3 * hot, 0.22, 0.14), se);
    },
  };
}
