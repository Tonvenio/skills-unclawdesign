/* unclawdesign palette customizer — drop-in panel for any page built on --c-* tokens.
 * Needs palette-engine.js loaded first. Include:  <script src="palette-engine.js"></script><script src="customizer.js"></script>
 * Optional: <div id="dock"> … </div> — a "Palette" button is added to it; otherwise a floating button appears.
 * State is kept in the link (?pal=…) and in localStorage, and is shared by every page on the same origin.
 */
(function () {
  const WADA = /*WADA_DATA*/;
  const P = window.UnclawPalette;
  if (!P) { console.warn('customizer: palette-engine.js missing'); return; }
  const KEY = 'unclaw-palette';
  const combos = WADA.combos.map(([no, ids]) => ({ no, colors: ids.map(i => ({ name: WADA.colors[i][0], hex: WADA.colors[i][1] })) }));
  let state = null;   // { kind: 'w'|'c', no?, colors?, mode }

  const enc = s => s.kind === 'w' ? `w${s.no}.${s.mode}` : `c.${s.colors.map(c => c.replace('#', '')).join('-')}.${s.mode}`;
  function dec(str) {
    if (!str) return null;
    const p = String(str).split('.');
    if (p[0] === 'c' && p[1]) { const colors = p[1].split('-').filter(x => /^[0-9a-f]{6}$/i.test(x)).map(x => '#' + x); return colors.length ? { kind: 'c', colors, mode: p[2] || 'color' } : null; }
    const no = parseInt(p[0].slice(1), 10);
    return p[0][0] === 'w' && combos.some(c => c.no === no) ? { kind: 'w', no, mode: p[1] || 'color' } : null;
  }
  const colorsOf = s => s.kind === 'w' ? combos.find(c => c.no === s.no).colors.map(c => c.hex) : s.colors;
  const labelOf = s => s.kind === 'w' ? `Wada No. ${s.no}: ` + combos.find(c => c.no === s.no).colors.map(c => c.name).join(', ') : 'Your colours: ' + s.colors.join(', ');

  function save() {
    try { state ? localStorage.setItem(KEY, enc(state)) : localStorage.removeItem(KEY); } catch (e) {}
    try { const u = new URL(location.href); state ? u.searchParams.set('pal', enc(state)) : u.searchParams.delete('pal'); history.replaceState(history.state, '', u); } catch (e) {}
  }
  function applyState(s, persist = true) {
    state = s;
    if (!s) { P.clear(); render(); if (persist) save(); dispatch(null); return; }
    const t = P.fromColors(colorsOf(s), s.mode);
    P.apply(t); render(t); if (persist) save(); dispatch(t);
  }
  function dispatch(t) { document.dispatchEvent(new CustomEvent('unclaw:palette', { detail: { tokens: t, state } })); }

  /* ── UI ── */
  const css = `
  .ucz-btn{appearance:none;border:0;background:transparent;color:inherit;font:inherit;display:inline-flex;align-items:center;gap:8px;padding:0 12px;min-height:40px;border-radius:min(var(--r-control,999px),17px);cursor:pointer;white-space:nowrap}
  .ucz-btn:hover{background:color-mix(in oklch,var(--c-bg) 16%,transparent)}
  .ucz-btn[aria-expanded="true"]{background:var(--c-bg);color:var(--c-text)}
  .ucz-btn:focus-visible{outline:2px solid var(--c-bg);outline-offset:2px}
  .ucz-btn .ucz-dot{width:14px;height:14px;border-radius:50%;background:conic-gradient(var(--c-accent) 0 33%,var(--c-accent-2,var(--c-accent-soft)) 0 66%,var(--c-accent-3,var(--c-surface-2)) 0);box-shadow:0 0 0 1.5px currentColor}
  .ucz-float{position:fixed;z-index:60;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));background:var(--c-text);color:var(--c-bg);border-radius:22px;padding:5px;box-shadow:0 10px 30px -12px rgb(0 0 0/.5)}
  @media (max-width:600px){.ucz-float{padding:3px}.ucz-float .ucz-btn{padding:0;min-width:40px;justify-content:center}.ucz-float .ucz-btn span:not(.ucz-dot){position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}
  .ucz-panel{position:fixed;z-index:61;right:max(10px,env(safe-area-inset-right));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 58px);width:min(25rem,calc(100vw - 20px));max-height:min(78svh,40rem);display:flex;flex-direction:column;
    background:var(--c-surface);color:var(--c-text);border:1px solid var(--c-border-strong);border-radius:min(var(--r-md,12px),16px);box-shadow:0 18px 50px -18px rgb(0 0 0/.55);font:400 14px/1.45 var(--font-body,system-ui),system-ui,sans-serif;letter-spacing:0;text-transform:none}
  .ucz-panel[hidden]{display:none}
  .ucz-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 8px}
  .ucz-head h2{font:700 16px/1.2 var(--font-body,system-ui),system-ui,sans-serif;letter-spacing:0;text-transform:none;margin:0}
  .ucz-x{appearance:none;border:0;background:transparent;color:inherit;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer}
  .ucz-x:hover{background:var(--c-surface-2)}
  .ucz-row{display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px 8px;align-items:center}
  .ucz-seg{display:inline-flex;border:1px solid var(--c-border-strong);border-radius:999px;padding:2px;gap:2px}
  .ucz-seg button,.ucz-chip,.ucz-act{appearance:none;border:0;background:transparent;color:var(--c-text);font:500 13px/1 var(--font-body,system-ui),system-ui,sans-serif;padding:8px 11px;border-radius:999px;cursor:pointer;min-height:32px}
  .ucz-seg button[aria-pressed="true"]{background:var(--c-text);color:var(--c-bg)}
  .ucz-chip{border:1px solid var(--c-border-strong)} .ucz-chip[aria-pressed="true"]{background:var(--c-accent);color:var(--c-accent-ink);border-color:var(--c-accent)}
  .ucz-act{border:1px solid var(--c-border-strong)} .ucz-act:hover,.ucz-chip:hover{background:var(--c-surface-2)}
  .ucz-seg button:focus-visible,.ucz-chip:focus-visible,.ucz-act:focus-visible,.ucz-sw:focus-visible,.ucz-x:focus-visible{outline:2px solid var(--c-focus);outline-offset:2px}
  .ucz-grid{overflow:auto;padding:4px 16px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(5.6rem,1fr));gap:8px;flex:1;min-height:8rem}
  .ucz-sw{appearance:none;border:1px solid var(--c-border);background:var(--c-bg);border-radius:8px;padding:4px;cursor:pointer;display:flex;flex-direction:column;gap:4px;color:var(--c-text-muted);font:500 11.5px/1 var(--font-body,system-ui),system-ui,sans-serif;text-align:left}
  .ucz-sw[aria-pressed="true"]{border-color:var(--c-text);box-shadow:0 0 0 2px var(--c-text)}
  .ucz-sw span.strip{display:flex;height:2.2rem;border-radius:5px;overflow:hidden} .ucz-sw span.strip i{flex:1}
  .ucz-custom{padding:4px 16px 12px;display:grid;gap:8px}
  .ucz-custom label{display:flex;align-items:center;gap:10px;font-weight:500}
  .ucz-custom input[type=color]{inline-size:44px;block-size:34px;padding:0;border:1px solid var(--c-border-strong);border-radius:8px;background:none;cursor:pointer}
  .ucz-custom input[type=text]{flex:1;min-width:0;font:500 14px/1 ui-monospace,monospace;padding:8px 10px;border:1px solid var(--c-border-strong);border-radius:8px;background:var(--c-bg);color:var(--c-text)}
  .ucz-foot{border-top:1px solid var(--c-border);padding:10px 16px 14px;display:grid;gap:8px}
  .ucz-now{color:var(--c-text-muted);font-size:12.5px}
  .ucz-now b{color:var(--c-text);font-weight:600}
  .ucz-ok{font-size:12.5px} .ucz-ok.good::before{content:"✓ ";color:inherit} .ucz-ok.warn::before{content:"! "}
  .ucz-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .ucz-panel [hidden]{display:none!important}`;

  let panel, btn, grid, nowEl, okEl, filter = 0, view = 'w', live;
  function el(tag, attrs = {}, html = '') { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (html) e.innerHTML = html; return e; }

  function build() {
    const st = el('style'); st.textContent = css; document.head.appendChild(st);
    btn = el('button', { type: 'button', class: 'ucz-btn', 'aria-expanded': 'false', 'aria-controls': 'ucz-panel' }, '<span class="ucz-dot" aria-hidden="true"></span><span>Palette</span>');
    const dock = document.querySelector('[data-palette-dock], #dock');
    if (dock) dock.insertBefore(btn, dock.lastElementChild);
    else { const f = el('div', { class: 'ucz-float' }); f.appendChild(btn); document.body.appendChild(f); }
    panel = el('aside', { id: 'ucz-panel', class: 'ucz-panel', hidden: '', 'aria-labelledby': 'ucz-title' });
    panel.innerHTML = `
      <div class="ucz-head"><h2 id="ucz-title">Palette</h2><button type="button" class="ucz-x" aria-label="Close palette">×</button></div>
      <div class="ucz-row">
        <div class="ucz-seg" role="group" aria-label="Source"><button type="button" data-view="w" aria-pressed="true">Wada 348</button><button type="button" data-view="c" aria-pressed="false">Your colours</button></div>
        <div class="ucz-seg" role="group" aria-label="Ground"><button type="button" data-mode="color" aria-pressed="true">Colour</button><button type="button" data-mode="light" aria-pressed="false">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>
      </div>
      <div class="ucz-row ucz-wtools">
        <button type="button" class="ucz-chip" data-f="0" aria-pressed="true">All</button><button type="button" class="ucz-chip" data-f="2" aria-pressed="false">2 colours</button>
        <button type="button" class="ucz-chip" data-f="3" aria-pressed="false">3</button><button type="button" class="ucz-chip" data-f="4" aria-pressed="false">4</button>
        <button type="button" class="ucz-act" data-act="shuffle">Shuffle</button>
      </div>
      <div class="ucz-grid" role="group" aria-label="Wada colour combinations"></div>
      <div class="ucz-custom" hidden>
        <p class="ucz-now">Enter 1 to 4 colours. They stay exact as fills; text and button colours are adjusted until they pass contrast checks.</p>
        ${[0, 1, 2, 3].map(i => `<label><input type="color" data-i="${i}" aria-label="Colour ${i + 1}"><input type="text" data-i="${i}" placeholder="${i ? 'optional' : '#1a6b5c'}" aria-label="Colour ${i + 1} hex" spellcheck="false"></label>`).join('')}
      </div>
      <div class="ucz-foot"><p class="ucz-now" aria-live="polite"></p><p class="ucz-ok"></p>
        <div class="ucz-row" style="padding:0"><button type="button" class="ucz-act" data-act="reset">Reset to direction</button><button type="button" class="ucz-act" data-act="copy">Copy CSS</button></div></div>`;
    document.body.appendChild(panel);
    grid = panel.querySelector('.ucz-grid'); nowEl = panel.querySelector('.ucz-foot .ucz-now'); okEl = panel.querySelector('.ucz-ok');
    btn.addEventListener('click', () => toggle(panel.hidden));
    panel.querySelector('.ucz-x').addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
    panel.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    panel.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      if (state) applyState({ ...state, mode }); else applyState({ kind: 'w', no: combos[Math.floor(Math.random() * combos.length)].no, mode });
    }));
    panel.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = +b.dataset.f; drawGrid(); }));
    panel.querySelector('[data-act="shuffle"]').addEventListener('click', () => {
      const pool = combos.filter(c => !filter || c.colors.length === filter); const c = pool[Math.floor(Math.random() * pool.length)];
      applyState({ kind: 'w', no: c.no, mode: state ? state.mode : 'color' });
      const sw = grid.querySelector(`[data-no="${c.no}"]`); if (sw) sw.scrollIntoView({ block: 'nearest' });
    });
    panel.querySelector('[data-act="reset"]').addEventListener('click', () => applyState(null));
    panel.querySelector('[data-act="copy"]').addEventListener('click', async () => {
      if (!state) return;
      const t = P.fromColors(colorsOf(state), state.mode);
      const text = `/* ${labelOf(state)} (${state.mode} ground) — unclawdesign */\n` + P.toCSS(t);
      try { await navigator.clipboard.writeText(text); okEl.textContent = 'CSS copied to the clipboard.'; } catch (e) { okEl.textContent = 'Copy failed; your browser blocked clipboard access.'; }
    });
    const custom = panel.querySelector('.ucz-custom');
    custom.addEventListener('input', e => {
      const i = +e.target.dataset.i; if (Number.isNaN(i)) return;
      const pair = custom.querySelectorAll(`[data-i="${i}"]`);
      let v = e.target.value.trim(); if (v && v[0] !== '#') v = '#' + v;
      if (e.target.type === 'text' && /^#[0-9a-f]{6}$/i.test(v)) pair[0].value = v;
      if (e.target.type === 'color') pair[1].value = v;
      const colors = [...custom.querySelectorAll('input[type=text]')].map(x => (x.value.trim()[0] === '#' ? x.value.trim() : '#' + x.value.trim())).filter(x => /^#[0-9a-f]{6}$/i.test(x));
      if (colors.length) applyState({ kind: 'c', colors, mode: state ? state.mode : 'color' });
    });
    drawGrid();
  }
  function toggle(open) { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) (panel.querySelector('[aria-pressed="true"].ucz-sw') || panel.querySelector('.ucz-x')).focus(); else btn.focus(); }
  function setView(v) {
    view = v;
    panel.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    panel.querySelector('.ucz-wtools').hidden = v !== 'w'; grid.hidden = v !== 'w'; panel.querySelector('.ucz-custom').hidden = v !== 'c';
    if (v === 'c') {
      const cs = state ? colorsOf(state) : [];
      panel.querySelectorAll('.ucz-custom input[type=text]').forEach((x, i) => { x.value = cs[i] || ''; panel.querySelectorAll('.ucz-custom input[type=color]')[i].value = cs[i] || '#888888'; });
    }
  }
  function drawGrid() {
    panel.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.f === filter)));
    grid.innerHTML = combos.filter(c => !filter || c.colors.length === filter).map(c =>
      `<button type="button" class="ucz-sw" data-no="${c.no}" aria-pressed="false" aria-label="Wada No. ${c.no}: ${c.colors.map(x => x.name).join(', ')}" title="${c.colors.map(x => x.name).join(' + ')}"><span class="strip">${c.colors.map(x => `<i style="background:${x.hex}"></i>`).join('')}</span>No. ${c.no}</button>`).join('');
    grid.querySelectorAll('.ucz-sw').forEach(b => b.addEventListener('click', () => applyState({ kind: 'w', no: +b.dataset.no, mode: state ? state.mode : 'color' })));
    render();
  }
  function render(t) {
    if (!panel) return;
    panel.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(state ? b.dataset.mode === state.mode : b.dataset.mode === 'color')));
    grid.querySelectorAll('.ucz-sw').forEach(b => b.setAttribute('aria-pressed', String(!!state && state.kind === 'w' && +b.dataset.no === state.no)));
    if (!state) { nowEl.innerHTML = 'Showing the direction\'s own rolled palette.'; okEl.textContent = ''; okEl.className = 'ucz-ok'; return; }
    nowEl.innerHTML = `<b>${labelOf(state)}</b>, ${state.mode} ground`;
    const r = P.report(t || P.fromColors(colorsOf(state), state.mode), state.mode);
    okEl.className = 'ucz-ok ' + (r.ok ? 'good' : 'warn');
    okEl.textContent = `Text ${r.text.toFixed(1)}:1, secondary ${r.muted.toFixed(1)}:1, links ${r.link.toFixed(1)}:1, button labels ${r.label.toFixed(1)}:1` + (r.ok ? '' : ' (below target)');
  }

  function init() {
    build();
    let s = null;
    try { s = dec(new URLSearchParams(location.search).get('pal')) || dec(localStorage.getItem(KEY)); } catch (e) {}
    if (s) applyState(s, true); else render();
  }
  window.UnclawCustomizer = { set: s => applyState(dec(s) || s), clear: () => applyState(null), get: () => state, combos };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
