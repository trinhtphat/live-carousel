// Shared pieces every slide uses: the VU meter, product staging (contact shadow + deck reflection),
// spark fountains (gerbs), confetti cannons, flame jets. All pure functions of t, loop-safe.
import { THREE, W, H, SW, TAU, LOOP, FLOOR_Y, sprite, place, sizePx, clamp, mix, hash, kickEnv, snareEnv, beatEnv, lnoise, since } from './core.js';
import { COMMON } from './gl.js';

// ---------- VU meter (DOM/SVG) ----------
export function vu(el, volLabel) {
  el.innerHTML = `<div class="face"><svg viewBox="0 0 190 112">
    <path d="M 22 92 A 78 78 0 0 1 168 92" fill="none" stroke="#2a1a10" stroke-width="2"/>
    <path d="M 128 34 A 78 78 0 0 1 168 92" fill="none" stroke="#c4161c" stroke-width="7"/>
    ${Array.from({ length: 11 }, (_, k) => { const a = (-58 + k * 11.6) * Math.PI / 180, r1 = 78, r2 = k % 2 ? 70 : 66;
      return `<line x1="${95 + Math.sin(a) * r1}" y1="${104 - Math.cos(a) * r1}" x2="${95 + Math.sin(a) * r2}" y2="${104 - Math.cos(a) * r2}" stroke="${k > 7 ? '#c4161c' : '#2a1a10'}" stroke-width="${k % 2 ? 1.5 : 2.5}"/>`; }).join('')}
    <text x="20" y="22" font-family="Stencil" font-size="11" fill="#2a1a10">-20</text>
    <text x="88" y="16" font-family="Stencil" font-size="11" fill="#2a1a10">-3</text>
    <text x="160" y="22" font-family="Stencil" font-size="11" fill="#c4161c">+3</text>
    <line class="needle" x1="95" y1="104" x2="95" y2="22" stroke="#140708" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="95" cy="104" r="7" fill="#140708"/></svg>
    <div class="lbl">VOL <b>${volLabel}</b></div><div class="glow"></div></div>`;
  const needle = el.querySelector('.needle'), glow = el.querySelector('.glow');
  return (v, hot = 0) => {
    const a = -58 + clamp(v, 0, 1.04) * 116;
    needle.setAttribute('transform', `rotate(${a.toFixed(2)} 95 104)`);
    glow.style.background = `radial-gradient(ellipse at 50% 100%,rgba(255,170,60,${(0.15 + 0.5 * hot).toFixed(3)}),rgba(255,140,40,0) 70%)`;
  };
}
// a believable needle: sits at `base`, kicks on beats, a little jitter
export const needle = (t, base, kick = 0.2, snare = 0.14, jit = 0.03) =>
  base + kick * kickEnv(t, 0.16) + snare * snareEnv(t, 0.14) + jit * lnoise(t * 4 % LOOP, base * 10, 3);

// ---------- staging a product on the deck ----------
// Returns { main, refl, shadow }: the product sprite, its mirrored reflection on the glossy deck, and a soft
// contact shadow. (x, baseY) = slide px of the contact point (bottom-centre), h = height in px.
export function staged(ctx, scene, i, asset, x, baseY, h, { segs = 1, order = 10, reflect = 0.22, shadowW = 0.7 } = {}) {
  const s = h / asset.h;
  const main = sprite(asset.tex, asset.w, asset.h, { segs, order });
  place(main, i, x, baseY, s, 0.5, 1);
  const refl = sprite(asset.tex, asset.w, asset.h, { segs, order: order - 2 });
  place(refl, i, x, baseY, s, 0.5, 0);
  refl.scale.y *= -1;                                 // mirror about the contact line
  refl.u.uOpacity.value = reflect;
  refl.u.uFade.value.set(0.0, 0.32);                  // only the part near the contact line shows
  refl.u.uDark.value = 0.35;
  const shadow = sprite(ctx.radialTex, 256, 256, { order: order - 1 });
  shadow.u.uTint.value.setRGB(0, 0, 0); shadow.u.uTintAmt.value = 1; shadow.u.uOpacity.value = 0.65;
  sizePx(shadow, asset.w * s * shadowW, 46);
  shadow.position.set(i * W + x, H - baseY - 4, 0);
  scene.add(shadow, refl, main);
  return { main, refl, shadow, s };
}

// ---------- particles ----------
function instanced(count, fill) {
  const base = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position);
  const a = new Float32Array(count * 4), b = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) fill(k, a, b);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(a, 4));
  geo.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 4));
  geo.instanceCount = count;
  return geo;
}

// Spark fountain (gerb): emits from (x, y) slide px between [t0, t1), sparks arc up and fall, white-hot to red.
// Loop-safe: ages wrap around the loop.
export function gerb(i, x, y, t0, t1, { count = 420, speed = 1150, spread = 0.2, angle = 0, life = 1.3, gravity = 1500, size = 1, order = 40 } = {}) {
  const geo = instanced(count, (k, a, b) => {
    a[k * 4] = hash(k * 1.7 + x); a[k * 4 + 1] = hash(k * 3.3 + 7 + y); a[k * 4 + 2] = hash(k * 5.9 + 11); a[k * 4 + 3] = hash(k * 7.1 + 13);
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 1 } },
    vertexShader: /* glsl */`
attribute vec4 aSeed; uniform float uTime; varying vec2 vQ; varying float vA; varying float vHeat;
void main(){
  float birth = ${t0.toFixed(3)} + aSeed.x * ${(t1 - t0).toFixed(3)};
  float age = mod(uTime - birth, ${LOOP}.);
  float life = ${life.toFixed(3)} * (0.55 + 0.45 * aSeed.y);
  vA = 0.; vHeat = 0.;
  vec2 pos = vec2(-9999.);
  vec2 dir = vec2(0., 1.);
  if (age < life) {
    float ang = ${angle.toFixed(3)} + (aSeed.z - 0.5) * 2. * ${spread.toFixed(3)};
    float sp = ${speed.toFixed(1)} * (0.55 + 0.45 * aSeed.w);
    vec2 v = vec2(sin(ang), cos(ang)) * sp;            // y up
    pos = vec2(${(i * W + x).toFixed(1)}, ${(H - y).toFixed(1)}) + v * age + vec2(0., -0.5 * ${gravity.toFixed(1)} * age * age);
    vec2 vel = v + vec2(0., -${gravity.toFixed(1)} * age);
    dir = normalize(vel + vec2(0.0001));
    float f = age / life;
    vA = (1. - f) * (1. - f) * (0.7 + 0.3 * aSeed.y);
    vHeat = 1. - f;
  }
  float len = (8. + 16. * vHeat) * ${size.toFixed(2)};
  vec2 side = vec2(dir.y, -dir.x);
  vQ = position.xy;
  vec2 off = side * position.x * 1.6 * ${size.toFixed(2)} + dir * position.y * len;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + off, 0., 1.);
}`,
    fragmentShader: /* glsl */`
uniform float uAmt; varying vec2 vQ; varying float vA; varying float vHeat;
void main(){
  float a = vA * uAmt * (1. - smoothstep(0.2, 1., abs(vQ.x))) * smoothstep(-1., 0.2, vQ.y) * (1. - smoothstep(0.7, 1., vQ.y));
  if (a < 0.003) discard;
  vec3 c = mix(vec3(1.0, 0.25, 0.05), mix(vec3(1.0, 0.72, 0.3), vec3(1.0, 0.97, 0.85), smoothstep(0.6, 1., vHeat)), smoothstep(0., 0.6, vHeat));
  gl_FragColor = vec4(c * a * 1.6, 0.);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = order; m.u = mat.uniforms;
  return m;
}

// Confetti: bursts fired from cannons (list of {x, y, at, angle, spread, speed}) + a steady fall from the rig.
// Paper squares tumble (flip), drift and flutter; colours cream / red / gold.
export function confetti(bursts, { count = 700, fall = 0, fallFrom = [0, SW], order = 45, size = 1 } = {}) {
  const NB = bursts.length;
  const geo = instanced(count, (k, a, b) => {
    a[k * 4] = hash(k * 1.31 + 1); a[k * 4 + 1] = hash(k * 2.17 + 3); a[k * 4 + 2] = hash(k * 3.71 + 5); a[k * 4 + 3] = hash(k * 4.93 + 7);
    b[k * 4] = hash(k * 6.1 + 9); b[k * 4 + 1] = hash(k * 7.7 + 11); b[k * 4 + 2] = k % (NB + (fall ? 1 : 0)); b[k * 4 + 3] = hash(k * 9.3 + 13);
  });
  const bu = bursts.map(bz => new THREE.Vector4(bz.x, H - bz.y, bz.at, bz.angle || 0));
  const bp = bursts.map(bz => new THREE.Vector4(bz.spread ?? 0.5, bz.speed ?? 1600, bz.life ?? 4.2, 0));
  while (bu.length < 6) { bu.push(new THREE.Vector4(0, 0, -100, 0)); bp.push(new THREE.Vector4(0, 0, 0, 0)); }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uB: { value: bu }, uBP: { value: bp }, uFall: { value: fall } },
    vertexShader: /* glsl */`
#define TAU 6.28318530718
attribute vec4 aSeed; attribute vec4 aB; uniform float uTime; uniform vec4 uB[6]; uniform vec4 uBP[6]; uniform float uFall;
varying vec2 vQ; varying float vA; varying vec3 vCol; varying float vFlip;
void main(){
  int bi = int(aB.z);
  vec2 pos = vec2(-9999.); vA = 0.;
  float tumble = 0.;
  float k = 2.2;                                  // drag
  float vt = 170. + 120. * aSeed.w;              // terminal fall speed
  if (bi < ${NB}) {
    vec4 B = uB[bi]; vec4 P = uBP[bi];
    float age = mod(uTime - B.z - aSeed.x * 0.08, ${LOOP}.);
    if (age < P.z) {
      float ang = B.w + (aSeed.y - 0.5) * 2. * P.x;
      vec2 v0 = vec2(sin(ang), cos(ang)) * P.y * (0.45 + 0.55 * aSeed.z);
      float e = (1. - exp(-k * age)) / k;
      pos = B.xy + v0 * e - vec2(0., vt * (age - e));
      pos.x += sin(age * (2. + 3. * aSeed.w) + aSeed.x * 6.) * 26. * smoothstep(0.2, 1., age);
      vA = smoothstep(0., 0.05, age) * (1. - smoothstep(P.z - 0.8, P.z, age));
      tumble = age;
    }
  } else if (uFall > 0.) {
    float per = ${LOOP}. / 2.;
    float age = mod(uTime + aSeed.x * per, per);
    float x = mix(${fallFrom[0].toFixed(1)}, ${fallFrom[1].toFixed(1)}, aSeed.y);
    pos = vec2(x + sin(age * (1.6 + 2. * aSeed.w) + aSeed.z * 6.) * 30., ${H + 40}. - age * (${H + 80}. / per));
    vA = uFall;
    tumble = age;
  }
  vFlip = cos(tumble * (5. + 6. * aSeed.z) + aSeed.w * 6.);
  float ca = aB.x;
  vCol = ca < 0.42 ? vec3(0.97, 0.92, 0.82) : ca < 0.74 ? vec3(0.86, 0.08, 0.1) : ca < 0.92 ? vec3(1.0, 0.74, 0.28) : vec3(0.08, 0.06, 0.06);
  float s = (7. + 6. * aB.y) * ${size.toFixed(2)};
  float rot = tumble * (2. + 4. * aB.w) + aB.w * 6.;
  vec2 q = position.xy * vec2(s * 1.4 * max(abs(vFlip), 0.12), s * 0.8);
  q = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * q;
  vQ = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + q, 0., 1.);
}`,
    fragmentShader: /* glsl */`
varying vec2 vQ; varying float vA; varying vec3 vCol; varying float vFlip;
void main(){
  if (vA < 0.003) discard;
  vec3 c = vCol * (0.55 + 0.45 * abs(vFlip)) + vec3(0.25) * pow(max(vFlip, 0.), 8.);
  gl_FragColor = vec4(c * vA, vA);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = order; m.u = mat.uniforms;
  return m;
}

// A flame jet (stage pyro) shooting up from (x, y) slide px. Height and level set per frame via uniforms.
export function flameJet(i, x, y, { w = 260, h = 760, order = 42 } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uLen: { value: 1 }, uSeed: { value: hash(x * 0.37 + i) * 10 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: COMMON.replace('uniform float uTime; uniform float uOff;', 'uniform float uTime;') + /* glsl */`
uniform float uAmt, uLen, uSeed;
void main(){
  vec2 uv = vUv;                              // x across, y up from the nozzle
  float y = uv.y / max(uLen, 0.001);
  if (y > 1.) discard;
  float t = uTime;
  vec2 q = vec2((uv.x - 0.5) * 2., y);
  // a flame-projector column: tight at the nozzle, licking and widening as it rises, ragged edges
  float n = fbm(vec2(q.x * 1.6, y * 2.6 - t * 5.) + uSeed + loopv(t) * 0.25);
  float n2 = fbm(vec2(q.x * 4.0 + 3., y * 5.5 - t * 8.) + uSeed * 2.);
  float width = mix(0.07, 0.62, pow(y, 0.75)) * (0.7 + 0.6 * n);
  float d = abs(q.x + (n2 - 0.5) * 0.6 * y + (n - 0.5) * 0.25 * y) / width;
  float body = 1. - smoothstep(0.55, 1.0, d);
  float tip = 1. - smoothstep(0.62 + 0.3 * n, 0.98, y);
  body *= tip * smoothstep(0., 0.02, y);
  float heat = body * (1.35 - 0.9 * y) * (0.65 + 0.7 * n2) * (1. - 0.5 * smoothstep(0.2, 1., d));
  vec3 c = mix(vec3(0.55, 0.04, 0.0), vec3(1.0, 0.42, 0.04), smoothstep(0.05, 0.45, heat));
  c = mix(c, vec3(1.0, 0.86, 0.45), smoothstep(0.55, 0.95, heat));
  c = mix(c, vec3(1.0, 0.98, 0.9), smoothstep(1.0, 1.3, heat));
  float a = clamp(body * uAmt * (0.35 + 0.85 * heat), 0., 1.);
  gl_FragColor = vec4(c * a * 1.5, a * 0.0);
}`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(i * W + x, H - y + h / 2, 0); m.renderOrder = order; m.frustumCulled = false; m.u = mat.uniforms;
  return m;
}

// glow sprite helper (additive radial)
export function glow(ctx, i, x, y, size, rgb, order = 30) {
  const g = sprite(ctx.radialTex, 256, 256, { additive: true, order });
  sizePx(g, size); g.position.set(i * W + x, H - y, 0);
  g.u.uTint.value.setRGB(...rgb); g.u.uTintAmt.value = 1;
  return g;
}

// standard "hit" on a slide: post punch + flash, decaying after `at`
export function hit(ctx, i, t, at, { zoom = 0.045, shake = 10, ca = 7, flash = 0.35, col = [1, 0.93, 0.82], dur = 0.22 } = {}) {
  const d = since(t, at);
  if (d > 1.6) return;
  const e = Math.exp(-d / dur);
  const p = ctx.punch[i];
  p.x *= 1 + zoom * e;
  p.y += shake * e * Math.sin(d * 70 + i);
  p.z += shake * 0.8 * e * Math.cos(d * 83 + i * 2);
  p.w += ca * e;
  const f = ctx.flash[i];
  const fa = flash * Math.exp(-d / (dur * 0.45));
  if (fa > f.w) { f.set(col[0], col[1], col[2], fa); }
}

// Dust puffs kicked up off the deck: bursts = [{x, y, at, k}] in strip x / slide y. Up to 32 bursts.
export function puffs(bursts, { per = 22, life = 1.1, spread = 260, col = [0.78, 0.6, 0.55], order = 44 } = {}) {
  const NBU = bursts.length;
  const count = NBU * per;
  const geo = instanced(count, (k, a, b) => {
    a[k * 4] = Math.floor(k / per); a[k * 4 + 1] = hash(k * 1.9 + 3); a[k * 4 + 2] = hash(k * 2.3 + 5); a[k * 4 + 3] = hash(k * 3.7 + 9);
  });
  const bu = bursts.map(z => new THREE.Vector4(z.x, H - z.y, z.at, z.k ?? 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uB: { value: bu }, uAmt: { value: 1 } },
    vertexShader: /* glsl */`
attribute vec4 aSeed; uniform float uTime; uniform vec4 uB[${NBU}]; varying vec2 vQ; varying float vA;
void main(){
  vec4 B = uB[int(aSeed.x)];
  float age = mod(uTime - B.z, ${LOOP}.);
  float L = ${life.toFixed(2)} * (0.6 + 0.4 * aSeed.w);
  vA = 0.; vec2 pos = vec2(-9999.);
  if (age < L) {
    float side = aSeed.y < 0.5 ? -1. : 1.;
    vec2 dir = normalize(vec2(side * (0.6 + 0.8 * aSeed.z), 0.08 + 0.35 * aSeed.w));
    float k = 3.2;
    pos = B.xy + dir * ${spread.toFixed(1)} * B.w * (0.5 + 0.7 * aSeed.z) * (1. - exp(-k * age));
    float f = age / L;
    vA = (1. - f) * (1. - f) * smoothstep(0., 0.04, age) * B.w * 0.42;
    float s = (14. + 70. * f) * (0.6 + 0.6 * aSeed.w) * (0.6 + 0.4 * B.w);
    vQ = position.xy;
    pos += position.xy * s;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0., 1.);
}`,
    fragmentShader: /* glsl */`
uniform float uAmt; varying vec2 vQ; varying float vA;
void main(){ float a = vA * uAmt * smoothstep(1., 0.1, length(vQ)); if (a < 0.003) discard; gl_FragColor = vec4(vec3(${col.map(c => c.toFixed(3)).join(',')}) * a, a); }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = order; m.u = mat.uniforms;
  return m;
}

// circular canvas art for a drum head: blackletter logo + tour line + a thin ring, colour texture
export function drumHeadTex() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.translate(512, 512);
  x.strokeStyle = '#b5121a'; x.lineWidth = 10; x.beginPath(); x.arc(0, 0, 440, 0, TAU); x.stroke();
  x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 418, 0, TAU); x.stroke();
  x.fillStyle = '#b5121a'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = '700 300px Fraktur'; x.fillText('Encore', 0, 70);
  x.font = '400 54px Stencil'; x.letterSpacing = '18px'; x.fillText("LOUD TOUR '26", 0, 190);
  x.font = '400 40px Marker'; x.letterSpacing = '0px'; x.fillStyle = '#1a0b0b'; x.fillText('★ on drums ★', 0, -190);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = true; tex.anisotropy = 4; tex.needsUpdate = true;
  return { tex, w: 1024, h: 1024 };
}
