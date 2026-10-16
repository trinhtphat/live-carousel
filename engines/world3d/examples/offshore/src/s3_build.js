// SLIDE 3 — THE BUILD. The Higgsfield 3D board spins 360° under a sun shaft over a glowing water floor,
// explodes into DECK / CORE / HULL / FINS (labelled), then snaps back together on the downbeat at 6.0.
import { THREE, W, H, TAU, CAUSTIC, clamp, mix, seg, smooth, eOutCubic, eInCubic, pulse, wobble, beatEnv } from './core.js';
import { bgQuad, hexv4 } from './gl.js';

const I = 2;
const FLOOR_Y = 1030;          // screen y of the floor centre
const LEN = 780;               // board length in px

// explode amount: out 3.9-4.45, hold, snap home 5.6-6.0 (impact on the downbeat at 6.0)
const explode = t => (t < 3.9 || t >= 6.0) ? 0 : t < 4.45 ? eOutCubic(seg(t, 3.9, 4.45)) * 1.0
  : t < 5.6 ? 1 + 0.07 * smooth(seg(t, 4.45, 5.6)) : 1.07 * (1 - eInCubic(seg(t, 5.6, 6.0)));

// spin: integrate a speed profile so the board turns exactly 2 full turns per loop
const SPIN = (() => {
  const n = 1600, out = new Float32Array(n + 1);
  const speed = t => 1 - 0.8 * clamp(explode(t)) + 1.6 * pulse(t, 6.0, 0.25);
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
const lerpTable = (tab, z0, z1, z) => {
  const B = tab.length, x = clamp((z - z0) / (z1 - z0)) * B - 0.5, k = Math.max(0, Math.min(B - 2, Math.floor(x)));
  return mix(tab[k], tab[k + 1], clamp(x - k, -0.5, 1.5));
};

// Split the Tripo board into deck / hull shells + fins, and build a foam core + stringer to sit between.
function splitBoard(gltf) {
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
  const len = mx[2] - mn[2], sc = LEN / len;
  const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
  // per length bin: deck top, hull bottom (5th pct), half width
  const B = 40, bins = Array.from({ length: B }, () => ({ ys: [], hw: 0, top: -1e9 }));
  const binOf = z => Math.max(0, Math.min(B - 1, Math.floor((z - mn[2]) / len * B)));
  for (let k = 0; k < P.length; k += 3) {
    const b = bins[binOf(P[k + 2])];
    b.ys.push(P[k + 1]); b.top = Math.max(b.top, P[k + 1]); b.hw = Math.max(b.hw, Math.abs(P[k] - cx));
  }
  const pct = (a, f) => { const s = Float32Array.from(a).sort(); return s[Math.floor(f * (s.length - 1))]; };
  const bottom = bins.map(b => (b.ys.length ? pct(b.ys, 0.05) : 0));
  const minY = bins.map(b => (b.ys.length ? Math.min(...b.ys) : 0));
  // the tail is the end the fins hang from
  const lowA = Math.min(...minY.slice(0, B / 2)), lowB = Math.min(...minY.slice(B / 2));
  const tailLow = lowA < lowB;                     // true: tail at -z
  // fins drag the hull estimate down near the tail: bridge those bins linearly from the tail tip
  const order = tailLow ? [...Array(B).keys()] : [...Array(B).keys()].reverse();
  const finZone = Math.round(B * 0.27);
  const tip = bottom[order[0]], clean = bottom[order[finZone]];
  for (let q = 1; q < finZone; q++) bottom[order[q]] = mix(tip, clean, q / finZone);
  const hull = bottom, top = bins.map(b => b.top);
  const z0 = mn[2], z1 = mx[2];
  const midAt = z => (lerpTable(top, z0, z1, z) + lerpTable(hull, z0, z1, z)) / 2;
  const hullAt = z => lerpTable(hull, z0, z1, z);
  const y0 = midAt(cz);

  const buckets = { deck: [], hull: [], fins: [] };
  for (let tri = 0; tri < P.length / 9; tri++) {
    let x = 0, y = 0, z = 0;
    for (let q = 0; q < 3; q++) { x += P[tri * 9 + q * 3]; y += P[tri * 9 + q * 3 + 1]; z += P[tri * 9 + q * 3 + 2]; }
    x /= 3; y /= 3; z /= 3;
    const fromTail = tailLow ? (z - z0) / len : (z1 - z) / len;
    let b = y > midAt(z) ? 'deck' : 'hull';
    if (fromTail < 0.36 && y < hullAt(z) - 0.016 * len) b = 'fins';
    buckets[b].push(tri);
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
    out[name] = { geo, centroid: new THREE.Vector3(sx / Math.max(n, 1), sy / Math.max(n, 1), sz / Math.max(n, 1)) };
  }
  // foam core: the board outline inset a little, bent to the rocker, about 60% of the thickness
  const pts = [];
  const hw = bins.map(b => b.hw);
  const S = 64;
  for (let k = 0; k <= S; k++) { const z = mix(z0 + len * 0.03, z1 - len * 0.03, k / S); pts.push([lerpTable(hw, z0, z1, z) * 0.84, z]); }
  const shape = new THREE.Shape();
  pts.forEach(([x, z], k) => (k ? shape.lineTo(x * sc, (z - cz) * sc) : shape.moveTo(x * sc, (z - cz) * sc)));
  for (let k = pts.length - 1; k >= 0; k--) shape.lineTo(-pts[k][0] * sc, (pts[k][1] - cz) * sc);
  const thick = (lerpTable(top, z0, z1, cz) - lerpTable(hull, z0, z1, cz)) * sc * 0.5;
  const coreGeo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.25, bevelSize: thick * 0.3, bevelSegments: 3, curveSegments: 4 });
  coreGeo.rotateX(Math.PI / 2);                     // shape plane xy -> xz, extrusion along -y
  coreGeo.translate(0, thick / 2, 0);
  const cp = coreGeo.attributes.position;
  for (let k = 0; k < cp.count; k++) {
    // the shape's y became -z after rotateX; bend each vertex to the rocker line
    const zz = cp.getZ(k) / sc + cz;
    cp.setY(k, cp.getY(k) + (midAt(zz) - y0) * sc);
  }
  coreGeo.computeVertexNormals();
  const stringer = new THREE.BoxGeometry(LEN * 0.0055, thick * 1.18, len * sc * 0.955, 1, 1, 48);
  const sp = stringer.attributes.position;
  for (let k = 0; k < sp.count; k++) { const zz = sp.getZ(k) / sc + cz; sp.setY(k, sp.getY(k) + (midAt(zz) - y0) * sc); }
  stringer.computeVertexNormals();
  return { parts: out, material: src.material, tailSign: tailLow ? -1 : 1, coreGeo, stringer, thick };
}

export function init(ctx) {
  // ---------- background: sun shaft, glowing water floor, the waterline ----------
  const bg = bgQuad(I, CAUSTIC + /* glsl */`uniform float uBeat; uniform float uShock; uniform float uLift; uniform float uFlash; uniform float uSpot;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.080, 0.330, 0.390), vec3(0.020, 0.120, 0.160), smoothstep(0., 980., p.y));
    col = mix(col, vec3(0.030, 0.150, 0.190), smoothstep(980., 1350., p.y));
    vec2 c = p - vec2(540., -160.);
    float ang = abs(c.x) / max(c.y, 1.);
    float n = fbm(vec2(p.x * 0.004, p.y * 0.002) + loopv(t) * 0.7);
    float cone = smoothstep(0.43, 0.22, ang) * smoothstep(1200., 600., p.y);
    add += vec3(0.75, 0.92, 0.95) * cone * (0.09 + 0.07 * n) * uSpot;
    add += vec3(1.0, 0.95, 0.88) * exp(-length((p - vec2(540., 0.)) * vec2(0.012, 0.03))) * 0.5 * uSpot;
    // the floor: a pool of lit water
    vec2 f = (p - vec2(540., ${FLOOR_Y}.)) * vec2(1., 3.4);
    float fd = length(f);
    float pool = exp(-fd * fd / (380. * 380.));
    add += vec3(0.08, 0.62, 0.66) * pool * (0.40 + 0.25 * uBeat);
    add += vec3(0.55, 0.95, 0.95) * exp(-fd * fd / (170. * 170.)) * 0.20 * (0.6 + 0.4 * uBeat);
    add += vec3(0.5, 1.0, 1.0) * caustic(vec2(p.x, p.y * 3.4) * 0.8, TAU * t / 8.) * pool * 0.22;
    col *= 1. - 0.45 * exp(-fd * fd / (230. * 230.)) * (1. - uLift) * smoothstep(${FLOOR_Y - 30}., ${FLOOR_Y + 10}., p.y);
    float ring = exp(-pow((fd - 430.) / 3.5, 2.));
    add += vec3(0.55, 0.95, 0.95) * ring * (0.30 + 0.45 * uBeat);
    float bp = fract(t / 0.5);
    add += vec3(0.4, 0.9, 0.95) * exp(-pow((fd - (430. + bp * 380.)) / 6., 2.)) * (1. - bp) * 0.32;
    if (uShock > 0.0) add += vec3(0.8, 1.0, 1.0) * exp(-pow((fd - uShock * 1300.) / 18., 2.)) * (1. - uShock) * 1.5;
    // the waterline: crosses into slide 4
    add += vec3(0.45, 0.95, 1.0) * exp(-abs(p.y - ${FLOOR_Y - 90}.) / 1.6) * 0.28 * smoothstep(0., 400., p.x);
    add += vec3(0.2, 0.7, 0.8) * exp(-abs(p.y - ${FLOOR_Y - 90}.) / 22.) * 0.09;
    col *= mix(0.88, 1.0, smoothstep(0., 260., p.y));
    add += uFlash * vec3(0.6, 0.95, 1.0);
  `, { uBeat: { value: 0 }, uShock: { value: 0 }, uLift: { value: 0 }, uFlash: { value: 0 }, uSpot: { value: 1 } });
  bg.u.uSeamL.value = hexv4('#0b3644', 1);
  bg.u.uSeamR.value = hexv4('#5b6d6c', 1);
  ctx.bgScene.add(bg);

  // ---------- 3D ----------
  const scene = new THREE.Scene();
  scene.environment = ctx.envMap;
  ctx.setMain(I, scene);
  const bd = splitBoard(ctx.assets.boardGltf);
  const mat = bd.material;
  mat.side = THREE.DoubleSide;
  // a white board: tame the Tripo guesses (metal ~0.35) so it reads glassy, not chrome or blown out
  mat.envMapIntensity = 0.7;
  mat.metalness = 0.0;
  mat.roughness = 0.55;
  const stageG = new THREE.Group();
  stageG.position.set(0, H / 2 - FLOOR_Y, 0);
  stageG.rotation.x = 0.5;
  scene.add(stageG);
  const root = new THREE.Group(), mroot = new THREE.Group();
  mroot.scale.set(1, -1, 1);
  stageG.add(root, mroot);

  const stageInv = { value: new THREE.Matrix4() };
  const refl = { value: 0.3 };
  const mkRefl = m => {
    const r = m.clone();
    r.transparent = true; r.depthWrite = true; r.side = THREE.DoubleSide;
    r.onBeforeCompile = sh => {
      sh.uniforms.uStageInv = stageInv; sh.uniforms.uRefl = refl;
      sh.vertexShader = 'uniform mat4 uStageInv; varying float vH;\n' + sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n vH = (uStageInv * modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'uniform float uRefl; varying float vH;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
        '#include <dithering_fragment>\n gl_FragColor.rgb *= vec3(0.62, 0.9, 0.95); gl_FragColor.a *= uRefl * smoothstep(-300.0, -6.0, vH);');
    };
    return r;
  };
  const rmat = mkRefl(mat);
  const foam = new THREE.MeshStandardMaterial({ color: 0xbfeee9, roughness: 0.95, metalness: 0, emissive: 0x19c3c9, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const cedar = new THREE.MeshStandardMaterial({ color: 0x9a5530, roughness: 0.55, metalness: 0 });
  const foamR = mkRefl(foam), cedarR = mkRefl(cedar);

  const pieces = {};
  const OFF = {
    deck: { p: [0, 150, 0], r: [0.0, 0, 0.06] },
    core: { p: [0, 28, 0], r: [0, 0, -0.02] },
    hull: { p: [0, -90, 0], r: [0.05, 0, -0.05] },
    fins: { p: [0, -210, 40 * bd.tailSign], r: [-0.14, 0.0, 0.08] },
  };
  const add = (name, geo, m, r, centroid) => {
    const a = new THREE.Mesh(geo, m), b = new THREE.Mesh(geo, r);
    a.renderOrder = 2; b.renderOrder = 1;
    root.add(a); mroot.add(b);
    if (!pieces[name]) pieces[name] = { meshes: [], off: OFF[name], centroid };
    pieces[name].meshes.push([a, b]);
  };
  for (const [name, part] of Object.entries(bd.parts)) add(name, part.geo, mat, rmat, part.centroid);
  add('core', bd.coreGeo, foam, foamR, new THREE.Vector3(LEN * 0.18, 0, 0));
  add('core', bd.stringer, cedar, cedarR, null);

  const spot = new THREE.SpotLight(0xfff4e6, 1.7, 0, 0.55, 0.7, 0);
  spot.position.set(0, 1500, 500); spot.target.position.set(0, -300, 0);
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x33e0e6, 1.5); rim.position.set(-900, 400, -700);
  const rim2 = new THREE.DirectionalLight(0xffa060, 0.9); rim2.position.set(900, 200, -500);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(300, 200, 900);
  scene.add(rim, rim2, fill, new THREE.AmbientLight(0x1d4a55, 0.5));

  // ---------- DOM ----------
  const el = ctx.dom[I];
  const svg = el.querySelector('svg.xlabels');
  const NS = 'http://www.w3.org/2000/svg';
  const LABELS = [
    { key: 'deck', title: 'DECK', sub: '4+4 OZ GLASS · GLOSS COAT', side: 1 },
    { key: 'core', title: 'CORE', sub: 'EPS FOAM + CEDAR STRINGER', side: -1 },
    { key: 'hull', title: 'HULL', sub: 'SINGLE TO DOUBLE CONCAVE', side: 1 },
    { key: 'fins', title: 'FINS', sub: 'THRUSTER · CARBON BASE', side: -1 },
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
  // phase the spin so the board is broadside (nose right, slight 3/4) while it is exploded
  const ANG0 = (bd.tailSign < 0 ? Math.PI / 2 : -Math.PI / 2) - 0.32 - SPIN(4.8);

  return {
    update(t) {
      const e = explode(t);
      const eo = clamp(e);
      const a = ANG0 + SPIN(t);
      const lift = 110 * eo + 8 * Math.sin(TAU * t / 4) + 95;
      const shake = 10 * wobble(t, 6.0, 7, 9);
      stageG.position.x = shake;
      stageG.position.y = H / 2 - FLOOR_Y + 0.6 * shake;
      root.position.y = lift; mroot.position.y = -lift;
      root.rotation.y = mroot.rotation.y = a;
      root.rotation.z = mroot.rotation.z = 0.06 * Math.sin(TAU * t / 8) * (1 - eo);
      root.rotation.x = mroot.rotation.x = 0.05 * Math.sin(TAU * t / 4 + 0.7) * (1 - eo);
      for (const pz of Object.values(pieces)) {
        const o = pz.off, w = 0.5 * wobble(t, 6.0, 2.6, 7);
        pz.meshes.forEach(([ma, mb]) => {
          ma.position.set(o.p[0] * e, o.p[1] * (e + w * 0.12), o.p[2] * e);
          ma.rotation.set(o.r[0] * e, o.r[1] * e, o.r[2] * e);
          mb.position.copy(ma.position); mb.rotation.copy(ma.rotation);
        });
      }
      stageG.updateMatrixWorld(true);
      stageInv.value.copy(stageG.matrixWorld).invert();
      refl.value = 0.3 * (1 - 0.6 * eo);
      spot.intensity = 1.7 + 0.6 * beatEnv(t, 0.15) + 1.4 * pulse(t, 6.0, 0.12);

      const shock = t >= 6.0 && t < 7.0 ? seg(t, 6.0, 7.0) : 0;
      bg.u.uBeat.value = beatEnv(t, 0.18) + pulse(t, 6.0, 0.25);
      bg.u.uShock.value = shock;
      bg.u.uLift.value = Math.min(1, 0.55 + eo);
      bg.u.uFlash.value = 0.3 * pulse(t, 6.0, 0.05) + 0.18 * pulse(t, 3.9, 0.05);
      bg.u.uSpot.value = 1 + 0.6 * pulse(t, 6.0, 0.2);

      // labels follow the pieces
      labs.forEach((L, k) => {
        const pz = pieces[L.key];
        const [ma] = pz.meshes[0];
        v.copy(pz.centroid || new THREE.Vector3()); ma.localToWorld(v); v.project(pc);
        const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
        const vis = smooth(seg(e, 0.55 + k * 0.06, 0.95));
        const lx = L.side > 0 ? 826 : 54, ly = y - 10;
        const ex = L.side > 0 ? 760 : 300;
        L.line.setAttribute('points', `${x},${y} ${ex},${ly} ${L.side > 0 ? lx - 12 : lx + 210},${ly}`);
        L.line.style.opacity = vis; L.dot.style.opacity = vis;
        L.dot.setAttribute('cx', x); L.dot.setAttribute('cy', y);
        L.d.style.left = lx + 'px';
        L.d.style.top = (ly - 34) + 'px';
        L.d.style.opacity = vis;
        L.d.style.transform = `translateX(${(1 - vis) * 20 * L.side}px)`;
      });
      const deg = (((a - ANG0) * 180 / Math.PI) % 360 + 360) % 360;
      rot.textContent = String(Math.floor(deg)).padStart(3, '0') + '°';
      mode.textContent = e > 0.4 ? 'EXPLODED VIEW' : 'GLASSED';
      mode.classList.toggle('on', e > 0.4);
      flash.style.opacity = 0.22 * pulse(t, 6.0, 0.05);
      head.style.transform = `translateY(${4 * wobble(t, 6.0, 3, 7)}px)`;
    },
  };
}
