/* Tidewater OS — a desktop operating system that is also a coffee roastery.
 * Window manager, menus, procedural dithered wallpaper and origin art, apps, screensaver, phone shell.
 * All colours are read from the --c-* tokens at render time, so the palette customizer re-themes everything. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqPhone = matchMedia('(max-width: 760px)');
  const reduced = () => mqReduce.matches;
  const phone = () => mqPhone.matches;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const hasGsap = () => typeof window.gsap !== 'undefined';
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tw-os:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tw-os:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  const settings = { sound: store.get('sound', false), saver: store.get('saver', true), parallax: store.get('parallax', true), large: store.get('large', false) };
  const MB = () => $('#menubar').offsetHeight;
  const NAMES = { welcome: 'Welcome', kiambu: 'Kiambu.txt', huila: 'Huila.txt', roast: 'Roast.mov', brew: 'Brew Calculator', plans: 'Plans', questions: 'Questions', trash: 'Trash', control: 'Control Panel', about: 'About Tidewater OS' };

  /* ───────────────────────── colour tokens ───────────────────────── */
  const probe = document.createElement('canvas').getContext('2d');
  function tok(name) { return getComputedStyle(html).getPropertyValue('--c-' + name).trim(); }
  function rgb(css) {
    probe.fillStyle = '#000'; probe.fillStyle = css || '#000';
    const v = probe.fillStyle;
    if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    const m = v.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
  }
  function palette() {
    const p = {};
    ['bg', 'surface', 'surface-2', 'text', 'accent', 'accent-2', 'accent-3', 'accent-soft', 'border-strong'].forEach(k => { p[k] = rgb(tok(k)); });
    return p;
  }
  function updateGround() {
    const [r, g, b] = rgb(tok('bg'));
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    html.dataset.ground = L < 110 ? 'dark' : 'light';
  }

  /* ───────────────────────── sprites ───────────────────────── */
  const SPR = window.TW_SPRITES || {};
  function spriteSVG(name, remap, hatch) {
    const map = SPR[name]; if (!map) return '';
    const runs = {};
    for (let y = 0; y < 16; y++) {
      let x = 0;
      while (x < 16) {
        let ch = map[y * 16 + x];
        if (ch === '.') { x++; continue; }
        const key = (c, xx) => { c = (remap && remap[c]) || c; return hatch && c !== 'k' && (xx + y) % 2 ? 'k' : c; };
        ch = key(ch, x);
        let n = 1;
        while (x + n < 16 && map[y * 16 + x + n] !== '.' && key(map[y * 16 + x + n], x + n) === ch) n++;
        (runs[ch] = runs[ch] || []).push(`M${x} ${y}h${n}v1h-${n}z`);
        x += n;
      }
    }
    return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${Object.keys(runs).map(c => `<path class="px-${c}" d="${runs[c].join('')}"/>`).join('')}</svg>`;
  }
  function parseRemap(s) { const o = {}; (s || '').split(',').filter(Boolean).forEach(p => { const [a, b] = p.split(':'); o[a] = b; }); return o; }
  function hydrate(el, hatch) { el.innerHTML = spriteSVG(el.dataset.sprite, parseRemap(el.dataset.remap), hatch); }
  $$('[data-sprite]').forEach(el => hydrate(el));

  /* ───────────────────────── sound (off by default) ───────────────────────── */
  let actx = null;
  const SEQ = { open: [[660, .045], [990, .06]], close: [[880, .045], [520, .06]], trash: [[200, .07], [130, .1]], alert: [[520, .09], [0, .04], [520, .09]],
    done: [[880, .1], [0, .06], [880, .1], [0, .06], [1175, .2]], click: [[1400, .018]], wake: [[440, .05], [660, .05], [880, .08]] };
  function sound(kind) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime + .01;
      for (const [f, d] of SEQ[kind] || []) {
        if (f) {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = 'square'; o.frequency.value = f;
          g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
          o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + .02);
        }
        t += d;
      }
    } catch (e) { /* audio unavailable */ }
  }

  /* ───────────────────────── toast ───────────────────────── */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ───────────────────────── dithering painter ───────────────────────── */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  /* fn(x, y) returns -1 (transparent) or ramp*10 + t, where t is a float position in that ramp */
  function paint(canvas, W, H, ramps, fn) {
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext('2d'); const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = fn(x, y); if (v < 0) continue;
        const ri = Math.floor(v / 10), t = v - ri * 10, r = ramps[ri];
        const base = Math.floor(t); let i = base + ((t - base) > BAYER[((y & 3) << 2) + (x & 3)] ? 1 : 0);
        if (i > r.length - 1) i = r.length - 1; if (i < 0) i = 0;
        const c = r[i], o = (y * W + x) << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ───────────────────────── wallpaper: dithered tidewater landscape ───────────────────────── */
  const wall = $('#wall');
  const PAR = [0, 4, 8, 12, 18];          // parallax travel per layer (CSS px)
  const PAD = 24;
  let W_ = 0, H_ = 0, S_ = 3, scene = null, wallLayers = [], seaT = 0, seaTimer = null;
  function wallGeometry(W, H) {
    const portrait = H > W * 1.1;
    const hz = Math.round(H * (portrait ? 0.44 : 0.57));
    const seaY = Math.round(H * (portrait ? 0.6 : 0.735));
    const sunR = Math.max(9, Math.round(Math.min(W, H) * (portrait ? 0.17 : 0.125)));
    const sunX = W * (portrait ? 0.68 : 0.7), sunY = hz - H * 0.015;
    const far = x => hz - H * 0.055 - (Math.sin(x * 0.019 + 1.3) * 0.5 + Math.sin(x * 0.043 + 0.4) * 0.32 + Math.sin(x * 0.12 + 2) * 0.1) * H * 0.05;
    const mid = x => hz + H * 0.035 - (Math.sin(x * 0.011 + 0.9) * 0.5 + 0.5) * H * 0.085 - Math.sin(x * 0.031 + 1.7) * H * 0.016;
    const nearW = W * (portrait ? 0.62 : 0.34);
    const near = x => x > nearW ? 1e9 : seaY + 2 - H * (portrait ? 0.075 : 0.11) * (1 - (x / nearW) ** 2);
    const sw = Math.max(15, Math.round(W * (portrait ? 0.11 : 0.05))), sx = Math.round(nearW * (portrait ? 0.2 : 0.3));
    const base = Math.round(near(sx + sw / 2)) + 1, sh = Math.round(sw * 0.55), rh = Math.round(sw * 0.36);
    const shed = { x: sx, w: sw, base, h: sh, rh, cx: Math.round(sx + sw * 0.72) };
    const clouds = portrait
      ? [[.2, .1, .2, .016], [.72, .17, .16, .012], [.38, .25, .13, .01]]
      : [[.16, .13, .11, .018], [.25, .15, .07, .013], [.57, .235, .09, .015], [.86, .1, .07, .012]];
    return { W, H, hz, seaY, sunR, sunX, sunY, far, mid, near, nearW, shed, clouds };
  }
  function skyFn(g) {
    const { hz, sunX, sunY, sunR, clouds, W, H } = g;
    const cl = clouds.map(([cx, cy, w, h]) => [cx * W, cy * H, w * W, Math.max(2, h * H)]);
    return (x, y) => {
      let t = clamp((y / hz - 0.5) / 0.5, 0, 1) * 1.15;
      const d = Math.hypot(x - sunX, y - sunY);
      if (d < sunR) t = 2;
      else if (d < sunR * 1.45) t = Math.max(t, 1.05 + (1 - (d - sunR) / (sunR * 0.45)) * 0.85);
      for (const [cx, cy, cw, ch] of cl) {
        const u = (x - cx) / cw, v = (y - cy) / ch;
        if (y <= cy + ch * 0.35 && u * u + v * v < 1) { t = 1.7 + (v < 0 ? 0.3 : 0); break; }
      }
      return t;               // ramp 0: bg, surface, surface-2
    };
  }
  function seaFn(g, time) {
    const { seaY, H, sunX, sunR } = g; const depth = Math.max(1, H - seaY);
    return (x, y) => {
      if (y < seaY) return -1;
      const k = y - seaY;
      if (k < 2) return hash(x >> 1, 7) < 0.7 ? 1 : 0;                      // foam line
      if (k % 3 !== 1) return 0;
      const dir = (k % 6 === 1) ? 1 : -1;
      const L = 4 + Math.floor(k / 5);
      const xs = x + Math.floor(time * dir * (0.6 + k / depth * 2.2));
      const seg = Math.floor(xs / L);
      const inSun = Math.abs(x - sunX) < sunR * (0.55 + 0.9 * k / depth);
      const dens = inSun ? 0.62 : 0.16 + 0.1 * (k / depth);
      return (hash(seg, k) < dens && (((xs % L) + L) % L) < L * 0.62) ? 1 : 0;   // ramp 0: accent-3, surface-2
    };
  }
  function renderWall() {
    if (!wall) return;
    updateGround();
    S_ = phone() ? 2 : 3;
    const vw = innerWidth, vh = innerHeight;
    W_ = Math.ceil((vw + PAD * 2) / S_); H_ = Math.ceil((vh + PAD * 2) / S_);
    const g = scene = wallGeometry(W_, H_);
    const P = palette();
    if (!wallLayers.length) {
      for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'wl'; const c = document.createElement('canvas'); d.appendChild(c); wall.appendChild(d); wallLayers.push(d); }
    }
    wallLayers.forEach(d => { d.style.left = -PAD + 'px'; d.style.top = -PAD + 'px'; const c = d.firstChild; c.style.width = W_ * S_ + 'px'; c.style.height = H_ * S_ + 'px'; });
    const [l0, l1, l2, l3, l4] = wallLayers.map(d => d.firstChild);
    paint(l0, W_, H_, [[P.bg, P.surface, P['surface-2']]], skyFn(g));
    paint(l1, W_, H_, [[P.surface, P['accent-2']]], (x, y) => {
      const f = g.far(x); if (y < f || y > g.seaY + 1) return -1;
      return 0.42 + 0.4 * clamp((y - f) / (H_ * 0.07), 0, 1);
    });
    paint(l2, W_, H_, [[P['accent-2'], P.accent]], (x, y) => {
      const m = g.mid(x); if (y < m || y > g.seaY + 1) return -1;
      const dy = y - m; const row = Math.floor((dy - 3) / 6), within = dy - 3 - row * 6;
      if (dy > 3 && within < 2 && ((x + row * 4) % 10 + 10) % 10 < 4) return 1;
      return 0;
    });
    const sh = g.shed;
    paint(l3, W_, H_, [[P.accent, P.text], [P['surface-2'], P['accent-3']]], (x, y) => {
      const top = sh.base - sh.h, rTop = top - sh.rh, cxm = sh.x + sh.w / 2;
      if (x >= sh.cx && x < sh.cx + 3 && y >= rTop - 4 && y < top - sh.rh * 0.3) return 1;           // chimney
      if (y >= rTop && y < top && Math.abs(x + 0.5 - cxm) <= (sh.w / 2 + 2) * (y - rTop + 1) / sh.rh) return 1;   // roof
      if (x >= sh.x && x < sh.x + sh.w && y >= top && y < sh.base) {
        const wx = x - sh.x, wy = y - top;
        if (wy >= 2 && wy < 5 && ((wx >= 2 && wx < 5) || (wx >= sh.w - 5 && wx < sh.w - 2))) return 11;   // lit windows
        if (wx >= Math.floor(sh.w / 2) - 1 && wx < Math.floor(sh.w / 2) + 2 && wy >= sh.h - 5) return 1;     // door
        return 10;
      }
      const n = g.near(x); if (y < n) return -1;
      return clamp((y - n) / (H_ * 0.16), 0, 0.85);
    });
    paint(l4, W_, H_, [[P['accent-3'], P['surface-2']]], seaFn(g, seaT));
    // chimney smoke puffs live in the near layer so they move with it
    const near = wallLayers[3];
    $$('.puff', near).forEach(p => p.remove());
    for (let i = 0; i < 3; i++) {
      const p = document.createElement('i'); p.className = 'puff';
      p.style.left = (sh.cx * S_ - 2) + 'px'; p.style.top = ((sh.base - sh.h - sh.rh - 8) * S_) + 'px';
      near.appendChild(p);
    }
    startSea();
  }
  function startSea() {
    clearInterval(seaTimer);
    if (reduced()) return;
    seaTimer = setInterval(() => {
      if (document.hidden || !scene || saverOn) return;
      seaT += 1;
      const P = palette();
      paint(wallLayers[4].firstChild, W_, H_, [[P['accent-3'], P['surface-2']]], seaFn(scene, seaT));
    }, 420);
  }
  // pointer parallax
  let parTarget = [0, 0], parCur = [0, 0], parRaf = 0;
  function parTick() {
    parCur[0] += (parTarget[0] - parCur[0]) * 0.08; parCur[1] += (parTarget[1] - parCur[1]) * 0.08;
    wallLayers.forEach((d, i) => { d.style.transform = `translate(${Math.round(parCur[0] * PAR[i])}px, ${Math.round(parCur[1] * PAR[i] * 0.5)}px)`; });
    if (Math.abs(parTarget[0] - parCur[0]) > 0.002 || Math.abs(parTarget[1] - parCur[1]) > 0.002) parRaf = requestAnimationFrame(parTick); else parRaf = 0;
  }
  addEventListener('pointermove', e => {
    if (!settings.parallax || reduced() || phone() || e.pointerType === 'touch') return;
    parTarget = [-(e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2];
    if (!parRaf) parRaf = requestAnimationFrame(parTick);
  }, { passive: true });
  function resetParallax() { parTarget = [0, 0]; if (!parRaf) parRaf = requestAnimationFrame(parTick); }

  /* ───────────────────────── origin illustrations in the documents ───────────────────────── */
  const ART = {
    kiambu(W, H, P) {
      const hz = H * 0.5;
      const r1 = x => H * 0.38 - (Math.sin(x * 0.05 + 1) * 0.5 + Math.sin(x * 0.13) * 0.2) * H * 0.08;
      const r2 = x => H * 0.5 - (Math.sin(x * 0.035 + 2.2) * 0.5 + 0.5) * H * 0.1;
      const hill = x => H * 0.6 - (Math.cos((x - W * 0.75) / W * 2.6) * 0.5 + 0.5) * H * 0.32;
      const sunX = W * 0.2, sunY = H * 0.26, sunR = H * 0.13;
      const back = [[[P.bg, P.surface, P['surface-2']], [P.surface, P['accent-2']]], (x, y) => {
        if (y >= r2(x)) return 10 + 0.75;
        if (y >= r1(x)) return 10 + 0.45;
        const d = Math.hypot(x - sunX, y - sunY);
        if (d < sunR) return 2;
        if (d < sunR * 1.5) return 1.1 + (1 - (d - sunR) / (sunR * 0.5)) * 0.8;
        return clamp(y / hz, 0, 1) * 1.1;
      }];
      const mid = [[[P['accent-2'], P.accent]], (x, y) => {
        const h = hill(x); if (y < h) return -1;
        const dy = y - h, row = Math.floor(dy / 4), w = dy - row * 4;
        return (w < 2 && ((x + row * 2) % 5 + 5) % 5 < 3) ? 1 : 0;
      }];
      const bx = Math.round(W * 0.16), bw = Math.round(W * 0.34), bTop = Math.round(H * 0.62), bBase = Math.round(H * 0.8);
      const front = [[[P['accent-2'], P.text], [P['surface-2'], P.surface, P.text], [P['accent-3'], P['surface-2']]], (x, y) => {
        // channel from the station down to the bottom edge
        const cx = bx + bw * 0.8 + (y - bBase) * 0.9;
        if (y > bBase - 1 && Math.abs(x - cx) < 3 + (y - bBase) * 0.12) return 20 + (((x + y * 2) % 7 === 0) ? 1 : 0);
        if (y >= bTop - 7 && y < bTop && x >= bx - 4 && x < bx + bw + 4) return (y === bTop - 7 || (x % 3)) ? 12 : 11;   // corrugated roof
        if (y >= bTop && y < bTop + 3 && x >= bx && x < bx + bw) return 11.5;                                          // shade under the eaves
        if (x >= bx && x < bx + bw && y >= bTop && y < bBase) {
          const lx = x - bx; if (lx % 9 < 1) return 12;               // posts
          if (y >= bTop + 4 && y < bTop + 8 && lx % 9 > 2 && lx % 9 < 7) return 21; // tanks
          return 10;
        }
        if (y >= bBase - 1) return clamp((y - bBase) / (H * 0.5), 0, 0.6);
        return -1;
      }];
      return [back, mid, front];
    },
    huila(W, H, P) {
      const peaks = x => H * 0.62 - Math.max(0, 1 - Math.abs(((x / W) * 3.2 % 1) - 0.5) * 2.1) ** 1.3 * H * (0.42 + 0.12 * Math.sin(x * 0.07));
      const ridge = x => H * 0.58 - (Math.sin(x * 0.04 + 1.4) * 0.5 + 0.5) * H * 0.12;
      const back = [[[P.bg, P.surface, P['surface-2']], [P['accent-2'], P.text], [P['surface-2']]], (x, y) => {
        const cb = H * 0.36 + Math.sin(x * 0.09) * 2;
        if (Math.abs(y - cb) < 3 && ((x >> 3) % 5) !== 0) return 20;           // cloud band
        if (y >= ridge(x)) return 10 + 0.15;
        if (y >= peaks(x)) return 10 + 0.55 - clamp((y - peaks(x)) / (H * 0.3), 0, 1) * 0.35;
        return clamp(y / (H * 0.6), 0, 1) * 1.2;
      }];
      const slope = x => H * 0.72 - (x / W) * H * 0.12;
      const mid = [[[P['accent-2'], P.text]], (x, y) => {
        // shade trees
        for (let i = 0; i < 6; i++) {
          const tx = W * (0.08 + i * 0.17), ty = slope(tx) - H * 0.06, tr = H * 0.07;
          if (Math.hypot(x - tx, (y - ty) * 1.3) < tr) return 0.55 + (y > ty ? 0.3 : 0);
          if (Math.abs(x - tx) < 1.5 && y > ty && y < slope(tx)) return 1;
        }
        return y >= slope(x) ? 0 : -1;
      }];
      const cTop = Math.round(H * 0.6), bedY = Math.round(H * 0.8);
      const front = [[[P.text], [P['surface-2'], P.accent], [P['accent-2'], P.text]], (x, y) => {
        // shade cloth: a mesh over the beds, read as a 50% dither
        if (y >= cTop && y < cTop + 3) return 0;
        if (y > cTop + 2 && y < cTop + 6 && ((x + y) & 1)) return 0;
        if ((x % 38) < 2 && y >= cTop && y < H) return 0;                     // poles
        // raised beds
        if (y >= bedY && y < bedY + 4 && (x % 38) > 4 && (x % 38) < 34) return y === bedY ? 10 + (hash(x, 3) < 0.5 ? 1 : 0.4) : 10 + 1;
        if (y >= bedY + 4 && y < H && ((x % 38) === 7 || (x % 38) === 31)) return 0;
        if (y >= H * 0.9) return 20 + 0.4;
        return -1;
      }];
      return [back, mid, front];
    }
  };
  const ART_PAR = [0.55, 0.28, 0];
  function renderArt(box) {
    const kind = box.dataset.art; if (!ART[kind]) return;
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    const s = 2, W = Math.ceil(w / s), H = Math.ceil(h / s) + 40;   // extra height for scroll parallax
    const layers = ART[kind](W, Math.ceil(h / s), palette());
    if (box.children.length !== 3) { box.innerHTML = ''; for (let i = 0; i < 3; i++) box.appendChild(document.createElement('canvas')); }
    layers.forEach(([ramps, fn], i) => {
      const c = box.children[i];
      paint(c, W, H, ramps, (x, y) => (i === 0 && y >= H - 40 ? fn(x, H - 41) : fn(x, y)));
      c.style.width = W * s + 'px'; c.style.height = H * s + 'px';
    });
  }
  function renderArts() { $$('.doc-art').forEach(b => { if (b.closest('.win') && !b.closest('.win').hidden) renderArt(b); else b.dataset.stale = '1'; }); }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entries => entries.forEach(e => { if (e.contentRect.width) renderArt(e.target); }));
    $$('.doc-art').forEach(b => ro.observe(b));
  }
  $$('.win--doc .win-body').forEach(body => {
    body.addEventListener('scroll', () => {
      if (reduced()) return;
      const st = body.scrollTop; const art = $('.doc-art', body); if (!art) return;
      [...art.children].forEach((c, i) => { c.style.transform = `translateY(${Math.round(Math.min(st, 260) * ART_PAR[i])}px)`; });
    }, { passive: true });
  });

  /* ───────────────────────── window manager ───────────────────────── */
  const DEF = {
    welcome: { x: 236, y: 70, w: 548, minW: 380, minH: 300 },
    roast: { x: 756, y: 168, w: 500, minW: 360, minH: 340 },
    kiambu: { x: 150, y: 56, w: 620, h: 690, minW: 360, minH: 300 },
    huila: { x: 214, y: 84, w: 620, h: 690, minW: 360, minH: 300 },
    brew: { x: 430, y: 92, w: 500, minW: 400, minH: 420 },
    plans: { x: 230, y: 74, w: 780, h: 590, minW: 600, minH: 440 },
    questions: { x: 290, y: 126, w: 740, h: 470, minW: 500, minH: 320 },
    trash: { x: 820, y: 420, w: 400, h: 300, minW: 300, minH: 220 },
    control: { x: 470, y: 130, w: 460, minW: 340, minH: 300 },
    about: { x: 520, y: 210, w: 470, minW: 340, minH: 220 }
  };
  const WM = { wins: new Map(), z: 10, active: null };
  $$('.win').forEach(el => {
    const id = el.dataset.app;
    WM.wins.set(id, { id, el, x: 0, y: 0, w: 0, h: null, open: false, min: false, placed: false, opener: null, fs: 0, zoomed: false, prev: null });
    const edge = document.createElement('div'); edge.className = 'win-edge'; edge.setAttribute('aria-hidden', 'true'); el.appendChild(edge);
    const home = document.createElement('button'); home.type = 'button'; home.className = 'win-home'; home.setAttribute('aria-label', 'Go to the home screen'); el.appendChild(home);
  });
  const W = id => WM.wins.get(id);
  function placeDefault(st) {
    const d = DEF[st.id], vw = innerWidth, vh = innerHeight, mb = MB();
    st.w = Math.min(d.w, vw - 150);
    st.x = clamp(d.x, 8, Math.max(8, vw - st.w - 136));
    st.y = clamp(d.y, mb + 10, Math.max(mb + 10, vh - 160));
    st.h = d.h ? Math.min(d.h, vh - st.y - 16) : null;
  }
  function applyRect(st) {
    const e = st.el;
    if (phone()) { e.style.left = ''; e.style.top = ''; e.style.width = ''; e.style.height = ''; e.style.maxHeight = ''; return; }
    e.style.left = Math.round(st.x) + 'px'; e.style.top = Math.round(st.y) + 'px';
    e.style.width = Math.round(st.w) + 'px';
    e.style.height = st.h ? Math.round(st.h) + 'px' : '';
    e.style.maxHeight = st.h ? '' : (innerHeight - st.y - 14) + 'px';
  }
  function setActive(st) {
    WM.active = st;
    WM.wins.forEach(s => s.el.classList.toggle('is-active', s === st));
  }
  function front(st) {
    if (st.el.style.zIndex != WM.z) st.el.style.zIndex = ++WM.z;
    setActive(st);
  }
  function topOpen() {
    let best = null;
    WM.wins.forEach(s => { if (s.open && !s.min && (!best || +s.el.style.zIndex > +best.el.style.zIndex)) best = s; });
    return best;
  }
  const iconOf = id => $(`.icon[data-app="${id}"]`);
  const visible = el => !!(el && el.getClientRects().length);
  function updateIcon(id) {
    const ic = iconOf(id); if (!ic) return;
    const st = W(id); const spr = $('.spr', ic);
    const hatch = !!(st && st.open);
    if (spr.dataset.hatch !== String(hatch)) { spr.dataset.hatch = String(hatch); hydrate(spr, hatch); }
  }
  const onOpen = {}, onClose = {};

  function zoom(icon, win, mode, done) {
    if (reduced() || !hasGsap()) { done && done(); return; }
    const wr = win.getBoundingClientRect();
    const ir = visible(icon) ? $('.spr', icon).getBoundingClientRect() : { left: wr.left + wr.width / 2 - 24, top: wr.top + wr.height / 2 - 24, width: 48, height: 48 };
    const layer = $('#zoomlayer');
    for (let i = 1; i <= 5; i++) {
      const k = mode === 'open' ? i / 6 : 1 - i / 6;
      const r = document.createElement('div'); r.className = 'zr';
      r.style.cssText = `left:${ir.left + (wr.left - ir.left) * k}px;top:${ir.top + (wr.top - ir.top) * k}px;width:${ir.width + (wr.width - ir.width) * k}px;height:${ir.height + (wr.height - ir.height) * k}px`;
      layer.appendChild(r);
      gsap.timeline({ delay: i * 0.03, onComplete: () => r.remove() }).set(r, { opacity: 1 }).set(r, { opacity: 0 }, 0.07);
    }
    const sx = ir.width / wr.width, sy = ir.height / wr.height, dx = ir.left - wr.left, dy = ir.top - wr.top;
    gsap.killTweensOf(win);
    if (mode === 'open') {
      gsap.fromTo(win, { x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 0, transformOrigin: '0 0' },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.34, delay: 0.14, ease: 'back.out(1.2)', clearProps: 'transform,opacity', onComplete: done });
    } else {
      gsap.to(win, { x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 0, transformOrigin: '0 0', duration: 0.22, ease: 'power2.in',
        onComplete: () => { done && done(); gsap.set(win, { clearProps: 'transform,opacity' }); } });
    }
  }

  function openWin(id, opener, opts = {}) {
    const st = W(id); if (!st) return;
    if (id !== 'trash' && trashState.items.includes(id)) { toast(`${NAMES[id]} is in the Trash. Put it back to open it.`); return; }
    if (opener) st.opener = opener;
    if (st.open && !st.min) { front(st); if (!opts.noFocus) st.el.focus({ preventScroll: true }); return; }
    st.open = true; st.min = false;
    if (!st.placed || phone()) { if (!st.placed) placeDefault(st); st.placed = true; }
    applyRect(st);
    st.el.hidden = false;
    front(st);
    updateIcon(id);
    if (st.el.querySelector('.doc-art')) $$('.doc-art', st.el).forEach(renderArt);
    zoom(iconOf(id), st.el, 'open');
    if (!opts.noFocus) st.el.focus({ preventScroll: true });
    if (phone()) { try { history.pushState({ tw: id }, ''); } catch (e) { /* ignore */ } }
    onOpen[id] && onOpen[id](st);
    if (!opts.quiet) sound('open');
    armIdle();
  }
  let pendingPop = null;
  function closeWin(id, opts = {}) {
    const st = W(id); if (!st || !st.open) return;
    if (phone() && !opts.fromPop) {
      try { if (history.state && history.state.tw === id) { pendingPop = { id, opts }; history.back(); return; } } catch (e) { /* ignore */ }
    }
    const minimise = !!opts.minimise;
    const wasActive = WM.active === st;
    st.open = minimise; st.min = minimise;
    onClose[id] && onClose[id](st);
    const finish = () => { st.el.hidden = true; if (hasGsap()) gsap.set(st.el, { clearProps: 'transform,opacity' }); };
    if (opts.slide && hasGsap() && !reduced()) gsap.to(st.el, { x: innerWidth, duration: 0.22, ease: 'power2.in', onComplete: finish });
    else if (opts.instant) finish();
    else zoom(iconOf(id), st.el, 'close', finish);
    updateIcon(id);
    const next = topOpen();
    if (wasActive) setActive(next);
    if (!opts.noReturn) {
      let ret = st.opener && document.contains(st.opener) && visible(st.opener) && !st.opener.closest('.win[hidden]') && !(st.opener.closest('.win') === st.el) ? st.opener : iconOf(id);
      if (!visible(ret)) ret = next ? next.el : null;
      if (phone() && next) ret = next.el.contains(st.opener) ? st.opener : next.el;
      ret && ret.focus({ preventScroll: true });
    }
    sound('close');
  }
  addEventListener('popstate', () => {
    if (pendingPop) { const p = pendingPop; pendingPop = null; closeWin(p.id, { ...p.opts, fromPop: true }); return; }
    if (!phone()) return;
    const t = topOpen(); if (t) closeWin(t.id, { fromPop: true });
  });
  try { if (history.state && history.state.tw) history.replaceState(null, ''); } catch (e) { /* ignore */ }

  function toggleZoom(st) {
    if (phone()) return;
    st.el.classList.add('is-tidy');
    if (st.zoomed && st.prev) { Object.assign(st, st.prev); st.zoomed = false; }
    else {
      st.prev = { x: st.x, y: st.y, w: st.w, h: st.h };
      st.x = 10; st.y = MB() + 10; st.w = innerWidth - 150; st.h = innerHeight - st.y - 14; st.zoomed = true;
    }
    applyRect(st); setTimeout(() => st.el.classList.remove('is-tidy'), 360);
  }

  WM.wins.forEach(st => {
    const el = st.el, bar = $('.win-bar', el), grip = $('.win-grip', el);
    el.addEventListener('pointerdown', () => front(st), true);
    el.addEventListener('focusin', () => front(st));
    $('.wb-close', el).addEventListener('click', () => closeWin(st.id));
    $('.wb-min', el).addEventListener('click', () => closeWin(st.id, { minimise: true }));
    $('.wb-zoom', el).addEventListener('click', () => toggleZoom(st));
    $('.win-home', el).addEventListener('click', () => goHome());
    bar.addEventListener('dblclick', e => { if (phone() || e.target.closest('button')) return; el.classList.toggle('is-shaded'); });
    bar.addEventListener('pointerdown', e => {
      if (phone() || e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = st.x, oy = st.y;
      bar.setPointerCapture(e.pointerId);
      const mv = ev => {
        st.x = clamp(ox + ev.clientX - sx, -st.w + 100, innerWidth - 100);
        st.y = clamp(oy + ev.clientY - sy, MB(), innerHeight - 40);
        el.style.left = Math.round(st.x) + 'px'; el.style.top = Math.round(st.y) + 'px';
      };
      const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); applyRect(st); st.zoomed = false; };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    grip.addEventListener('pointerdown', e => {
      if (phone() || e.button !== 0) return;
      e.preventDefault();
      const d = DEF[st.id], sx = e.clientX, sy = e.clientY, ow = st.w, oh = st.h || el.offsetHeight;
      grip.setPointerCapture(e.pointerId);
      const mv = ev => {
        st.w = clamp(ow + ev.clientX - sx, d.minW, innerWidth - st.x - 6);
        st.h = clamp(oh + ev.clientY - sy, d.minH, innerHeight - st.y - 6);
        applyRect(st);
      };
      const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); st.zoomed = false; };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
    });
    grip.addEventListener('keydown', e => {
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k || phone()) return;
      e.preventDefault(); const d = DEF[st.id], n = e.shiftKey ? 64 : 16;
      st.w = clamp(st.w + k[0] * n, d.minW, innerWidth - st.x - 6);
      st.h = clamp((st.h || el.offsetHeight) + k[1] * n, d.minH, innerHeight - st.y - 6);
      applyRect(st);
    });
    el.addEventListener('keydown', e => {
      if (e.target !== el || phone()) return;
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k) return;
      e.preventDefault(); const n = e.shiftKey ? 64 : 16;
      st.x = clamp(st.x + k[0] * n, -st.w + 100, innerWidth - 100); st.y = clamp(st.y + k[1] * n, MB(), innerHeight - 40);
      applyRect(st);
    });
    // phone: back gesture from the left edge
    const edge = $('.win-edge', el);
    edge.addEventListener('pointerdown', e => {
      if (!phone()) return;
      const sx = e.clientX; let dx = 0; edge.setPointerCapture(e.pointerId);
      const mv = ev => { dx = Math.max(0, ev.clientX - sx); el.style.transform = `translateX(${dx}px)`; };
      const up = () => {
        edge.removeEventListener('pointermove', mv); edge.removeEventListener('pointerup', up); edge.removeEventListener('pointercancel', up);
        if (dx > 80) { if (hasGsap()) gsap.set(el, { x: dx }); el.style.transform = hasGsap() ? el.style.transform : ''; closeWin(st.id, { slide: true }); }
        else if (hasGsap() && !reduced()) gsap.to(el, { x: 0, duration: 0.18, clearProps: 'transform' });
        else el.style.transform = '';
      };
      edge.addEventListener('pointermove', mv); edge.addEventListener('pointerup', up); edge.addEventListener('pointercancel', up);
    });
  });
  function goHome() { const list = []; WM.wins.forEach(s => { if (s.open && !s.min) list.push(s); }); list.forEach(s => closeWin(s.id, { fromPop: true, noReturn: true, instant: list.length > 1 })); try { if (history.state && history.state.tw) history.go(-Math.max(1, list.length)); } catch (e) { /* ignore */ } const f = iconOf(list[0] && list[0].id); f && f.focus({ preventScroll: true }); }

  // things that open windows
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    openWin(b.dataset.open, b);
  });

  /* ───────────────────────── desktop icons ───────────────────────── */
  const ORDER = ['kiambu', 'huila', 'roast', 'brew', 'plans', 'questions'];
  const DOCK_BEFORE = 'control';
  let pos = {};
  let selected = null;
  function defaultPos() {
    const vw = innerWidth, vh = innerHeight, top = MB() + 14, stepY = 106;
    const rows = Math.max(1, Math.floor((vh - top - 130) / stepY));
    const p = {};
    ORDER.forEach((id, i) => { const c = Math.floor(i / rows), r = i % rows; p[id] = { x: vw - 126 - c * 114, y: top + r * stepY }; });
    p.trash = { x: vw - 126, y: vh - 116 };
    return p;
  }
  function clampPos(p) { return { x: clamp(p.x, 4, innerWidth - 110), y: clamp(p.y, MB() + 4, innerHeight - 100) }; }
  function layoutIcons(reset) {
    const def = defaultPos(), saved = reset ? {} : store.get('icons', {});
    [...ORDER, 'trash'].forEach(id => {
      const s = saved[id] && saved[id].vw === innerWidth ? saved[id] : null;
      pos[id] = s ? clampPos(s) : def[id];
      applySlot(id);
    });
  }
  function applySlot(id) {
    const slot = $(`.slot[data-id="${id}"]`); if (!slot) return;
    slot.style.translate = phone() ? '' : `${Math.round(pos[id].x)}px ${Math.round(pos[id].y)}px`;
  }
  function savePos() { const o = {}; Object.keys(pos).forEach(k => { o[k] = { ...pos[k], vw: innerWidth }; }); store.set('icons', o); }
  function select(id) {
    selected = id;
    $$('.icon').forEach(ic => ic.classList.toggle('is-sel', ic.dataset.app === id));
  }
  let lastPT = 'mouse', suppressClick = false;
  $$('.icon').forEach(icon => {
    const id = icon.dataset.app, slot = icon.parentElement;
    icon.addEventListener('focus', () => { if (!phone()) select(id); });
    icon.addEventListener('pointerdown', e => {
      lastPT = e.pointerType;
      if (phone() || e.button !== 0 || !pos[id]) return;
      select(id);
      const sx = e.clientX, sy = e.clientY, p0 = { ...pos[id] }; let drag = false, over = false;
      const trashIcon = iconOf('trash');
      const mv = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!drag && Math.hypot(dx, dy) < 6) return;
        if (!drag) { drag = true; slot.classList.add('is-dragging'); try { icon.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
        slot.style.translate = `${Math.round(p0.x + dx)}px ${Math.round(p0.y + dy)}px`;
        const tr = trashIcon.getBoundingClientRect();
        over = id !== 'trash' && ev.clientX > tr.left - 10 && ev.clientX < tr.right + 10 && ev.clientY > tr.top - 10 && ev.clientY < tr.bottom + 10;
        trashIcon.classList.toggle('is-target', over);
      };
      const up = ev => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        if (!drag) return;
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
        slot.classList.remove('is-dragging'); trashIcon.classList.remove('is-target');
        if (over) { pos[id] = p0; applySlot(id); trashItem(id); }
        else { pos[id] = clampPos({ x: p0.x + ev.clientX - sx, y: p0.y + ev.clientY - sy }); applySlot(id); savePos(); }
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    icon.addEventListener('click', e => {
      if (suppressClick) { suppressClick = false; return; }
      if (e.detail === 0 || phone() || lastPT === 'touch' || lastPT === 'pen') openWin(id, icon);
      else select(id);
    });
    icon.addEventListener('dblclick', () => { if (!phone()) openWin(id, icon); });
    icon.addEventListener('keydown', e => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && id !== 'trash') { e.preventDefault(); trashItem(id); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const list = $$('.icon').filter(visible); const i = list.indexOf(icon);
        const n = list[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
        if (n) { e.preventDefault(); n.focus(); }
      }
    });
  });
  $('#home').addEventListener('pointerdown', e => { if (e.target === e.currentTarget || e.target.id === 'icons') select(null); });
  wall.addEventListener('pointerdown', () => select(null));
  function moveDock() {
    const dock = $('#dock'), icons = $('#icons');
    $$('.slot[data-dock]').forEach(s => { if (phone()) dock.appendChild(s); else icons.insertBefore(s, $(`.slot[data-id="${DOCK_BEFORE}"]`)); });
  }

  /* ───────────────────────── trash ───────────────────────── */
  const trashState = { items: [], emptied: [] };
  function trashItem(id) {
    if (!id || id === 'trash') return;
    if (id === 'plans') { showAlert({ title: 'Plans can’t go in the Trash', body: 'Plans is where your first bag lives. Everything else on this desktop can be thrown away and put back.', icon: 'bag' }); return; }
    if (trashState.items.includes(id)) return;
    const st = W(id); if (st && st.open) closeWin(id, { noReturn: true, instant: true });
    trashState.items.push(id);
    $(`.slot[data-id="${id}"]`).hidden = true;
    if (selected === id) select(null);
    renderTrash(); sound('trash'); toast(`${NAMES[id]} moved to the Trash.`);
    const t = iconOf('trash'); t && t.focus({ preventScroll: true });
  }
  function putBack(id) {
    trashState.items = trashState.items.filter(x => x !== id);
    $(`.slot[data-id="${id}"]`).hidden = false; renderTrash();
  }
  function renderTrash() {
    const list = $('#trash-list'); list.innerHTML = '';
    trashState.items.forEach(id => {
      const li = document.createElement('li');
      const ic = iconOf(id), spr = ic ? $('.spr', ic) : null;
      li.innerHTML = `<span class="spr" data-sprite="${spr ? spr.dataset.sprite : 'doc'}" ${spr && spr.dataset.remap ? `data-remap="${spr.dataset.remap}"` : ''}></span><span class="nm">${NAMES[id]}</span><button type="button" class="tool-btn">Put Back</button>`;
      hydrate($('.spr', li));
      $('button', li).addEventListener('click', () => { putBack(id); const n = $('#trash-list button') || $('#win-trash'); n.focus(); });
      list.appendChild(li);
    });
    const n = trashState.items.length;
    $('#trash-hint').hidden = n > 0;
    $('#trash-empty').disabled = n === 0;
    $('#trash-count').textContent = n ? `${n} item${n > 1 ? 's' : ''}` : 'Empty';
    const tspr = $('.spr', iconOf('trash'));
    tspr.dataset.sprite = n ? 'trashfull' : 'trash'; hydrate(tspr, W('trash').open);
    tspr.dataset.hatch = String(W('trash').open);
  }
  function emptyTrash() {
    if (!trashState.items.length) return;
    const names = trashState.items.map(id => NAMES[id]).join(', ');
    showAlert({ title: 'Empty the Trash?', body: `${names} will disappear from the desktop until you choose Special, Restore Desktop or reload the page.`, icon: 'trashfull',
      buttons: [{ label: 'Cancel', quiet: true }, { label: 'Empty Trash', act: () => { trashState.emptied.push(...trashState.items); trashState.items = []; renderTrash(); sound('trash'); toast('The Trash is empty.'); } }] });
  }
  function restoreDesktop() {
    [...trashState.emptied, ...trashState.items].forEach(id => { $(`.slot[data-id="${id}"]`).hidden = false; });
    trashState.emptied = []; trashState.items = []; renderTrash(); layoutIcons(true); savePos(); toast('Every icon is back on the desktop.');
  }
  $('#trash-empty').addEventListener('click', emptyTrash);

  /* ───────────────────────── modal alert ───────────────────────── */
  let alertReturn = null;
  function showAlert({ title, body, icon = 'bag', buttons }) {
    const m = $('#modal'); alertReturn = document.activeElement;
    $('#al-t').textContent = title; $('#al-d').textContent = body;
    const ico = $('#al-ico'); ico.dataset.sprite = icon; hydrate(ico);
    const box = $('#al-btns'); box.innerHTML = '';
    (buttons || [{ label: 'OK' }]).forEach((b, i, arr) => {
      let el;
      if (b.href) { el = document.createElement('a'); el.href = b.href; }
      else { el = document.createElement('button'); el.type = 'button'; el.addEventListener('click', () => { closeAlert(); b.act && b.act(); }); }
      el.className = 'btn' + (b.quiet ? ' btn--quiet' : ''); el.textContent = b.label;
      box.appendChild(el);
      if (i === arr.length - 1) el.dataset.default = '1';
    });
    m.hidden = false; sound('alert');
    ($('[data-default]', box) || $('.alert', m)).focus();
  }
  function closeAlert() { $('#modal').hidden = true; if (alertReturn && document.contains(alertReturn)) alertReturn.focus({ preventScroll: true }); }
  $('#modal').addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeAlert(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('#al-btns .btn'); if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });

  /* ───────────────────────── menus ───────────────────────── */
  const tops = $$('.mb-top');
  let openMenu = null;
  const menuOf = top => $('#' + top.getAttribute('aria-controls'));
  const itemsOf = m => $$('.mb-item', m);
  function setRoving(top) { tops.forEach(t => t.tabIndex = t === top ? 0 : -1); }
  function openM(top, focus) {
    if (openMenu && openMenu.top === top) { if (focus) focusItem(focus); return; }
    closeM(false); refreshMenus();
    const m = menuOf(top); m.hidden = false; top.setAttribute('aria-expanded', 'true'); openMenu = { top, m }; setRoving(top);
    if (focus) focusItem(focus);
  }
  function focusItem(which) { const it = itemsOf(openMenu.m); const el = which === 'last' ? it[it.length - 1] : it[0]; el && el.focus(); }
  function closeM(returnFocus) {
    if (!openMenu) return;
    const { top, m } = openMenu; m.hidden = true; top.setAttribute('aria-expanded', 'false'); openMenu = null;
    if (returnFocus) top.focus();
  }
  function visibleTops() { return tops.filter(visible); }
  tops.forEach(top => {
    top.addEventListener('click', e => { if (openMenu && openMenu.top === top) closeM(false); else openM(top, e.detail === 0 ? 'first' : null); });
    top.addEventListener('pointerenter', () => { if (openMenu && openMenu.top !== top && !phone()) openM(top, null); });
    top.addEventListener('keydown', e => {
      const vt = visibleTops(), i = vt.indexOf(top);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); const n = vt[(i + (e.key === 'ArrowRight' ? 1 : -1) + vt.length) % vt.length];
        setRoving(n); n.focus(); if (openMenu) openM(n, 'first');
      } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openM(top, 'first'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); openM(top, 'last'); }
      else if (e.key === 'Escape' && openMenu) { e.preventDefault(); e.stopPropagation(); closeM(true); }
    });
  });
  $$('.mb-menu').forEach(m => {
    m.addEventListener('keydown', e => {
      const it = itemsOf(m), i = it.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); it[(i + 1) % it.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); it[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); it[it.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeM(true); }
      else if (e.key === 'Tab') { closeM(false); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const vt = visibleTops(), j = vt.indexOf(openMenu.top);
        const n = vt[(j + (e.key === 'ArrowRight' ? 1 : -1) + vt.length) % vt.length];
        e.preventDefault(); openM(n, 'first'); n.tabIndex = 0;
      } else if (e.key === ' ' && document.activeElement.tagName === 'A') { e.preventDefault(); document.activeElement.click(); }
    });
    m.addEventListener('click', e => {
      const it = e.target.closest('.mb-item'); if (!it) return;
      if (it.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      if (it.tagName === 'A') return;
      const top = openMenu && openMenu.top; closeM(false);
      const cmd = it.dataset.cmd; if (CMD[cmd]) CMD[cmd](it, top); else if (top) top.focus();
    });
    m.addEventListener('pointerover', e => { const it = e.target.closest('.mb-item'); if (it && document.activeElement !== it) it.focus({ preventScroll: true }); });
  });
  document.addEventListener('pointerdown', e => { if (openMenu && !e.target.closest('.mb-li')) closeM(false); });
  function setDis(cmd, dis) { $$(`[data-cmd="${cmd}"]`).forEach(el => el.setAttribute('aria-disabled', String(!!dis))); }
  function setChk(cmd, on) { $$(`[data-cmd="${cmd}"]`).forEach(el => el.setAttribute('aria-checked', String(!!on))); }
  function refreshMenus() {
    setDis('open', !selected); setDis('trash', !selected || selected === 'trash'); setDis('close', !topOpen());
    setDis('putback', !trashState.items.length); setDis('empty', !trashState.items.length); setDis('restore', !trashState.emptied.length && !trashState.items.length);
    setDis('saver', reduced()); setDis('parallax', reduced()); setDis('tile', !topOpen());
    setChk('large', settings.large); setChk('parallax', settings.parallax && !reduced()); setChk('sound', settings.sound);
    // window list in View
    const sep = $('[data-winlist]'); const menu = sep.parentElement;
    $$('.mb-dyn', menu).forEach(n => n.remove());
    const open = []; WM.wins.forEach(s => { if (s.open) open.push(s); });
    sep.hidden = !open.length;
    open.forEach(s => {
      const li = document.createElement('li'); li.setAttribute('role', 'none'); li.className = 'mb-dyn';
      li.innerHTML = `<button type="button" role="menuitemradio" class="mb-item" data-cmd="focuswin" data-id="${s.id}" aria-checked="${WM.active === s && !s.min}"><span>${NAMES[s.id]}${s.min ? ' (minimised)' : ''}</span></button>`;
      menu.appendChild(li);
    });
  }
  const LOTS = 'Tidewater Roasters, October lots. Batch 041 roasts Monday 12 October and ships by Wednesday 14 October.\n'
    + '1. Kiambu, Kenya: SL28 and SL34, washed, 1,800 m. Blackcurrant, grapefruit, cane sugar. Light roast.\n'
    + '2. Huila, Colombia: Caturra, honey process, 1,750 m. Red apple, panela, cocoa nib. Medium-light roast.\n'
    + '(Tidewater is a fictional roastery.)';
  function toggleSetting(k, v) {
    settings[k] = v === undefined ? !settings[k] : v; store.set(k, settings[k]);
    if (k === 'large') html.classList.toggle('large', settings.large);
    if (k === 'parallax' && !settings.parallax) resetParallax();
    if (k === 'saver') armIdle();
    syncControl();
  }
  const CMD = {
    about: (el, top) => openWin('about', top), welcome: (el, top) => openWin('welcome', top), control: (el, top) => openWin('control', top), plans: (el, top) => openWin('plans', top),
    open: () => selected && openWin(selected, iconOf(selected)),
    close: () => { const t = topOpen(); t && closeWin(t.id); },
    trash: () => trashItem(selected),
    putback: () => { [...trashState.items].forEach(putBack); toast('Everything in the Trash is back on the desktop.'); },
    copy: async () => { try { await navigator.clipboard.writeText(LOTS); toast('October’s lots are on the clipboard.'); } catch (e) { toast('Your browser blocked the clipboard.'); } },
    selectall: () => { $$('.icon').filter(visible).forEach(ic => ic.classList.add('is-sel')); selected = null; toast('All icons selected.'); },
    cleanup: () => { $$('.slot').forEach(s => s.classList.add('is-tidy')); layoutIcons(true); savePos(); setTimeout(() => $$('.slot').forEach(s => s.classList.remove('is-tidy')), 380); },
    tile: () => tileWindows(),
    large: () => toggleSetting('large'), parallax: () => toggleSetting('parallax'), sound: () => { toggleSetting('sound'); sound('click'); },
    empty: () => emptyTrash(), restore: () => restoreDesktop(), saver: () => startSaver(true),
    restart: () => restart(), shutdown: () => shutdown(),
    roast: (el, top) => openWin('roast', top), ship: (el, top) => { openWin('questions', top); selectTab(0); },
    changes: (el, top) => { openWin('questions', top); selectTab(5); }, next: (el, top) => { openWin('questions', top); selectTab(6); },
    focuswin: el => { const id = el.dataset.id; openWin(id); }
  };
  function tileWindows() {
    const list = []; WM.wins.forEach(s => { if (s.open && !s.min) list.push(s); }); if (!list.length || phone()) return;
    const n = list.length, cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), g = 18;
    const x0 = 12, y0 = MB() + 12, aw = innerWidth - 150 - x0, ah = innerHeight - y0 - 14;
    const cw = (aw - g * (cols - 1)) / cols, ch = (ah - g * (rows - 1)) / rows;
    list.forEach((s, i) => {
      const c = i % cols, r = Math.floor(i / cols); s.el.classList.add('is-tidy');
      s.x = x0 + c * (cw + g); s.y = y0 + r * (ch + g); s.w = Math.max(cw, 280); s.h = Math.max(ch, 200); applyRect(s);
      setTimeout(() => s.el.classList.remove('is-tidy'), 380);
    });
  }

  /* ───────────────────────── clock & roast date ───────────────────────── */
  const clock = $('#clock'); let clockDate = false;
  function tickClock() {
    const d = new Date();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
    clock.textContent = clockDate ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (phone() ? time : `${day} ${time}`);
    const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((new Date(2026, 9, 12) - today) / 86400000);
    const rel = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff > 1 && diff < 60 ? `in ${diff} days` : diff < 0 ? 'roasted' : '';
    $$('[data-roast-rel]').forEach(el => { el.textContent = rel; });
  }
  clock.addEventListener('click', () => { clockDate = !clockDate; tickClock(); clock.setAttribute('aria-label', clockDate ? 'Date. Press to show the time.' : 'Clock. Press to show the date.'); });
  tickClock(); setInterval(tickClock, 10000);

  /* ───────────────────────── Roast.mov player ───────────────────────── */
  const vid = $('#roast-video'), vplay = $('#vplay'), scrub = $('#vscrub'), vtime = $('#vtime');
  let scrubbing = false, wasPlaying = false;
  const fmt = s => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
  const dur = () => (isFinite(vid.duration) && vid.duration) || 9;
  function syncVid() {
    const d = dur(), t = vid.currentTime || 0;
    if (!scrubbing) scrub.value = Math.round(t / d * 1000);
    scrub.style.setProperty('--fill', (scrub.value / 10) + '%');
    scrub.setAttribute('aria-valuetext', `${t.toFixed(1)} of ${d.toFixed(1)} seconds`);
    vtime.textContent = `${fmt(t)} / ${fmt(d)}`;
  }
  function vidUI() { const p = !vid.paused; vplay.classList.toggle('is-playing', p); vplay.setAttribute('aria-label', p ? 'Pause' : 'Play'); }
  function playVid() { if (vid.preload !== 'auto') vid.preload = 'auto'; const p = vid.play(); if (p && p.catch) p.catch(() => vidUI()); }
  function vtick() { syncVid(); if (!vid.paused) requestAnimationFrame(vtick); }
  vplay.addEventListener('click', () => (vid.paused ? playVid() : vid.pause()));
  $('.screen-hit').addEventListener('click', () => (vid.paused ? playVid() : vid.pause()));
  vid.addEventListener('play', () => { vidUI(); requestAnimationFrame(vtick); });
  vid.addEventListener('pause', vidUI);
  vid.addEventListener('loadedmetadata', syncVid);
  vid.addEventListener('timeupdate', () => { if (vid.paused) syncVid(); });
  scrub.addEventListener('pointerdown', () => { scrubbing = true; wasPlaying = !vid.paused; vid.pause(); });
  const endScrub = () => { if (!scrubbing) return; scrubbing = false; if (wasPlaying) playVid(); };
  scrub.addEventListener('pointerup', endScrub); scrub.addEventListener('pointercancel', endScrub); scrub.addEventListener('change', endScrub);
  scrub.addEventListener('input', () => {
    if (vid.readyState === 0) { vid.preload = 'auto'; vid.load(); }
    try { vid.currentTime = scrub.value / 1000 * dur(); } catch (e) { /* not seekable yet */ }
    scrub.style.setProperty('--fill', (scrub.value / 10) + '%');
    vtime.textContent = `${fmt(scrub.value / 1000 * dur())} / ${fmt(dur())}`;
  });
  onOpen.roast = () => { if (!reduced()) playVid(); else if (vid.preload !== 'auto') { vid.preload = 'metadata'; } };
  onClose.roast = () => vid.pause();

  /* ───────────────────────── Brew Calculator ───────────────────────── */
  const BREW = {
    filter: { water: 250, ratio: 16, temp: 94, time: 180, tl: ['3:00', ''], wl: 'Water', note: 'Grind medium-fine. Bloom with twice the coffee’s weight in water for 30 s, then pour slowly in circles.' },
    espresso: { dose: 18, out: 36, temp: 93, time: 28, tl: ['25–30', ' s'], wl: 'In the cup', note: 'Grind fine. Pull one double shot per cup: 18 g in, 36 g out.' },
    moka: { water: 50, ratio: 10, temp: 90, time: 270, tl: ['4–5', ' min'], wl: 'Water', note: 'Grind finer than filter, coarser than espresso. Fill the base with hot water to just below the valve, and take it off the heat when it starts to sputter.' },
    press: { water: 250, ratio: 15, temp: 95, time: 240, tl: ['4:00', ''], wl: 'Water', note: 'Grind coarse. Stir after a minute, press the plunger slowly at four minutes and pour it all out.' }
  };
  let cups = 2, method = 'filter', tmr = null, tStart = 0;
  const g05 = v => { const r = Math.round(v * 2) / 2; return (r % 1 ? r.toFixed(1) : String(r)); };
  function brewCalc() {
    const b = BREW[method];
    const dose = b.dose ? b.dose * cups : b.water * cups / b.ratio;
    const water = b.out ? b.out * cups : b.water * cups;
    $('#o-dose').innerHTML = `${g05(dose)}<small> g</small>`;
    $('#o-water-l').textContent = b.wl;
    $('#o-water').innerHTML = `${water}<small> g</small>`;
    $('#o-temp').innerHTML = `${b.temp}<small> °C</small>`;
    $('#o-time').innerHTML = `${b.tl[0]}<small>${b.tl[1]}</small>`;
    $('#o-note').textContent = b.note;
    $('#cups-n').textContent = cups;
    $$('.calc .step').forEach(s => { s.disabled = (+s.dataset.d < 0 && cups <= 1) || (+s.dataset.d > 0 && cups >= 6); });
    const vis = $('#cups-vis'); vis.innerHTML = '';
    for (let i = 0; i < cups; i++) { const s = document.createElement('span'); s.className = 'spr'; s.dataset.sprite = method === 'espresso' ? 'espresso' : 'cup'; hydrate(s); vis.appendChild(s); }
    resetTimer();
  }
  function setBar(el) {
    const b = BREW[method], t = el;
    const p = clamp(t / b.time, 0, 1);
    $('#t-bar span').style.setProperty('--p', (p * 100) + '%');
    const bar = $('#t-bar'); bar.setAttribute('aria-valuemax', b.time); bar.setAttribute('aria-valuenow', Math.floor(t)); bar.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(b.time)}`);
    $('#t-clock').textContent = fmt(t);
  }
  function resetTimer() { clearInterval(tmr); tmr = null; $('#t-start').textContent = 'Start brew timer'; setBar(0); }
  $('#t-start').addEventListener('click', () => {
    if (tmr) { resetTimer(); return; }
    if ($('#t-start').textContent === 'Reset timer') { resetTimer(); return; }
    tStart = Date.now(); $('#t-start').textContent = 'Stop timer';
    tmr = setInterval(() => {
      const el = (Date.now() - tStart) / 1000, b = BREW[method];
      setBar(Math.min(el, b.time));
      if (el >= b.time) { clearInterval(tmr); tmr = null; $('#t-start').textContent = 'Reset timer'; sound('done'); toast('Brew time is up. Pour it now.'); }
    }, 200);
  });
  $$('.calc input[name="method"]').forEach(r => r.addEventListener('change', () => { method = r.value; brewCalc(); }));
  $$('.calc .step').forEach(s => s.addEventListener('click', () => { cups = clamp(cups + +s.dataset.d, 1, 6); brewCalc(); sound('click'); }));
  brewCalc();

  /* ───────────────────────── Plans wizard ───────────────────────── */
  const wz = $('#wz'); let step = 1;
  const val = n => { const r = wz.querySelector(`input[name="${n}"]:checked`); return r ? r.value : null; };
  function wzSummary() {
    const p = val('plan'), bags = $('#wz-bags'); bags.innerHTML = '';
    const n = p === 'two' ? 2 : 1;
    for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'spr spr--hero'; s.dataset.sprite = 'bag'; if (i) s.dataset.remap = 'a:c'; hydrate(s); bags.appendChild(s); }
    const g = val('grind');
    $('#wz-sum').innerHTML = p ? `<b><span class="cur">€</span>${p === 'two' ? '26' : '14'} a month</b>${p === 'two' ? 'Two bags, both coffees' : 'One bag, alternating'}${g ? `<br>${g.toLowerCase().replace('whole bean', 'Whole bean')}` : ''}` : 'Pick a plan to see your box.';
  }
  function wzShow(n, focus = true) {
    step = n;
    $$('.wz-page', wz).forEach(p => { p.hidden = +p.dataset.step !== n; });
    $$('#wz-steps li').forEach(li => { const s = +li.dataset.s; li.classList.toggle('is-done', s < n); if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    $('#wz-back').disabled = n === 1;
    $('#wz-next').textContent = n === 4 ? 'Choose your first bag' : 'Continue';
    if (n === 4) {
      const p = val('plan'), g = val('grind'), s = val('start');
      const rows = [
        ['Plan', p === 'two' ? 'Two bags, 2 × 250 g' : 'One bag, 250 g'],
        ['Coffee', p === 'two' ? 'Kiambu and Huila, side by side' : 'Alternates between the two lots'],
        ['Grind', g],
        ['First roast', s === 'nov' ? 'November’s lots, announced 2 November' : 'Monday 12 October, batch 041'],
        ['Ships', s === 'nov' ? 'Within 48 hours of roasting' : 'By Wednesday 14 October'],
        ['Changes', 'Skip, pause or cancel by the Sunday before roasting']
      ];
      $('#wz-review').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') + `<div class="total"><dt>Each month</dt><dd><span class="cur">€</span>${p === 'two' ? '26' : '14'}</dd></div>`;
    }
    wzSummary();
    if (focus) { const h = $(`.wz-page[data-step="${n}"] .wz-h`, wz); h && h.focus({ preventScroll: true }); }
  }
  function wzErr(name, msg) { const e = $(`[data-err="${name}"]`, wz); if (e) e.textContent = msg || ''; }
  $('#wz-next').addEventListener('click', () => {
    if (step === 1 && !val('plan')) { wzErr('plan', 'Pick one of the two plans to continue.'); $('input[name="plan"]', wz).focus(); return; }
    if (step === 2 && !val('grind')) { wzErr('grind', 'Choose whole bean or a grind to continue.'); $('input[name="grind"]', wz).focus(); return; }
    if (step < 4) { wzShow(step + 1); sound('click'); return; }
    const p = val('plan'), g = val('grind'), s = val('start');
    showAlert({ title: 'Your first bag is chosen', icon: 'bag',
      body: `${p === 'two' ? 'Two bags' : 'One bag'}, ${g.toLowerCase().replace('whole bean', 'whole bean')}, starting with ${s === 'nov' ? 'November’s lots' : 'batch 041'}. This is a demo: Tidewater is a fictional roastery, so nothing was ordered and nothing was charged.`,
      buttons: [{ label: 'All showcases', href: '../../', quiet: true }, { label: 'OK' }] });
  });
  $('#wz-back').addEventListener('click', () => { if (step > 1) wzShow(step - 1); });
  wz.addEventListener('change', e => { if (e.target.name) wzErr(e.target.name, ''); wzSummary(); });
  wz.addEventListener('submit', e => e.preventDefault());
  onOpen.plans = () => { if (step === 4) wzShow(1, false); };
  wzShow(1, false);

  /* ───────────────────────── Questions (vertical tabs) ───────────────────────── */
  const tabs = $$('.help-tabs [role="tab"]');
  function selectTab(i, focus) {
    tabs.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', e => {
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); selectTab((i + k + tabs.length) % tabs.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
      else if (e.key === 'End') { e.preventDefault(); selectTab(tabs.length - 1, true); }
    });
  });

  /* ───────────────────────── Control Panel & text size ───────────────────────── */
  function syncControl() {
    $$('[data-set]').forEach(c => {
      const k = c.dataset.set; c.checked = !!settings[k];
      const motion = k === 'saver' || k === 'parallax';
      c.disabled = motion && reduced();
      if (motion) { const note = $('[data-motion-note]', c.closest('.chk')); if (!note.dataset.orig) note.dataset.orig = note.textContent; note.textContent = reduced() ? 'Off: your system asks for reduced motion.' : note.dataset.orig; if (reduced()) c.checked = false; }
    });
  }
  $$('[data-set]').forEach(c => c.addEventListener('change', () => { toggleSetting(c.dataset.set, c.checked); if (c.dataset.set === 'sound') sound('click'); }));
  $('#cp-palette').addEventListener('click', () => { const b = $('.ucz-btn'); if (b) b.click(); });
  html.classList.toggle('large', settings.large);
  syncControl();
  $$('.win--doc').forEach(win => {
    const st = W(win.dataset.app), body = $('.win-body', win);
    $$('[data-size]', win).forEach(b => b.addEventListener('click', () => { st.fs = clamp(st.fs + +b.dataset.size, -1, 3); body.style.fontSize = `calc(var(--win-fs) * ${(1 + st.fs * 0.12).toFixed(2)})`; }));
  });

  /* ───────────────────────── Escape ───────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (!$('#modal').hidden || !$('#shutdown').hidden) return;
    if (openMenu) { closeM(true); return; }
    if ($('.ucz-panel:not([hidden])')) return;
    const w = document.activeElement && document.activeElement.closest && document.activeElement.closest('.win');
    if (w && !w.hidden) { e.preventDefault(); closeWin(w.dataset.app); return; }
    if (phone()) { const t = topOpen(); if (t) closeWin(t.id); }
  });

  /* ───────────────────────── screensaver (motion only) ───────────────────────── */
  let saverOn = false, idleT = 0, saverRaf = 0, saverEng = null, wakeAt = null;
  function busy() { return !vid.paused || !!tmr || !$('#modal').hidden || !$('#shutdown').hidden || !$('#boot').hidden; }
  function armIdle() { clearTimeout(idleT); if (!settings.saver || reduced()) return; idleT = setTimeout(() => { if (busy()) armIdle(); else startSaver(); }, 60000); }
  function beanSprites(P) {
    const out = [];
    for (let a = 0; a < 16; a++) {
      const ang = a / 16 * Math.PI, c = document.createElement('canvas'); c.width = c.height = 11; const x = c.getContext('2d');
      const img = x.createImageData(11, 11), ca = Math.cos(ang), sa = Math.sin(ang);
      for (let py = 0; py < 11; py++) for (let px = 0; px < 11; px++) {
        const dx = px - 5, dy = py - 5, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        if ((u * u) / 16 + (v * v) / 7.3 > 1) continue;
        const col = Math.abs(v + Math.sin(u * 0.8) * 0.6) < 0.6 ? P.accent : (v < -1.2 && u < 0 ? P['surface-2'] : P.bg);
        const o = (py * 11 + px) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
      x.putImageData(img, 0, 0); out.push(c);
    }
    return out;
  }
  function startSaver(manual) {
    if (saverOn || reduced() || !window.Matter) { if (manual && !window.Matter) toast('The screensaver is still loading.'); return; }
    saverOn = true; closeM(false);
    const el = $('#saver'), c = $('#saver-c'); el.hidden = false;
    const S = phone() ? 2 : 3, Wd = Math.ceil(innerWidth / S), Hd = Math.ceil(innerHeight / S);
    c.width = Wd; c.height = Hd; const ctx = c.getContext('2d');
    const P = palette(), spr = beanSprites(P);
    const { Engine, Bodies, Composite, Body } = window.Matter;
    const eng = saverEng = Engine.create(); eng.gravity.y = 0.55;
    const ground = Bodies.rectangle(Wd / 2, Hd + 10, Wd * 3, 20, { isStatic: true });
    const left = Bodies.rectangle(-10, Hd / 2, 20, Hd * 4, { isStatic: true });
    const right = Bodies.rectangle(Wd + 10, Hd / 2, 20, Hd * 4, { isStatic: true });
    Composite.add(eng.world, [ground, left, right]);
    const beans = []; let last = performance.now(), spawn = 0, waveClock = 0, wave = null;
    const toCss = a => `rgb(${a[0]},${a[1]},${a[2]})`;
    const waveH = x => { if (!wave) return 0; const u = (x - wave.x) / wave.w; if (u < 0 || u > 1) return 0; const k = u < 0.18 ? Math.sin(u / 0.18 * Math.PI / 2) ** 0.6 : (1 - (u - 0.18) / 0.82) ** 1.4; return Hd * 0.4 * k; };
    wakeAt = null;
    function frame(now) {
      if (!saverOn) return;
      const dt = Math.min(40, now - last); last = now;
      spawn += dt; waveClock += dt;
      if (!wave && spawn > 70 && beans.length < 230) {
        spawn = 0;
        const b = Bodies.rectangle(8 + Math.random() * (Wd - 16), -8, 8, 5.5, { chamfer: { radius: 2.6 }, restitution: 0.25, friction: 0.4, angle: Math.random() * Math.PI });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.2); beans.push(b); Composite.add(eng.world, b);
      }
      if (!wave && waveClock > 15000) { wave = { x: Wd + 4, w: Math.max(120, Wd * 0.7) }; Composite.remove(eng.world, left); }
      if (wave) {
        wave.x -= dt * 0.11 * (Wd / 480 + 0.5);
        for (const b of beans) { const h = waveH(b.position.x); if (h > 0 && b.position.y > Hd - h - 2) Body.setVelocity(b, { x: -2.6 - Math.random(), y: Math.min(b.velocity.y, -0.4 - Math.random() * 0.8) }); }
        if (wave.x + wave.w < -4) {
          for (let i = beans.length - 1; i >= 0; i--) if (beans[i].position.x < -4) { Composite.remove(eng.world, beans[i]); beans.splice(i, 1); }
          wave = null; waveClock = 0; Composite.add(eng.world, left);
        }
      }
      for (let left2 = dt; left2 > 0; left2 -= 16) Engine.update(eng, Math.min(16, left2));
      ctx.fillStyle = toCss(P.text); ctx.fillRect(0, 0, Wd, Hd);
      for (const b of beans) {
        let a = b.angle % Math.PI; if (a < 0) a += Math.PI;
        ctx.drawImage(spr[Math.round(a / Math.PI * 16) % 16], Math.round(b.position.x) - 5, Math.round(b.position.y) - 5);
      }
      if (wave) {
        for (let x = Math.max(0, Math.floor(wave.x)); x < Math.min(Wd, wave.x + wave.w); x++) {
          const h = Math.round(waveH(x)); if (h <= 0) continue;
          ctx.fillStyle = toCss(P['accent-3']); ctx.fillRect(x, Hd - h, 1, h);
          ctx.fillStyle = toCss(P['surface-2']); ctx.fillRect(x, Hd - h, 1, 3);
          for (let y = Hd - h + 6; y < Hd; y += 3) if (hash((x + Math.floor(y / 3) * 5) >> 2, y) < 0.22) ctx.fillRect(x, y, 1, 1);
        }
      }
      saverRaf = requestAnimationFrame(frame);
    }
    saverRaf = requestAnimationFrame(frame);
  }
  function stopSaver() {
    if (!saverOn) return;
    saverOn = false; cancelAnimationFrame(saverRaf);
    if (saverEng && window.Matter) { window.Matter.Composite.clear(saverEng.world, false); window.Matter.Engine.clear(saverEng); }
    saverEng = null; $('#saver').hidden = true; sound('wake'); armIdle();
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, e => { if (saverOn) { stopSaver(); if (ev === 'keydown') e.preventDefault(); } armIdle(); }, { capture: true, passive: ev !== 'keydown' }));
  addEventListener('pointermove', e => {
    if (saverOn) { if (!wakeAt) wakeAt = [e.clientX, e.clientY]; else if (Math.hypot(e.clientX - wakeAt[0], e.clientY - wakeAt[1]) > 8) stopSaver(); return; }
    armIdle();
  }, { passive: true });

  /* ───────────────────────── boot, restart, shut down ───────────────────────── */
  function boot(force, then) {
    const b = $('#boot');
    let seen = false; try { seen = sessionStorage.getItem('tw-booted') === '1'; } catch (e) { /* ignore */ }
    if (reduced() || (seen && !force) || !hasGsap()) { then(); return; }
    try { sessionStorage.setItem('tw-booted', '1'); } catch (e) { /* ignore */ }
    const bar = $('.boot-bar span', b), msg = $('#boot-msg');
    gsap.set(b, { opacity: 1 }); gsap.set(bar, { width: 0 }); msg.textContent = 'Warming the drum';
    b.hidden = false;
    gsap.timeline({ onComplete: () => { b.hidden = true; then(); } })
      .to(bar, { width: '100%', duration: 0.8, ease: 'steps(10)' })
      .call(() => { msg.textContent = 'Loading October’s lots'; }, null, 0.3)
      .call(() => { msg.textContent = 'Opening the desktop'; }, null, 0.6)
      .to(b, { opacity: 0, duration: 0.16 }, '+=0.06');
  }
  function closeAll() { WM.wins.forEach(s => { if (s.open) { s.open = false; s.min = false; s.el.hidden = true; onClose[s.id] && onClose[s.id](s); updateIcon(s.id); } }); setActive(null); }
  function startDesktop() {
    if (phone()) { const f = $('.widget-cta'); return; }
    openWin('roast', null, { quiet: true, noFocus: true });
    setTimeout(() => openWin('welcome', null, { quiet: true }), reduced() ? 0 : 180);
  }
  function restart() { $('#shutdown').hidden = true; closeAll(); boot(true, startDesktop); }
  function shutdown() {
    closeAll(); const s = $('#shutdown'); s.hidden = false; $('.shutdown-card', s).focus();
  }
  $('#sd-restart').addEventListener('click', restart);
  $('#shutdown').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('#shutdown .btn'); const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });

  /* ───────────────────────── mode & resize ───────────────────────── */
  function setMode() {
    moveDock();
    WM.wins.forEach(st => {
      $('.wb-close', st.el).setAttribute('aria-label', phone() ? 'Back to the home screen' : `Close ${NAMES[st.id]}`);
      if (!phone() && st.placed) { st.x = clamp(st.x, -st.w + 100, innerWidth - 100); st.y = clamp(st.y, MB(), innerHeight - 40); }
      applyRect(st);
    });
    layoutIcons(false); tickClock();
  }
  mqPhone.addEventListener('change', () => { setMode(); renderWall(); });
  mqReduce.addEventListener('change', () => { syncControl(); startSea(); armIdle(); if (reduced()) resetParallax(); });
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { renderWall(); setMode(); }, 160); });
  document.addEventListener('unclaw:palette', () => { renderWall(); renderArts(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(idleT); else armIdle(); });

  addEventListener('keydown', e => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) html.dataset.input = 'kbd'; }, true);
  addEventListener('pointerdown', () => { html.dataset.input = 'ptr'; }, true);

  /* ───────────────────────── go ───────────────────────── */
  setMode();
  renderWall();
  renderTrash();
  boot(false, startDesktop);
  armIdle();
  window.TidewaterOS = { open: openWin, close: closeWin, saver: () => startSaver(true), wins: WM.wins };
})();
