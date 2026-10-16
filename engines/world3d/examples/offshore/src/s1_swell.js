// SLIDE 1 — SWELL. Pre-dawn sea, the word shimmering under the surface. The sun cracks the horizon
// on 1.0 and throws a flare along it (into slide 2); SWELL bursts out of the water one chrome letter
// at a time, floats on the swell, then sinks back as the sun drops and the sea goes dark.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, eInCubic, eOutBack, eInOut, pulse, wobble, beatEnv, hash, flick } from './core.js';
import { bgQuad, FLARE, SUN_POS, hexv4 } from './gl.js';

export const HY = 700;                 // horizon, slide px (y down)
const WATER_Y = H / 2 - HY;            // horizon in the perspective scene (y up, z = 0 plane)
const RISE0 = 1.12, RISE_STEP = 0.2, RISE_DUR = 0.72;
const SINK0 = 6.2, SINK_STEP = 0.09, SINK_DUR = 0.62;

// Sun + flare state, shared with slide 2 (the same streak lights the board there).
export function flareState(t) {
  let f = 0;
  if (t >= 0.97 && t < 7.05) {
    f = 1;
    if (t > 6.55) f *= 1 - smooth(seg(t, 6.55, 7.05));
    f *= 1 + 0.2 * beatEnv(t, 0.14) * (t > 1.4 && t < 6.4 ? 1 : 0) + 0.9 * pulse(t, 1.0, 0.09);
  }
  const cut = t < 0.97 ? 0 : eOutCubic(seg(t, 0.97, 1.3));
  const sunUp = t < 1.0 ? 0 : t < 6.55 ? eOutCubic(seg(t, 1.0, 1.7)) : 1 - eInOut(seg(t, 6.55, 7.05));
  const sunY = HY + 64 - 76 * sunUp - 26 * smooth(seg(t, 1.7, 6.55)) * (t < 6.55 ? 1 : 1 - eInOut(seg(t, 6.55, 7.05)));
  return { flare: f, cut, sun: sunUp, sunY };
}

const LETTER_VS = /* glsl */`
varying vec2 vUv; varying vec3 vViewPos; varying vec3 vT; varying vec3 vB; varying vec3 vN; varying float vWY;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWY = wp.y;
  vec4 mv = viewMatrix * wp;
  vViewPos = mv.xyz;
  vT = normalize(normalMatrix * vec3(1.,0.,0.));
  vB = normalize(normalMatrix * vec3(0.,1.,0.));
  vN = normalize(normalMatrix * vec3(0.,0.,1.));
  gl_Position = projectionMatrix * mv;
}`;
const LETTER_FS = /* glsl */`
uniform sampler2D map; uniform vec2 uTexel; uniform float uOpacity, uGlitch, uTime, uSeed, uFlash, uSunLit, uMirror, uWaterY, uFlipY, uNight;
varying vec2 vUv; varying vec3 vViewPos; varying vec3 vT; varying vec3 vB; varying vec3 vN; varying float vWY;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 env(vec3 r){
  float y = r.y;
  // dawn chrome: warm low sky, blue high sky, a dark horizon, deep teal sea below
  vec3 sky = mix(vec3(1.0, 0.62, 0.40), vec3(0.62, 0.80, 1.05), smoothstep(0.03, 0.55, y));
  sky = mix(sky, vec3(1.12, 1.1, 1.08), smoothstep(0.82, 0.99, y));
  vec3 ground = mix(vec3(0.03, 0.17, 0.21), vec3(0.003, 0.02, 0.035), smoothstep(-0.05, -0.7, y));
  vec3 c = mix(ground, sky, smoothstep(-0.03, 0.03, y));
  c *= 1.0 - 0.88 * exp(-pow((y - 0.02) * 16.0, 2.0));
  c += vec3(1.0, 0.55, 0.25) * exp(-pow((y - 0.05) * 9.0, 2.0)) * 0.8 * uSunLit;
  c += vec3(0.10, 0.75, 0.80) * exp(-pow((y + 0.2) * 6.0, 2.0)) * 0.4;
  vec3 sd = normalize(vec3(0.42, 0.04, 0.55));
  c += vec3(1.0, 0.78, 0.5) * pow(max(dot(r, sd), 0.0), 18.0) * 3.0 * uSunLit;
  c += vec3(1.0, 0.5, 0.25) * pow(max(dot(r, sd), 0.0), 3.0) * 0.3 * uSunLit;
  return c * mix(0.42, 1.0, uSunLit);
}
vec3 shade(vec2 uv, out float a){
  vec4 tx = texture2D(map, uv);
  a = tx.r;
  vec2 e = uTexel * 2.5;
  float hL = texture2D(map, uv - vec2(e.x, 0.)).g, hR = texture2D(map, uv + vec2(e.x, 0.)).g;
  float hD = texture2D(map, uv - vec2(0., e.y)).g, hU = texture2D(map, uv + vec2(0., e.y)).g;
  vec3 nt = normalize(vec3((hL - hR) * 7.5, (hD - hU) * 7.5 * uFlipY, 1.0));
  vec3 N = normalize(vT * nt.x + vB * nt.y + vN * nt.z);
  vec3 V = normalize(-vViewPos);
  vec3 c = env(reflect(-V, N)) * vec3(0.95, 0.97, 1.0);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  c += fr * vec3(0.35, 0.85, 0.95) * 0.5;
  c *= 0.85 + 0.3 * tx.g;
  return c;
}
void main(){
  float below = uWaterY - vWY;
  if (uMirror < 0.5 && below > 0.0) discard;
  if (uMirror > 0.5 && below < 0.0) discard;
  vec2 uv = vUv;
  // liquid shimmer: rows slide on a sine, like looking at the word through moving water
  float ph = uTime * 6.28318530718 / 8.0;
  uv.x += sin(uv.y * 34.0 + ph * 16.0 + uSeed * 9.0) * 0.045 * uGlitch;
  float gt = floor(uTime * 24.0);
  float sl = floor(uv.y * 9.0 + uSeed * 7.0);
  uv.x += (h21(vec2(sl, gt)) - 0.5) * 0.12 * uGlitch * step(0.6, h21(vec2(sl * 1.7, gt + 3.0 + uSeed)));
  if (uMirror > 0.5) uv.x += sin(below * 0.09 + ph * 8.0) * 0.012 + sin(below * 0.031 - ph * 4.0) * 0.008;
  float sp = 0.014 * uGlitch;
  float aR, aG, aB;
  vec3 cR = shade(uv + vec2(sp, 0.), aR);
  vec3 cG = shade(uv, aG);
  vec3 cB = shade(uv - vec2(sp, 0.), aB);
  float a = max(max(aR, aG), aB);
  vec3 col = vec3(cR.r * aR, cG.g * aG, cB.b * aB) / max(a, 1e-3);
  // before sunrise the word reads as cold, moonlit aqua chrome
  col = mix(col, col.ggg * vec3(0.55, 1.05, 1.12) + vec3(0.02, 0.10, 0.13), uNight);
  col = mix(col, vec3(1.0, 0.85, 0.62) * 1.6, uFlash);
  float o = a * uOpacity;
  if (uMirror < 0.5) {
    // wet waterline where the letter breaks the surface
    col += vec3(0.75, 0.95, 1.0) * exp(-(vWY - uWaterY) / 7.0) * 0.55;
    o *= smoothstep(0.0, 2.5, vWY - uWaterY);
  } else {
    col = mix(col * vec3(0.55, 0.85, 0.9), vec3(0.02, 0.14, 0.18), 0.35);
    o *= 0.42 * exp(-below / 260.0) * smoothstep(0.0, 4.0, below);
  }
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
  const word = 'SWELL';
  const N = word.length;
  // ---------- background: night-to-dawn sky, perspective sea, sun glitter, the flare ----------
  const bg = bgQuad(i, FLARE + /* glsl */`
    uniform float uSun; uniform float uSunVis; uniform float uFlash; uniform float uBeat;
    uniform float uRipX[${N}]; uniform float uRipA[${N}];`, /* glsl */`
    float t = uTime;
    float HY = ${HY}.;
    vec2 sunC = vec2(${SUN_POS.x}., uSunY);
    float ds = length(p - sunC);
    if (p.y < HY) {
      float sy = clamp(p.y / HY, 0., 1.);
      vec3 night = mix(vec3(0.030, 0.075, 0.180), vec3(0.120, 0.250, 0.420), pow(sy, 1.4));
      vec3 dawn = mix(vec3(0.10, 0.34, 0.66), vec3(0.98, 0.60, 0.36), pow(sy, 2.6));
      dawn = mix(dawn, vec3(1.0, 0.76, 0.48), pow(sy, 10.) * 0.75);
      col = mix(night, dawn, uSun);
      col += vec3(0.7, 0.8, 1.0) * step(0.9975, hash12(floor(p / 2.))) * (0.4 + 0.6 * sin(TAU * t / 4. + hash12(floor(p / 2.) + 3.) * 20.)) * (1. - uSun) * smoothstep(HY, 120., p.y) * 0.7;
      col += vec3(0.04, 0.06, 0.12) * fbm(p * 0.003 + loopv(t) * 0.25) * (1. - uSun) * sy;
      col += vec3(1.0, 0.52, 0.22) * exp(-ds / 260.) * 0.55 * uSun;
      col += vec3(1.0, 0.80, 0.55) * exp(-ds / 70.) * 0.55 * uSun;
      col = mix(col, vec3(1.0, 0.93, 0.80) * 1.35, smoothstep(61., 57., ds) * uSunVis);
    } else {
      float dy = p.y - HY;
      float Z = 52000. / max(dy, 1.5);
      float X = (p.x - 540.) * Z / 900.;
      vec2 w = vec2(X * 0.010, Z * 0.024);
      float sw = sin(Z * 0.010 + TAU * t / 8. * 4.);
      float n = fbm(w + loopv(t) * 0.6);
      float n2 = fbm(w * 2.3 + vec2(3.1, 1.7) - loopv(t + 2.) * 0.5);
      float h = n * 0.6 + n2 * 0.4 + 0.18 * sw;
      float fres = 1. - smoothstep(0., 520., dy);
      vec3 deep = mix(vec3(0.012, 0.060, 0.120), vec3(0.020, 0.230, 0.300), uSun);
      vec3 refl = mix(vec3(0.10, 0.20, 0.36), vec3(0.98, 0.66, 0.44), uSun);
      vec3 water = mix(deep, refl, fres * (0.35 + 0.65 * h));
      water += vec3(0.03, 0.20, 0.22) * h * (0.45 + uSun) * (1. - fres * 0.5);
      // sun glitter path
      float px = abs(p.x - sunC.x);
      float pathW = 26. + dy * 0.5;
      float glit = pow(clamp(n2 * 1.3 + 0.2 * sw, 0., 1.), 6.);
      float spark = step(0.86, hash12(floor(vec2(X * 0.05, Z * 0.04)) + floor(t * 12.) * 0.37));
      water += vec3(1.0, 0.72, 0.45) * exp(-px / pathW) * (glit * 2.4 + spark * 0.7 * exp(-px / (pathW * 0.6))) * uSun * smoothstep(0., 10., dy);
      water += vec3(0.6, 0.75, 1.0) * exp(-px / pathW) * glit * 0.25 * (1. - uSun);
      water += vec3(1.0, 0.55, 0.3) * exp(-dy / 5.) * 0.35 * uSun;
      // rings where the letters break the surface
      for (int k = 0; k < ${N}; k++) {
        float a = uRipA[k];
        if (a >= 0. && a < 2.6) {
          vec2 q = vec2(p.x - uRipX[k], (p.y - HY - 12.) / 0.15);
          float R = 30. + a * 280.;
          float ring = exp(-pow((length(q) - R) / (5. + a * 9.), 2.));
          float ring2 = exp(-pow((length(q) - R * 0.62) / (4. + a * 6.), 2.));
          water += vec3(0.65, 0.92, 1.0) * (ring + 0.5 * ring2) * exp(-a * 1.5) * mix(0.35, 0.8, uSun);
        }
      }
      col = water;
    }
    add += flare(sp, t);
    col *= mix(0.86, 1.0, smoothstep(0., 300., p.y));
    add += uFlash * vec3(1.0, 0.72, 0.45);
  `, {
    uFlare: { value: 0 }, uFlareCut: { value: 0 }, uSunY: { value: HY + 60 }, uSun: { value: 0 }, uSunVis: { value: 0 },
    uFlash: { value: 0 }, uBeat: { value: 0 },
    uRipX: { value: new Array(N).fill(0) }, uRipA: { value: new Array(N).fill(-1) },
  });
  bg.u.uSeamR.value = hexv4('#0f4656', 1);
  ctx.bgScene.add(bg);

  // ---------- chrome letters + their reflections (perspective scene) ----------
  const scene = new THREE.Scene();
  ctx.setMain(i, scene);
  const F = 420;
  const tr = -2;
  const glyphs = [...word].map(ch => letterTexture(ch, F));
  const totalAdv = glyphs.reduce((s, g) => s + g.adv, 0) + tr * (glyphs.length - 1);
  const k = 820 / totalAdv;
  const baseY = H / 2 - 492;                       // local y-up of the baseline (screen y 492)
  let pen = -totalAdv * k / 2;
  const mkMat = (g, j, mirror) => new THREE.ShaderMaterial({
    uniforms: {
      map: { value: g.tex }, uTexel: { value: new THREE.Vector2(1 / g.cw, 1 / g.chh) },
      uOpacity: { value: 1 }, uGlitch: { value: 0 }, uTime: { value: 0 }, uSeed: { value: hash(j + 1) },
      uFlash: { value: 0 }, uSunLit: { value: 1 }, uMirror: { value: mirror ? 1 : 0 }, uWaterY: { value: WATER_Y },
      uFlipY: { value: mirror ? -1 : 1 }, uNight: { value: 0 },
    },
    vertexShader: LETTER_VS, fragmentShader: LETTER_FS, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    side: THREE.DoubleSide,
  });
  const letters = glyphs.map((g, j) => {
    const geo = new THREE.PlaneGeometry(g.cw * k, g.chh * k);
    const mat = mkMat(g, j, false), rmat = mkMat(g, j, true);
    const mesh = new THREE.Mesh(geo, mat), refl = new THREE.Mesh(geo, rmat);
    mesh.renderOrder = 2; refl.renderOrder = 1;
    const cx = pen + (g.right - g.left) / 2 * k;
    const cy = baseY + (g.asc - g.desc) / 2 * k;
    pen += (g.adv + tr) * k;
    scene.add(refl, mesh);
    const r = n => hash(j * 13.7 + n);
    const hgt = g.chh * k;
    return {
      mesh, refl, mat, rmat, home: new THREE.Vector3(cx, cy, 0), hgt,
      deep: new THREE.Vector3(cx + (r(1) - 0.5) * 60, WATER_Y - hgt * 0.62 - 40, 0),
      tilt: (r(2) - 0.5) * 0.5,
      start: RISE0 + j * RISE_STEP,
      sink: SINK0 + j * SINK_STEP,
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
      const fs = flareState(t);
      bg.u.uFlare.value = fs.flare; bg.u.uFlareCut.value = fs.cut; bg.u.uSunY.value = fs.sunY;
      bg.u.uSun.value = Math.min(1, fs.sun * 1.15);
      bg.u.uSunVis.value = fs.sun > 0 ? 1 : 0;
      bg.u.uFlash.value = pulse(t, 1.0, 0.06) * 0.7;
      bg.u.uBeat.value = beatEnv(t, 0.18);

      letters.forEach((L, j) => {
        const u = L.mat.uniforms, ru = L.rmat.uniforms;
        u.uTime.value = ru.uTime.value = t;
        u.uSunLit.value = ru.uSunLit.value = Math.max(0.7 * (1 - fs.sun), Math.min(1.25, fs.sun * (1 + 0.2 * beatEnv(t, 0.15))));
        u.uNight.value = ru.uNight.value = 1 - Math.min(1, fs.sun * 1.4);
        // floating on the swell, all periodic in the loop: a wave runs along the word
        const swell = Math.sin(TAU * t / 4 - j * 0.9);
        const fy = swell * 12;
        const rz = Math.cos(TAU * t / 4 - j * 0.9) * 0.05;
        const ry = Math.sin(TAU * t / 8 + j * 0.7) * 0.16;
        const fz = Math.sin(TAU * t / 8 + j * 1.3) * 30;
        const p = tmpV.set(L.home.x, L.home.y + fy, fz);
        let rot = [Math.sin(TAU * t / 4 + j * 2.1) * 0.05, ry, rz];
        let op = 1, gl = 0, flash = 0;
        const shimmer = t < 0.55 || t >= 7.6;
        if (shimmer) {                                    // the word seen through dark moving water
          op = flick(t, [[0, 0.24], [0.28, 0.12], [0.43, 0.06], [7.6, 0.06], [7.74, 0.1], [7.88, 0.12]]) * 0.92;
          gl = 0.75 + 0.25 * hash(Math.floor(t * 24) + j);
          p.set(L.home.x, L.home.y, 0); rot = [0, 0, 0];
        } else if (t < L.start) {                          // dark; two single-frame glimpses
          op = flick(t, [[0.70, 0.04], [0.86, 0.035]]) * 0.6; gl = 1;
          p.set(L.home.x, L.home.y, 0); rot = [0, 0, 0];
          if (!op) p.copy(L.deep);
        } else if (t < L.start + RISE_DUR) {               // burst up out of the water
          const a = seg(t, L.start, L.start + RISE_DUR);
          const e = eOutBack(a, 1.9);
          p.lerpVectors(L.deep, p, e);
          rot = rot.map((r, q) => q === 2 ? mix(L.tilt, r, eOutCubic(a)) : r * eOutCubic(a));
          gl = 0.25 * (1 - a);
        } else if (t < L.sink) {
          const w = wobble(t, L.start + RISE_DUR * 0.45, 2.0, 5);
          p.y += w * 10; rot[2] += w * 0.04;
          flash = 0.3 * pulse(t, L.start + RISE_DUR * 0.4, 0.07);
        } else if (t < L.sink + SINK_DUR) {                // sink back under
          const a = eInCubic(seg(t, L.sink, L.sink + SINK_DUR));
          p.lerp(L.deep, a);
          rot[2] = mix(rot[2], -L.tilt, a);
        } else {
          p.copy(L.deep); op = 0;
        }
        L.mesh.position.copy(p);
        L.mesh.rotation.set(rot[0], rot[1], rot[2]);
        // mirror about the waterline
        L.refl.position.set(p.x, 2 * WATER_Y - p.y, p.z);
        L.refl.rotation.set(-rot[0], rot[1], -rot[2]);
        L.refl.scale.set(1, -1, 1);
        u.uOpacity.value = op; ru.uOpacity.value = shimmer ? 0 : op;
        u.uGlitch.value = gl; ru.uGlitch.value = gl * 0.5;
        u.uFlash.value = flash;
        L.mesh.visible = op > 0.001;
        L.refl.visible = op > 0.001 && !shimmer;
        // splash rings: on the way up and on the way down
        const up = t - (L.start + RISE_DUR * 0.18), down = t - (L.sink + SINK_DUR * 0.7);
        bg.u.uRipX.value[j] = L.home.x + W / 2;
        bg.u.uRipA.value[j] = down >= 0 ? down : up >= 0 ? up : (t + 8 - (L.sink + SINK_DUR * 0.7) < 2.6 ? t + 8 - (L.sink + SINK_DUR * 0.7) : -1);
      });

      // DOM
      const lastUp = RISE0 + (N - 1) * RISE_STEP + RISE_DUR * 0.5;
      const shown = smooth(seg(t, lastUp, lastUp + 0.45)) * (1 - smooth(seg(t, SINK0 + 0.1, SINK0 + 0.55)));
      const shim = t < 0.55 || t >= 7.6 ? flick(t, [[0, 0.24], [0.28, 0.12], [0.43, 0.06], [7.74, 0.1], [7.88, 0.12]]) : 0;
      const vis = Math.max(shown, shim);
      const jit = shim ? Math.sin(t * 60) * 8 : 0;
      kicker.style.opacity = vis;
      kicker.style.transform = `translate(calc(-50% + ${jit}px), ${(1 - shown) * (shim ? 0 : 14)}px)`;
      sub.style.opacity = vis;
      sub.style.transform = `translate(calc(-50% + ${-jit}px), ${(1 - shown) * (shim ? 0 : 24)}px)`;
      sub.style.letterSpacing = `${0.06 + 0.05 * (1 - shown)}em`;
      const lit = fs.sun > 0.3;
      read.textContent = lit ? 'BUOY 46026 — 6.2FT @ 14S' : 'SCANNING SWELL…';
      dot.style.opacity = 0.3 + 0.7 * beatEnv(t, 0.15);
      dot.style.background = lit ? '#19c3c9' : '#ff7a2f';
      swipe.querySelector('span').style.transform = `translateX(${10 * beatEnv(t, 0.12)}px)`;
    },
  };
}
