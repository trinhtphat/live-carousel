// Shared GLSL: noise, loop-safe time, the cyan scan laser, background quad factory.
import { THREE, W, H } from './core.js';

export const COMMON = /* glsl */`
#define TAU 6.28318530718
#define PI 3.14159265359
uniform float uTime; uniform float uOff;
uniform vec4 uSeamL; uniform vec4 uSeamR;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
// a point that walks a circle once per loop: noise(p + loopv(t)) is periodic in t
vec2 loopv(float t){ float a = TAU * t / 8.0; return vec2(cos(a), sin(a)); }
vec3 seamBlend(vec3 col, vec2 p){
  float wl = uSeamL.a * pow(1. - smoothstep(0., 300., p.x), 1.7);
  float wr = uSeamR.a * pow(1. - smoothstep(0., 300., 1080. - p.x), 1.7);
  col = mix(col, uSeamL.rgb, wl);
  col = mix(col, uSeamR.rgb, wr);
  return col;
}
`;

// The scan laser: enters top-left of slide 1, cuts across the word, crosses the seam and hits the aligner.
// Computed in strip coordinates (y down) so slides 1 and 2 draw one continuous beam.
export const BEAM = /* glsl */`
uniform float uBeam; uniform float uBeamCut;
const vec2 BA = vec2(-160., 190.);
const vec2 BB = vec2(1420., 560.);
vec3 beam(vec2 sp, float t){
  vec2 d = normalize(BB - BA); vec2 n = vec2(-d.y, d.x);
  float L = length(BB - BA);
  float along = dot(sp - BA, d);
  float perp = dot(sp - BA, n);
  float front = uBeamCut * (L + 900.);
  float reveal = 1. - smoothstep(front - 160., front, along);
  float fade = 1. - smoothstep(L - 40., L + 420., along);
  float w = 5. + max(along, 0.) * 0.016;
  float core = exp(-pow(perp / (w * 0.55), 2.));
  float glow = exp(-abs(perp) / (w * 5.5));
  float haze = exp(-abs(perp) / (w * 26.));
  float dust = fbm(vec2(along * 0.0055, perp * 0.022) + loopv(t) * 1.8);
  float spark = step(0.985, hash12(floor(vec2(along * 0.08, perp * 0.25)))) * (0.5 + 0.5 * sin(TAU * t / 0.5 + hash12(floor(sp * 0.1)) * 6.));
  vec3 c = core * vec3(0.92, 1.0, 1.0) * 1.15
         + glow * vec3(0.18, 0.72, 1.0) * 0.75
         + haze * vec3(0.02, 0.24, 0.55) * 0.42;
  c *= 0.7 + 0.7 * dust;
  c += spark * glow * vec3(0.7, 0.95, 1.0) * 0.8;
  return c * reveal * fade * uBeam;
}
`;

const BG_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Build a full-slide background quad for slide i. `body` sets `vec3 col` (world colour, seam-blended)
// and `vec3 add` (light that crosses seams). p = slide px (y down), sp = strip px (y down).
export function bgQuad(i, decl, body, uniforms = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOff: { value: i * W },
      uSeamL: { value: new THREE.Vector4(0, 0, 0, 0) }, uSeamR: { value: new THREE.Vector4(0, 0, 0, 0) },
      ...uniforms,
    },
    vertexShader: BG_VS,
    fragmentShader: COMMON + decl + `
void main(){
  vec2 p = vec2(vUv.x * 1080., (1. - vUv.y) * 1350.);
  vec2 sp = p + vec2(uOff, 0.);
  vec3 col = vec3(0.); vec3 add = vec3(0.);
  ${body}
  col = seamBlend(col, p) + add;
  gl_FragColor = vec4(col, 1.);
}`,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  mesh.position.set(i * W + W / 2, H / 2, 0);
  mesh.renderOrder = -100 + i;
  mesh.frustumCulled = false;
  mesh.u = mat.uniforms;
  return mesh;
}

// seam colours are written straight into display-space shaders, so keep the hex value as-is (no sRGB→linear)
export const hexv4 = (hex, a = 1) => { const c = new THREE.Color(hex).convertLinearToSRGB(); return new THREE.Vector4(c.r, c.g, c.b, a); };
