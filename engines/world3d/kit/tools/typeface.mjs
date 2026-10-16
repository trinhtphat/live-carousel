// TTF -> three.js typeface JSON (same conversion as three's TTFLoader, run at build time).
// node tools/typeface.mjs fonts/UnifrakturCook-Bold.ttf src/assets/fraktur.json "Encore!ENCORE"
import opentype from 'opentype.js';
import fs from 'fs';
const [src, out, chars] = process.argv.slice(2);
const buf = fs.readFileSync(src);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const glyphs = {};
const want = new Set([...(chars || '')]);
const round = Math.round;
for (let i = 0; i < font.glyphs.length; i++) {
  const g = font.glyphs.glyphs[i];
  const unicodes = g.unicodes && g.unicodes.length ? g.unicodes : (g.unicode !== undefined ? [g.unicode] : []);
  for (const u of unicodes) {
    const ch = String.fromCodePoint(u);
    if (want.size && !want.has(ch)) continue;
    const token = { ha: round(g.advanceWidth * scale), x_min: round(g.xMin * scale), x_max: round(g.xMax * scale), o: '' };
    // same as three's TTFLoader (reversed = false): TrueType outer contours are clockwise, which ShapePath.toShapes() treats as solid
    const o = [];
    for (const c of g.path.commands) {
      if (c.type === 'M') o.push('m', round(c.x * scale), round(c.y * scale));
      else if (c.type === 'L') o.push('l', round(c.x * scale), round(c.y * scale));
      else if (c.type === 'Q') o.push('q', round(c.x * scale), round(c.y * scale), round(c.x1 * scale), round(c.y1 * scale));
      else if (c.type === 'C') o.push('b', round(c.x * scale), round(c.y * scale), round(c.x1 * scale), round(c.y1 * scale), round(c.x2 * scale), round(c.y2 * scale));
    }
    token.o = o.join(' ');
    glyphs[ch] = token;
  }
}
const json = {
  glyphs, familyName: font.getEnglishName('fullName'), ascender: round(font.ascender * scale), descender: round(font.descender * scale),
  underlinePosition: font.tables.post.underlinePosition, underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
  resolution: 1000, original_font_information: font.tables.name,
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(out, Object.keys(glyphs).length, 'glyphs');
