// SLIDE 4 — WHITENING. A bright pearl lab. The veneer arch starts warm (shade A3); at 1.0 a scan bar
// sweeps across it and leaves bright white behind (BL1) while the pointer walks the shade guide. Glints pop
// on the beat. At 3.0 the shade tabs burst apart in zero-g (crossing into slides 3 and 5), then fly back
// and magnet-snap into the guide two per beat. 7.45 the scan rewinds so the loop starts warm again.
import { THREE, W, H, TAU, clamp, mix, seg, smooth, eOutCubic, eInCubic, eOutExpo, eInOut, pulse, wobble, beatEnv, hash, sprite, textTexture, prepTex } from './core.js';
import { bgQuad, hexv4 } from './gl.js';

const I = 3;
const ARCH = { x: 540, y: 600, w: 960 };
const SHADES = [
  ['A4', '#cfa671'], ['A3.5', '#d8b380'], ['A3', '#e0c091'], ['A2', '#e8cda4'],
  ['A1', '#efdab8'], ['B1', '#f4e5cc'], ['BL2', '#f8eee0'], ['BL1', '#fdfaf3'],
];
const START = 2, END = 7;                          // A3 → BL1
const TAB = { y: 945, w: 64, h: 146, gap: 104 };
const BURST = 3.0, TRAVEL = 0.42;
const LANDS = [5.0, 5.0, 5.5, 5.5, 6.0, 6.0, 6.5, 6.5];
// where each tab flies to in zero-g (slide-local; beyond 0..1080 crosses the seams)
const OUT = [[-330, 700, -0.9], [120, 180, 0.7], [300, 1180, -0.5], [-150, 1010, 1.1], [820, 1220, -0.8], [1230, 990, 0.9], [960, 200, -0.6], [1420, 640, 1.2]];

// wipe position in sprite-local x: -0.55 (all warm) → 0.55 (all white); rewinds 7.45-7.85
const wipe = t => t < 1.0 ? -0.55 : t < 2.0 ? mix(-0.55, 0.55, eInOut(seg(t, 1.0, 2.0)))
  : t < 7.45 ? 0.55 : mix(0.55, -0.55, eInOut(seg(t, 7.45, 7.85)));

function tabTexture(hex) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 300;
  const g = c.getContext('2d');
  // holder (handle) + porcelain tooth-shaped tab
  g.fillStyle = '#9aa9b2'; g.beginPath(); g.roundRect(44, 0, 40, 88, 10); g.fill();
  g.fillStyle = '#d9e2e7'; g.beginPath(); g.roundRect(30, 70, 68, 30, 8); g.fill();
  const grd = g.createLinearGradient(0, 96, 0, 296);
  grd.addColorStop(0, hex); grd.addColorStop(0.7, hex); grd.addColorStop(1, '#ffffff');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(18, 100); g.lineTo(110, 100);
  g.bezierCurveTo(118, 180, 112, 250, 86, 290);
  g.quadraticCurveTo(64, 300, 42, 290);
  g.bezierCurveTo(16, 250, 10, 180, 18, 100);
  g.fill();
  const sh = g.createLinearGradient(18, 0, 110, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.55)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fill();
  return prepTex(new THREE.CanvasTexture(c));
}

export function init(ctx) {
  const bg = bgQuad(I, /* glsl */`uniform float uScanY; uniform float uScanA; uniform float uFlash; uniform float uBeat;`, /* glsl */`
    float t = uTime;
    col = mix(vec3(0.955, 0.972, 0.978), vec3(0.76, 0.81, 0.84), smoothstep(120., 1150., length((p - vec2(540., 600.)) * vec2(1., 0.78))));
    col += vec3(0.03) * (fbm(p * 0.006 + loopv(t) * 0.4) - 0.5);
    vec2 g1 = abs(fract(p / 54.) - 0.5) * 54.;
    float l1 = 1. - smoothstep(0.35, 1.2, min(g1.x, g1.y));
    vec2 g2 = abs(fract(p / 270.) - 0.5) * 270.;
    float l2 = 1. - smoothstep(0.45, 1.5, min(g2.x, g2.y));
    col -= vec3(0.030, 0.026, 0.024) * l1 + vec3(0.055, 0.048, 0.044) * l2;
    // crosshair marks
    vec2 cm = abs(mod(p - vec2(270., 270.), vec2(540., 540.)) - 270.);
    col -= vec3(0.25) * (1. - smoothstep(0.6, 1.6, min(cm.x, cm.y))) * step(max(cm.x, cm.y), 14.);
    // scan line at each magnetic snap
    float sc = exp(-abs(p.y - uScanY) / 2.2) * uScanA;
    col = mix(col, vec3(0.04, 0.62, 0.90), clamp(sc, 0., 1.) * 0.85);
    col = mix(col, vec3(0.45, 0.85, 1.0), exp(-abs(p.y - uScanY) / 90.) * uScanA * 0.18);
    col = mix(col, vec3(0.80, 0.96, 1.0), uFlash);
    // laser horizon arriving from slide 3
    add += vec3(-0.42, -0.10, 0.02) * exp(-abs(p.y - 1060.) / 1.4) * smoothstep(620., 0., p.x) * 0.9;
  `, { uScanY: { value: -100 }, uScanA: { value: 0 }, uFlash: { value: 0 }, uBeat: { value: 0 } });
  bg.u.uSeamL.value = hexv4('#8d9ba3', 1);
  bg.u.uSeamR.value = hexv4('#7fd4f2', 1);
  ctx.bgScene.add(bg);

  // giant type behind the arch
  const T = textTexture(['WHITE.'], { size: 620, ls: 4 });
  const TO = textTexture(['WHITE.'], { size: 620, ls: 4, stroke: 5 });
  const kT = 940 / T.w;
  const word = sprite(T.tex, T.w * kT, T.h * kT, { order: -50 });
  word.u.uTint.value.set('#06121c'); word.u.uTintAmt.value = 1; word.u.uOpacity.value = 0.9;
  const wordO = sprite(TO.tex, TO.w * kT, TO.h * kT, { order: -51 });
  wordO.u.uTint.value.set('#1fc8ff'); wordO.u.uTintAmt.value = 1; wordO.u.uOpacity.value = 0.7;
  ctx.bgScene.add(wordO, word);
  const WORD_Y = 345;

  // the arch + its soft shadow
  const A = ctx.assets.arch;
  const ah = ARCH.w * A.h / A.w;
  const arch = sprite(A.tex, ARCH.w, ah, { order: 31, segs: 16 });
  arch.u.uWarm.value = 1;
  arch.u.uShade.value = 0.25;
  arch.u.uRim.value.set('#1fc8ff'); arch.u.uRimDir.value.set(0.8, 0.45);
  const ash = sprite(A.tex, ARCH.w * 1.03, ah * 1.03, { order: 30, segs: 8 });
  ash.u.uTint.value.set('#1b2a33'); ash.u.uTintAmt.value = 1; ash.u.uBias.value = 4.5; ash.u.uOpacity.value = 0.3;
  ctx.seamScene.add(ash, arch);

  // shade tabs + shadows
  const tabs = SHADES.map(([code, hex], k) => {
    const tex = tabTexture(hex);
    const s = sprite(tex, TAB.w, TAB.h, { order: 34 + k * 0.01, segs: 4 });
    s.u.uShade.value = 0.3;
    const sh = sprite(tex, TAB.w * 1.05, TAB.h * 1.05, { order: 33, segs: 4 });
    sh.u.uTint.value.set('#1b2a33'); sh.u.uTintAmt.value = 1; sh.u.uBias.value = 3.5; sh.u.uOpacity.value = 0.25;
    ctx.seamScene.add(sh, s);
    return { code, s, sh, k, home: { x: ARCH.x + (k - 3.5) * TAB.gap, y: TAB.y }, out: OUT[k], land: LANDS[k] };
  });

  // DOM
  const el = ctx.dom[I];
  const scan = el.querySelector('.s4-scan');
  scan.innerHTML = '<b class="l">AFTER</b><b class="r">BEFORE</b>';
  const ptr = el.querySelector('.tab-ptr');
  const shade = el.querySelector('.s4-shade b');
  const flash = el.querySelector('.flash');
  const codes = tabs.map(tb => {
    const d = document.createElement('div'); d.className = 'tab-code'; d.textContent = tb.code;
    d.style.left = tb.home.x + 'px'; d.style.top = (TAB.y + TAB.h / 2 + 14) + 'px';
    el.append(d); return d;
  });
  ptr.style.top = (TAB.y + TAB.h / 2 + 38) + 'px';
  // sparkle glints on the teeth (4-point stars)
  const svg = el.querySelector('svg.glints');
  const NS = 'http://www.w3.org/2000/svg';
  const star = 'M0,-1 C0.08,-0.08 0.08,-0.08 1,0 C0.08,0.08 0.08,0.08 0,1 C-0.08,0.08 -0.08,0.08 -1,0 C-0.08,-0.08 -0.08,-0.08 0,-1Z';
  const GL = [
    { x: 470, y: 560, at: 2.05, s: 46 }, { x: 650, y: 585, at: 2.3, s: 34 }, { x: 290, y: 600, at: 2.55, s: 28 },
    { x: 560, y: 570, at: 6.9, s: 40 }, { x: 790, y: 560, at: 7.15, s: 26 },
  ].map(g => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', star); svg.append(p); return { ...g, p }; });

  // tab state: {x, y, r, k(at home 0..1), sq}
  const state = (tb, t) => {
    const bob = Math.sin(TAU * t / 4 + tb.k * 0.7) * 4;
    const home = { x: tb.home.x, y: tb.home.y + bob };
    const [ox, oy, or] = tb.out;
    const start = tb.land - TRAVEL;
    if (t < BURST || t >= tb.land) { const sq = wobble(t, tb.land, 2.4, 7); return { ...home, r: 0.05 * sq, k: 1, sq }; }
    if (t < start) {
      const a = eOutExpo(seg(t, BURST, BURST + 0.7));
      const drift = 1 + 0.10 * smooth(seg(t, BURST + 0.5, start));
      const spin = 0.6 * seg(t, BURST, start) * Math.sign(or);
      return { x: mix(home.x, mix(home.x, ox, drift), a), y: mix(home.y, mix(home.y, oy, drift), a), r: or * a + spin, k: 1 - a, sq: 0 };
    }
    const b = eInCubic(seg(t, start, tb.land));
    const fx = mix(home.x, ox, 1.10), fy = mix(home.y, oy, 1.10), fr = or + 0.6 * Math.sign(or);
    return { x: mix(fx, home.x, b), y: mix(fy, home.y, b), r: mix(fr, 0, b), k: b * 0.6, sq: 0 };
  };

  return {
    update(t) {
      const wp = wipe(t);
      const prog = clamp((wp + 0.55) / 1.1);
      // arch
      const ax = ARCH.x + Math.sin(TAU * t / 8) * 10, ay = ARCH.y + Math.sin(TAU * t / 4) * 8 - 14 * wobble(t, 2.0, 2, 5);
      arch.position.set(I * W + ax, H - ay, 0);
      arch.u.uTime.value = t;
      arch.u.uYaw.value = 0.12 * Math.sin(TAU * t / 8);
      arch.u.uPitch.value = 0.06 * Math.sin(TAU * t / 4 + 0.5);
      arch.u.uWipe.value = wp;
      arch.u.uBright.value = 1.0 + 0.08 * prog + 0.2 * pulse(t, 2.0, 0.15);
      arch.u.uRimAmt.value = 0.08 + 0.4 * pulse(t, 2.0, 0.2);
      arch.u.uShineAmt.value = 0.5;
      const sweep = a => (t >= a && t < a + 0.9 ? -0.6 + 2.6 * (t - a) / 0.9 : -3);
      arch.u.uShine.value = sweep(2.0) > -2 ? sweep(2.0) : sweep(6.8);
      ash.position.set(I * W + ax + 14, H - ay - 34, 0);
      ash.u.uYaw.value = arch.u.uYaw.value;

      // big word breathes and kicks on the burst
      const kick = wobble(t, BURST, 1.8, 4);
      word.position.set(I * W + 540, H - WORD_Y - 24 * kick, 0);
      wordO.position.set(I * W + 540 + 8, H - WORD_Y - 24 * kick - 10, 0);
      word.scale.set(1 + 0.02 * pulse(t, 2.0, 0.2), 1, 1); wordO.scale.copy(word.scale);

      // tabs
      let scanY = -100, scanA = 0, fl = 0;
      tabs.forEach(tb => {
        const st = state(tb, t);
        tb.s.position.set(I * W + st.x, H - st.y, 0);
        tb.s.u.uRoll.value = -st.r;
        tb.s.u.uYaw.value = 0.25 * Math.sin(TAU * t / 8 + tb.k) * (1 - st.k * 0.8);
        tb.s.u.uTime.value = t;
        tb.s.scale.set(1 + 0.06 * st.sq, 1 - 0.06 * st.sq, 1);
        const lifted = 1 - st.k;
        tb.sh.position.set(I * W + st.x + 8 + 40 * lifted, H - st.y - 14 - 50 * lifted, 0);
        tb.sh.u.uRoll.value = -st.r; tb.sh.scale.copy(tb.s.scale);
        tb.sh.u.uOpacity.value = 0.25 * (1 - lifted);
        const dt = ((t - tb.land) % 8 + 8) % 8;
        if (dt < 0.45) { scanY = st.y; scanA = Math.exp(-dt / 0.12); }
        codes[tb.k].style.opacity = smooth(seg(st.k, 0.85, 1));
      });
      fl = Math.max(0.3 * pulse(t, BURST, 0.06), 0.25 * pulse(t, 2.0, 0.06));
      bg.u.uScanY.value = scanY; bg.u.uScanA.value = scanA; bg.u.uFlash.value = fl;

      // pointer walks the shade guide with the wipe (snaps tab to tab)
      const idx = Math.round(mix(START, END, prog));
      const home = tabs[idx].home.x;
      const allHome = t < BURST || t >= 6.5;
      ptr.style.left = home + 'px';
      ptr.style.opacity = allHome ? 1 : 0;
      shade.textContent = SHADES[idx][0];
      tabs.forEach(tb => { tb.s.u.uRimAmt.value = tb.k === idx && allHome ? 0.9 : 0; tb.s.u.uRim.value.set('#1fc8ff'); });

      // scan bar rides the wipe while it moves
      const moving = (t >= 0.95 && t < 2.05) || (t >= 7.4 && t < 7.9);
      const bx = ARCH.x + wp * ARCH.w;
      scan.style.left = bx + 'px';
      scan.style.opacity = moving ? clamp(Math.min((wp + 0.55) / 0.08, (0.55 - wp) / 0.08)) : 0;

      // glints
      GL.forEach(g => {
        const d = ((t - g.at) % 8 + 8) % 8;
        const a = d < 0.45 ? Math.sin(Math.PI * d / 0.45) : 0;
        g.p.setAttribute('transform', `translate(${g.x + (ax - ARCH.x)},${g.y + (ay - ARCH.y)}) rotate(${d * 120}) scale(${g.s * a})`);
        g.p.style.opacity = a;
      });
      flash.style.opacity = 0;
    },
  };
}
