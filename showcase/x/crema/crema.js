// Tidewater "Crema" — a cup of coffee seen from above that you can stir.
// WebGL2: stable-fluids velocity (vorticity + Jacobi pressure) at low res, advected crema/milk dye at high res,
// a damped wave equation for ripples, and one composite pass for cup, light, caustics, scrims and type.
import * as SH from './shaders.js';

const doc = document.documentElement;
const params = new URLSearchParams(location.search);
const CAPTURE = params.get('capture');
const reduced = doc.classList.contains('rm');
const canvas = document.getElementById('liquid');
const coarse = matchMedia('(pointer: coarse)').matches;
if (coarse) doc.classList.add('touch');

/* ───────────────────────── colour from tokens ───────────────────────── */
const probe = document.createElement('canvas').getContext('2d');
function parseColor(v) {
  probe.fillStyle = 'transparent'; probe.fillStyle = v || 'transparent';
  const s = probe.fillStyle;
  if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
  const m = s.match(/[\d.]+/g) || [0, 0, 0];
  return m.slice(0, 3).map(x => +x / 255);
}
const tok = name => parseColor(getComputedStyle(doc).getPropertyValue('--c-' + name).trim());
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function oklch(rgb) {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function fromOklch(L, C, h) {
  for (let i = 0; i < 24; i++) {
    const A = C * Math.cos(h), B = C * Math.sin(h);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (rgb.every(v => v >= -1e-4 && v <= 1.0001) || C < 1e-3) return rgb.map(v => gam(clamp(v, 0, 1)));
    C *= 0.85;
  }
  return [L, L, L];
}
const luminance = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

function readPalette() {
  const bg = tok('bg'), surf = tok('surface'), text = tok('text'), acc = tok('accent'), acc2 = tok('accent-2'), acc3 = tok('accent-3');
  const [L3, C3, H3] = oklch(acc3), [L2, C2, H2] = oklch(acc2), [La, Ca, Ha] = oklch(acc);
  // coffee is the token's own hue, pulled down to an espresso depth; crema and milk keep their hue but stay in a plausible lightness band
  const coffee = fromOklch(0.21, clamp(C3 * 0.9, 0.012, 0.07), H3);
  const umber = fromOklch(clamp(L3, 0.34, 0.5), C3 * 1.15, H3);
  const crema = fromOklch(clamp(L2, 0.62, 0.78), C2 * 1.22, H2);
  const milk = fromOklch(Math.max(La, 0.9), Math.min(Ca, 0.07), Ha);
  const inkL = luminance(text) >= luminance(bg) ? text : bg, inkD = inkL === text ? bg : text;
  const L = c => c.map(lin);
  return { cBg: L(bg), cSurf: L(surf), cText: L(text), cMilk: L(milk), cCrema: L(crema), cUmber: L(umber), cCoffee: L(coffee),
    sBg: bg, sInkL: inkL, sInkD: inkD, uLumL: luminance(inkL), uLumD: luminance(inkD), uLumText: luminance(text), uLumMuted: luminance(tok('text-muted')) };
}

/* ───────────────────────── seeded random (capture determinism) ───────────────────────── */
let seed = 20261012;
const rand = CAPTURE ? () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) : Math.random;

/* ───────────────────────── WebGL engine ───────────────────────── */
function getGL(cv) {
  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
    preserveDrawingBuffer: !!CAPTURE, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 unavailable');
  let renderer = '';
  try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); renderer = gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ''; } catch (e) { /* optional */ }
  return { gl, software: /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer) };
}

function createEngine(gl, tier) {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('no float render targets');
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, SH.VERT);
  function program(fs) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, nm); }
    return { p, u };
  }
  const P = {
    pattern: program(SH.PATTERN), splat: program(SH.SPLAT), advVel: program(SH.ADVECT_VEL), curl: program(SH.CURL),
    vort: program(SH.VORTICITY), div: program(SH.DIVERGENCE), scale: program(SH.SCALE), prs: program(SH.PRESSURE),
    grad: program(SH.GRADIENT), dye: program(SH.DYE), wave: program(SH.WAVE), comp: program(SH.COMPOSITE),
  };
  function target(w, h) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete');
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, tx: [1 / w, 1 / h] };
  }
  function pair(w, h) { let a = target(w, h), b = target(w, h); return { get r() { return a; }, get w() { return b; }, swap() { const t = a; a = b; b = t; } }; }
  const SIM = tier.sim, DYE = tier.dye, WAV = tier.wave;
  const vel = pair(SIM, SIM), prs = pair(SIM, SIM), curlT = target(SIM, SIM), divT = target(SIM, SIM);
  const dye = pair(DYE, DYE), pattern = target(DYE, DYE), wave = pair(WAV, WAV);

  let unit = 0;
  const use = Pr => { gl.useProgram(Pr.p); unit = 0; return Pr; };
  const tex = (Pr, name, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.tex || t); gl.uniform1i(Pr.u[name], unit); unit++; };
  const draw = t => {
    if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  function seedCrema(s) {
    use(P.pattern); gl.uniform1f(P.pattern.u.uSeed, s); draw(pattern);
    for (let i = 0; i < 2; i++) { use(P.scale); tex(P.scale, 'uTex', pattern); gl.uniform1f(P.scale.u.uK, 1); draw(dye.w); dye.swap(); }
  }
  seedCrema(CAPTURE ? 0.37 : rand());

  const queues = { vel: [], dye: [], wave: [] };
  const sp = new Float32Array(32), sv = new Float32Array(32);
  function flush(name, field, lo, hi) {
    const q = queues[name];
    while (q.length) {
      const chunk = q.splice(0, 8);
      sp.fill(0); sv.fill(0);
      chunk.forEach((s, i) => { sp.set([s[0], s[1], s[2], 0], i * 4); sv.set(s[3], i * 4); });
      const Pr = use(P.splat); tex(Pr, 'uTarget', field.r);
      gl.uniform1i(Pr.u.uN, chunk.length); gl.uniform4fv(Pr.u.uP, sp); gl.uniform4fv(Pr.u.uV, sv);
      gl.uniform1f(Pr.u.uClampLo, lo); gl.uniform1f(Pr.u.uClampHi, hi);
      draw(field.w); field.swap();
    }
  }

  // word atlas texture
  const atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  let atlasSize = [1, 1];
  function setAtlas(c2d) {
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2d);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    atlasSize = [c2d.width, c2d.height];
  }

  function step(dt, k) {
    flush('vel', vel, -4000, 4000); flush('dye', dye, 0, 1.3); flush('wave', wave, -4, 4);
    let Pr = use(P.curl); tex(Pr, 'uVel', vel.r); gl.uniform2fv(Pr.u.uTexel, vel.r.tx); draw(curlT);
    Pr = use(P.vort); tex(Pr, 'uVel', vel.r); tex(Pr, 'uCurl', curlT); gl.uniform2fv(Pr.u.uTexel, vel.r.tx);
    gl.uniform1f(Pr.u.uCurlK, k.curl); gl.uniform1f(Pr.u.uDt, dt); draw(vel.w); vel.swap();
    Pr = use(P.div); tex(Pr, 'uVel', vel.r); gl.uniform2fv(Pr.u.uTexel, vel.r.tx); draw(divT);
    Pr = use(P.scale); tex(Pr, 'uTex', prs.r); gl.uniform1f(Pr.u.uK, 0.8); draw(prs.w); prs.swap();
    Pr = use(P.prs); gl.uniform2fv(Pr.u.uTexel, vel.r.tx);
    for (let i = 0; i < k.iters; i++) { unit = 0; tex(Pr, 'uP', prs.r); tex(Pr, 'uDiv', divT); draw(prs.w); prs.swap(); }
    Pr = use(P.grad); tex(Pr, 'uP', prs.r); tex(Pr, 'uVel', vel.r); gl.uniform2fv(Pr.u.uTexel, vel.r.tx); draw(vel.w); vel.swap();
    Pr = use(P.advVel); tex(Pr, 'uVel', vel.r); gl.uniform2fv(Pr.u.uTexel, vel.r.tx);
    gl.uniform1f(Pr.u.uDt, dt); gl.uniform1f(Pr.u.uDiss, k.velDiss); draw(vel.w); vel.swap();
    Pr = use(P.dye); tex(Pr, 'uDye', dye.r); tex(Pr, 'uVel', vel.r); tex(Pr, 'uPattern', pattern);
    gl.uniform2fv(Pr.u.uVelTexel, vel.r.tx); gl.uniform1f(Pr.u.uDt, dt);
    gl.uniform1f(Pr.u.uMilkDecay, k.milkDecay); gl.uniform1f(Pr.u.uCremaTarget, k.cremaTarget);
    gl.uniform1f(Pr.u.uCremaRelax, k.cremaRelax); gl.uniform1f(Pr.u.uTigerRelax, k.tigerRelax);
    draw(dye.w); dye.swap();
    Pr = use(P.wave); gl.uniform2fv(Pr.u.uTexel, wave.r.tx); gl.uniform1f(Pr.u.uC, 0.24); gl.uniform1f(Pr.u.uDamp, k.waveDamp);
    for (let i = 0; i < 2; i++) { unit = 0; tex(Pr, 'uWave', wave.r); draw(wave.w); wave.swap(); }
  }

  function render(f) {
    const Pr = use(P.comp), u = Pr.u;
    tex(Pr, 'uDye', dye.r); tex(Pr, 'uWave', wave.r); tex(Pr, 'uAtlas', atlasTex);
    gl.uniform2f(u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(u.uTime, f.time); gl.uniform1f(u.uPx, f.px); gl.uniform1f(u.uFade, f.fade); gl.uniform1f(u.uWaveK, f.waveK);
    gl.uniform2fv(u.uWaveTexel, wave.r.tx); gl.uniform2fv(u.uDyeTexel, dye.r.tx); gl.uniform2fv(u.uAtlasSize, atlasSize);
    gl.uniform3fv(u.uCup0, f.cup0); gl.uniform3fv(u.uCup1, f.cup1); gl.uniform1f(u.uCup1Vis, f.cup1Vis);
    gl.uniform4fv(u.uLook, f.look);
    for (const k of ['cBg', 'cSurf', 'cText', 'cMilk', 'cCrema', 'cUmber', 'cCoffee', 'sBg', 'sInkL', 'sInkD']) gl.uniform3fv(u[k], f.pal[k]);
    gl.uniform1f(u.uLumL, f.pal.uLumL); gl.uniform1f(u.uLumD, f.pal.uLumD);
    gl.uniform1i(u.uWordN, f.wordN); gl.uniform4fv(u.uWordRect, f.wordRect); gl.uniform4fv(u.uWordUV, f.wordUV); gl.uniform1fv(u.uWordRev, f.wordRev);
    gl.uniform1i(u.uScrimN, f.scrimN); gl.uniform4fv(u.uScrim, f.scrim); gl.uniform1f(u.uScrimAmt, f.scrimAmt); gl.uniform1f(u.uLumText, f.pal.uLumText);
    gl.uniform1fv(u.uScrimT, f.scrimT);
    draw(null);
  }
  return { gl, SIM, DYE, step, render, setAtlas, seedCrema,
    splat: (name, x, y, sigma, v) => queues[name].push([x, y, sigma * sigma, v]),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
}

/* ───────────────────────── page wiring ───────────────────────── */
const state = { brew: 'filter', plan: 'two', preview: null };
setupForm();
if (reduced) { /* static stills, no loop */ }
else {
  try { boot(); }
  catch (err) { fail(err); }
}

function fail(err) {
  doc.classList.remove('gl-type', 'gl-live'); doc.classList.add('no-gl');
  if (err && !CAPTURE) console.info('Crema: showing still images instead of the live cup.', String(err.message || err).slice(0, 160));
}

function setupForm() {
  const form = document.getElementById('order');
  const done = document.getElementById('done');
  const read = () => { const fd = new FormData(form); state.brew = fd.get('grind') || 'filter'; state.plan = fd.get('plan') || 'two'; };
  read();
  form.addEventListener('change', read);
  form.querySelectorAll('.method').forEach(l => {
    const v = document.getElementById(l.htmlFor).value;
    l.addEventListener('pointerenter', () => { state.preview = v; });
    l.addEventListener('pointerleave', () => { state.preview = null; });
  });
  const names = { bean: 'whole bean', filter: 'ground for filter', espresso: 'ground for espresso', moka: 'ground for a moka pot', press: 'ground for French press' };
  form.addEventListener('submit', e => {
    e.preventDefault(); read();
    const plan = state.plan === 'one' ? 'One bag, 250 g a month for €14, alternating between Kiambu and Huila' : 'Two bags, Kiambu and Huila side by side for €26 a month';
    done.textContent = `Your first bag: ${plan}, ${names[state.brew]}. This is a demo page, so nothing was ordered. October’s lots roast on Monday 12 October and ship by Wednesday 14 October.`;
  });
}

function boot() {
  const small = Math.min(innerWidth, innerHeight) < 600 || coarse;
  const { gl, software } = getGL(canvas);
  // software rasterisers (no GPU) get a light simulation and native scrolling
  const tier = CAPTURE ? { sim: 160, dye: +params.get('dye') || 1024, wave: 384, iters: 24 }
    : software ? { sim: 96, dye: 512, wave: 224, iters: 6 }
    : small ? { sim: 112, dye: 640, wave: 256, iters: 10 } : { sim: 144, dye: 1152, wave: 352, iters: 20 };
  let dprCap = CAPTURE ? 1 : 1.5;
  let dpr = Math.min(devicePixelRatio || 1, dprCap);
  let W = 0, H = 0;
  if (CAPTURE) {
    W = +params.get('w') || 1400; H = +params.get('h') || W;
    Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', width: W + 'px', height: H + 'px', opacity: '1' });
  }
  function size() {
    const cw = CAPTURE ? W : canvas.clientWidth || innerWidth, ch = CAPTURE ? H : canvas.clientHeight || innerHeight;
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  size();
  const E = createEngine(gl, tier);
  let pal = readPalette();
  document.addEventListener('unclaw:palette', () => { pal = readPalette(); needsFrame = true; });
  doc.classList.add('gl-type');

  /* ── lenis smooth scroll ── */
  let lenis = null;
  if (!CAPTURE && !software && window.Lenis) {
    try { lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 }); } catch (e) { lenis = null; }
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.8, easing: x => 1 - Math.pow(1 - x, 4) }); else t.scrollIntoView({ behavior: 'smooth' });
    t.focus({ preventScroll: true });
  }));

  /* ── scenes and camera keyframes ── */
  const scenes = [...document.querySelectorAll('[data-scene]')].map(el => ({ el, name: el.dataset.scene, key: 0 }));
  let maxScroll = 1;
  function measure() {
    const y = scrollY, vh = innerHeight, mob = W < 900;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    scenes.forEach((s, i) => {
      const r = s.el.getBoundingClientRect(); const top = r.top + y;
      // desktop: the cup reaches its pose when the scene's content is centred in the viewport
      let cTop = Infinity, cBot = -Infinity;
      s.el.querySelectorAll('.wrap > *').forEach(c => { const b = c.getBoundingClientRect(); if (b.height) { cTop = Math.min(cTop, b.top + y); cBot = Math.max(cBot, b.bottom + y); } });
      if (!isFinite(cTop)) { cTop = top; cBot = top + r.height; }
      let k = mob && s.name !== 'end' ? top : (cTop + cBot) / 2 - vh / 2;
      if (i === 0) k = 0;
      s.key = clamp(k, 0, maxScroll);
    });
    for (let i = 1; i < scenes.length; i++) scenes[i].key = Math.max(scenes[i].key, scenes[i - 1].key + 1);
  }
  const LOOK = {
    espresso: [1, 0, 0, 0], moka: [0.62, 0, 0, 0], filter: [0, 1, 0, 0], bean: [0, 1, 0.5, 0], press: [0, 0.9, 0, 1],
  };
  function key(name) {
    const mob = W < 900, M = Math.max(W, H);
    const brew = LOOK[state.preview || state.brew];
    const two = state.plan === 'two';
    const k = { c0: [0, 0, 1], c1: null, look: [1, 0, 0, 0], milk: 0.03, force: 1, calm: 0 };
    if (!mob) {
      switch (name) {
        case 'intro': k.c0 = [0.665 * W, 0.52 * H, 0.40 * H]; break;
        case 'october': k.c0 = [0.25 * W, 0.56 * H, 0.70 * H]; break;
        case 'huila': k.c0 = [0.29 * W, 0.52 * H, 0.40 * H]; k.milk = 0.008; break;
        case 'kiambu': k.c0 = [0.32 * W, 0.60 * H, 0.62 * M]; k.look = [0, 1, 0, 0]; k.milk = 2.4; break;
        case 'brew': k.c0 = [0.75 * W, 0.52 * H, 0.30 * H]; k.look = brew.slice(); k.milk = brew[1] > 0.5 ? 1.4 : 0.05; break;
        case 'end': k.c0 = [0.5 * W, 0.535 * H, 0.15 * H]; k.look = brew.slice(); k.look[2] = 1; k.milk = brew[1] > 0.5 ? 1.4 : 0.05; k.calm = 1; break;
        default:
          k.look = brew.slice(); k.look[2] = Math.max(k.look[2], 0.85); k.milk = brew[1] > 0.5 ? 1.4 : 0.05; k.calm = 1;
          if (two) { k.c0 = [0.62 * W, 0.65 * H, 0.20 * H]; k.c1 = [0.86 * W, 0.33 * H, 0.20 * H]; }
          else k.c0 = [0.74 * W, 0.52 * H, 0.29 * H];
      }
    } else {
      switch (name) {
        case 'intro': k.c0 = [0.60 * W, 0.40 * H, 0.56 * W]; break;
        case 'october': k.c0 = [0.50 * W, 0.30 * H, 0.74 * W]; break;
        case 'huila': k.c0 = [0.46 * W, 0.25 * H, 0.50 * W]; k.milk = 0.008; break;
        case 'kiambu': k.c0 = [0.50 * W, 0.30 * H, 0.95 * H]; k.look = [0, 1, 0, 0]; k.milk = 2.4; break;
        case 'brew': k.c0 = [0.54 * W, 0.22 * H, 0.34 * W]; k.look = brew.slice(); k.milk = brew[1] > 0.5 ? 1.4 : 0.05; break;
        case 'end': k.c0 = [0.5 * W, 0.42 * H, 0.24 * W]; k.look = brew.slice(); k.look[2] = 1; k.milk = brew[1] > 0.5 ? 1.4 : 0.05; k.calm = 1; break;
        default:
          k.look = brew.slice(); k.look[2] = Math.max(k.look[2], 0.85); k.milk = brew[1] > 0.5 ? 1.4 : 0.05; k.calm = 1;
          if (two) { k.c0 = [0.28 * W, 0.29 * H, 0.23 * W]; k.c1 = [0.74 * W, 0.15 * H, 0.23 * W]; }
          else k.c0 = [0.54 * W, 0.22 * H, 0.32 * W];
      }
    }
    // the second cup waits off-screen to the right and slides in for the two-bag plan
    if (!k.c1) k.c1 = [W + k.c0[2] * 1.6, k.c0[1] * 0.7 + H * 0.15, k.c0[2]];
    k.v1 = two && name === 'choose' ? 1 : 0;
    return k;
  }
  function blend(a, b, f) {
    const lc = (p, q) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f), Math.exp(lerp(Math.log(p[2]), Math.log(q[2]), f))];
    return { c0: lc(a.c0, b.c0), c1: lc(a.c1, b.c1), v1: lerp(a.v1, b.v1, f), look: a.look.map((v, i) => lerp(v, b.look[i], f)),
      milk: Math.exp(lerp(Math.log(a.milk), Math.log(b.milk), f)), calm: lerp(a.calm, b.calm, f), weights: null };
  }
  function cameraTarget(y) {
    let i = 0; while (i < scenes.length - 1 && y >= scenes[i + 1].key) i++;
    const a = scenes[i], b = scenes[Math.min(i + 1, scenes.length - 1)];
    const f = a === b ? 0 : smooth(0.16, 0.84, (y - a.key) / (b.key - a.key));
    const k = blend(key(a.name), key(b.name), f);
    k.weights = { [a.name]: 1 - f }; k.weights[b.name] = (k.weights[b.name] || 0) + f;
    return k;
  }
  const cam = { c0: [0, 0, 1], c1: [0, 0, 1], v1: 0, look: [1, 0, 0, 0], milk: 0.03, calm: 0, init: false };
  function follow(t, dt) {
    if (!cam.init) { Object.assign(cam, JSON.parse(JSON.stringify(t)), { init: true }); return 1; }
    const mv = Math.abs(cam.c0[0] - t.c0[0]) + Math.abs(cam.c0[1] - t.c0[1]) + Math.abs(cam.c0[2] - t.c0[2]) + Math.abs(cam.v1 - t.v1) * 100;
    const a = 1 - Math.exp(-dt * 7), al = 1 - Math.exp(-dt * 3.2);
    const fc = (c, q) => { c[0] = lerp(c[0], q[0], a); c[1] = lerp(c[1], q[1], a); c[2] = Math.exp(lerp(Math.log(c[2]), Math.log(q[2]), a)); };
    fc(cam.c0, t.c0); fc(cam.c1, t.c1); cam.v1 = lerp(cam.v1, t.v1, a);
    cam.look = cam.look.map((v, i) => lerp(v, t.look[i], al)); cam.milk = t.milk; cam.calm = lerp(cam.calm, t.calm, al);
    cam.weights = t.weights;
    return mv;
  }

  /* ── cup mapping (css px ↔ cup uv) ── */
  function cupAt(x, y) {
    const list = [[cam.c0, 0]]; if (cam.v1 > 0.5) list.push([cam.c1, 1]);
    for (const [c, k] of list) {
      const X = x * dpr, Y = y * dpr, cx = c[0] * dpr, cy = c[1] * dpr, r = c[2] * dpr;
      const Wp = W * dpr, Hp = H * dpr;
      let vx = (cx - Wp / 2) / Hp, vy = (cy - Hp / 2) / Hp; const vl = Math.hypot(vx, vy), m = Math.min(1, 0.9 / Math.max(vl, 1e-3)); vx *= m; vy *= m;
      let dx = ((X - cx) / r + vx * 0.045) / 0.99, dy = ((Y - cy) / r + vy * 0.045) / 0.99;
      if (dx * dx + dy * dy < 0.995) {
        const s = k ? -1 : 1;
        return { k, u: s * dx * 0.5 + 0.5, v: s * dy * 0.5 + 0.5, s, rpx: r * 0.99 / dpr };
      }
    }
    return null;
  }

  /* ── effects: milk blooms and latte art ── */
  const effects = [];
  let milkLevel = 0, lastPour = -1e9;
  function bloom(hit) {
    if (!hit) return;
    const { u, v } = hit; let t = 0; milkLevel = Math.max(milkLevel, 0.6);
    E.splat('wave', u, v, 0.012, [0.22, 0, 0, 0]);
    const swirl = rand() < 0.5 ? 1 : -1;
    effects.push((dt, dts = dt) => {
      t += dt / 0.9; if (t >= 1) return false;
      const sig = lerp(0.018, 0.06, Math.pow(t, 0.6));
      E.splat('dye', u, v, sig, [4.4 * dt * Math.pow(1 - t, 0.5), 0, 0, 0]);
      if (t < 0.5) for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 4;
        const px = u + Math.cos(a) * sig, py = v + Math.sin(a) * sig;
        const f = 30 * swirl * (1 - t) * dts * 60;
        E.splat('vel', px, py, sig * 0.8, [-Math.sin(a) * f, Math.cos(a) * f, 0, 0]);
      }
      return true;
    });
  }
  let artUntil = 0;
  function latteArt(k = 0, style = 'rosetta') {
    // painted the way a barista builds it: microfoam laid down in crescents, then a pull-through drags their centres into chevrons
    const c = k ? -1 : 1, to = (x, y) => [c * x * 0.5 + 0.5, c * y * 0.5 + 0.5];
    milkLevel = 1; lastPour = performance.now();
    const plan = [];
    if (style === 'heart') {
      plan.push({ at: 0, dur: 1.5, blob: [0, 0.02] });
      plan.push({ at: 1.65, dur: 0.5, pull: [0.50, -0.52] });
    } else {
      const N = 6;
      for (let i = 0; i < N; i++) {
        const g = i / (N - 1);
        plan.push({ at: 0.1 + i * 0.26, leaf: [lerp(-0.38, 0.46, g), lerp(0.58, 0.24, g), lerp(0.34, 0.16, g), i] });
      }
      plan.push({ at: 0.1 + N * 0.26 + 0.2, dur: 0.6, pull: [0.60, -0.46] });
    }
    const T = Math.max(...plan.map(p => p.at + (p.dur || 0))) + 0.05;
    artUntil = performance.now() + (T + 2.5) * 1000;
    let t = 0;
    effects.push((dt, dts = dt) => {
      if (cam.look[1] > 0.45) return false;   // the cup turned clear: stop laying foam
      const t0 = t; t += dt;
      for (const p of plan) {
        if (p.leaf && p.at >= t0 && p.at < t) {
          const [y, hw, bend, i] = p.leaf, n = Math.ceil(hw * 2 / 0.035);
          for (let s = 0; s <= n; s++) {
            const x = -hw + (s / n) * hw * 2, e = x / hw;
            const [u, v] = to(x, y + bend * e * e);
            E.splat('dye', u, v, 0.014 + 0.010 * (1 - e * e), [1.0 * (1 - 0.3 * e * e), 0, 0, 0]);
          }
          const [u, v] = to(0, y); const sgn = i % 2 ? 1 : -1;
          E.splat('vel', u, v, 0.05, [c * sgn * 14, -c * 8, 0, 0]);
        }
        if (p.dur && t > p.at && t0 < p.at + p.dur) {
          const g = clamp((t - p.at) / p.dur, 0, 1);
          if (p.blob) {
            const [u, v] = to(p.blob[0], p.blob[1]);
            E.splat('dye', u, v, lerp(0.03, p.small ? 0.07 : 0.17, Math.sqrt(g)), [(p.small ? 1.2 : 2.6) * dt, 0, 0, 0]);
          }
          if (p.pull) {
            const g0 = clamp((t0 - p.at) / p.dur, 0, 1);
            const y0 = lerp(p.pull[0], p.pull[1], Math.pow(g0, 0.9)), y1 = lerp(p.pull[0], p.pull[1], Math.pow(g, 0.9));
            const n = Math.max(1, Math.ceil(Math.abs(y1 - y0) / 0.03));
            for (let s = 1; s <= n; s++) {
              const [u, v] = to(0, lerp(y0, y1, s / n));
              E.splat('dye', u, v, 0.010, [0.35 * (1 - g * 0.5), 0, 0, 0]);
              E.splat('vel', u, v, 0.016, [0, -c * 75 * (1 - g * 0.7) * (dts * 60) / n, 0, 0]);
            }
          }
        }
      }
      return t < T;
    });
  }

  /* ── pointer: hover stirs on desktop; press-and-hold stirs on touch so swipes still scroll ── */
  const ring = document.querySelector('.ring');
  const ptr = { x: -1, y: -1, lx: -1, ly: -1, active: false, stir: false, boost: 1, last: 0 };
  let touch = null, stirredOnce = false;
  const markStirred = () => { if (!stirredOnce) { stirredOnce = true; setTimeout(() => doc.classList.add('stirred'), 1600); } };
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true; ptr.last = performance.now(); ptr.boost = e.buttons ? 1.8 : 1; }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.active = false; ptr.lx = -1; });
  canvas.addEventListener('click', e => { if (e.pointerType === 'mouse' || e.pointerType === '' || !coarse) { bloom(cupAt(e.clientX, e.clientY)); markStirred(); } });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
    touch.timer = setTimeout(() => {
      if (!touch || touch.moved) return;
      ptr.stir = true; ptr.active = true; ptr.x = ptr.lx = touch.x0; ptr.y = ptr.ly = touch.y0; ptr.boost = 1.6;
      try { canvas.setPointerCapture(touch.id); } catch (err) { /* capture is optional */ }
      ring.style.translate = `${touch.x0}px ${touch.y0}px`; ring.classList.add('on'); markStirred();
    }, 230);
  });
  canvas.addEventListener('pointermove', e => {
    if (!touch || e.pointerId !== touch.id) return;
    if (!ptr.stir) { if (Math.hypot(e.clientX - touch.x0, e.clientY - touch.y0) > 9) { touch.moved = true; clearTimeout(touch.timer); } return; }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.last = performance.now(); ring.style.translate = `${e.clientX}px ${e.clientY}px`;
  });
  const endTouch = e => {
    if (!touch) return;
    clearTimeout(touch.timer);
    if (e && e.type === 'pointerup' && !ptr.stir && !touch.moved && performance.now() - touch.t0 < 260) { bloom(cupAt(e.clientX, e.clientY)); markStirred(); }
    if (ptr.stir) { ptr.stir = false; ptr.active = false; ptr.lx = -1; ring.classList.remove('on'); }
    touch = null;
  };
  canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
  canvas.addEventListener('touchmove', e => { if (ptr.stir) e.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', e => { if (coarse) e.preventDefault(); });

  function stirInput(dt) {
    if (!ptr.active) { ptr.lx = -1; return; }
    if (!ptr.stir && performance.now() - ptr.last > 120) { ptr.lx = ptr.x; ptr.ly = ptr.y; return; }
    if (ptr.lx < 0) { ptr.lx = ptr.x; ptr.ly = ptr.y; return; }
    const dx = ptr.x - ptr.lx, dy = ptr.y - ptr.ly, dist = Math.hypot(dx, dy);
    ptr.lx = ptr.x; ptr.ly = ptr.y;
    if (dist < 0.5) return;
    const n = Math.min(4, 1 + Math.floor(dist / 22));
    const force = (1 - cam.calm * 0.6) * ptr.boost;
    for (let i = 1; i <= n; i++) {
      const x = ptr.x - dx * (1 - i / n), y = ptr.y - dy * (1 - i / n);
      const hit = cupAt(x, y); if (!hit) continue;
      const sig = clamp(30 / hit.rpx * 0.5, 1.4 / E.SIM, 0.07);
      const du = hit.s * dx / hit.rpx * 0.5, dv = hit.s * dy / hit.rpx * 0.5;
      const vx = du / dt * E.SIM * 0.42 * force / n, vy = dv / dt * E.SIM * 0.42 * force / n;
      E.splat('vel', hit.u, hit.v, sig, [clamp(vx, -900, 900), clamp(vy, -900, 900), 0, 0]);
      const sp = Math.min(1, Math.hypot(du, dv) / dt * 0.9);
      E.splat('wave', hit.u, hit.v, sig * 0.6, [-0.07 * sp * force / n, 0, 0, 0]);
      markStirred();
    }
  }
  let ambientT = 0;
  function ambient(dt) {
    ambientT -= dt; if (ambientT > 0) return;
    ambientT = 1.4 + rand() * 1.8;
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 0.7, u = 0.5 + Math.cos(a) * rr * 0.5, v = 0.5 + Math.sin(a) * rr * 0.5;
    const b = rand() * Math.PI * 2, f = 22 * (1 - cam.calm);
    E.splat('vel', u, v, 0.09, [Math.cos(b) * f, Math.sin(b) * f, 0, 0]);
  }

  /* ── GL type: an atlas of the display words, drawn into the liquid ── */
  const words = [...document.querySelectorAll('.gl-word')].map(el => ({ el, speed: +el.dataset.speed || 0, slot: null }));
  let atlasReady = false, introT0 = 0;
  const atlasCanvas = document.createElement('canvas');
  function buildAtlas() {
    const scale = dpr, ctx = atlasCanvas.getContext('2d');
    const slots = []; let wMax = 0, hSum = 0;
    for (const w of words) {
      const r = w.el.getBoundingClientRect(); const cs = getComputedStyle(w.el);
      const fs = parseFloat(cs.fontSize), pad = Math.ceil(fs * 0.16);
      if (!r.width || !r.height) { w.slot = null; continue; }
      const font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      ctx.font = font; const asc = ctx.measureText('Hg').fontBoundingBoxAscent || fs * 0.92;
      const upper = cs.textTransform === 'uppercase', lower = cs.textTransform === 'lowercase';
      const glyphs = []; const walker = document.createTreeWalker(w.el, NodeFilter.SHOW_TEXT); const range = document.createRange();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const txt = node.textContent;
        for (let i = 0; i < txt.length; i++) {
          if (!txt[i].trim()) continue;
          range.setStart(node, i); range.setEnd(node, i + 1);
          const cr = range.getClientRects()[0]; if (!cr) continue;
          glyphs.push([upper ? txt[i].toUpperCase() : lower ? txt[i].toLowerCase() : txt[i], cr.left - r.left + pad, cr.top - r.top + asc + pad]);
        }
      }
      const sw = Math.ceil((r.width + pad * 2) * scale), sh = Math.ceil((r.height + pad * 2) * scale);
      slots.push({ w, font: `${cs.fontStyle} ${cs.fontWeight} ${fs * scale}px ${cs.fontFamily}`, glyphs, sw, sh, y: hSum, pad, cw: r.width, ch: r.height });
      wMax = Math.max(wMax, sw); hSum += sh + 24;
    }
    let k = 1; const lim = Math.min(E.maxTex, 4096);
    if (hSum > lim || wMax > lim) k = Math.min(lim / hSum, lim / wMax);
    atlasCanvas.width = Math.max(1, Math.ceil(wMax * k)); atlasCanvas.height = Math.max(1, Math.ceil(hSum * k));
    ctx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    ctx.fillStyle = 'white'; ctx.textBaseline = 'alphabetic';
    for (const s of slots) {
      ctx.save(); ctx.translate(0, s.y * k); ctx.scale(k * scale, k * scale);
      ctx.font = s.font.replace(/([\d.]+)px/, (m0, n) => (n / scale) + 'px');
      for (const [ch, x, y] of s.glyphs) ctx.fillText(ch, x, y);
      ctx.restore();
      s.w.slot = { u: 0, v: (s.y * k) / atlasCanvas.height, du: (s.sw * k) / atlasCanvas.width, dv: (s.sh * k) / atlasCanvas.height, pad: s.pad };
    }
    E.setAtlas(atlasCanvas);
    if (!atlasReady) { atlasReady = true; introT0 = performance.now(); }
    needsFrame = true;
  }
  let atlasTimer = 0;
  const scheduleAtlas = (ms = 160) => { clearTimeout(atlasTimer); atlasTimer = setTimeout(() => { try { buildAtlas(); } catch (e) { doc.classList.remove('gl-type'); } }, ms); };
  if (!CAPTURE) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]).then(() => scheduleAtlas(30));
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => scheduleAtlas(120));
  }

  const wordRect = new Float32Array(32), wordUV = new Float32Array(32), wordRev = new Float32Array(8), scrimArr = new Float32Array(24), scrimT = new Float32Array(6);
  const scrimEls = [...document.querySelectorAll('[data-scrim]')];
  function domUniforms(now) {
    let n = 0;
    const introRev = atlasReady ? smooth(0, 1, (now - introT0 - 250) / 1500) : 0;
    if (atlasReady) for (const w of words) {
      if (!w.slot || n >= 8) continue;
      const r = w.el.getBoundingClientRect();
      if (r.bottom < -H * 0.4 || r.top > H * 1.4) continue;
      const cy = r.top + r.height / 2, off = (cy - H / 2) * w.speed, p = w.slot.pad;
      wordRect.set([(r.left - p) * dpr, (r.top - p + off) * dpr, (r.width + 2 * p) * dpr, (r.height + 2 * p) * dpr], n * 4);
      wordUV.set([w.slot.u, w.slot.v, w.slot.du, w.slot.dv], n * 4);
      const ey = cy + off;
      wordRev[n] = Math.min(introRev, smooth(H * 1.08, H * 0.70, ey), smooth(-H * 0.18, H * 0.07, ey));
      n++;
    }
    let m = 0;
    for (const el of scrimEls) {
      if (m >= 6) break;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > H + 100 || !r.width) continue;
      scrimArr.set([r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr], m * 4);
      // body text keeps 6:1; blocks with secondary text keep 4.6:1 for the muted colour
      const muted = el.dataset.scrim === 'muted', L = muted ? pal.uLumMuted : pal.uLumText, ratio = muted ? 4.6 : 6;
      scrimT[m] = pal.uLumText > luminance(pal.sBg) ? (L + 0.05) / ratio - 0.05 : (L + 0.05) * ratio - 0.05;
      m++;
    }
    return { n, m };
  }

  /* ── UI controls ── */
  let paused = false, needsFrame = true, artStyle = 0;
  const pauseBtn = document.getElementById('pause'), pourBtn = document.getElementById('pour');
  pauseBtn.addEventListener('click', () => {
    paused = !paused; pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.querySelector('.lbl').textContent = paused ? 'Play' : 'Pause';
    pourBtn.disabled = paused;
  });
  pourBtn.addEventListener('click', () => {
    // espresso gets latte art; a clear cup gets a slow cloud of milk
    if (cam.look[1] > 0.45) bloom({ u: 0.5 + (rand() - 0.5) * 0.2, v: 0.5 + (rand() - 0.5) * 0.2 });
    else latteArt(0, artStyle++ % 2 ? 'heart' : 'rosetta');
    markStirred();
  });

  /* ── resize, visibility ── */
  let lastW = innerWidth, lastH = innerHeight;
  const onResize = () => {
    if (CAPTURE) return;
    const wChanged = innerWidth !== lastW, hChanged = Math.abs(innerHeight - lastH) > 120;
    lastW = innerWidth; lastH = innerHeight;
    if (wChanged || hChanged || Math.abs(canvas.clientHeight - H) > 120) size();
    measure(); scheduleAtlas(); needsFrame = true;
  };
  addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(() => { measure(); }).observe(document.body);
  let visible = true;
  if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !dead && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dead = true; fail(new Error('context lost')); });

  /* ── simulation parameters from the camera state ── */
  let cremaLevel = 1, huilaArmed = true;
  function simParams(dt, wall = 1) {
    const L = cam.look, calm = Math.max(cam.calm, L[2]);
    const target = clamp(L[0], 0, 1);
    const far = Math.abs(target - cremaLevel) > 0.06;
    const relax = (far ? 1.4 : 0.03) * wall;
    cremaLevel = lerp(cremaLevel, target, 1 - Math.exp(-relax * dt));
    milkLevel *= Math.exp(-cam.milk * dt * wall);
    const art = performance.now() < artUntil;
    return { curl: (art ? 2 : 11) * (1 - calm * 0.7), iters: tier.iters, velDiss: (art ? 0.9 : 0.35) + calm * 1.6, milkDecay: cam.milk * wall,
      cremaTarget: target, cremaRelax: relax, tigerRelax: far ? 1.2 : 0.035, waveDamp: 0.9955 - calm * 0.006 };
  }

  /* ── frame loop ── */
  let lastWork = 0, forceFrame = false;
  let last = performance.now(), dead = false, fade = CAPTURE ? 1 : 0, live = false, slowFrames = 0, emaMs = 16;
  measure();
  const frameData = { pal: null, cup0: new Float32Array(3), cup1: new Float32Array(3) };
  let drawnScroll = -1;
  let running = true;
  function frame(now) {
    if (dead || CAPTURE || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    if (lenis) lenis.raf(now);
    if (!visible) { last = now; return; }
    // software rasterisers (no GPU): leave the CPU idle between frames so scrolling and input stay responsive
    if (software && now - lastWork < 420 && !forceFrame) return;
    const dtRaw = (now - last) / 1000; last = now; lastWork = now; forceFrame = false;
    const dt = clamp(dtRaw, 1 / 240, software ? 1 / 12 : 1 / 30), dtWall = clamp(dtRaw, 0, 0.5);
    const moving = follow(cameraTarget(scrollY), dtWall);
    const w = cam.weights || {};
    if ((w.huila || 0) > 0.7 && huilaArmed && milkLevel < 0.25) { huilaArmed = false; latteArt(0, 'rosetta'); }
    if ((w.huila || 0) < 0.2 && milkLevel < 0.2) huilaArmed = true;
    fade = Math.min(1, fade + dtWall / 1.1);
    if (paused) {
      // the liquid is frozen; the camera and the type still follow the page
      if (needsFrame || moving > 0.02 || drawnScroll !== scrollY || fade < 1) { draw(now); needsFrame = false; }
      return;
    }
    stirInput(dt); ambient(dt);
    // on a software rasteriser frames are far apart: let choreography and state changes follow the wall clock
    const wall = software ? clamp(dtWall / dt, 1, 12) : 1;
    const dtFx = software ? Math.min(dtWall, 0.7) : dt;
    for (let i = effects.length - 1; i >= 0; i--) if (!effects[i](dtFx, dt)) effects.splice(i, 1);
    E.step(dt, simParams(dt, wall));
    draw(now);
    if (!software) {
      // adaptive resolution: drop the pixel ratio if the device struggles
      emaMs = lerp(emaMs, dtRaw * 1000, 0.05);
      if (emaMs > 26 && dpr > 1.0) { if (++slowFrames > 90) { dpr = Math.max(1, dpr - 0.25); size(); scheduleAtlas(); slowFrames = 0; emaMs = 16; } } else slowFrames = 0;
    }
  }
  function draw(now) {
    drawnScroll = scrollY;
    const { n, m } = domUniforms(now);
    frameData.pal = pal;
    frameData.time = now / 1000; frameData.px = dpr; frameData.fade = fade; frameData.waveK = 30;
    frameData.cup0.set([cam.c0[0] * dpr, cam.c0[1] * dpr, cam.c0[2] * dpr]);
    frameData.cup1.set([cam.c1[0] * dpr, cam.c1[1] * dpr, cam.c1[2] * dpr]);
    frameData.cup1Vis = smooth(0.05, 0.95, cam.v1);
    frameData.look = cam.look;
    frameData.wordN = n; frameData.wordRect = wordRect; frameData.wordUV = wordUV; frameData.wordRev = wordRev;
    frameData.scrimN = m; frameData.scrim = scrimArr; frameData.scrimAmt = 1; frameData.scrimT = scrimT;
    E.render(frameData);
    if (!live) { live = true; requestAnimationFrame(() => doc.classList.add('gl-live')); }
  }

  if (params.has('debug')) window.__crema = { cam, scenes, get milk() { return milkLevel; }, get effects() { return effects.length; }, software };
  if (CAPTURE) { runCapture(); return; }
  requestAnimationFrame(frame);

  /* ── offline stills: ?capture=cup|huila|calm|crema|kiambu&w=…&h=… ── */
  function runCapture() {
    const preset = CAPTURE;
    const M = Math.max(W, H);
    const shots = {
      cup: { c0: [W / 2, H / 2, W / 3.6], look: [1, 0, 0, 0] },
      huila: { c0: [W / 2, H / 2, W / 3.6], look: [1, 0, 0, 0], art: true },
      calm: { c0: [W / 2, H / 2, W / 3.6], look: [0, 1, 0.9, 0], calm: 1 },
      crema: { c0: [W * 0.25, H * 0.56, H * 0.70], look: [1, 0, 0, 0], stir: true },
      kiambu: { c0: [W * 0.32, H * 0.60, M * 0.62], look: [0, 1, 0, 0], drops: true },
    }[preset] || { c0: [W / 2, H / 2, W / 3.6], look: [1, 0, 0, 0] };
    Object.assign(cam, { c0: shots.c0, c1: shots.c0.slice(), v1: 0, look: shots.look, milk: preset === 'huila' ? 0.004 : 0.03, calm: shots.calm || 0, init: true });
    cremaLevel = shots.look[0];
    const dt = 1 / 60;
    const steps = n => { for (let i = 0; i < n; i++) { stirInput(dt); for (let j = effects.length - 1; j >= 0; j--) if (!effects[j](dt)) effects.splice(j, 1); E.step(dt, simParams(dt)); } };
    if (shots.stir) {
      // a slow spoon arc through the crema
      ptr.active = true; ptr.stir = true;
      for (let i = 0; i <= 60; i++) { const a = -0.4 + i / 60 * 3.4; ptr.x = W * 0.25 + Math.cos(a) * H * 0.34; ptr.y = H * 0.56 + Math.sin(a) * H * 0.30; ptr.last = performance.now(); steps(1); }
      ptr.active = false; ptr.stir = false; steps(150);
    } else if (shots.art) { steps(20); latteArt(0, 'rosetta'); steps(Math.round(3.6 * 60) + 70); }
    else if (shots.drops) {
      steps(40);
      steps(10);
    } else if (preset === 'cup') { steps(40); }
    else steps(30);
    fade = 1;
    const fd = Object.assign(frameData, { pal, time: 7.3, px: 1, fade: 1, waveK: 30, look: cam.look, cup1Vis: 0, wordN: 0, scrimN: 0, scrimAmt: 0, scrimT,
      wordRect, wordUV, wordRev, scrim: scrimArr });
    fd.cup0.set(cam.c0); fd.cup1.set(cam.c0);
    E.render(fd);
    window.__cremaCapture = canvas.toDataURL('image/png');
  }
}
