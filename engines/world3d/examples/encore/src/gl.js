// Shared GLSL: noise, loop-safe time, and THE STAGE — one continuous set across all six slides:
// a crimson velvet backdrop, a chrome box truss with 18 moving heads, a honey-oak deck with a guitar cable
// running the whole length, and a row of footlights on the lip. Everything is computed in strip px, so it
// is continuous at every seam. Per-slide light (wash colour, follow-spot) is blended with the neighbours'
// near each seam so the two sides of a seam always agree.
import { THREE, W, H, N, FLOOR_Y, LIP_Y } from './core.js';

export const NFIX = 18;           // moving heads, 3 per slide, every 360 px
export const FIX_X = j => 180 + 360 * j;
export const FIX_PIVOT_Y = 58;    // where the yoke clamps to the truss

export const COMMON = /* glsl */`
#define TAU 6.28318530718
#define PI 3.14159265359
uniform float uTime; uniform float uOff;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s / .875; }
// a point that walks a circle once per loop: noise(p + loopv(t)) is periodic in t
vec2 loopv(float t){ float a = TAU * t / 8.0; return vec2(cos(a), sin(a)); }
vec2 loopv2(float t){ float a = TAU * t / 4.0; return vec2(cos(a), sin(a)); }
float sq(float x){ return x * x; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
`;

export const STAGE = /* glsl */`
#define NFIX ${NFIX}
#define FLOOR_Y ${FLOOR_Y}.
#define LIP_Y ${LIP_Y}.
uniform vec4 uFix[NFIX];      // lens x, lens y (strip px, y down), beam angle (rad, 0 = straight down, + = toward +x), half-width (rad)
uniform vec4 uFixC[NFIX];     // rgb * intensity, a = haze-pool strength on the floor
uniform vec3 uWash, uWashL, uWashR;        // backdrop light (rgb * level) for this slide and its neighbours
uniform vec4 uSpot; uniform vec3 uSpotCol; // follow-spot on the backdrop: x, y, radius (slide px), level
uniform float uSway;                        // curtain sway (wind) amount
uniform float uFoot;                        // footlight level
uniform float uBlack;                       // stage blackout 0..1 (cover intro)

vec3 washAt(float x){
  float wl = 0.5 * (1. - smoothstep(0., 420., x));
  float wr = 0.5 * (1. - smoothstep(0., 420., 1080. - x));
  return uWash * (1. - wl - wr) + uWashL * wl + uWashR * wr;
}

// velvet folds: returns colour (unlit albedo * diffuse + sheen), lit later by the wash
vec3 velvet(vec2 sp, float t, float detail){
  float y = sp.y;
  float hangD = clamp(y / 1100., 0., 1.);
  float sw = uSway * hangD * (sin(TAU * t / 8. * 2. + sp.x * 0.0021) * 0.6 + sin(TAU * t / 8. * 3. + sp.x * 0.0047 + 1.3) * 0.4);
  float u = sp.x / 96. + 0.42 * sin(sp.x / 331. + 0.6) + 0.22 * sin(sp.x / 157. + 1.7) + 0.05 * sin(y / 210. + sp.x / 90.) + sw;
  float fold = sin(u * TAU);
  float slope = cos(u * TAU) * (0.85 + 0.25 * sin(sp.x / 513.)) * (1.15 - 0.35 * hangD);
  vec3 n = normalize(vec3(-slope * 1.25, 0., 1.));
  vec3 L = normalize(vec3(-0.35, 0.45, 0.82));
  float dif = clamp(dot(n, L), 0., 1.);
  float sheen = pow(max(1. - n.z, 0.), 1.6);
  float nap = mix(0.5, fbm3(vec2(sp.x * 0.045, y * 0.0018 + sp.x * 0.0003)), detail);
  vec3 deep = vec3(0.30, 0.012, 0.03), mid = vec3(0.80, 0.055, 0.085), hi = vec3(1.0, 0.30, 0.26);
  vec3 c = mix(deep, mid, smoothstep(0.05, 0.95, dif));
  c += hi * sheen * 0.55;
  c *= 0.86 + 0.28 * nap;
  // pleats gather at the top: deeper shadow in the fold valleys near the rail
  c *= 1. - 0.25 * (1. - hangD) * smoothstep(0.2, 1., -fold);
  return c;
}

float haze(vec2 sp, float t){
  return fbm3(sp * vec2(0.0032, 0.0021) + loopv(t) * 0.9 + vec2(0., t * 0.0)) ;
}

// all moving-head beams at this point (additive light)
vec3 beams(vec2 sp, float t, out vec3 floorPool){
  vec3 acc = vec3(0.); floorPool = vec3(0.);
  float hz = 0.35 + 0.95 * haze(sp, t);
  for (int j = 0; j < NFIX; j++){
    vec4 f = uFix[j]; vec4 fc = uFixC[j];
    if (dot(fc.rgb, vec3(1.)) < 0.002) continue;
    vec2 o = f.xy;
    if (abs(sp.x - o.x) > 1700.) continue;
    vec2 dir = vec2(sin(f.z), cos(f.z));
    vec2 d = sp - o;
    float along = dot(d, dir);
    float perp = abs(d.x * dir.y - d.y * dir.x);
    float r = 7. + max(along, 0.) * tan(f.w);
    float body = exp(-sq(perp / r) * 2.2) + 0.7 * exp(-sq(perp / (r * 0.28)));
    float fall = smoothstep(0., 60., along) * exp(-max(along, 0.) / 1900.);
    // beams stop where they meet the deck (they land somewhere in the floor band)
    float land = FLOOR_Y + 70. + 60. * sin(float(j) * 2.1);
    fall *= 1. - smoothstep(land - 30., land + 50., sp.y);
    acc += fc.rgb * body * fall * hz * 0.55;
    acc += fc.rgb * exp(-length(d) / 16.) * 1.6;                       // lens hotspot
    // pool where the beam lands on the deck
    float lx = o.x + tan(f.z) * (land - o.y);
    vec2 q = (sp - vec2(lx, land)) / vec2(r * 1.25 + 40., (r * 1.25 + 40.) * 0.22);
    floorPool += fc.rgb * exp(-dot(q, q)) * fc.a;
  }
  return acc;
}

// the box truss across the top (chrome tubes), coverage in a, colour in rgb
vec4 truss(vec2 sp){
  float y = sp.y;
  if (y > 92.) return vec4(0.);
  float cov = 0.; vec3 col = vec3(0.);
  // chords
  for (int k = 0; k < 2; k++){
    float yc = k == 0 ? 14. : 64.; float rr = 6.5;
    float c = (y - yc) / rr;
    float m = 1. - smoothstep(0.85, 1.1, abs(c));
    float hl = 0.35 + 0.65 * exp(-sq((c + 0.35) * 2.4)) + 0.25 * exp(-sq((c - 0.6) * 4.));
    vec3 cc = mix(vec3(0.22, 0.2, 0.21), vec3(1.0, 0.95, 0.92), hl);
    col = mix(col, cc, m * (1. - cov)); cov = max(cov, m);
  }
  // lacing
  float xm = mod(sp.x, 64.);
  float dd = min(sdSeg(vec2(xm, y), vec2(0., 14.), vec2(32., 64.)), sdSeg(vec2(xm, y), vec2(32., 64.), vec2(64., 14.)));
  float m2 = (1. - smoothstep(2.6, 3.8, dd)) * step(14., y) * step(y, 64.);
  vec3 lc = mix(vec3(0.25), vec3(0.85, 0.82, 0.8), 0.5 + 0.5 * sin(xm * 0.4));
  col = mix(col, lc, m2 * (1. - cov)); cov = max(cov, m2);
  return vec4(col, cov);
}

// the guitar cable lying on the deck, one curve for the whole strip
float cableY(float x){ return 1236. + 26. * sin(x / 410. + 0.4) + 14. * sin(x / 173. + 2.1) + 8. * sin(x / 97.); }

vec3 deck(vec2 sp, vec2 p, float t, vec3 wash, vec3 pool, float detail){
  float v = (sp.y - FLOOR_Y) / (LIP_Y - FLOOR_Y);             // 0 back .. 1 front
  float horizon = 640.;
  float wz = 52000. / (sp.y - horizon);                         // depth, world units
  float row = floor(wz / 9.5);
  float fr = fract(wz / 9.5);
  float wx = sp.x * (1. + 0.0 * v) / 1.0;
  float joint = fract((wx / 410.) + hash11(row) * 7.3);
  float jl = 1. - smoothstep(0., 0.004 + 0.002 * v, min(joint, 1. - joint));
  float gap = 1. - smoothstep(0.0, 0.07 + 0.06 * (1. - v), min(fr, 1. - fr));
  float grain = fbm3(vec2(wx * 0.012, row * 3.1 + fr * 0.6)) * 0.8 + 0.2 * vnoise(vec2(wx * 0.11, row * 9.));
  vec3 woodA = vec3(0.50, 0.30, 0.16), woodB = vec3(0.30, 0.16, 0.08);
  vec3 c = mix(woodB, woodA, grain) * (0.9 + 0.22 * hash11(row * 1.7 + floor(wx / 410. + hash11(row) * 7.3)));
  c *= 1. - 0.55 * gap - 0.45 * jl;
  // scuffs
  c *= 0.85 + 0.15 * smoothstep(0.3, 0.7, fbm3(vec2(wx * 0.004, sp.y * 0.02)));
  // light: the wash bounces off the backdrop, plus the beam pools, plus the footlights near the lip
  vec3 light = wash * (0.75 - 0.25 * v) + pool + vec3(1.0, 0.72, 0.42) * uFoot * 0.55 * smoothstep(0.35, 1., v);
  c *= light;
  // glossy reflection of the velvet (mirrored about the floor line, softer detail)
  vec2 rp = vec2(sp.x, 2. * FLOOR_Y - sp.y + 10. * sin(sp.x * 0.05) * v);
  vec3 refl = velvet(rp, t, 0.) * washAt(p.x);
  float fres = mix(0.42, 0.10, v) * (1. - 0.6 * gap);
  c += refl * fres * 0.75;
  // guitar cable (black rubber with a highlight) + its shadow
  float cy = cableY(sp.x);
  float slope = (cableY(sp.x + 2.) - cableY(sp.x - 2.)) / 4.;
  float dist = (sp.y - cy) / sqrt(1. + slope * slope);
  float cw = 4.2;
  float sh = exp(-sq((dist - 7.) / 7.));
  c *= 1. - 0.5 * sh;
  float cm = 1. - smoothstep(cw - 0.8, cw + 0.8, abs(dist));
  vec3 cc = vec3(0.025) + vec3(1., 0.75, 0.6) * exp(-sq((dist + 1.6) / 1.1)) * 0.55 * (0.5 + 0.5 * dot(light, vec3(0.33)));
  c = mix(c, cc, cm);
  return c;
}

// the lip: black front face with a row of warm footlight bulbs
vec3 lip(vec2 sp, float t){
  vec3 c = vec3(0.035, 0.02, 0.02) * (1. + 0.6 * smoothstep(LIP_Y + 18., LIP_Y, sp.y));
  float bx = mod(sp.x + 30., 60.) - 30.;
  vec2 d = vec2(bx, sp.y - (LIP_Y + 24.));
  float r = length(d * vec2(1., 1.25));
  float k = floor((sp.x + 30.) / 60.);
  float fl = 0.92 + 0.08 * sin(TAU * t / 8. * 4. + k * 1.7);
  c += vec3(1.0, 0.78, 0.48) * (exp(-r / 4.5) * 1.6 + exp(-r / 18.) * 0.35) * uFoot * fl;
  // the edge highlight
  c += vec3(0.9, 0.5, 0.35) * exp(-sq((sp.y - LIP_Y) / 1.5)) * 0.35 * uFoot;
  return c;
}

vec3 stageColor(vec2 p, vec2 sp, float t){
  vec3 wash = washAt(p.x);
  vec3 pool;
  vec3 bm = beams(sp, t, pool);
  vec3 col;
  if (sp.y < FLOOR_Y){
    col = velvet(sp, t, 1.) * wash;
    // stage ceiling: falls to near-black above the rail
    col *= 0.25 + 0.75 * smoothstep(40., 260., sp.y);
    // the backdrop meets the deck: contact shadow
    col *= 1. - 0.55 * smoothstep(FLOOR_Y - 70., FLOOR_Y, sp.y);
    // follow-spot pool on the velvet
    vec2 q = (p - uSpot.xy) / uSpot.z;
    float s = exp(-sq(max(length(q) - 0.72, 0.) / 0.16)) * smoothstep(1.2, 0.7, length(q));
    col += velvet(sp, t, 1.) * uSpotCol * s * uSpot.w * 1.2 + uSpotCol * s * uSpot.w * 0.06;
    col += bm;
  } else if (sp.y < LIP_Y){
    col = deck(sp, p, t, wash, pool, 1.) + bm * 0.6;
  } else {
    col = lip(sp, t);
  }
  vec4 tr = truss(sp);
  col = mix(col, tr.rgb * (0.35 + 0.65 * dot(wash, vec3(0.33))) + bm * 0.15, tr.a);
  col *= 1. - uBlack * 0.9;
  return col;
}
`;

const BG_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// The shared stage uniforms: one object, referenced by every slide's background (set once per frame).
export const stageU = {
  uFix: { value: Array.from({ length: NFIX }, () => new THREE.Vector4(0, 0, 0, 0.06)) },
  uFixC: { value: Array.from({ length: NFIX }, () => new THREE.Vector4(0, 0, 0, 0)) },
};

// Build a full-slide background quad for slide i. `body` may start from `col = stageColor(p, sp, t);`
// and then add slide-specific light. p = slide px (y down), sp = strip px (y down).
export function bgQuad(i, decl, body, uniforms = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOff: { value: i * W },
      uFix: stageU.uFix, uFixC: stageU.uFixC,
      uWash: { value: new THREE.Vector3(1, 1, 1) }, uWashL: { value: new THREE.Vector3(1, 1, 1) }, uWashR: { value: new THREE.Vector3(1, 1, 1) },
      uSpot: { value: new THREE.Vector4(540, 600, 300, 0) }, uSpotCol: { value: new THREE.Vector3(1, 0.9, 0.75) },
      uSway: { value: 0.04 }, uFoot: { value: 1 }, uBlack: { value: 0 },
      ...uniforms,
    },
    vertexShader: BG_VS,
    fragmentShader: COMMON + STAGE + decl + `
void main(){
  vec2 p = vec2(vUv.x * 1080., (1. - vUv.y) * 1350.);
  vec2 sp = p + vec2(uOff, 0.);
  float t = uTime;
  vec3 col = vec3(0.);
  ${body}
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

// display-space colour (no sRGB->linear conversion: the background shaders output display values)
export const hexv3 = (hex, k = 1) => { const c = new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace); return new THREE.Vector3(c.r * k, c.g * k, c.b * k); };
