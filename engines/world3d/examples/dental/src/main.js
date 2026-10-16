// PEARL LAB — SMILE, ENGINEERED. Live carousel engine (dental studio).
// One WebGL renderer draws a 6480×1350 world (6 slides of 1080×1350):
//   1. bgScene    (ortho, strip px)  per-slide worlds + type that sits behind objects
//   2. main[i]    (perspective)      3D for slide i, framed 3 slides wide so it can spill over seams
//   3. seamScene  (ortho, strip px)  products, particles, anything that crosses a seam
// DOM on top carries crisp type. Every frame is a pure function of t ∈ [0, 8).
import { THREE, W, H, N, SW, LOOP, D_CAM, TAU, prepTex, hash } from './core.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ASSETS, MANIFEST } from './assets.gen.js';
import { dust } from './particles.js';
import * as S1 from './s1_hook.js';
import * as S2 from './s2_aligner.js';
import * as S3 from './s3_implant.js';
import * as S4 from './s4_white.js';
import * as S5 from './s5_shine.js';
import * as S6 from './s6_book.js';

const qs = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);
const canvas = $('#gl'), stage = $('#stage'), viewport = $('#viewport'), grain = $('#grain');
const FOV = 2 * Math.atan(H / 2 / D_CAM) * 180 / Math.PI;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.autoClear = false;
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const state = {
  view: 'strip', slide: 0, pan: 0, panV: 0, t: 0, playing: true, speed: 1, clean: false, seams: false, oneToOne: false,
  drag: null,
};

function b64ToBuf(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
async function loadTex(uri) { const img = new Image(); img.src = uri; await img.decode(); return prepTex(new THREE.Texture(img)); }

async function boot() {
  $('#loading b').textContent = 'FONTS';
  await Promise.all(['400 100px Anton', '400 20px JBM', '800 20px Anybody'].map(f => document.fonts.load(f)));
  $('#loading b').textContent = 'TEXTURES';
  const assets = {};
  for (const k of ['implant', 'molar', 'aligner', 'arch', 'hero']) assets[k] = { tex: await loadTex(ASSETS[k]), ...MANIFEST[k] };
  $('#loading b').textContent = '3D MODELS';
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  assets.implantGltf = await loader.parseAsync(b64ToBuf(ASSETS.implantGlb), '');
  try { assets.molarGltf = await loader.parseAsync(b64ToBuf(ASSETS.molarGlb), ''); } catch (e) { console.warn('molar glb', e); }

  // film grain tile
  const nc = document.createElement('canvas'); nc.width = nc.height = 220;
  const nx = nc.getContext('2d'), nd = nx.createImageData(220, 220);
  for (let k = 0; k < nd.data.length; k += 4) { const v = Math.random() * 255; nd.data[k] = nd.data[k + 1] = nd.data[k + 2] = v; nd.data[k + 3] = 255; }
  nx.putImageData(nd, 0, 0); grain.style.backgroundImage = `url(${nc.toDataURL()})`;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // soft radial texture for glows
  const rc = document.createElement('canvas'); rc.width = rc.height = 256;
  const rg = rc.getContext('2d'); const gr = rg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  rg.fillStyle = gr; rg.fillRect(0, 0, 256, 256);
  const radialTex = prepTex(new THREE.CanvasTexture(rc));

  const bgScene = new THREE.Scene(), seamScene = new THREE.Scene();
  const keyL = new THREE.DirectionalLight(0x6fdcff, 2.0); keyL.position.set(-1, 0.8, 0.6);
  const topL = new THREE.DirectionalLight(0xffffff, 1.2); topL.position.set(0.3, 1, 0.8);
  seamScene.add(keyL, topL, new THREE.AmbientLight(0x557788, 0.6));
  const mains = new Array(N).fill(null);
  const projCam = new THREE.PerspectiveCamera(FOV, W / H, 1, 20000); projCam.position.z = D_CAM; projCam.updateMatrixWorld();
  const ctx = {
    assets, envMap, radialTex, bgScene, seamScene, projCam,
    dom: [...document.querySelectorAll('.slide')],
    setMain: (i, scene) => { mains[i] = scene; },
  };
  const motes = dust(); seamScene.add(motes);
  const slides = [S1, S2, S3, S4, S5, S6].map(m => m.init(ctx));
  const mainCam = new THREE.PerspectiveCamera(FOV, (3 * W) / H, 1, 20000); mainCam.position.z = D_CAM;
  const orthoCam = new THREE.OrthographicCamera(0, SW, H, 0, -10000, 10000);

  // ---------- layout ----------
  let f = 1, dpr = 1, X0 = 0, X1 = SW, bufW = 0, bufH = 0;
  function layout() {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, Number(qs.get('dpr')) || 2);
    const pad = state.clean ? 0 : 28;
    if (state.view === 'strip') {
      f = Math.min((vw - pad * 2) / SW, (vh - pad * 2) / H);
      X0 = 0; X1 = SW;
    } else {
      f = Math.min((vw - pad * 2) / W, (vh - pad * 2) / H);
      if (state.oneToOne) f = Math.min(1, f);
      X0 = state.pan; X1 = state.pan + W;
    }
    const ox = (vw - (X1 - X0) * f) / 2, oy = (vh - H * f) / 2;
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${f}) translateX(${-X0}px)`;
    stage.style.clipPath = state.view === 'strip' ? 'none' : `inset(0px ${SW - X1}px 0px ${X0}px)`;
    canvas.style.left = grain.style.left = X0 + 'px';
    canvas.style.width = grain.style.width = (X1 - X0) + 'px';
    const bw = Math.round((X1 - X0) * f * dpr), bh = Math.round(H * f * dpr);
    if (bw !== bufW || bh !== bufH) { bufW = bw; bufH = bh; renderer.setSize(bw, bh, false); }
    canvas.style.height = H + 'px';
  }

  function render() {
    const S = bufW / (X1 - X0);
    renderer.setViewport(0, 0, bufW, bufH);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    orthoCam.left = X0; orthoCam.right = X1; orthoCam.updateProjectionMatrix();
    renderer.render(bgScene, orthoCam);
    for (let i = 0; i < N; i++) {
      if (!mains[i]) continue;
      const a = Math.max(X0, (i - 1) * W), b = Math.min(X1, (i + 2) * W);
      if (b <= a) continue;
      mainCam.setViewOffset(3 * W, H, a - (i - 1) * W, 0, b - a, H);
      renderer.setViewport((a - X0) * S, 0, (b - a) * S, bufH);
      renderer.clearDepth();
      renderer.render(mains[i], mainCam);
    }
    renderer.setViewport(0, 0, bufW, bufH);
    renderer.clearDepth();
    renderer.render(seamScene, orthoCam);
  }

  function frame(t) {
    motes.u.uTime.value = t;
    slides.forEach(s => s.update(t));
    const fr = Math.floor(t * 30);
    grain.style.backgroundPosition = `${Math.floor(hash(fr) * 220)}px ${Math.floor(hash(fr + 0.5) * 220)}px`;
    render();
    ui.sync();
  }

  // ---------- sound: each slide's loop-exact mix, synced to the timeline (single-slide view) ----------
  const snd = { ctx: null, bufs: null, src: null, on: false, slide: -1, startAt: 0 };
  async function soundOn() {
    if (!snd.ctx) {
      snd.ctx = new AudioContext();
      snd.bufs = await Promise.all(ASSETS.audio.map(b => snd.ctx.decodeAudioData(b64ToBuf(b))));
    }
    await snd.ctx.resume();
    snd.on = true;
  }
  function soundStop() { if (snd.src) { try { snd.src.stop(); } catch (e) {} snd.src.disconnect(); snd.src = null; } snd.slide = -1; }
  function soundStart(k, t) {
    soundStop();
    const src = snd.ctx.createBufferSource();
    src.buffer = snd.bufs[k]; src.loop = true; src.connect(snd.ctx.destination);
    src.start(0, t % LOOP);
    snd.src = src; snd.slide = k; snd.startAt = snd.ctx.currentTime - t;
  }
  function soundSync() {
    if (!snd.on || !snd.bufs) return;
    const want = state.playing && state.view === 'slide' && !state.drag && Math.abs(state.pan - state.slide * W) < 2;
    if (!want) { if (snd.src) soundStop(); return; }
    if (snd.slide !== state.slide) soundStart(state.slide, state.t);
    else state.t = ((snd.ctx.currentTime - snd.startAt) % LOOP + LOOP) % LOOP;   // audio is the master clock
  }

  // ---------- UI ----------
  const ui = makeUI();
  function makeUI() {
    const scrub = $('#scrub'), tRead = $('#tread'), play = $('#play');
    const btns = [...document.querySelectorAll('[data-view]')];
    scrub.addEventListener('input', () => { state.playing = false; state.t = Number(scrub.value); });
    play.addEventListener('click', () => { state.playing = !state.playing; });
    btns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    $('#clean').addEventListener('click', () => setClean(!state.clean));
    $('#seamsBtn').addEventListener('click', () => { state.seams = !state.seams; });
    $('#oneBtn').addEventListener('click', () => { state.oneToOne = !state.oneToOne; layout(); });
    $('#sndBtn').addEventListener('click', () => toggleSound());
    return {
      sync() {
        scrub.value = state.t; tRead.textContent = state.t.toFixed(2) + 's';
        play.textContent = state.playing ? '❚❚' : '▶';
        btns.forEach(b => b.classList.toggle('on', b.dataset.view === (state.view === 'strip' ? 'strip' : String(state.slide + 1))));
        document.body.classList.toggle('seams', state.seams);
        document.body.classList.toggle('clean', state.clean);
        $('#oneBtn').classList.toggle('on', state.oneToOne);
        $('#sndBtn').classList.toggle('on', snd.on);
      },
    };
  }
  function setView(v, instant = false) {
    if (v === 'strip') { state.view = 'strip'; }
    else {
      const k = Math.max(0, Math.min(N - 1, Number(v) - 1));
      if (state.view === 'strip' || instant) state.pan = k * W;
      state.view = 'slide'; state.slide = k;
    }
    layout();
  }
  async function toggleSound() { if (snd.on) { snd.on = false; soundStop(); } else { await soundOn(); if (state.view === 'strip') setView(String(state.slide + 1)); } }
  function setClean(c) { state.clean = c; document.body.classList.toggle('clean', c); requestAnimationFrame(layout); layout(); }

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') setView(String(Math.min(N, (state.view === 'strip' ? 0 : state.slide + 1) + 1)));
    else if (e.key === 'ArrowLeft') setView(String(Math.max(1, (state.view === 'strip' ? 2 : state.slide + 1) - 1)));
    else if (e.key >= '1' && e.key <= '6') setView(e.key);
    else if (e.key === 's' || e.key === 'S') setView('strip');
    else if (e.key === ' ') { state.playing = !state.playing; e.preventDefault(); }
    else if (e.key === 'r' || e.key === 'R') setClean(!state.clean);
    else if (e.key === 'g' || e.key === 'G') state.seams = !state.seams;
    else if (e.key === 'o' || e.key === 'O') { state.oneToOne = !state.oneToOne; layout(); }
    else if (e.key === 'm' || e.key === 'M') toggleSound();
    else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (e.key === '.') { state.playing = false; state.t = (state.t + 1 / 30) % LOOP; }
    else if (e.key === ',') { state.playing = false; state.t = (state.t - 1 / 30 + LOOP) % LOOP; }
  });
  // drag / swipe between slides (single-slide view)
  viewport.addEventListener('pointerdown', e => {
    if (state.view !== 'slide') return;
    state.drag = { x: e.clientX, pan: state.pan, t0: performance.now() };
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', e => {
    if (!state.drag) return;
    state.pan = Math.max(-W * 0.15, Math.min((N - 1) * W + W * 0.15, state.drag.pan - (e.clientX - state.drag.x) / f));
    layout();
  });
  viewport.addEventListener('pointerup', e => {
    if (!state.drag) return;
    const dx = e.clientX - state.drag.x, dt = performance.now() - state.drag.t0;
    let k = state.slide;
    if (Math.abs(dx) / f > W * 0.18 || (Math.abs(dx) > 30 && dt < 260)) k += dx < 0 ? 1 : -1;
    state.slide = Math.max(0, Math.min(N - 1, k));
    state.drag = null;
  });
  viewport.addEventListener('wheel', e => {
    if (state.view !== 'slide' || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (!state.wheelLock) { state.wheelLock = true; setView(String(state.slide + 1 + (e.deltaX > 0 ? 1 : -1))); setTimeout(() => (state.wheelLock = false), 450); }
  }, { passive: false });
  window.addEventListener('resize', layout);

  // ---------- URL / automation ----------
  if (qs.get('clean') === '1') { state.clean = true; document.body.classList.add('clean'); }
  if (qs.get('t') !== null) { state.t = Number(qs.get('t')) % LOOP; state.playing = false; }
  if (qs.get('paused') === '1') state.playing = false;
  setView(qs.get('view') || 'strip', true);

  // capture a swipe between slides: pan in strip px (0 .. (N-1)*W), any t (tools/seams.mjs, tools/swipe.mjs)
  window.__pan = (pan, t) => {
    state.view = 'slide'; state.slide = Math.round(pan / W); state.pan = pan;
    state.playing = false; state.t = t % LOOP;
    layout(); frame(state.t);
    return true;
  };
  window.__go = (view, t) => {
    if (view !== undefined && view !== null) setView(String(view), true);
    state.playing = false; state.t = t % LOOP;
    layout(); frame(state.t);
    return true;
  };

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (state.playing) state.t = (state.t + dt * state.speed) % LOOP;
    soundSync();
    if (state.view === 'slide' && !state.drag) {
      const target = state.slide * W;
      // critically damped swipe
      const k = 120, c = 2 * Math.sqrt(k);
      state.panV += (k * (target - state.pan) - c * state.panV) * dt;
      state.pan += state.panV * dt;
      if (Math.abs(target - state.pan) < 0.3 && Math.abs(state.panV) < 1) { state.pan = target; state.panV = 0; }
      layout();
    }
    frame(state.t);
    requestAnimationFrame(tick);
  }
  layout();
  frame(state.t);
  document.body.classList.add('ready');
  window.__ready = true;
  if (qs.get('capture') !== '1') requestAnimationFrame(tick);
}

boot().catch(err => {
  console.error(err);
  $('#loading').innerHTML = `<b>ERROR</b><span>${String(err && err.message || err)}</span>`;
  window.__error = String(err && err.stack || err);
});
