/* unclawdesign palette engine (browser + node)
 * OKLCH conversion, WCAG 2 contrast, and contrast-safe token sets built from 1–4 colors.
 * Mirrors scripts/colorlib.py (build_variant / palette_from_colors) so pages can re-theme live.
 * Usage: UnclawPalette.fromColors(['#ae5224', '#f9c1ce', '#2b4a6b'], 'color')  -> { bg, surface, ..., accent, accent-ink, ... }
 */
(function (root) {
  const lin = x => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const gam = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function oklchToLinear(L, C, H) {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  const inGamut = (L, C, H, eps = 1e-4) => oklchToLinear(L, C, H).every(v => v >= -eps && v <= 1 + eps);
  function gamutMap(L, C, H) {
    L = clamp(L, 0, 1);
    if (inGamut(L, C, H)) return [L, C, H];
    let lo = 0, hi = C;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (inGamut(L, mid, H)) lo = mid; else hi = mid; }
    return [L, lo, H];
  }
  function oklchToHex(L, C, H) {
    [L, C, H] = gamutMap(L, C, H);
    return '#' + oklchToLinear(L, C, H).map(v => Math.round(clamp(gam(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, '0')).join('');
  }
  const H = lch => oklchToHex(lch[0], lch[1], lch[2]);
  function hexToRgb(h) {
    h = String(h).replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  function hexToOklab(h) {
    const [r, g, b] = hexToRgb(h).map(lin);
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const [l_, m_, s_] = [l, m, s].map(Math.cbrt);
    return [0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
      1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
      0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_];
  }
  function hexToOklch(h) { const [L, a, b] = hexToOklab(h); return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]; }
  const lum = h => { const [r, g, b] = hexToRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const deltaE = (a, b) => { const p = hexToOklab(a), q = hexToOklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

  function push(lch, against, target, dir) {
    let [L, C, Hh] = lch; const step = dir === 'darker' ? -0.005 : 0.005;
    for (let i = 0; i < 220; i++) {
      const hx = oklchToHex(L, C, Hh);
      if (Math.min(...against.map(a => contrast(hx, a))) >= target) return [L, C, Hh];
      L = clamp(L + step, 0, 1);
      if (L === 0 || L === 1) break;
    }
    return [L, C, Hh];
  }
  function avoidTerracotta(lch, limit = 0.06) {
    let [L, C, Hh] = lch;
    for (let i = 0; i < 12; i++) {
      if (deltaE(oklchToHex(L, C, Hh), '#D97757') >= limit) break;
      Hh = Hh < 39 ? (Hh - 3 + 360) % 360 : (Hh + 3) % 360; C += 0.008;
      [L, C, Hh] = gamutMap(L, C, Hh);
    }
    return [L, C, Hh];
  }
  const away = bg => (lum(bg) > 0.18 ? 'darker' : 'lighter');
  const pickInk = (fill, light, dark) => (contrast(fill, light) >= contrast(fill, dark) ? light : dark);

  function buildVariant(mode, nh, nc, accent, accent2, accent3, bg, exactFills) {
    const t = {}; let surf, darkInk, lightInk;
    if (mode === 'light') {
      const bL = bg ? bg[0] : 0.985, bgc = bg || [bL, nc, nh];
      t.bg = H(bgc);
      t.surface = H([Math.min(1, bL + 0.012), bgc[1] * 0.5, bgc[2]]);
      t['surface-2'] = H([bL - 0.04, bgc[1] * 1.3 + 0.003, bgc[2]]);
      t.border = H([bL - 0.12, nc * 1.5 + 0.006, nh]);
      surf = [t.bg, t.surface, t['surface-2']];
      t['border-strong'] = H(push([bL - 0.35, nc * 2 + 0.01, nh], [t.bg, t.surface], 3.0, 'darker'));
      t.text = H(push([0.24, Math.min(0.03, nc * 3 + 0.008), nh], surf, 7.0, 'darker'));
      t['text-muted'] = H(push([0.50, nc * 2 + 0.01, nh], surf, 4.5, 'darker'));
      darkInk = H([0.2, 0.02, nh]); lightInk = H([0.995, 0.003, nh]);
    } else if (mode === 'dark') {
      const bL = bg ? bg[0] : 0.215, bgc = bg || [bL, nc * 1.5 + 0.008, nh];
      t.bg = H(bgc);
      t.surface = H([bL + 0.05, bgc[1] * 1.05, bgc[2]]);
      t['surface-2'] = H([Math.max(0.1, bL - 0.045), bgc[1], bgc[2]]);
      t.border = H([bL + 0.13, bgc[1] * 1.1, bgc[2]]);
      surf = [t.bg, t.surface, t['surface-2']];
      t['border-strong'] = H(push([bL + 0.3, bgc[1], bgc[2]], [t.bg, t.surface], 3.0, 'lighter'));
      t.text = H(push([0.94, nc + 0.006, nh], surf, 7.0, 'lighter'));
      t['text-muted'] = H(push([0.66, nc + 0.01, nh], surf, 4.5, 'lighter'));
      darkInk = H([0.18, 0.02, nh]); lightInk = H([0.97, 0.01, nh]);
    } else {
      const bgc = bg; t.bg = H(bgc);
      const lightTxt = H([0.985, 0.012, bgc[2]]), darkTxt = H([0.2, 0.04, bgc[2]]);
      const txtDir = contrast(t.bg, lightTxt) >= contrast(t.bg, darkTxt) ? 'lighter' : 'darker';
      const sgn = txtDir === 'darker' ? 1 : -1;
      t.surface = H([clamp(bgc[0] + 0.045 * sgn, 0.05, 0.99), bgc[1] * 0.92, bgc[2]]);
      t['surface-2'] = H([clamp(bgc[0] + 0.09 * sgn, 0.05, 0.99), bgc[1] * 0.95, bgc[2]]);
      surf = [t.bg, t.surface, t['surface-2']];
      const baseTxt = txtDir === 'lighter' ? [0.985, 0.012, bgc[2]] : [0.2, 0.04, bgc[2]];
      t.text = H(push(baseTxt, surf, 7.0, txtDir));
      const tl = hexToOklch(t.text);
      t['text-muted'] = H(push([bgc[0] + (tl[0] - bgc[0]) * 0.72, bgc[1] * 0.5, bgc[2]], surf, 4.5, txtDir));
      if (Math.min(...surf.map(x => contrast(t['text-muted'], x))) < 4.5) t['text-muted'] = t.text;
      t.border = H([bgc[0] + (tl[0] - bgc[0]) * 0.22, bgc[1] * 0.8, bgc[2]]);
      t['border-strong'] = H(push([bgc[0] + (tl[0] - bgc[0]) * 0.4, bgc[1] * 0.6, bgc[2]], [t.bg, t.surface], 3.0, txtDir));
      darkInk = H([0.2, 0.03, bgc[2]]); lightInk = H([0.985, 0.01, bgc[2]]);
    }
    const aw = away(t.bg);
    if (mode === 'dark') { const [aL, aC, aH] = accent; accent = [aL < 0.70 ? Math.min(Math.max(aL + 0.16, 0.70), 0.86) : aL, aC, aH]; }
    let a = push(exactFills ? gamutMap(...accent) : avoidTerracotta(gamutMap(...accent)), [t.bg], 3.0, aw);
    t.accent = H(a);
    t['accent-hover'] = H([a[0] + (aw === 'darker' ? -0.07 : 0.07), a[1], a[2]]);
    let ink = pickInk(t.accent, lightInk, darkInk);
    if (contrast(t.accent, ink) < 4.5) {
      let best = null;
      for (const [candInk, d] of [[lightInk, 'darker'], [darkInk, 'lighter']]) {
        const a2 = push(a, [candInk], 4.5, d);
        const ok = contrast(H(a2), candInk) >= 4.5 && contrast(H(a2), t.bg) >= 3.0;
        if (ok && (best === null || Math.abs(a2[0] - a[0]) < Math.abs(best[0][0] - a[0]))) best = [a2, candInk];
      }
      if (best) [a, ink] = best;
      t.accent = H(a);
      t['accent-hover'] = H([a[0] + (ink === lightInk ? -0.07 : 0.07), a[1], a[2]]);
    }
    t['accent-ink'] = ink;
    t['accent-text'] = H(push(a, surf, 4.5, aw));
    const bgL = hexToOklch(t.bg)[0];
    let softL = mode === 'light' ? bgL - 0.05 : mode === 'dark' ? bgL + 0.08 : bgL + (aw === 'lighter' ? 0.08 : -0.08);
    if (mode === 'color') { const b = hexToOklch(t.bg); t['accent-soft'] = H([softL, b[1] * 0.75, b[2]]); }
    else t['accent-soft'] = H([softL, Math.min(a[1] * 0.35, 0.07), a[2]]);
    [['accent-2', accent2], ['accent-3', accent3]].forEach(([name, ac]) => {
      if (!ac) return;
      let g;
      if (exactFills) g = gamutMap(...ac);
      else { if (mode === 'dark' && ac[0] < 0.70) ac = [Math.min(Math.max(ac[0] + 0.16, 0.70), 0.86), ac[1], ac[2]]; g = avoidTerracotta(gamutMap(...ac)); }
      t[name] = H(g); t[name + '-ink'] = pickInk(t[name], lightInk, darkInk);
    });
    t.focus = contrast(t.accent, t.bg) >= 3 && contrast(t.accent, t.surface) >= 3 ? t.accent : t.text;
    return t;
  }

  function fromColors(hexes, mode = 'color') {
    hexes = hexes.filter(Boolean).slice(0, 4);
    const cols = hexes.map(hexToOklch);
    const idx = cols.map((_, i) => i);
    const byChroma = idx.slice().sort((i, j) => cols[j][1] - cols[i][1]);
    const lightest = idx.reduce((m, i) => (cols[i][0] > cols[m][0] ? i : m), 0);
    const darkest = idx.reduce((m, i) => (cols[i][0] < cols[m][0] ? i : m), 0);
    const used = new Set(); let bg, nh, nc, a = null;
    if (mode === 'color') {
      const carry = lch => { const hx = H(lch); return Math.max(contrast(hx, '#ffffff'), contrast(hx, '#1a1a1a')); };
      const mids = byChroma.filter(i => cols[i][0] >= 0.3 && cols[i][0] <= 0.9);
      const good = mids.filter(i => carry(cols[i]) >= 6.0);
      const g = (good.length ? good : mids.length ? mids : byChroma)[0];
      bg = cols[g].slice(); used.add(g);
      for (let n = 0; carry(bg) < 5.2 && n < 20; n++) bg = [bg[0] + (bg[0] > 0.6 ? 0.012 : -0.012), bg[1], bg[2]];
      const rest = idx.filter(i => !used.has(i));
      if (rest.length) a = rest.reduce((m, i) => (contrast(hexes[i], hexes[g]) * (1 + cols[i][1]) > contrast(hexes[m], hexes[g]) * (1 + cols[m][1]) ? i : m), rest[0]);
      nh = bg[2]; nc = bg[1];
    } else if (mode === 'light') {
      if (cols[lightest][0] >= 0.9) { bg = cols[lightest]; used.add(lightest); }
      else { const [, C, Hh] = cols[lightest]; bg = [0.975, Math.min(C * 0.3, 0.022), Hh]; }
      const rest = byChroma.filter(i => !used.has(i));
      const key = i => (cols[i][1] > 0.04 ? cols[i][0] : cols[i][0] + 0.5);
      if (rest.length) a = rest.reduce((m, i) => (key(i) < key(m) ? i : m), rest[0]);
      nh = bg[2]; nc = Math.max(bg[1], 0.004);
    } else {
      if (cols[darkest][0] <= 0.3) { bg = cols[darkest]; used.add(darkest); }
      else { const [, C, Hh] = cols[darkest]; bg = [0.2, Math.min(C * 0.6, 0.05), Hh]; }
      const rest = byChroma.filter(i => !used.has(i));
      if (rest.length) a = rest.reduce((m, i) => (cols[i][0] + cols[i][1] > cols[m][0] + cols[m][1] ? i : m), rest[0]);
      nh = bg[2]; nc = Math.max(bg[1] * 0.6, 0.004);
    }
    let accent;
    if (a === null) { const [L, C, Hh] = bg; accent = [L > 0.6 ? 0.3 : 0.9, Math.max(C, 0.08), Hh]; }
    else { accent = cols[a]; used.add(a); }
    const fills = idx.filter(i => !used.has(i)).map(i => cols[i]);
    while (fills.length < 2) {
      fills.push(fills.length === 0 ? [Math.min(0.95, accent[0] + 0.25), accent[1] * 0.6, accent[2]]
        : [Math.max(0.25, accent[0] - 0.2), accent[1] * 0.8, (accent[2] + 30) % 360]);
    }
    return buildVariant(mode, nh, nc, accent, fills[0], fills[1], bg, true);
  }

  function report(t, mode) {
    const surf = ['bg', 'surface', 'surface-2'].map(k => t[k]);
    const min = k => Math.min(...surf.map(s => contrast(t[k], s)));
    const r = { text: min('text'), muted: min('text-muted'), link: min('accent-text'), accentOnBg: contrast(t.accent, t.bg), label: contrast(t['accent-ink'], t.accent) };
    r.ok = r.text >= (mode === 'color' ? 4.5 : 7) - 0.01 && r.muted >= 4.49 && r.link >= 4.49 && r.accentOnBg >= 2.99 && r.label >= 4.49;
    return r;
  }

  function apply(tokens, el = (typeof document !== 'undefined' ? document.documentElement : null)) {
    if (!el) return;
    Object.entries(tokens).forEach(([k, v]) => el.style.setProperty('--c-' + k, v));
    const L = hexToOklch(tokens.bg)[0];
    el.style.setProperty('color-scheme', L < 0.5 ? 'dark' : 'light');
  }
  function clear(el = (typeof document !== 'undefined' ? document.documentElement : null)) {
    if (!el) return;
    [...el.style].filter(p => p.startsWith('--c-') || p === 'color-scheme').forEach(p => el.style.removeProperty(p));
  }
  function toCSS(tokens, selector = ':root') {
    return selector + ' {\n' + Object.entries(tokens).map(([k, v]) => '  --c-' + k + ': ' + v + ';').join('\n') + '\n}';
  }

  const api = { fromColors, buildVariant, report, apply, clear, toCSS, contrast, hexToOklch, oklchToHex, deltaE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UnclawPalette = api;
})(typeof window !== 'undefined' ? window : globalThis);
