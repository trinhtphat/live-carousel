// Shared GLSL: noise, loop-safe time, the sunrise flare, background quad factory.
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

// The sunrise flare: the sun breaks the horizon on slide 1 and throws an anamorphic streak along
// the horizon line that runs across the seam into slide 2 and rim-lights the board there.
// Computed in strip coordinates (y down) so slides 1 and 2 draw one continuous streak.
export const SUN_POS = { x: 742, y: 700 };     // strip px, y down (slide 1's horizon)
export const FLARE = /* glsl */`
uniform float uFlare; uniform float uFlareCut; uniform float uSunY;
vec3 flare(vec2 sp, float t){
  vec2 d = sp - vec2(${SUN_POS.x}., uSunY);
  float reach = 1. - smoothstep(uFlareCut * 1700. - 260., uFlareCut * 1700., abs(d.x));
  float fade = 1. - smoothstep(700., 1350., abs(d.x));
  float lf = exp(-abs(d.x) / 620.);
  float yy = d.y + 0.0;
  float core = exp(-pow(yy / 1.8, 2.));
  float glow = exp(-abs(yy) / 11.);
  float haze = exp(-abs(yy) / 64.);
  float shimmer = 0.75 + 0.5 * fbm(vec2(d.x * 0.006, 0.) + loopv(t) * 1.3);
  vec3 c = core * vec3(1.0, 0.97, 0.9) * (0.45 + 0.75 * lf)
         + glow * vec3(1.0, 0.66, 0.36) * 0.55 * (0.25 + 0.75 * lf)
         + haze * vec3(0.95, 0.42, 0.22) * 0.20 * lf;
  return c * shimmer * reach * fade * uFlare;
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

export const hexv4 = (hex, a = 1) => { const c = new THREE.Color(hex); return new THREE.Vector4(c.r, c.g, c.b, a); };
