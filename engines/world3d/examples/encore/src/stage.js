// The shared rig: 18 moving-head fixtures (Higgsfield photo) hanging from the truss, their lens glows,
// the low dry-ice fog that rolls across the whole deck, and drifting haze motes. Each slide owns three
// fixtures and programs them with a cue function; the beams themselves are drawn by the backdrop shader
// (gl.js) from the shared uniforms, so a beam that leans over a seam is the same beam on both sides.
import { THREE, W, H, N, SW, TAU, FLOOR_Y, LIP_Y, sprite, sizePx, clamp, mix, hash, lnoise, dcol } from './core.js';
import { NFIX, FIX_X, FIX_PIVOT_Y, stageU, COMMON } from './gl.js';

const FIX_SCALE = 0.36;
const LENS = 0.86;                     // lens centre, fraction of the fixture image height

// default cue: slow, lazy sweeps in warm white
export const idleCue = (t, j) => ({
  a: 0.32 * lnoise(t, j * 3.1, 2) + (j % 2 ? 0.12 : -0.12), w: 0.075, I: 0.42, col: [1.0, 0.86, 0.66], pool: 0.35,
});

export function createRig(ctx) {
  const { assets, bgScene, seamScene, radialTex } = ctx;
  const fx = assets.fixture;
  const fixtures = [], glows = [];
  for (let j = 0; j < NFIX; j++) {
    const m = sprite(fx.tex, fx.w, fx.h, { order: -40 });
    m.scale.set(FIX_SCALE, FIX_SCALE, 1);
    m.u.uBright.value = 0.9;
    m.u.uRimAmt.value = 0.6;
    m.u.uRimDir.value.set(0, 0.8);
    bgScene.add(m); fixtures.push(m);
    const g = sprite(radialTex, 256, 256, { additive: true, order: -39 });
    bgScene.add(g); glows.push(g);
  }

  // low-lying fog over the whole deck (in front of everything that stands on the stage)
  const fogU = {
    uTime: { value: 0 }, uAmt: { value: Array.from({ length: N }, () => 0.5) },
    uTint: { value: Array.from({ length: N }, () => new THREE.Vector3(1, 0.82, 0.78)) },
  };
  const fogMat = new THREE.ShaderMaterial({
    uniforms: fogU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: COMMON.replace('uniform float uTime; uniform float uOff;', 'uniform float uTime;') + /* glsl */`
uniform float uAmt[${N}]; uniform vec3 uTint[${N}];
void main(){
  vec2 sp = vec2(vUv.x * ${SW}., (1. - vUv.y) * 1350.);
  float fx = sp.x / 1080. - 0.5;
  int k0 = int(clamp(floor(fx), 0., ${N - 1}.)); int k1 = int(clamp(floor(fx) + 1., 0., ${N - 1}.));
  float f = smoothstep(0., 1., fract(fx));
  float amt = mix(uAmt[k0], uAmt[k1], f);
  vec3 tint = mix(uTint[k0], uTint[k1], f);
  float t = uTime;
  // rolling banks: two layers drifting in opposite directions, each loop-periodic
  vec2 q = vec2(sp.x * 0.0022, sp.y * 0.006);
  float n1 = fbm(q + vec2(0.0, 0.) + loopv(t) * 0.55);
  float n2 = fbm(q * 1.9 + vec2(3.1, 1.7) - loopv(t + 2.) * 0.7);
  float n = 0.6 * n1 + 0.4 * n2;
  float h = smoothstep(${FLOOR_Y - 190}., ${LIP_Y - 10}., sp.y + 120. * (n - 0.5));
  h *= 1. - smoothstep(${LIP_Y + 4}., ${LIP_Y + 40}., sp.y) * 0.6;
  float a = clamp(h * smoothstep(0.25, 0.85, n) * amt, 0., 0.85);
  gl_FragColor = vec4(tint * a, a);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const fog = new THREE.Mesh(new THREE.PlaneGeometry(SW, H), fogMat);
  fog.position.set(SW / 2, H / 2, 0); fog.renderOrder = 60; fog.frustumCulled = false;
  seamScene.add(fog);

  const cues = new Array(N).fill(null);
  return {
    fogU,
    setCue(i, fn) { cues[i] = fn; },
    update(t) {
      fogU.uTime.value = t;
      for (let j = 0; j < NFIX; j++) {
        const i = Math.floor(j / 3), k = j % 3;
        const c = (cues[i] || idleCue)(t, k, j);
        const tilt = clamp(c.a * 0.55, -0.6, 0.6);
        const fw = fx.w * FIX_SCALE, fh = fx.h * FIX_SCALE;
        const px = FIX_X(j), py = FIX_PIVOT_Y;                      // strip x, slide y (down)
        // sprite centre = pivot + R(tilt) * (0, fh/2) in y-down coords
        const cxd = px + Math.sin(tilt) * fh / 2, cyd = py + Math.cos(tilt) * fh / 2;
        const m = fixtures[j];
        m.position.set(cxd, H - cyd, 0);
        m.rotation.z = tilt;
        const lx = px + Math.sin(tilt) * fh * LENS, ly = py + Math.cos(tilt) * fh * LENS;
        stageU.uFix.value[j].set(lx, ly, c.a, c.w);
        const I = c.I;
        stageU.uFixC.value[j].set(c.col[0] * I, c.col[1] * I, c.col[2] * I, c.pool ?? 0.35);
        const g = glows[j];
        g.position.set(lx, H - ly, 0);
        const gs = 70 + 90 * I;
        sizePx(g, gs);
        g.u.uOpacity.value = clamp(I * 1.1);
        g.u.uTint.value.setRGB(c.col[0], c.col[1], c.col[2]); g.u.uTintAmt.value = 0.35;
        m.u.uRim.value.setRGB(c.col[0], c.col[1] * 0.8, c.col[2] * 0.7);
        m.u.uRimAmt.value = 0.25 + 0.9 * I;
      }
    },
  };
}

// Haze motes: tiny specks that glint when they drift through light. Cross every seam.
export function motes(count = 900) {
  const base = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position);
  const seed = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) { seed[k * 4] = hash(k * 1.3); seed[k * 4 + 1] = hash(k * 2.7 + 1); seed[k * 4 + 2] = hash(k * 3.9 + 2); seed[k * 4 + 3] = hash(k * 5.1 + 3); }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
#define TAU 6.28318530718
attribute vec4 aSeed; uniform float uTime; varying vec2 vQ; varying float vA;
void main(){
  float ph = fract(uTime / 8. + aSeed.z);
  vec2 pos = vec2(aSeed.x * ${SW}., 120. + aSeed.y * 1000.);
  pos += vec2(sin(TAU * (uTime / 8. + aSeed.w)) * 30., ph * 90. - 45.);
  float s = 1.2 + 2.4 * aSeed.w * aSeed.w;
  vA = (0.25 + 0.75 * aSeed.z) * sin(PI_ * ph);
  vQ = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.x + position.x * s, ${H}. - pos.y + position.y * s, 0., 1.);
}`.replace('PI_', '3.14159265'),
    fragmentShader: `varying vec2 vQ; varying float vA; void main(){ float a = vA * smoothstep(1., 0., length(vQ)); gl_FragColor = vec4(vec3(1., .86, .7) * a * 0.55, 0.); }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 55; m.u = mat.uniforms;
  return m;
}
