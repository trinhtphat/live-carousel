// SLIDE 1 — THE FRONTMAN (cover). An empty stage, a marquee sign with a chrome blackletter logo and
// chasing bulbs, and the leather jacket hung on a vintage mic stand where the singer should be.
// 3.25-4.0 the house dips while the bulbs count in; 4.0 the lights slam, the beams fan out, the gerbs fire
// and the wind machine catches the jacket. Everything settles back to the t=0 look by 7.6.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutBack, pulse, wobble, since, lnoise, kickEnv, snareEnv, dcol } from './core.js';
import { bgQuad, hexv3 } from './gl.js';
import { vu, needle, staged, gerb, hit } from './kit.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const I = 0;
const HIT = 4.0;
const SIGN = { x: 540, y: 338, w: 900, h: 236 };
const dip = t => smooth(seg(t, 3.2, 3.7)) * (t < HIT ? 1 : 0);
const after = t => (t >= HIT ? 1 - smooth(seg(t, 5.6, 7.6)) : 0);     // the post-hit "show" state

export function init(ctx) {
  const A = ctx.assets;
  // ---------- backdrop ----------
  const bg = bgQuad(I, /* glsl */`uniform float uSignGlow;`, /* glsl */`
    col = stageColor(p, sp, t);
    // the bulbs throw warm light onto the velvet behind the sign
    vec2 q = (p - vec2(${SIGN.x}., ${SIGN.y}.)) / vec2(560., 250.);
    col += vec3(1.0, 0.62, 0.32) * exp(-dot(q, q)) * uSignGlow * 0.32;
  `, { uSignGlow: { value: 1 } });
  bg.u.uSpot.value.set(760, 760, 380, 0.7);
  ctx.bgScene.add(bg);

  // ---------- 3D: the marquee sign ----------
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(-300, 500, 900);
  const rim = new THREE.DirectionalLight(0xff5040, 1.2); rim.position.set(400, 300, -600);
  scene.add(key, rim, new THREE.AmbientLight(0x6a2020, 0.6));
  const pivot = new THREE.Group();               // hangs from the truss
  pivot.position.set(SIGN.x - W / 2, H / 2 - 64, 0);
  scene.add(pivot);
  const sign = new THREE.Group();
  sign.position.set(0, -(SIGN.y - 64), 0);
  pivot.add(sign);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xeadcc0, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.9 });
  const panel = new THREE.Mesh(new RoundedBoxGeometry(SIGN.w, SIGN.h, 40, 5, 22), panelMat);
  sign.add(panel);
  const face = new THREE.Mesh(new RoundedBoxGeometry(SIGN.w - 70, SIGN.h - 70, 8, 3, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a0508, roughness: 0.55, metalness: 0.1 }));
  face.position.z = 18; sign.add(face);
  // chrome blackletter letters
  const tg = new TextGeometry('Encore', { font: A.fraktur, size: 128, depth: 22, curveSegments: 8, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.4, bevelSegments: 3 });
  tg.computeBoundingBox();
  const bb = tg.boundingBox;
  tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2 - 4, 0);
  const chrome = new THREE.MeshStandardMaterial({ color: 0xfff6ee, metalness: 1, roughness: 0.13, envMapIntensity: 1.7 });
  const letters = new THREE.Mesh(tg, chrome);
  letters.position.z = 24;
  sign.add(letters);
  // bulbs around the border
  const bulbPath = [];
  {
    const iw = SIGN.w - 36, ih = SIGN.h - 36, r = 14;
    const per = 2 * (iw + ih);
    const NB = 54;
    for (let k = 0; k < NB; k++) {
      let s = (k / NB) * per, x, y;
      if (s < iw) { x = -iw / 2 + s; y = ih / 2; }
      else if ((s -= iw) < ih) { x = iw / 2; y = ih / 2 - s; }
      else if ((s -= ih) < iw) { x = iw / 2 - s; y = -ih / 2; }
      else { s -= iw; x = -iw / 2; y = -ih / 2 + s; }
      bulbPath.push([x, y]);
    }
  }
  const NB = bulbPath.length;
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(8.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NB);
  const sockets = new THREE.InstancedMesh(new THREE.CylinderGeometry(10, 10, 8, 14), new THREE.MeshStandardMaterial({ color: 0xbdb5ad, metalness: 1, roughness: 0.25 }), NB);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  bulbPath.forEach(([x, y], k) => {
    m4.compose(new THREE.Vector3(x, y, 30), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); bulbs.setMatrixAt(k, m4);
    m4.compose(new THREE.Vector3(x, y, 22), q4, new THREE.Vector3(1, 1, 1)); sockets.setMatrixAt(k, m4);
    bulbs.setColorAt(k, new THREE.Color(1, 1, 1));
  });
  sign.add(sockets, bulbs);
  // the two hanging chains
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c8, metalness: 1, roughness: 0.3 });
  for (const sx of [-SIGN.w / 2 + 60, SIGN.w / 2 - 60]) {
    const len = SIGN.y - 64 - SIGN.h / 2;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, len, 6), chainMat);
    c.position.set(sx, -len / 2, 0); pivot.add(c);
  }

  // ---------- the frontman: jacket on the mic stand ----------
  const J = staged(ctx, ctx.seamScene, I, A.jacket_mic, 760, 1196, 724, { segs: 60, order: 12, reflect: 0.2, shadowW: 0.45 });
  const jm = J.main.u;
  jm.uWindMask.value.set(0.1, 0.6, 0.06, 0.32);
  jm.uWindDir.value.set(-1, 0.1);
  jm.uRimDir.value.set(-0.35, 0.9);
  jm.uRim.value = dcol(0xffe2c0);
  jm.uGrad.value.set(1.04, 0.9);
  jm.uContrast.value = 1.06;
  J.refl.u.uWindMask.value.copy(jm.uWindMask.value);

  // ---------- pyro: gerbs either side of the stage ----------
  const g1 = gerb(I, 525, 1168, HIT, HIT + 2.6, { angle: 0.05, spread: 0.16, count: 520 });
  const g2 = gerb(I, 978, 1168, HIT, HIT + 2.6, { angle: -0.05, spread: 0.16, count: 520 });
  ctx.seamScene.add(g1, g2);

  // ---------- lights ----------
  ctx.rig.setCue(I, (t, k) => {
    const d = dip(t), a = after(t);
    const base = { a: [-0.3, 0.08, 0.36][k] + 0.22 * Math.sin(TAU * t / 8 + k * 2.1), I: 0.52, w: 0.07 };
    const spotA = -0.14;                                              // fixture 3 → the jacket
    const beat = Math.sin(TAU * t / 2 + k * Math.PI);                 // swing on the half bar
    const fan = { a: [-0.62, 0.0, 0.6][k] + 0.18 * beat, I: 1.0, w: 0.06 };
    let aa = mix(base.a, k === 2 ? spotA : base.a, d);
    aa = mix(aa, fan.a, a);
    let I0 = mix(base.I, k === 2 ? 0.7 : 0.03, d);
    I0 = mix(I0, fan.I * (0.75 + 0.25 * kickEnv(t, 0.2)), a);
    const hot = pulse(t, HIT, 0.3);
    const col = [1.0, mix(0.84, 0.95, a), mix(0.62, 0.86, a)];
    return { a: aa, w: mix(base.w, fan.w, a), I: I0 + hot * 0.6, col, pool: 0.45 };
  });

  // ---------- DOM ----------
  const dom = ctx.dom[I];
  const lines = [...dom.querySelectorAll('.s1-hook span')];
  const band = dom.querySelector('.s1-hook .r');
  const swipe = dom.querySelector('.s1-swipe');
  const meter = vu(dom.querySelector('.vu'), '01');
  const tape = dom.querySelector('.s1-tape');

  const off = new THREE.Color(0.22, 0.13, 0.08), on = new THREE.Color(1.0, 0.84, 0.55), tmp = new THREE.Color();
  return {
    bg,
    update(t) {
      const d = dip(t), a = after(t), hot = pulse(t, HIT, 0.25);
      bg.u.uTime.value = t;
      const wl = mix(1.0, 0.36, d) + 0.35 * hot + 0.06 * a * kickEnv(t, 0.15);
      bg.u.uWash.value.set(1.0 * wl, 0.86 * wl, 0.8 * wl);
      bg.u.uSpot.value.w = mix(0.75, 1.05, d) + 0.4 * hot;
      bg.u.uFoot.value = mix(1, 0.35, d) + 0.5 * hot;
      bg.u.uSway.value = 0.05 + 0.12 * a;
      ctx.rig.fogU.uAmt.value[I] = 0.55 + 0.3 * a;

      // sign: sway + a jolt on the hit
      pivot.rotation.z = 0.01 * Math.sin(TAU * t / 8) + 0.035 * wobble(t, HIT, 1.1, 1.6);
      pivot.rotation.y = 0.05 * Math.sin(TAU * t / 8 + 1) + 0.04 * wobble(t, HIT + 0.05, 0.8, 1.2);
      pivot.rotation.x = 0.04 * wobble(t, HIT, 1.3, 2.2);
      // bulbs: chase on 16ths, all-on on the kicks; count-in during the dip; full blast on the hit
      let lit = 0;
      const step = Math.floor(t * 8);
      for (let k = 0; k < NB; k++) {
        let v;
        if (t >= 3.2 && t < HIT) v = k < NB * smooth(seg(t, 3.2, 3.95)) ? 1 : 0.06;
        else if (since(t, HIT) < 0.55) v = 1;
        else {
          const chase = ((k + step) % 4) < 2 ? 1 : 0.25;
          v = Math.max(chase, kickEnv(t, 0.09) > 0.5 ? 1 : 0);
        }
        lit += v;
        tmp.copy(off).lerp(on, v);
        if (v > 0.9) tmp.multiplyScalar(1 + 0.25 * hot);
        bulbs.setColorAt(k, tmp);
      }
      bulbs.instanceColor.needsUpdate = true;
      bg.u.uSignGlow.value = 0.4 + 0.9 * lit / NB + 0.6 * hot;
      chrome.envMapIntensity = 1.5 + 0.8 * hot;

      // jacket
      for (const m of [J.main, J.refl]) {
        m.u.uTime.value = t;
        m.u.uWind.value = 3 + 34 * a * (0.7 + 0.3 * Math.sin(TAU * t * 1.5)) + 18 * hot;
        m.u.uFlutter.value = 0.08 + 0.25 * a;
        m.u.uRipple.value = 0.15;
      }
      jm.uRimAmt.value = 0.35 + 0.5 * a + 0.8 * hot;
      jm.uBright.value = mix(1.0, 0.82, d) + 0.12 * hot;
      J.shadow.u.uOpacity.value = 0.6;

      g1.u.uTime.value = g2.u.uTime.value = t;
      hit(ctx, I, t, HIT, { zoom: 0.05, shake: 9, ca: 6, flash: 0.32 });

      // type
      lines.forEach((el, k) => {
        const e = pulse(t, HIT + k * 0.05, 0.12);
        const y = -18 * e;
        el.style.transform = `translateY(${y.toFixed(1)}px) scale(${(1 + 0.05 * e).toFixed(3)})`;
      });
      const sn = snareEnv(t, 0.18);
      band.style.textShadow = `7px 7px 0 #2a0306, 0 0 ${(18 + 40 * sn).toFixed(0)}px rgba(255,60,40,${(0.25 + 0.5 * sn + 0.5 * hot).toFixed(2)})`;
      swipe.style.transform = `rotate(-4deg) translateX(${(10 * kickEnv(t, 0.2)).toFixed(1)}px)`;
      tape.style.opacity = 1;
      meter(needle(t, mix(0.32, 0.12, d) + 0.25 * a, 0.18, 0.12), a);
    },
  };
}
