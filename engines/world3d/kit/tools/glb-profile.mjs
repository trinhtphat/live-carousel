// Shape profile of a GLB, no dependencies: node tools/glb-profile.mjs model.glb [axis=y] [bins=40]
// Prints the bounds and, per slice along the axis, the max radius around it — read it to pick split heights for an
// exploded view (where a crown meets a post, deck meets hull…). Use the RAW model (before meshopt compression).
import fs from 'fs';
const [file, axis = 'y', binsArg = '40'] = process.argv.slice(2);
if (!file) { console.log('usage: node tools/glb-profile.mjs model.glb [x|y|z] [bins]'); process.exit(1); }
const buf = fs.readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a .glb');
let off = 12, json = null, bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), body = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8')); else if (type === 0x004e4942) bin = body;
  off += 8 + len;
}
const prims = json.meshes.flatMap(m => m.primitives);
const A = ['x', 'y', 'z'].indexOf(axis), B = Number(binsArg);
const pts = [];
for (const p of prims) {
  const acc = json.accessors[p.attributes.POSITION], bv = json.bufferViews[acc.bufferView];
  if (bv.extensions && bv.extensions.EXT_meshopt_compression) { console.log('This GLB is meshopt-compressed: profile the raw model (before gltf-transform optimize).'); process.exit(1); }
  const comp = { 5126: [4, 'readFloatLE', 1], 5122: [2, 'readInt16LE', 32767], 5123: [2, 'readUInt16LE', 65535], 5120: [1, 'readInt8', 127], 5121: [1, 'readUInt8', 255] }[acc.componentType];
  const stride = bv.byteStride || comp[0] * 3, base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const scale = acc.normalized ? 1 / comp[2] : 1;
  for (let i = 0; i < acc.count; i++) { const o = base + i * stride; pts.push([0, 1, 2].map(c => bin[comp[1]](o + c * comp[0]) * scale)); }
}
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (const p of pts) for (let c = 0; c < 3; c++) { if (p[c] < mn[c]) mn[c] = p[c]; if (p[c] > mx[c]) mx[c] = p[c]; }
console.log(`${prims.length} primitive(s), ${pts.length} vertices`);
console.log('min', mn.map(v => v.toFixed(3)).join(' '), ' max', mx.map(v => v.toFixed(3)).join(' '));
const o = [0, 1, 2].filter(c => c !== A), cen = o.map(c => (mn[c] + mx[c]) / 2);
const r = new Array(B).fill(0);
for (const p of pts) { const b = Math.min(B - 1, Math.floor(((p[A] - mn[A]) / (mx[A] - mn[A] || 1)) * B)); r[b] = Math.max(r[b], Math.hypot(p[o[0]] - cen[0], p[o[1]] - cen[1])); }
const rm = Math.max(...r) || 1;
console.log(`slice (0 = ${axis} min)   max radius`);
r.forEach((v, b) => console.log(((b + 0.5) / B).toFixed(3).padStart(6), v.toFixed(3).padStart(8), ' ' + '#'.repeat(Math.round((v / rm) * 50))));
