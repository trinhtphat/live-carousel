// SLIDE 3 — THE IMPLANT. The Higgsfield 3D implant turns on a turntable under a spotlight over a glowing,
// reflective floor, explodes into CROWN / ABUTMENT / POST (labelled), then snaps back together on a beat.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, eInCubic, pulse, wobble, beatEnv } from './core.js';
import { bgQuad, hexv4 } from './gl.js';

const I = 2;
const FLOOR_Y = 1130;          // screen y of the floor centre
const TALL = 560;              // implant height in px

// explode amount: out 3.9-4.45, hold, snap home 5.6-6.0 (impact on the downbeat at 6.0)
const explode = t => (t < 3.9 || t >= 6.0) ? 0 : t < 4.45 ? eOutCubic(seg(t, 3.9, 4.45)) * 1.0
  : t < 5.6 ? 1 + 0.07 * smooth(seg(t, 4.45, 5.6)) : 1.07 * (1 - eInCubic(seg(t, 5.6, 6.0)));

// spin: integrate a speed profile so the implant turns exactly 2 full turns per loop
const SPIN = (() => {
  const n = 1600, out = new Float32Array(n + 1);
  const speed = t => 1 - 0.75 * clamp(explode(t)) + 1.6 * pulse(t, 6.0, 0.25);
  let acc = 0; out[0] = 0;
  for (let k = 0; k < n; k++) { acc += speed((k + 0.5) / n * 8); out[k + 1] = acc; }
  for (let k = 0; k <= n; k++) out[k] = out[k] / acc * 2 * TAU;
  return t => { const x = (t / 8) * n, k = Math.min(n - 1, Math.floor(x)), f = x - k; return mix(out[k], out[k + 1], f); };
})();

function toFloat(attr) {
  const a = new Float32Array(attr.count * attr.itemSize);
  for (let k = 0; k < attr.count; k++) for (let c = 0; c < attr.itemSize; c++) a[k * attr.itemSize + c] = attr.getComponent(k, c);
  return a;
}

// Split the Tripo mesh by height (y up): threaded post < 0.55 < titanium abutment < 0.655 < crown.
// Splits read off the radius profile (tools/profile.mjs): the abutment is the narrow neck.
function splitImplant(gltf) {
  let src = null;
  gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
  src.updateWorldMatrix(true, false);
  const g0 = src.geometry.index ? src.geometry.toNonIndexed() : src.geometry;
  const P = toFloat(g0.attributes.position), Nn = toFloat(g0.attributes.normal), UV = toFloat(g0.attributes.uv);
  const mw = src.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(mw), v = new THREE.Vector3();
  for (let k = 0; k < P.length; k += 3) {
    v.set(P[k], P[k + 1], P[k + 2]).applyMatrix4(mw); P[k] = v.x; P[k + 1] = v.y; P[k + 2] = v.z;
    v.set(Nn[k], Nn[k + 1], Nn[k + 2]).applyMatrix3(nm).normalize(); Nn[k] = v.x; Nn[k + 1] = v.y; Nn[k + 2] = v.z;
  }
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let k = 0; k < P.length; k += 3) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], P[k + c]); mx[c] = Math.max(mx[c], P[k + c]); }
  const hgt = mx[1] - mn[1], sc = TALL / hgt;
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, y0 = mn[1];
  const buckets = { post: [], abutment: [], crown: [] };
  for (let tri = 0; tri < P.length / 9; tri++) {
    let y = 0;
    for (let q = 0; q < 3; q++) y += P[tri * 9 + q * 3 + 1];
    const yn = (y / 3 - y0) / hgt;
    buckets[yn < 0.55 ? 'post' : yn < 0.655 ? 'abutment' : 'crown'].push(tri);
  }
  const out = {};
  for (const [name, tris] of Object.entries(buckets)) {
    const n = tris.length * 3;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let sx = 0, sy = 0, sz = 0;
    tris.forEach((tri, j) => {
      for (let q = 0; q < 3; q++) {
        const s = tri * 3 + q, d = j * 3 + q;
        pos[d * 3] = (P[s * 3] - cx) * sc; pos[d * 3 + 1] = (P[s * 3 + 1] - y0) * sc; pos[d * 3 + 2] = (P[s * 3 + 2] - cz) * sc;
        nor[d * 3] = Nn[s * 3]; nor[d * 3 + 1] = Nn[s * 3 + 1]; nor[d * 3 + 2] = Nn[s * 3 + 2];
        uv[d * 2] = UV[s * 2]; uv[d * 2 + 1] = UV[s * 2 + 1];
        sx += pos[d * 3]; sy += pos[d * 3 + 1]; sz += pos[d * 3 + 2];
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out[name] = { geo, centroid: new THREE.Vector3(sx / n, sy / n, sz / n) };
  }
  return { parts: out, material: src.material };
}

export function init(ctx) {
  // ---------- background: spotlight, glowing floor, horizon ----------
  const bg = bgQuad(I, /* glsl */`uniform float uBeat; uniform float uShock; uniform float uLift; uniform float uFlash; uniform float uSpot;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.11, 0.32, 0.46), vec3(0.05, 0.17, 0.26), smoothstep(0., 1060., p.y));
    col = mix(col, vec3(0.07, 0.20, 0.28), smoothstep(1060., 1350., p.y));
    vec2 c = p - vec2(540., -160.);
    float ang = abs(c.x) / max(c.y, 1.);
    float n = fbm(vec2(p.x * 0.004, p.y * 0.002) + loopv(t) * 0.7);
    float cone = smoothstep(0.43, 0.22, ang) * smoothstep(1280., 600., p.y);
    add += vec3(0.50, 0.80, 0.95) * cone * (0.10 + 0.07 * n) * uSpot;
    add += vec3(0.90, 0.98, 1.0) * exp(-length((p - vec2(540., 0.)) * vec2(0.012, 0.03))) * 0.5 * uSpot;
    // floor
    vec2 f = (p - vec2(540., ${FLOOR_Y}.)) * vec2(1., 3.4);
    float fd = length(f);
    add += vec3(0.10, 0.60, 1.0) * exp(-fd * fd / (380. * 380.)) * (0.40 + 0.28 * uBeat);
    add += vec3(0.70, 0.95, 1.0) * exp(-fd * fd / (170. * 170.)) * 0.22 * (0.6 + 0.4 * uBeat);
    col *= 1. - 0.75 * exp(-fd * fd / (230. * 230.)) * (1. - uLift) * smoothstep(${FLOOR_Y - 30}., ${FLOOR_Y + 10}., p.y + 0.);
    // floor ring + beat ripples
    float ring = exp(-pow((fd - 430.) / 3.5, 2.));
    add += vec3(0.45, 0.88, 1.0) * ring * (0.35 + 0.5 * uBeat);
    float bp = fract(t / 0.5);
    add += vec3(0.25, 0.80, 1.0) * exp(-pow((fd - (430. + bp * 380.)) / 6., 2.)) * (1. - bp) * 0.35;
    if (uShock > 0.0) add += vec3(0.75, 0.97, 1.0) * exp(-pow((fd - uShock * 1300.) / 18., 2.)) * (1. - uShock) * 1.6;
    // horizon laser: crosses into slide 4
    add += vec3(0.45, 0.90, 1.0) * exp(-abs(p.y - ${FLOOR_Y - 70}.) / 1.6) * 0.30 * smoothstep(0., 400., p.x);
    add += vec3(0.10, 0.55, 0.90) * exp(-abs(p.y - ${FLOOR_Y - 70}.) / 22.) * 0.10;
    col *= mix(0.85, 1.0, smoothstep(0., 260., p.y));
    add += uFlash * vec3(0.45, 0.88, 1.0);
  `, { uBeat: { value: 0 }, uShock: { value: 0 }, uLift: { value: 0 }, uFlash: { value: 0 }, uSpot: { value: 1 } });
  bg.u.uSeamL.value = hexv4('#164a6e', 1);
  bg.u.uSeamR.value = hexv4('#8d9ba3', 1);
  ctx.bgScene.add(bg);

  // ---------- 3D ----------
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  const imp = splitImplant(ctx.assets.implantGltf);
  const mat = imp.material;
  mat.side = THREE.DoubleSide;
  mat.envMapIntensity = 1.3;
  const stageG = new THREE.Group();
  stageG.position.set(0, 675 - FLOOR_Y, 0);
  stageG.rotation.x = 0.2;
  scene.add(stageG);
  const root = new THREE.Group(), mroot = new THREE.Group();
  mroot.scale.set(1, -1, 1);
  stageG.add(root, mroot);

  // reflection material: fades with depth below the floor
  const stageInv = { value: new THREE.Matrix4() };
  const refl = { value: 0.34 };
  const rmat = mat.clone();
  rmat.transparent = true; rmat.depthWrite = true; rmat.side = THREE.DoubleSide;
  rmat.onBeforeCompile = sh => {
    sh.uniforms.uStageInv = stageInv; sh.uniforms.uRefl = refl;
    sh.vertexShader = 'uniform mat4 uStageInv; varying float vH;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n vH = (uStageInv * modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform float uRefl; varying float vH;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n gl_FragColor.rgb *= 0.8; gl_FragColor.a *= uRefl * smoothstep(-280.0, -6.0, vH);');
  };
  const pieces = {};
  const OFF = {
    post: { p: [0, -10, 0], r: [0, 0, 0.04] },
    abutment: { p: [0, 70, 0], r: [0.0, 0, -0.06] },
    crown: { p: [0, 165, 0], r: [-0.14, 0.4, 0.08] },
  };
  for (const [name, part] of Object.entries(imp.parts)) {
    const a = new THREE.Mesh(part.geo, mat), b = new THREE.Mesh(part.geo, rmat);
    a.renderOrder = 2; b.renderOrder = 1;
    root.add(a); mroot.add(b);
    pieces[name] = { a, b, part, off: OFF[name] };
  }

  const spot = new THREE.SpotLight(0xeefcff, 5.5, 0, 0.55, 0.7, 0);
  spot.position.set(0, 1500, 500); spot.target.position.set(0, -300, 0);
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x2fc8ff, 3.2); rim.position.set(-900, 400, -700);
  const rim2 = new THREE.DirectionalLight(0x9fe8ff, 1.6); rim2.position.set(900, 200, -500);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(300, 200, 900);
  scene.add(rim, rim2, fill, new THREE.AmbientLight(0x2a4a5a, 0.6));

  // ---------- DOM ----------
  const el = ctx.dom[I];
  const svg = el.querySelector('svg.xlabels');
  const NS = 'http://www.w3.org/2000/svg';
  const LABELS = [
    { key: 'crown', title: 'CROWN', sub: 'ZIRCONIA, SHADE-MATCHED', side: 1 },
    { key: 'abutment', title: 'ABUTMENT', sub: 'CUSTOM-MILLED TITANIUM', side: -1 },
    { key: 'post', title: 'POST', sub: 'FUSES WITH YOUR BONE', side: 1 },
  ];
  const labs = LABELS.map(L => {
    const line = document.createElementNS(NS, 'polyline'); svg.append(line);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 5); svg.append(dot);
    const d = document.createElement('div'); d.className = 'x-label'; d.innerHTML = `<b>${L.title}</b><span>${L.sub}</span>`;
    el.append(d);
    return { ...L, line, dot, d };
  });
  const rot = el.querySelector('.s3-rot b');
  const mode = el.querySelector('.s3-mode');
  const head = el.querySelector('.s3-head');
  const flash = el.querySelector('.flash');
  const v = new THREE.Vector3();
  const pc = ctx.projCam;
  const ANG0 = -0.4;

  return {
    update(t) {
      const e = explode(t);
      const eo = clamp(e);
      const a = ANG0 + SPIN(t);
      const lift = 70 * eo + 7 * Math.sin(TAU * t / 4);
      const shake = 10 * wobble(t, 6.0, 7, 9);
      stageG.position.x = shake;
      stageG.position.y = 675 - FLOOR_Y + 0.6 * shake;
      root.position.y = lift; mroot.position.y = -lift;
      root.rotation.y = mroot.rotation.y = a;
      root.rotation.z = mroot.rotation.z = 0.06 * Math.sin(TAU * t / 8) * (1 - eo);
      for (const pz of Object.values(pieces)) {
        const o = pz.off, w = 0.5 * wobble(t, 6.0, 2.6, 7);
        pz.a.position.set(o.p[0] * e, o.p[1] * (e + w * 0.12), o.p[2] * e);
        pz.a.rotation.set(o.r[0] * e, o.r[1] * e, o.r[2] * e);
        pz.b.position.copy(pz.a.position); pz.b.rotation.copy(pz.a.rotation);
      }
      stageG.updateMatrixWorld(true);
      stageInv.value.copy(stageG.matrixWorld).invert();
      refl.value = 0.34 * (1 - 0.6 * eo);
      spot.intensity = 5.5 + 2.5 * beatEnv(t, 0.15) + 4 * pulse(t, 6.0, 0.12);

      const shock = t >= 6.0 && t < 7.0 ? seg(t, 6.0, 7.0) : 0;
      bg.u.uBeat.value = beatEnv(t, 0.18) + pulse(t, 6.0, 0.25);
      bg.u.uShock.value = shock;
      bg.u.uLift.value = eo;
      bg.u.uFlash.value = 0.32 * pulse(t, 6.0, 0.05) + 0.2 * pulse(t, 3.9, 0.05);
      bg.u.uSpot.value = 1 + 0.6 * pulse(t, 6.0, 0.2);

      // labels follow the pieces
      labs.forEach((L, k) => {
        const pz = pieces[L.key];
        v.copy(pz.part.centroid); pz.a.localToWorld(v); v.project(pc);
        const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
        const vis = smooth(seg(e, 0.55 + k * 0.08, 0.95));
        const lx = L.side > 0 ? 770 : 64, ly = y - 10;
        const ex = L.side > 0 ? 730 : 330;
        L.line.setAttribute('points', `${x},${y} ${ex},${ly} ${L.side > 0 ? lx - 12 : lx + 250},${ly}`);
        L.line.style.opacity = vis; L.dot.style.opacity = vis;
        L.dot.setAttribute('cx', x); L.dot.setAttribute('cy', y);
        L.d.style.left = lx + 'px';
        L.d.style.top = (ly - 34) + 'px';
        L.d.style.opacity = vis;
        L.d.style.transform = `translateX(${(1 - vis) * 20 * L.side}px)`;
      });
      const deg = ((a - ANG0) * 180 / Math.PI) % 360;
      rot.textContent = String(Math.floor(deg)).padStart(3, '0') + '°';
      mode.textContent = e > 0.4 ? 'EXPLODED VIEW' : 'ASSEMBLED';
      mode.classList.toggle('on', e > 0.4);
      flash.style.opacity = 0.22 * pulse(t, 6.0, 0.05);
      head.style.transform = `translateY(${4 * wobble(t, 6.0, 3, 7)}px)`;
    },
  };
}
