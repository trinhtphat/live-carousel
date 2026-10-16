// OFFSHORE SURF CO. / SWELL — shared constants, timing helpers, materials.
// Everything that moves is a pure function of t in [0, LOOP), so every slide loops seamlessly.
import * as THREE from 'three';
export { THREE };

export const W = 1080, H = 1350, N = 6, SW = W * N;
export const LOOP = 8;          // 4 bars at 120 BPM
export const BEAT = 0.5;
export const TAU = Math.PI * 2;
export const D_CAM = 1600;      // perspective camera distance: z=0 plane maps 1:1 to px

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

// time since an event, wrapped around the loop (so tails flow through the loop point)
export const since = (t, at) => ((t - at) % LOOP + LOOP) % LOOP;
// decaying envelope after an event
export const pulse = (t, at, dur) => { const d = since(t, at); return d < dur * 9 ? Math.exp(-d / dur) : 0; };
// damped oscillation after an event, starts at 0
export const wobble = (t, at, f = 2.4, k = 6) => { const d = since(t, at); return d > 3 ? 0 : Math.exp(-k * d) * Math.sin(f * TAU * d); };
// beat envelope on every beat
export const beatEnv = (t, dur = 0.12) => Math.exp(-((t % BEAT) / dur));
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const lsin = (t, n = 1, ph = 0) => Math.sin(TAU * n * t / LOOP + ph);
export const lcos = (t, n = 1, ph = 0) => Math.cos(TAU * n * t / LOOP + ph);
// true if t is in [a, b) (handles wrap when a > b)
export const within = (t, a, b) => (a <= b ? t >= a && t < b : t >= a || t < b);
// deterministic one-frame flicker pattern: list of [start, dur]
export const flick = (t, list) => list.some(([a, d]) => t >= a && t < a + d) ? 1 : 0;

export const AQUA = new THREE.Color('#19c3c9');
export const AQUA_HOT = new THREE.Color('#8ff5ee');
export const SUN = new THREE.Color('#ff7a2f');

// Loop-periodic water caustics (after joltz0r's tileable caustic; integer time factors so it loops).
export const CAUSTIC = /* glsl */`
float caustic(vec2 px, float t){
  vec2 q = px * 0.0042;
  vec2 i = q;
  float c = 1.0, inten = 0.006;
  float ks[4]; ks[0] = 1.0; ks[1] = -1.0; ks[2] = 2.0; ks[3] = -1.0;
  for (int n = 0; n < 4; n++){
    float tt = t * ks[n] + float(n) * 1.7;
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}
`;

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

// Text drawn white on transparent, used as a tinted sprite (for type that must sit behind objects).
export function textTexture(lines, { font = 'Anton', size = 400, weight = 400, lh = 0.9, ls = 0, stroke = 0, pad = 24 } = {}) {
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  const setFont = () => { ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = `${ls}px`; };
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    const y = pad + stroke + asc + i * lineH;
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(l, c.width / 2, y); }
    else { ctx.fillStyle = '#fff'; ctx.fillText(l, c.width / 2, y); }
  });
  const tex = prepTex(new THREE.CanvasTexture(c));
  return { tex, w: c.width, h: c.height };
}

// ---------- the sprite material: products, type, shadows ----------
// Plane in strip px (ortho camera). Optional cloth ripple, shock pulse, fake 3D tilt w/ perspective,
// 2D rim light (alpha edge facing the light), shine sweep, tint. Premultiplied alpha.
const SPRITE_VS = /* glsl */`
uniform vec2 uSize; uniform float uTime, uRipple, uFlutter, uPulse, uPulseR, uYaw, uPitch, uRoll, uPersp, uFlipX;
varying vec2 vUv; varying float vShade; varying vec2 vLocal;
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
  vec2 p = position.xy * uSize;
  vLocal = position.xy;
  float z = rz(p);
  float dzdx = (rz(p + vec2(2.,0.)) - z) * 0.5;
  float dzdy = (rz(p + vec2(0.,2.)) - z) * 0.5;
  // sleeves / hem flutter more than the body
  float edge = smoothstep(0.18, 0.5, abs(position.x)) + smoothstep(0.2, 0.5, -position.y) * 0.6;
  float t = uTime * TAU / 8.0;
  p.x += uFlutter * edge * sin(p.y*0.012 + t*3.0) * 9.0;
  p.y += uFlutter * edge * sin(p.x*0.010 - t*2.0 + 0.7) * 6.0;
  vec3 n = normalize(vec3(-dzdx*1.4, -dzdy*1.4, 1.0));
  mat3 R = rotZ(uRoll) * rotY(uYaw) * rotX(uPitch);
  vec3 q = R * vec3(p, z);
  n = R * n;
  vShade = dot(n, normalize(vec3(-0.55, 0.5, 0.68)));
  float s = uPersp / max(uPersp - q.z, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(q.xy * s, 0.0, 1.0);
}`;

const SPRITE_FS = /* glsl */`
uniform sampler2D map; uniform float uOpacity, uBright, uShade, uRimAmt, uTintAmt, uShine, uShineAmt, uBias, uSat, uDark, uCaustic, uTime;
uniform vec3 uRim, uTint, uCausticCol; uniform vec2 uRimDir, uSize, uCausticOff;
varying vec2 vUv; varying float vShade; varying vec2 vLocal;
${CAUSTIC}
void main(){
  vec4 c = texture2D(map, vUv, uBias);
  float a = c.a;
  if (a < 0.002) discard;
  vec3 col = c.rgb / a;
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, uSat);
  col *= uBright;
  col *= mix(1.0, 0.62 + 0.62*clamp(vShade, 0.0, 1.0), uShade);
  if (uRimAmt > 0.0) {
    float o1 = texture2D(map, vUv + uRimDir*0.010, 1.5).a;
    float o2 = texture2D(map, vUv + uRimDir*0.022, 2.5).a;
    float rim = clamp(a - 0.55*o1 - 0.45*o2, 0.0, 1.0);
    col += uRim * rim * uRimAmt;
  }
  float d = (vUv.x*0.75 + (1.0 - vUv.y)*0.55) - uShine;
  col += vec3(1.0) * exp(-d*d*160.0) * uShineAmt;
  if (uCaustic > 0.0) col += uCausticCol * caustic(vLocal * uSize + uCausticOff, uTime * 6.28318530718 / 8.0) * uCaustic * (0.4 + 0.6 * l);
  col = mix(col, uTint, uTintAmt);
  col *= (1.0 - uDark);
  float o = a * uOpacity;
  gl_FragColor = vec4(col * o, o);
}`;

export function spriteMaterial(tex, w, h, { additive = false } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex }, uSize: { value: new THREE.Vector2(w, h) },
      uOpacity: { value: 1 }, uTime: { value: 0 },
      uRipple: { value: 0 }, uFlutter: { value: 0 }, uPulse: { value: 0 }, uPulseR: { value: 0 },
      uYaw: { value: 0 }, uPitch: { value: 0 }, uRoll: { value: 0 }, uPersp: { value: 1800 }, uFlipX: { value: 1 },
      uBright: { value: 1 }, uShade: { value: 0 }, uSat: { value: 1 }, uDark: { value: 0 },
      uRim: { value: new THREE.Color(0x5ff0ff) }, uRimAmt: { value: 0 }, uRimDir: { value: new THREE.Vector2(-0.85, 0.5) },
      uTint: { value: new THREE.Color(0xffffff) }, uTintAmt: { value: 0 },
      uShine: { value: -3 }, uShineAmt: { value: 0 }, uBias: { value: 0 },
      uCaustic: { value: 0 }, uCausticCol: { value: new THREE.Color(0x9ff8ff) }, uCausticOff: { value: new THREE.Vector2(0, 0) },
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

// A sprite mesh positioned in strip px (y up). seg = tessellation for ripple / tilt.
export function sprite(tex, w, h, { segs = 1, additive = false, order = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1, segs, segs);
  const mesh = new THREE.Mesh(geo, spriteMaterial(tex, w, h, { additive }));
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  mesh.u = mesh.material.uniforms;
  return mesh;
}

// slide-local (x right, y down) -> strip coords (y up)
export const S = (i, x, y) => [i * W + x, H - y];
