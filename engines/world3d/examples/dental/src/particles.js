// GPU particle systems (instanced quads), all positions computed in the vertex shader from t,
// periodic in the loop. Strip coordinates, y up.
import { THREE, W, H, SW, hash } from './core.js';

const HEAD = /* glsl */`
#define TAU 6.28318530718
#define PI 3.14159265359
attribute vec4 aSeed; attribute vec4 aBase;
uniform float uTime;
varying vec2 vQ; varying float vA; varying vec3 vCol;
`;
const FRAG = /* glsl */`
varying vec2 vQ; varying float vA; varying vec3 vCol;
uniform float uSoft;
void main(){
  float d = length(vQ);
  float a = vA * (uSoft > 0.5 ? smoothstep(1.0, 0.0, d) : smoothstep(1.0, 0.6, d));
  if (a < 0.003) discard;
  gl_FragColor = vec4(vCol * a, a);
}`;
const STREAK_FRAG = /* glsl */`
varying vec2 vQ; varying float vA; varying vec3 vCol;
void main(){
  float across = 1.0 - smoothstep(0.2, 1.0, abs(vQ.x));
  float along = smoothstep(-1.0, 0.7, vQ.y) * (1.0 - smoothstep(0.85, 1.0, vQ.y));
  float a = vA * across * along;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vCol * a, a);
}`;

function system(count, vs, fs, fill, { additive = false, order = 0, soft = 1 } = {}) {
  const base = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('uv', base.attributes.uv);
  const seed = new Float32Array(count * 4), b = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) fill(k, seed, b);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(b, 4));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSoft: { value: soft }, uFlip: { value: 0 }, uBoost: { value: 0 } },
    vertexShader: vs, fragmentShader: fs, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor,
    blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = order; mesh.u = mat.uniforms;
  return mesh;
}

// Dust motes drifting right and up across the whole strip (cross every seam). Dark on slide 4.
export function dust(count = 520) {
  return system(count, HEAD + /* glsl */`
void main(){
  float k = 1.0 + floor(aSeed.y * 2.0);
  float ph = fract(uTime / 8.0 * k + aSeed.x);
  vec2 pos = aBase.xy + vec2(ph * aBase.z, ph * aBase.z * (0.18 + aSeed.z * 0.45));
  pos += vec2(sin(TAU * uTime / 8.0 * 2.0 + aSeed.w * 6.0), cos(TAU * uTime / 8.0 + aSeed.z * 6.0)) * 12.0;
  vA = sin(ph * PI) * (0.25 + 0.75 * aSeed.w);
  float x = pos.x;
  float light = smoothstep(3240.0 - 160.0, 3240.0 + 160.0, x) * (1.0 - smoothstep(4320.0 - 160.0, 4320.0 + 160.0, x));
  vCol = mix(mix(vec3(0.82, 0.96, 1.0), vec3(0.35, 0.80, 1.0), aSeed.z), vec3(0.06, 0.14, 0.22), light);
  vQ = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + position.xy * aBase.w, 0.0, 1.0);
}`, FRAG, (k, s, b) => {
    s.set([hash(k), hash(k + 0.31), hash(k + 0.77), hash(k + 0.13)], k * 4);
    const big = hash(k + 0.5) > 0.96;
    b.set([-900 + hash(k * 3.1) * (SW + 900), -120 + hash(k * 7.3) * (H + 40), 500 + hash(k * 1.7) * 900, big ? 4 + hash(k) * 4 : 1.1 + hash(k * 2.2) * 2.2], k * 4);
  }, { order: 10 });
}

// Sparkle streaks rising past the hero on slide 5.
export function rise(count = 150) {
  return system(count, HEAD + /* glsl */`
uniform float uFlip;
void main(){
  float k = 2.0 + floor(aSeed.y * 3.0);
  float ph = fract(uTime / 8.0 * k + aSeed.x);
  float y = -200.0 + ph * 1750.0;
  float x = aBase.x + sin(TAU * uTime / 8.0 + aSeed.z * 6.0) * 10.0;
  float len = aBase.z;
  vec2 pos = vec2(x, mix(y, 1350.0 - y, uFlip));
  float dir = mix(1.0, -1.0, uFlip);
  vA = (0.15 + 0.6 * aSeed.w) * smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.85, 1.0, ph));
  vCol = mix(vec3(0.85, 0.97, 1.0), vec3(0.49, 1.0, 0.80), step(0.9, aSeed.z));
  vQ = position.xy;
  vec2 off = vec2(position.x * aBase.w, position.y * len * dir);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + off, 0.0, 1.0);
}`, STREAK_FRAG, (k, s, b) => {
    s.set([hash(k + 9), hash(k + 9.4), hash(k + 9.8), hash(k + 10.2)], k * 4);
    b.set([4320 + 30 + hash(k * 5.7) * 1020, 0, 40 + hash(k * 3.3) * 150, 1 + hash(k * 1.9) * 1.6], k * 4);
  }, { order: 43, additive: true });
}

// Light stream: particles spiral from slide 5 into the pearl's ring on slide 6.
export const BH = { x: 5 * W + 540, y: H - 430, rs: 132 };   // strip, y up
export function stream(count = 300) {
  return system(count, HEAD + /* glsl */`
uniform float uBoost;
vec2 path(float s, float th0, float r0){
  float r = mix(r0, ${BH.rs.toFixed(1)} * 1.05, pow(s, 0.8));
  float th = th0 - s * TAU * 1.15;
  return vec2(${BH.x.toFixed(1)}, ${BH.y.toFixed(1)}) + vec2(cos(th), sin(th) * 0.36) * r;
}
void main(){
  float k = 1.0 + floor(aSeed.y * 2.0);
  float s = fract(uTime / 8.0 * k + aSeed.x);
  float th0 = PI + (aSeed.z - 0.5) * 0.9;
  float r0 = aBase.x;
  vec2 p = path(s, th0, r0);
  vec2 p2 = path(min(s + 0.012, 1.0), th0, r0);
  vec2 dir = normalize(p2 - p + 1e-4);
  vec2 nrm = vec2(-dir.y, dir.x);
  float len = aBase.z * (0.5 + 1.6 * s) * (1.0 + uBoost);
  vA = (0.25 + 0.75 * aSeed.w) * smoothstep(0.0, 0.12, s) * (1.0 - smoothstep(0.86, 1.0, s));
  vCol = mix(vec3(0.15, 0.70, 1.0), vec3(0.92, 1.0, 1.0), smoothstep(0.4, 0.95, s));
  vQ = position.xy;
  vec2 off = dir * position.y * len + nrm * position.x * aBase.w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p + off, 0.0, 1.0);
}`, STREAK_FRAG, (k, s, b) => {
    s.set([hash(k + 21), hash(k + 21.4), hash(k + 21.8), hash(k + 22.2)], k * 4);
    b.set([950 + hash(k * 4.1) * 420, 0, 8 + hash(k * 2.7) * 26, 0.8 + hash(k * 6.1) * 1.8], k * 4);
  }, { order: 40, additive: true });
}

// same path in JS, for the product sprites that spiral in
export function bhPath(s, th0, r0) {
  const r = r0 + (BH.rs * 1.05 - r0) * Math.pow(s, 0.8);
  const th = th0 - s * Math.PI * 2 * 1.15;
  return [BH.x + Math.cos(th) * r, BH.y + Math.sin(th) * 0.36 * r, r, th];
}
