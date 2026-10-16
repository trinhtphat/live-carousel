// SLIDE 1 — HOOK. Darkness, glitch flicker, a cyan scan laser cuts in, SMILE assembles from pearl-chrome
// letters that float weightless over a scan grid, then drift apart. The laser continues into slide 2.
import { THREE, W, H, TAU, D_CAM, clamp, mix, seg, smooth, eOutCubic, eInOut, pulse, wobble, beatEnv, hash, flick } from './core.js';
import { bgQuad, BEAM, hexv4 } from './gl.js';

// Shared with slide 2 (same beam, same light on the hoodie)
export function beamState(t) {
  let b = 0;
  if (t >= 0.95 && t < 7.05) {
    b = 1;
    b *= 1 - flick(t, [[0.97, 0.03], [6.56, 0.05], [6.72, 0.08], [6.86, 0.03]]);
    if (t > 6.92) b *= 1 - seg(t, 6.92, 7.05);
    b *= 1 + 0.22 * beatEnv(t, 0.14) * (t > 1.4 && t < 6.4 ? 1 : 0) + 0.9 * pulse(t, 1.0, 0.09);
  }
  b += 0.35 * flick(t, [[0.70, 0.04], [7.72, 0.04]]);
  const cut = t < 1.0 ? 0 : eOutCubic(seg(t, 1.0, 1.24));
  return { beam: b, cut: t >= 0.95 && t < 1.0 ? 0.03 : (t >= 1.0 ? cut : 1) };
}

const LETTER_VS = /* glsl */`
varying vec2 vUv; varying vec3 vViewPos; varying vec3 vT; varying vec3 vB; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vT = normalize(normalMatrix * vec3(1.,0.,0.));
  vB = normalize(normalMatrix * vec3(0.,1.,0.));
  vN = normalize(normalMatrix * vec3(0.,0.,1.));
  gl_Position = projectionMatrix * mv;
}`;
const LETTER_FS = /* glsl */`
uniform sampler2D map; uniform vec2 uTexel; uniform float uOpacity, uGlitch, uTime, uSeed, uFlash, uBeamLit;
varying vec2 vUv; varying vec3 vViewPos; varying vec3 vT; varying vec3 vB; varying vec3 vN;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 env(vec3 r){
  float y = r.y;
  // classic chrome: bright sky, a hard dark horizon, dark violet ground
  vec3 irid = 0.5 + 0.5 * cos(6.2831 * (r.x * 0.9 + y * 1.3 + vec3(0.0, 0.33, 0.67)));
  vec3 sky = mix(vec3(0.52, 0.58, 0.62), vec3(1.06, 1.08, 1.1), smoothstep(0.05, 0.75, y));
  sky = mix(sky, sky * (0.8 + 0.35 * irid), 0.35);
  vec3 ground = mix(vec3(0.03, 0.12, 0.17), vec3(0.003, 0.01, 0.016), smoothstep(-0.05, -0.7, y));
  vec3 c = mix(ground, sky, smoothstep(-0.03, 0.03, y));
  c *= 1.0 - 0.9 * exp(-pow((y - 0.02) * 16.0, 2.0));
  c += vec3(1.0) * smoothstep(0.9, 0.99, y) * 1.2;
  c += vec3(0.15, 0.70, 1.0) * exp(-pow((y + 0.18) * 6.0, 2.0)) * 0.55;
  vec3 bd = normalize(vec3(-0.85, 0.42, 0.35));
  c += vec3(0.55,0.92,1.0) * pow(max(dot(r, bd), 0.0), 18.0) * 3.2 * uBeamLit;
  c += vec3(0.15,0.65,1.0) * pow(max(dot(r, bd), 0.0), 3.0) * 0.28 * uBeamLit;
  return c;
}
vec3 shade(vec2 uv, out float a){
  vec4 tx = texture2D(map, uv);
  a = tx.r;
  vec2 e = uTexel * 2.5;
  float hL = texture2D(map, uv - vec2(e.x, 0.)).g, hR = texture2D(map, uv + vec2(e.x, 0.)).g;
  float hD = texture2D(map, uv - vec2(0., e.y)).g, hU = texture2D(map, uv + vec2(0., e.y)).g;
  vec3 nt = normalize(vec3((hL - hR) * 7.5, (hD - hU) * 7.5, 1.0));
  vec3 N = normalize(vT * nt.x + vB * nt.y + vN * nt.z);
  vec3 V = normalize(-vViewPos);
  vec3 c = env(reflect(-V, N)) * vec3(0.95, 0.98, 1.0);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  c += fr * vec3(0.35, 0.85, 1.0) * 0.5;
  c *= 0.85 + 0.3 * tx.g;
  return c;
}
void main(){
  vec2 uv = vUv;
  float gt = floor(uTime * 24.0);
  float sl = floor(uv.y * 11.0 + uSeed * 7.0);
  float on = step(0.5, h21(vec2(sl * 1.7, gt + 3.0 + uSeed)));
  uv.x += (h21(vec2(sl, gt)) - 0.5) * 0.32 * uGlitch * on;
  float sp = 0.016 * uGlitch;
  float aR, aG, aB;
  vec3 cR = shade(uv + vec2(sp, 0.), aR);
  vec3 cG = shade(uv, aG);
  vec3 cB = shade(uv - vec2(sp, 0.), aB);
  float a = max(max(aR, aG), aB);
  vec3 col = vec3(cR.r * aR, cG.g * aG, cB.b * aB) / max(a, 1e-3);
  col = mix(col, vec3(0.6, 0.95, 1.0) * 1.6, uFlash);
  float o = a * uOpacity;
  gl_FragColor = vec4(col * o, o);
}`;

function letterTexture(ch, F) {
  const pad = 46;
  const m0 = document.createElement('canvas').getContext('2d');
  m0.font = `${F}px Anton`;
  const m = m0.measureText(ch);
  const cw = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
  const chh = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
  const sharp = document.createElement('canvas'); sharp.width = cw; sharp.height = chh;
  const sc = sharp.getContext('2d'); sc.font = `${F}px Anton`; sc.fillStyle = '#fff';
  sc.fillText(ch, pad + m.actualBoundingBoxLeft, pad + m.actualBoundingBoxAscent);
  const blur = document.createElement('canvas'); blur.width = cw; blur.height = chh;
  const bc = blur.getContext('2d'); bc.filter = 'blur(13px)'; bc.drawImage(sharp, 0, 0);
  const out = document.createElement('canvas'); out.width = cw; out.height = chh;
  const oc = out.getContext('2d');
  const A = sc.getImageData(0, 0, cw, chh).data, B = bc.getImageData(0, 0, cw, chh).data;
  const img = oc.createImageData(cw, chh);
  for (let k = 0; k < A.length; k += 4) {
    const hb = B[k + 3] / 255;
    img.data[k] = A[k + 3];
    img.data[k + 1] = Math.round(255 * Math.min(1, hb * 1.35) ** 0.8);
    img.data[k + 2] = 0; img.data[k + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
  return { tex, cw, chh, adv: m.width, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, pad };
}

export function init(ctx) {
  const i = 0;
  // ---------- background: void, scan grid, the laser ----------
  const bg = bgQuad(i, BEAM + /* glsl */`
    uniform float uGlitch; uniform float uFlash; uniform float uWell;`, /* glsl */`
    float t = uTime;
    float lit = 0.62 + 0.38 * min(uBeam, 1.);
    col = mix(vec3(0.08, 0.27, 0.44), vec3(0.03, 0.12, 0.22), smoothstep(0., 1350., p.y)) * lit;
    col += vec3(0.03, 0.12, 0.18) * fbm(p * 0.0035 + loopv(t) * 0.5) * (0.5 + uBeam);
    // scan-grid floor with a soft dent under the word
    float yh = 655.;
    if (p.y > yh) {
      float dy = p.y - yh;
      float dent = (90. + 40. * uWell) * exp(-pow((p.x - 540.) / 300., 2.) - pow((p.y - 760.) / 110., 2.));
      float dy2 = max(dy - dent, 2.0);
      float Z = 52000. / dy2;
      float X = (p.x - 540.) * Z / 900.;
      vec2 g = vec2(X / 160., Z / 160. - 2.0 * t / 8.0);
      vec2 fw = fwidth(g) * 1.3;
      vec2 gln = smoothstep(vec2(0.), fw, abs(fract(g) - 0.5) - (0.5 - fw));
      float lines = max(gln.x, gln.y);
      float fade = smoothstep(0., 150., dy) * (0.55 + 0.45 * smoothstep(1350., 900., p.y));
      add += vec3(0.10, 0.62, 1.0) * lines * fade * (0.10 + 0.22 * uBeam) ;
      add += vec3(0.05, 0.45, 0.80) * exp(-pow((p.y - yh) / 3., 2.)) * 0.18 * uBeam;
    }
    add += beam(sp, t);
    float band = step(0.94, hash12(vec2(floor(p.y / 5.), floor(t * 30.))));
    add += vec3(0.35, 0.85, 1.0) * band * uGlitch * 0.28;
    add += vec3(0.04, 0.35, 0.65) * smoothstep(760., 1080., p.x) * smoothstep(1300., 500., p.y) * 0.10 * uBeam;
    col *= mix(0.85, 1.0, smoothstep(0., 280., p.y));
    add += uFlash * vec3(0.45, 0.85, 1.0);
  `, { uBeam: { value: 0 }, uBeamCut: { value: 0 }, uGlitch: { value: 0 }, uFlash: { value: 0 }, uWell: { value: 0 } });
  bg.u.uSeamR.value = hexv4('#0f3552', 1);
  ctx.bgScene.add(bg);

  // ---------- pearl-chrome letters (perspective scene) ----------
  const scene = new THREE.Scene();
  ctx.setMain(i, scene);
  const F = 420;
  const word = 'SMILE';
  const tr = -6;                                   // tracking at F
  const glyphs = [...word].map(ch => letterTexture(ch, F));
  const totalAdv = glyphs.reduce((s, g) => s + g.adv, 0) + tr * (glyphs.length - 1);
  const k = 740 / totalAdv;
  const baseY = 675 - 500;                         // local y-up of the baseline (screen y 500)
  let pen = -totalAdv * k / 2;
  const letters = glyphs.map((g, j) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: g.tex }, uTexel: { value: new THREE.Vector2(1 / g.cw, 1 / g.chh) },
        uOpacity: { value: 1 }, uGlitch: { value: 0 }, uTime: { value: 0 }, uSeed: { value: hash(j + 1) },
        uFlash: { value: 0 }, uBeamLit: { value: 1 },
      },
      vertexShader: LETTER_VS, fragmentShader: LETTER_FS, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(g.cw * k, g.chh * k), mat);
    const cx = pen + (g.right - g.left) / 2 * k;
    const cy = baseY + (g.asc - g.desc) / 2 * k;
    pen += (g.adv + tr) * k;
    scene.add(mesh);
    const r = n => hash(j * 13.7 + n);
    return {
      mesh, mat, home: new THREE.Vector3(cx, cy, 0),
      from: new THREE.Vector3(cx * 1.9 + (r(1) - 0.5) * 900, cy + (r(2) - 0.5) * 1300, -1900 - r(3) * 1400),
      fromRot: new THREE.Vector3((r(4) - 0.5) * 4, (r(5) - 0.5) * 5, (r(6) - 0.5) * 3),
      away: new THREE.Vector3(cx * 1.35 + (r(7) - 0.5) * 260, cy + (r(8) - 0.5) * 380 + 40, -500 - r(9) * 700),
      awayRot: new THREE.Vector3((r(10) - 0.5) * 1.6, (r(11) - 0.5) * 2.4, (r(12) - 0.5) * 1.2),
      start: 1.16 + j * 0.24,
    };
  });
  ctx.slide1Letters = letters;

  // ---------- DOM ----------
  const el = ctx.dom[i];
  const kicker = el.querySelector('.s1-kicker');
  const sub = el.querySelector('.s1-sub');
  const read = el.querySelector('.s1-read b');
  const dot = el.querySelector('.s1-read i');
  const swipe = el.querySelector('.s1-swipe');
  const tmpV = new THREE.Vector3();

  return {
    update(t) {
      const bs = beamState(t);
      bg.u.uBeam.value = bs.beam;
      bg.u.uBeamCut.value = bs.cut;
      // Rebuild the opening signal before the loop boundary so the last frame
      // approaches frame zero instead of jumping from an empty stage.
      const seamReturn = smooth(seg(t, 7.4, 7.95));
      const glitchPhase = t < 0.55 ? 0.7 + 0.3 * hash(Math.floor(t * 24)) : seamReturn * (0.7 + 0.3 * hash(0));
      bg.u.uGlitch.value = glitchPhase + flick(t, [[0.70, 0.04], [0.86, 0.035], [7.72, 0.04], [7.9, 0.035]]);
      bg.u.uFlash.value = pulse(t, 1.0, 0.06) * 0.75 + flick(t, [[0.70, 0.03]]) * 0.15;
      const lift = smooth(seg(t, 4.0, 4.6)) * (1 - smooth(seg(t, 5.6, 6.2)));
      bg.u.uWell.value = lift + 0.4 * beatEnv(t, 0.2) * (t > 3 && t < 6.4 ? 1 : 0);

      letters.forEach((L, j) => {
        const m = L.mesh, u = L.mat.uniforms;
        u.uTime.value = mix(t, 0, seamReturn);
        u.uBeamLit.value = Math.min(1.4, bs.beam);
        // weightless float, all periodic in the loop
        const fx = Math.sin(TAU * t / 8 + j * 1.9) * 6;
        const fy = Math.sin(TAU * t / 4 + j * 0.9) * 11;
        const fz = Math.sin(TAU * t / 8 + j * 1.3) * 45;
        const rz = Math.sin(TAU * t / 8 + j * 1.3) * 0.04;
        const ry = Math.sin(TAU * t / 8 + j * 0.7) * 0.2;
        const rx = Math.sin(TAU * t / 4 + j * 2.1) * 0.07;
        let p = tmpV.set(L.home.x + fx + (L.home.x) * 0.07 * lift, L.home.y + fy + lift * (34 + (j % 2) * 26), fz);
        let rot = [rx, ry, rz];
        let op = 1, gl = 0, flash = 0;
        if (t < 0.55) {                                  // glitch flicker: the word as a broken signal
          op = flick(t, [[0, 0.2], [0.24, 0.1], [0.38, 0.06], [0.47, 0.04]]);
          gl = 0.65 + 0.35 * hash(Math.floor(t * 24) + j);
          p.set(L.home.x + (hash(Math.floor(t * 24) * 3 + j) - 0.5) * 14, L.home.y, 0); rot = [0, 0, 0];
        } else if (t < L.start) {                        // darkness, two single-frame glimpses
          op = flick(t, [[0.70, 0.04], [0.86, 0.035]]) * 0.65; gl = 1;
          p.set(L.home.x, L.home.y, 0); rot = [0, 0, 0];
        } else if (t < L.start + 0.78) {                 // fly in from deep space, one letter at a time
          const a = eOutCubic(seg(t, L.start, L.start + 0.78));
          p.lerpVectors(L.from, p, a);
          rot = rot.map((r, q) => mix([L.fromRot.x, L.fromRot.y, L.fromRot.z][q], r, a));
          op = seg(t, L.start, L.start + 0.12);
          gl = 0.35 * (1 - a);
        } else {
          const w = wobble(t, L.start + 0.78, 2.2, 6);
          p.y += w * 14; rot[2] += w * 0.05;
          gl = 0.6 * pulse(t, L.start + 0.78, 0.05);
          flash = 0.35 * pulse(t, L.start + 0.78, 0.06);
          if (t > 6.2) {                                 // drift apart into the void
            const a = eInOut(seg(t, 6.2, 7.45));
            p.lerp(L.away, a);
            rot = rot.map((r, q) => r + [L.awayRot.x, L.awayRot.y, L.awayRot.z][q] * a);
            op = 1 - seg(t, 6.8, 7.4);
            gl = 0.5 * flick(t, [[6.56, 0.05], [6.72, 0.08]]);
          }
        }
        if (t >= 7.4) {
          op = seamReturn;
          gl = 0.65 + 0.35 * hash(j);
          p.set(L.home.x + (hash(j) - 0.5) * 14, L.home.y, 0);
          rot = [0, 0, 0];
        }
        m.position.copy(p);
        m.rotation.set(rot[0], rot[1], rot[2]);
        u.uOpacity.value = op;
        u.uGlitch.value = gl;
        u.uFlash.value = flash;
        m.visible = op > 0.001;
      });

      // DOM
      const assembled = smooth(seg(t, 2.85, 3.3)) * (1 - smooth(seg(t, 6.35, 6.85)));
      const glitchOn = t < 0.55 ? flick(t, [[0, 0.2], [0.24, 0.1], [0.38, 0.06]]) : 0;
      const vis = Math.max(assembled, glitchOn, seamReturn);
      const jit = t < 0.55 ? (glitchOn ? (hash(Math.floor(t * 24)) - 0.5) * 18 : 0) : seamReturn * (hash(0) - 0.5) * 18;
      kicker.style.opacity = vis;
      kicker.style.transform = `translate(calc(-50% + ${jit}px), ${(1 - Math.max(assembled, seamReturn)) * (glitchOn ? 0 : 14)}px)`;
      sub.style.opacity = vis;
      sub.style.transform = `translate(calc(-50% + ${-jit}px), ${(1 - Math.max(assembled, seamReturn)) * (glitchOn ? 0 : 24)}px)`;
      sub.style.letterSpacing = `${0.06 + 0.05 * (1 - assembled)}em`;
      const lit = bs.beam > 0.2;
      read.textContent = lit ? 'SCANNER: LIVE' : 'SCANNER: STANDBY';
      dot.style.opacity = 0.3 + 0.7 * beatEnv(t, 0.15);
      dot.style.background = lit ? '#7dffcb' : '#ff4d6d';
      swipe.querySelector('span').style.transform = `translateX(${10 * beatEnv(t, 0.12)}px)`;
    },
  };
}
