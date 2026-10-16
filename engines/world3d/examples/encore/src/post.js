// Post pass over the whole rendered view: bloom (soft-knee threshold, 5-level down/up chain), red film
// halation around the hottest light, and per-slide "concert cam" punches (zoom, shake, chromatic split,
// flash). The frame is rendered to the default framebuffer as before (so ACES on the 3D models is kept),
// copied to a texture, then composited back over the screen.
import { THREE, W, H, N } from './core.js';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const PREFILTER = `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uTh, uKnee; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.);
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb; c += texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb;  c += texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uTh + uKnee, 0., 2. * uKnee);
  soft = soft * soft / (4. * uKnee + 1e-4);
  float k = max(soft, br - uTh) / max(br, 1e-4);
  gl_FragColor = vec4(c * k, 1.);
}`;
const DOWN = `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 4.;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb; c += texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb;  c += texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb;
  gl_FragColor = vec4(c / 8., 1.);
}`;
const UP = `
uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.);
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., 0.)).rgb * 2.; c += texture2D(tSrc, vUv + uTexel * vec2(1., 0.)).rgb * 2.;
  c += texture2D(tSrc, vUv + uTexel * vec2(0., -1.)).rgb * 2.; c += texture2D(tSrc, vUv + uTexel * vec2(0., 1.)).rgb * 2.;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb; c += texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb;
  c += texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb;  c += texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb;
  gl_FragColor = vec4(c / 12. + texture2D(tBase, vUv).rgb, 1.);
}`;
const COMPOSITE = `
uniform sampler2D tSrc, tBloom, tWide; uniform vec2 uView;   // strip x of the view's left / right edge
uniform vec4 uPunch[${N}];   // zoom, dx, dy (slide px), chromatic split (px)
uniform vec4 uFlash[${N}];   // rgb, amount
uniform float uBloom, uHal, uVig;
varying vec2 vUv;
vec2 toUv(vec2 sp){ return vec2((sp.x - uView.x) / (uView.y - uView.x), 1. - sp.y / ${H}.); }
void main(){
  float sx = mix(uView.x, uView.y, vUv.x);
  float sy = (1. - vUv.y) * ${H}.;
  int k = int(clamp(floor(sx / ${W}.), 0., ${N - 1}.));
  vec4 pu = uPunch[k];
  vec2 c = vec2(${W / 2}., ${H / 2}.);
  vec2 lp = vec2(sx - float(k) * ${W}., sy);
  vec2 src = c + (lp - c) / pu.x - vec2(pu.y, pu.z);
  vec2 dir = (lp - c) / ${H / 2}.;
  vec2 ca = dir * pu.w;
  vec2 lo = vec2(float(k) * ${W}. + 0.5, 0.5), hi = vec2(float(k + 1) * ${W}. - 0.5, ${H}. - 0.5);
  vec2 s0 = clamp(src + lo - vec2(0.5), lo, hi);
  vec2 sr = clamp(src + ca + lo - vec2(0.5), lo, hi);
  vec2 sb = clamp(src - ca + lo - vec2(0.5), lo, hi);
  vec3 col;
  col.r = texture2D(tSrc, toUv(sr)).r;
  col.g = texture2D(tSrc, toUv(s0)).g;
  col.b = texture2D(tSrc, toUv(sb)).b;
  vec3 bl = texture2D(tBloom, toUv(s0)).rgb;
  vec3 wide = texture2D(tWide, toUv(s0)).rgb;
  col += bl * uBloom;
  // halation: the widest glow, pushed to red-orange, like light bleeding through the film base
  float wl = dot(wide, vec3(0.35, 0.45, 0.2));
  col += vec3(1.0, 0.28, 0.12) * wl * uHal;
  // soft shoulder above 0.8 so bright light rolls off instead of clipping flat
  vec3 over = max(col - 0.8, 0.);
  col = min(col, 0.8) + 0.2 * (1. - exp(-over / 0.2));
  vec4 fl = uFlash[k];
  col = mix(col, fl.rgb, clamp(fl.a, 0., 1.));
  vec2 vq = (lp - c) / c;
  col *= 1. - uVig * pow(clamp(length(vq * vec2(0.9, 0.75)), 0., 1.4), 2.4);
  gl_FragColor = vec4(col, 1.);
}`;

export function createPost(renderer) {
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  quadGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(quadGeo); mesh.frustumCulled = false; scene.add(mesh);
  const mk = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });
  const pre = mk(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uTh: { value: 0.76 }, uKnee: { value: 0.2 } });
  const down = mk(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const up = mk(UP, { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const comp = mk(COMPOSITE, {
    tSrc: { value: null }, tBloom: { value: null }, tWide: { value: null }, uView: { value: new THREE.Vector2(0, W) },
    uPunch: { value: Array.from({ length: N }, () => new THREE.Vector4(1, 0, 0, 0)) },
    uFlash: { value: Array.from({ length: N }, () => new THREE.Vector4(1, 1, 1, 0)) },
    uBloom: { value: 0.75 }, uHal: { value: 0.5 }, uVig: { value: 0.16 },
  });
  let fbTex = null, D = [], U = [], w = 0, h = 0;
  const LEVELS = 5;
  const rt = (a, b) => new THREE.WebGLRenderTarget(a, b, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  function setSize(bw, bh) {
    if (bw === w && bh === h) return;
    w = bw; h = bh;
    if (fbTex) fbTex.dispose();
    fbTex = new THREE.FramebufferTexture(bw, bh);
    fbTex.minFilter = fbTex.magFilter = THREE.LinearFilter;
    D.forEach(r => r.dispose()); U.forEach(r => r.dispose());
    D = []; U = [];
    let a = bw, b = bh;
    for (let k = 0; k < LEVELS; k++) { a = Math.max(1, a >> 1); b = Math.max(1, b >> 1); D.push(rt(a, b)); U.push(rt(a, b)); }
  }
  function pass(mat, target) { mesh.material = mat; renderer.setRenderTarget(target); renderer.render(scene, cam); }
  return {
    comp,
    run(X0, X1) {
      renderer.copyFramebufferToTexture(fbTex, new THREE.Vector2(0, 0));
      const vp = new THREE.Vector4(); renderer.getViewport(vp);
      pre.uniforms.tSrc.value = fbTex; pre.uniforms.uTexel.value.set(1 / w, 1 / h);
      pass(pre, D[0]);
      for (let k = 1; k < LEVELS; k++) {
        down.uniforms.tSrc.value = D[k - 1].texture; down.uniforms.uTexel.value.set(1 / D[k - 1].width, 1 / D[k - 1].height);
        pass(down, D[k]);
      }
      // U[L-1] = D[L-1]; U[k] = D[k] + up(U[k+1])
      let srcTex = D[LEVELS - 1].texture;
      for (let k = LEVELS - 2; k >= 0; k--) {
        up.uniforms.tSrc.value = srcTex; up.uniforms.tBase.value = D[k].texture;
        up.uniforms.uTexel.value.set(1 / D[k + 1].width, 1 / D[k + 1].height);
        pass(up, U[k]);
        srcTex = U[k].texture;
      }
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, w, h);
      comp.uniforms.tSrc.value = fbTex; comp.uniforms.tBloom.value = U[0].texture; comp.uniforms.tWide.value = U[2].texture;
      comp.uniforms.uView.value.set(X0, X1);
      mesh.material = comp;
      renderer.render(scene, cam);
    },
    setSize,
  };
}
