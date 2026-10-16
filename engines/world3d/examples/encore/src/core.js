// ENCORE® / LOUD — shared constants, timing helpers, materials.
// Everything that moves is a pure function of t in [0, LOOP), so every slide loops seamlessly.
import * as THREE from 'three';
export { THREE };

export const W = 1080, H = 1350, N = 6, SW = W * N;
export const LOOP = 8;          // 4 bars at 120 BPM
export const BEAT = 0.5;
export const TAU = Math.PI * 2;
export const D_CAM = 1600;      // perspective camera distance: z=0 plane maps 1:1 to px

// the stage, in slide px (y down)
export const FLOOR_Y = 1122;    // where the backdrop meets the deck
export const LIP_Y = 1306;      // front edge of the stage (footlights below it)

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = x => x * x * (3 - 2 * x);
export const eOutCubic = x => 1 - Math.pow(1 - x, 3);
export const eInCubic = x => x * x * x;
export const eInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const eInExpo = x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const eOutBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const eOutElastic = x => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1);

// time since an event, wrapped around the loop (so tails flow through the loop point)
export const since = (t, at) => ((t - at) % LOOP + LOOP) % LOOP;
// decaying envelope after an event
export const pulse = (t, at, dur) => { const d = since(t, at); return d < dur * 9 ? Math.exp(-d / dur) : 0; };
// damped oscillation after an event, starts at 0
export const wobble = (t, at, f = 2.4, k = 6) => { const d = since(t, at); return d > 3 ? 0 : Math.exp(-k * d) * Math.sin(f * TAU * d); };
// beat envelope on every beat (and on the backbeat only)
export const beatEnv = (t, dur = 0.12) => Math.exp(-((t % BEAT) / dur));
export const kickEnv = (t, dur = 0.12) => Math.exp(-((t % 1) / dur));                 // beats 1 + 3 (every 1.0 s)
export const snareEnv = (t, dur = 0.12) => Math.exp(-(((t + 0.5) % 1) / dur));        // beats 2 + 4
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const lsin = (t, n = 1, ph = 0) => Math.sin(TAU * n * t / LOOP + ph);
export const lcos = (t, n = 1, ph = 0) => Math.cos(TAU * n * t / LOOP + ph);
export const within = (t, a, b) => (a <= b ? t >= a && t < b : t >= a || t < b);
export const flick = (t, list) => list.some(([a, d]) => t >= a && t < a + d) ? 1 : 0;
// smooth loop-periodic 1D noise in [-1, 1]
export const lnoise = (t, seed = 0, n = 3) => {
  let s = 0, a = 1, norm = 0;
  for (let k = 1; k <= n; k++) { s += a * Math.sin(TAU * k * t / LOOP + hash(seed * 7.1 + k) * TAU); norm += a; a *= 0.55; }
  return s / norm;
};

// colours in DISPLAY space (the shaders work in display space; THREE.Color(hex) would linearise them)
export const dcol = hex => (typeof hex === 'number' ? new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace) : new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace));
export const CREAM = '#f5ead6';
export const CRIMSON = '#c4161c';
export const AMBER = '#ffbe6a';
export const INK = '#140708';

// ---------- texture helpers ----------
export function prepTex(tex, { mips = true } = {}) {
  tex.colorSpace = THREE.NoColorSpace;          // shaders work in display space
  tex.premultiplyAlpha = true;
  tex.generateMipmaps = mips;
  tex.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Text drawn white on transparent, used as a tinted sprite (for type that lives inside the WebGL world).
export function textTexture(lines, { font = 'Anton', size = 400, weight = 400, lh = 0.9, ls = 0, stroke = 0, pad = 24, stretch = '', align = 'center' } = {}) {
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  const setFont = () => { ctx.font = `${weight} ${stretch} ${size}px ${font}`.replace(/\s+/g, ' '); ctx.letterSpacing = `${ls}px`; };
  setFont();
  const ms = lines.map(l => ctx.measureText(l));
  const asc = Math.max(...ms.map(m => m.actualBoundingBoxAscent));
  const desc = Math.max(...ms.map(m => m.actualBoundingBoxDescent));
  const wMax = Math.max(...ms.map(m => m.actualBoundingBoxLeft + m.actualBoundingBoxRight));
  const lineH = size * lh;
  c.width = Math.ceil(wMax + pad * 2 + stroke * 2);
  c.height = Math.ceil(asc + desc + lineH * (lines.length - 1) + pad * 2 + stroke * 2);
  ctx = c.getContext('2d');
  setFont();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const ax = align === 'left' ? pad + stroke : c.width / 2;
  lines.forEach((l, i) => {
    const y = pad + stroke + asc + i * lineH;
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(l, ax, y); }
    else { ctx.fillStyle = '#fff'; ctx.fillText(l, ax, y); }
  });
  const tex = prepTex(new THREE.CanvasTexture(c));
  return { tex, w: c.width, h: c.height, canvas: c };
}

// Poster type as a colour texture: cream fill + a hard offset shadow (and optional outline), for type that
// lives INSIDE the world (behind products). size px; stretch is a canvas fontStretch keyword.
export function posterText(lines, { font = 'Archivo', weight = 900, size = 300, lh = 0.84, ls = 0, stretch = 'extra-condensed',
  fill = '#f5ead6', shadow = '#5a0610', sx = 9, sy = 9, stroke = 0, strokeCol = '#140708', pad = 30, align = 'center' } = {}) {
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  const setFont = () => { ctx.font = `${weight} ${size}px ${font}`; ctx.fontStretch = stretch; ctx.letterSpacing = `${ls}px`; };
  setFont();
  const ms = lines.map(l => ctx.measureText(l));
  const asc = Math.max(...ms.map(m => m.actualBoundingBoxAscent)), desc = Math.max(...ms.map(m => m.actualBoundingBoxDescent));
  const wMax = Math.max(...ms.map(m => m.actualBoundingBoxLeft + m.actualBoundingBoxRight));
  const lineH = size * lh;
  c.width = Math.ceil(wMax + pad * 2 + Math.abs(sx) + stroke * 2);
  c.height = Math.ceil(asc + desc + lineH * (lines.length - 1) + pad * 2 + Math.abs(sy) + stroke * 2);
  ctx = c.getContext('2d'); setFont();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const ax = align === 'left' ? pad + stroke : (c.width - Math.abs(sx)) / 2;
  lines.forEach((l, i) => {
    const y = pad + stroke + asc + i * lineH;
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(l, ax + sx, y + sy); if (stroke) { ctx.lineWidth = stroke * 2; ctx.strokeStyle = shadow; ctx.strokeText(l, ax + sx, y + sy); } }
    if (stroke) { ctx.lineWidth = stroke * 2; ctx.strokeStyle = strokeCol; ctx.strokeText(l, ax, y); }
    ctx.fillStyle = fill; ctx.fillText(l, ax, y);
  });
  const tex = prepTex(new THREE.CanvasTexture(c));
  return { tex, w: c.width, h: c.height, canvas: c };
}

// ---------- the sprite material: products, type, shadows, reflections ----------
// Plane in strip px (ortho camera). Optional cloth ripple + flutter, shock pulse, a travelling wave
// (bass), fake 3D tilt with perspective, 2D rim light (alpha edge facing the light), shine sweep, tint,
// a top/bottom brightness gradient (stage light falls off toward the floor) and a vertical fade
// (floor reflections). Premultiplied alpha.
const SPRITE_VS = /* glsl */`
uniform vec2 uSize; uniform float uTime, uRipple, uFlutter, uPulse, uPulseR, uYaw, uPitch, uRoll, uPersp, uFlipX, uWind;
uniform vec4 uWave;   // amp px, wavelength px, phase, falloff toward the top (0 = uniform)
uniform vec4 uUv;      // sub-rectangle of the texture: u0, v0, du, dv
uniform vec2 uWindDir; uniform vec4 uWindMask;   // y0, y1 (0 = top, 1 = bottom of the image), |x| from, |x| to (0..0.5); y1 <= y0 = hang mask
varying vec2 vUv; varying float vShade; varying vec2 vLocal; varying vec2 vLoc;
#define TAU 6.28318530718
float rz(vec2 p){
  float t = uTime * TAU / 8.0;
  float z = sin(p.x*0.0105 + p.y*0.0042 - t*2.0);
  z += 0.7*sin(p.y*0.0135 - p.x*0.0061 + t*3.0 + 1.3);
  z += 0.45*sin(length(p - vec2(-140., 220.))*0.019 - t*4.0);
  z *= uRipple;
  float pr = length(p) - uPulseR;
  z += uPulse * sin(pr*0.03) * exp(-pr*pr/16000.0) * 46.0;
  return z;
}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}
void main(){
  vUv = vec2(uFlipX > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
  vUv = uUv.xy + vUv * uUv.zw;
  vLoc = uv;
  vec2 p = position.xy * uSize;
  vLocal = position.xy;
  float z = rz(p);
  float dzdx = (rz(p + vec2(2.,0.)) - z) * 0.5;
  float dzdy = (rz(p + vec2(0.,2.)) - z) * 0.5;
  // hems and sleeves flutter more than the body (free ends = bottom and sides)
  float edge = smoothstep(0.18, 0.5, abs(position.x)) + smoothstep(0.1, 0.5, -position.y) * 0.8;
  float t = uTime * TAU / 8.0;
  p.x += uFlutter * edge * sin(p.y*0.012 + t*3.0) * 9.0;
  p.y += uFlutter * edge * sin(p.x*0.010 - t*2.0 + 0.7) * 6.0;
  // wind from a machine: pushes the free (lower) part along uWindDir with a gusty wave
  float yy = 0.5 - position.y;
  float hang = uWindMask.y > uWindMask.x
    ? smoothstep(uWindMask.x, uWindMask.y, yy) * (1.0 - smoothstep(uWindMask.y, uWindMask.y + 0.1, yy)) * smoothstep(uWindMask.z, uWindMask.w, abs(position.x))
    : yy * yy;
  p += uWindDir * uWind * hang * (1.0 + 0.35 * sin(p.y*0.02 - t*8.0) + 0.25 * sin(p.x*0.03 + t*6.0));
  if (uWave.x != 0.0) {
    float fall = mix(1.0, smoothstep(0.5, -0.5, position.y), uWave.w);
    p.y += uWave.x * sin(p.x * TAU / uWave.y + uWave.z) * fall;
  }
  vec3 n = normalize(vec3(-dzdx*1.4, -dzdy*1.4, 1.0));
  mat3 R = rotZ(uRoll) * rotY(uYaw) * rotX(uPitch);
  vec3 q = R * vec3(p, z);
  n = R * n;
  vShade = dot(n, normalize(vec3(-0.55, 0.5, 0.68)));
  float s = uPersp / max(uPersp - q.z, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q.xy * s, 0.0, 1.0);
}`;

const SPRITE_FS = /* glsl */`
uniform sampler2D map; uniform float uOpacity, uBright, uShade, uRimAmt, uTintAmt, uShine, uShineAmt, uBias, uSat, uDark, uTime, uContrast;
uniform vec3 uRim, uTint, uMul; uniform vec2 uRimDir, uSize, uGrad, uFade; uniform float uRound;
varying vec2 vUv; varying float vShade; varying vec2 vLocal; varying vec2 vLoc;
void main(){
  vec4 c = texture2D(map, vUv, uBias);
  if (uRound > 0.0) c *= 1.0 - smoothstep(uRound - 0.04, uRound, length(vLoc - 0.5) * 2.0);
  float a = c.a;
  if (a < 0.002) discard;
  vec3 col = c.rgb / a;
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBright * uMul;
  col *= mix(uGrad.y, uGrad.x, vUv.y);                       // top / bottom light falloff
  col *= mix(1.0, 0.62 + 0.62*clamp(vShade, 0.0, 1.0), uShade);
  if (uRimAmt > 0.0) {
    float o1 = texture2D(map, vUv + uRimDir*0.010, 1.5).a;
    float o2 = texture2D(map, vUv + uRimDir*0.022, 2.5).a;
    float rim = clamp(a - 0.55*o1 - 0.45*o2, 0.0, 1.0);
    col += uRim * rim * uRimAmt;
  }
  float d = (vUv.x*0.75 + (1.0 - vUv.y)*0.55) - uShine;
  col += vec3(1.0) * exp(-d*d*160.0) * uShineAmt * (0.35 + 0.65 * l);
  col = mix(col, uTint, uTintAmt);
  col *= (1.0 - uDark);
  float o = a * uOpacity;
  if (uFade.y > uFade.x) o *= 1.0 - smoothstep(uFade.x, uFade.y, vUv.y);  // reflections: strongest at the contact line (image bottom), gone by uFade.y
  gl_FragColor = vec4(max(col, 0.0) * o, o);
}`;

export function spriteMaterial(tex, w, h, { additive = false } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex }, uSize: { value: new THREE.Vector2(w, h) },
      uOpacity: { value: 1 }, uTime: { value: 0 },
      uRipple: { value: 0 }, uFlutter: { value: 0 }, uPulse: { value: 0 }, uPulseR: { value: 0 },
      uWind: { value: 0 }, uWindDir: { value: new THREE.Vector2(1, 0.15) }, uWindMask: { value: new THREE.Vector4(0, 0, 0, 0.5) },
      uWave: { value: new THREE.Vector4(0, 300, 0, 0) },
      uYaw: { value: 0 }, uPitch: { value: 0 }, uRoll: { value: 0 }, uPersp: { value: 1800 }, uFlipX: { value: 1 },
      uBright: { value: 1 }, uShade: { value: 0 }, uSat: { value: 1 }, uDark: { value: 0 }, uContrast: { value: 1 },
      uMul: { value: new THREE.Color(1, 1, 1) }, uUv: { value: new THREE.Vector4(0, 0, 1, 1) }, uRound: { value: 0 }, uGrad: { value: new THREE.Vector2(1, 1) }, uFade: { value: new THREE.Vector2(0, 0) },
      uRim: { value: dcol(0xffd2a0) }, uRimAmt: { value: 0 }, uRimDir: { value: new THREE.Vector2(-0.85, 0.5) },
      uTint: { value: new THREE.Color(0xffffff) }, uTintAmt: { value: 0 },
      uShine: { value: -3 }, uShineAmt: { value: 0 }, uBias: { value: 0 },
    },
    vertexShader: SPRITE_VS, fragmentShader: SPRITE_FS,
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
  });
  return m;
}

// A sprite mesh positioned in strip px (y up). segs = tessellation for ripple / wave / tilt.
export function sprite(tex, w, h, { segs = 1, additive = false, order = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1, segs, segs);
  const mesh = new THREE.Mesh(geo, spriteMaterial(tex, w, h, { additive }));
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  mesh.u = mesh.material.uniforms;
  return mesh;                       // natural size = (w, h) px via uSize; mesh.scale is a relative factor
}
// set a sprite's on-screen size in px
export const sizePx = (mesh, wpx, hpx = wpx) => { mesh.scale.set(wpx / mesh.u.uSize.value.x, hpx / mesh.u.uSize.value.y, 1); return mesh; };

// Place a sprite by slide-local coords: anchor point (ax, ay) in 0..1 of the image (0,0 = top-left),
// at slide i, slide px (x, y down), with a uniform scale.
export function place(mesh, i, x, y, scale = 1, ax = 0.5, ay = 0.5) {
  const w = mesh.u.uSize.value.x * scale, h = mesh.u.uSize.value.y * scale;
  mesh.scale.set(scale, scale, 1);
  mesh.position.set(i * W + x + (0.5 - ax) * w, H - y + (ay - 0.5) * h, mesh.position.z);
  return mesh;
}

// slide-local (x right, y down) -> strip coords (y up)
export const S = (i, x, y) => [i * W + x, H - y];
