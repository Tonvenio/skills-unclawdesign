/* unclawdesign palette customizer — drop-in panel for any page built on --c-* tokens.
 * Needs palette-engine.js loaded first. Include:  <script src="palette-engine.js"></script><script src="customizer.js"></script>
 * Optional: <div id="dock"> … </div> — a "Palette" button is added to it; otherwise a floating button appears.
 * State is kept in the link (?pal=…) and in localStorage, and is shared by every page on the same origin.
 */
(function () {
  const WADA = {"colors":[["Hermosa Pink","#f9c1ce"],["Corinthian Pink","#f8b6ba"],["Cameo Pink","#e0b3b6"],["Fawn","#d1b0a7"],["Light Brown Drab","#b59392"],["Coral Red","#f58e84"],["Fresh Color","#f6917e"],["Grenadine Pink","#f48067"],["Eosine Pink","#f37f94"],["Spinel Red","#f27291"],["Old Rose","#d46d7a"],["Eugenia Red | A","#e2625e"],["Eugenia Red | B","#da525d"],["Raw Sienna","#bb7125"],["Vinaceous Tawny","#c56127"],["Jasper Red","#eb5324"],["Spectrum Red","#e31f26"],["Red Orange","#dd4027"],["Etruscan Red","#c55347"],["Burnt Sienna","#ae5224"],["Ochre Red","#ab544d"],["Scarlet","#cb2f43"],["Carmine","#cc1236"],["Indian Lake","#c53c69"],["Rosolanc Purple","#b73f74"],["Pomegranite Purple","#b71f57"],["Hydrangea Red","#a94151"],["Brick Red","#a84222"],["Carmine Red","#a62c37"],["Pompeian Red","#ab2439"],["Red","#a72144"],["Brown","#7c4226"],["Hay's Russet","#793327"],["Vandyke Red","#82241f"],["Pansy Purple","#7d133a"],["Pale Burnt Lake","#802626"],["Violet Red","#642d5e"],["Vistoris Lake","#6d4145"],["Sulpher Yellow","#f5ecc2"],["Pale Lemon Yellow","#ffefae"],["Naples Yellow","#fbe6a0"],["Ivory Buff","#ebd3a2"],["Seashell Pink","#fdd4bd"],["Light Pinkish Cinnamon","#fcc79b"],["Pinkish Cinnamon","#eeb480"],["Cinnamon Buff","#fdc57e"],["Cream Yellow","#fdbf68"],["Golden Yellow","#f3a257"],["Vinaceous Cinnamon","#eea78c"],["Ochraceous Salmon","#d8a37b"],["Isabella Color","#c5a56e"],["Maple","#c59f6b"],["Olive Buff","#c1c494"],["Ecru","#c2ae93"],["Yellow","#fff200"],["Lemon Yellow","#f8ed43"],["Apricot Yellow","#ffdd00"],["Pyrite Yellow","#cab356"],["Olive Ocher","#d6b43e"],["Yellow Ocher","#e2b540"],["Orange Yellow","#fcb315"],["Yellow Orange","#f99d1b"],["Apricot Orange","#f68c50"],["Orange","#f37420"],["Peach Red","#f15a30"],["English Red","#d96629"],["Cinnamon Rufous","#c27544"],["Orange Rufous","#c16b27"],["Sulphine Yellow","#c19f2c"],["Khaki","#bc892b"],["Citron Yellow","#b2b73e"],["Citrine","#b09f36"],["Buffy Citrine","#96874d"],["Dark Citrine","#8b835b"],["Light Grayish Olive","#848061"],["Krongbergs Green","#84875e"],["Olive","#837e31"],["Orange Citrine","#986f2d"],["Sudan Brown","#a36752"],["Olive Green","#6b7140"],["Light Brownish Olive","#806e4b"],["Deep Grayish Olive","#635a3a"],["Pale Raw Umber","#71502f"],["Sepia","#644b1e"],["Madder Brown","#762c19"],["Mars Brown Tobacco","#653514"],["Vandyke Brown","#4b3317"],["Turquoise Green","#b5decc"],["Glaucous Green","#b4cdc2"],["Dark Greenish Glaucous","#b7c2a9"],["Yellow Green","#afd472"],["Light Green Yellow","#c7d14f"],["Night Green","#87c540"],["Olive Yellow","#a6a159"],["Artemesia Green","#709390"],["Andover Green","#6d7e77"],["Rainette Green","#8fa071"],["Chromium Green","#719470"],["Pistachio Green","#648f7b"],["Sea Green","#00b49b"],["Benzol Green","#00978d"],["Light Porcelain Green","#00908a"],["Green","#489b6e"],["Dull Viridian Green","#009465"],["Oil Green","#819238"],["Diamine Green","#1a7444"],["Cossack Green","#437742"],["Lincoln Green","#555832"],["Blackish Olive","#42533e"],["Deep Slate Olive","#253122"],["Nile Blue","#bce4e5"],["Pale King's Blue","#a7d4e4"],["Light Glaucous Blue","#a5c8d1"],["Salvia Blue","#97acc8"],["Cobalt Green","#96d1aa"],["Calamine BLue","#78cdd0"],["Venice Green","#62c6bf"],["Cerulian Blue","#0093a5"],["Peacock Blue","#00939b"],["Green Blue","#099197"],["Olympic Blue","#5a82b3"],["Blue","#006eb8"],["Antwarp Blue","#007190"],["Helvetia Blue","#005b8d"],["Dark Medici Blue","#547076"],["Dusky Green","#004f46"],["Deep Lyons Blue","#1c4286"],["Violet Blue","#40456a"],["Vandar Poel's Blue","#064f6e"],["Dark Tyrian Blue","#12354e"],["Dull Violet Black","#1e0e3f"],["Deep Indigo","#051230"],["Deep Slate Green","#112f2c"],["Grayish Lavender - A","#b5b1d8"],["Grayish Lavender - B","#c0a9b3"],["Laelia Pink","#ca92a8"],["Lilac","#b984af"],["Eupatorium Purple","#bf5892"],["Light Mauve","#9a72aa"],["Aconite Violet","#a36aa5"],["Dull Blue Violet","#80719e"],["Dark Soft Violet","#66629c"],["Blue Violet","#6450a1"],["Purple Drab","#84565b"],["Deep Violet / Plumbeous","#70727c"],["Veronia Purple","#8c4c62"],["Dark Slate Purple","#704357"],["Taupe Brown","#7a4456"],["Violet Carmine","#713b4c"],["Violet","#4f4086"],["Red Violet","#59256a"],["Cotinga Purple","#501345"],["Dusky Madder Violet","#4e1d4c"],["White","#ffffff"],["Neutral Gray","#b6bfc1"],["Mineral Gray","#a2b0ad"],["Warm Gray","#a1a39a"],["Slate Color","#34454c"],["Black","#111314"]],"combos":[[1,[65,117]],[2,[61,129]],[3,[13,39]],[4,[50,150]],[5,[106,128]],[6,[7,131]],[7,[63,88]],[8,[66,133]],[9,[36,140]],[10,[66,73]],[11,[41,155]],[12,[50,119]],[13,[13,145]],[14,[9,40]],[15,[100,133]],[16,[33,111]],[17,[12,99]],[18,[3,152]],[19,[85,92]],[20,[115,135]],[21,[7,99]],[22,[54,126]],[23,[45,138]],[24,[83,145]],[25,[18,110]],[26,[47,82]],[27,[1,157]],[28,[84,131]],[29,[75,113]],[30,[29,155]],[31,[17,39]],[32,[49,92]],[33,[13,157]],[34,[8,154]],[35,[4,28]],[36,[68,87]],[37,[27,150]],[38,[105,126]],[39,[22,123]],[40,[14,70]],[41,[73,115]],[42,[59,149]],[43,[1,139]],[44,[101,120]],[45,[42,55]],[46,[63,158]],[47,[18,134]],[48,[24,123]],[49,[111,121]],[50,[41,152]],[51,[28,121]],[52,[38,158]],[53,[61,152]],[54,[100,112]],[55,[10,153]],[56,[134,149]],[57,[147,157]],[58,[32,99]],[59,[8,71]],[60,[39,129]],[61,[91,151]],[62,[54,158]],[63,[37,117]],[64,[139,141]],[65,[68,115]],[66,[58,79]],[67,[120,129]],[68,[4,54]],[69,[156,158]],[70,[13,107]],[71,[29,49]],[72,[38,111]],[73,[82,96]],[74,[87,119]],[75,[111,127]],[76,[39,156]],[77,[12,128]],[78,[44,116]],[79,[84,119]],[80,[38,138]],[81,[47,156]],[82,[32,152]],[83,[52,127]],[84,[42,132]],[85,[14,122]],[86,[13,99]],[87,[1,70]],[88,[42,121]],[89,[61,127]],[90,[8,139]],[91,[37,67]],[92,[5,100]],[93,[71,112]],[94,[41,125]],[95,[32,130]],[96,[59,76]],[97,[1,18]],[98,[84,127]],[99,[39,117]],[100,[72,140]],[101,[2,126]],[102,[41,67]],[103,[66,152]],[104,[28,38]],[105,[2,97]],[106,[122,130]],[107,[56,74]],[108,[8,27]],[109,[39,108]],[110,[31,86]],[111,[39,90]],[112,[7,158]],[113,[42,86]],[114,[60,122]],[115,[40,64]],[116,[2,142]],[117,[22,158]],[118,[59,86]],[119,[112,129]],[120,[2,29]],[121,[31,49,107]],[122,[22,46,100]],[123,[5,55,147]],[124,[35,59,93]],[125,[3,117,127]],[126,[41,59,126]],[127,[45,98,141]],[128,[1,116,138]],[129,[56,69,113]],[130,[13,28,149]],[131,[13,65,118]],[132,[38,47,71]],[133,[33,71,99]],[134,[8,138,150]],[135,[38,106,113]],[136,[21,103,150]],[137,[18,45,98]],[138,[47,55,116]],[139,[113,131,154]],[140,[47,122,157]],[141,[63,90,129]],[142,[26,68,113]],[143,[121,136,156]],[144,[24,63,158]],[145,[31,70,130]],[146,[69,81,105]],[147,[9,33,87]],[148,[58,60,117]],[149,[58,63,132]],[150,[42,70,88]],[151,[38,61,128]],[152,[18,32,112]],[153,[8,60,70]],[154,[22,54,121]],[155,[15,100,131]],[156,[58,114,149]],[157,[34,58,120]],[158,[55,66,92]],[159,[69,115,133]],[160,[68,82,124]],[161,[31,44,123]],[162,[10,96,136]],[163,[56,87,122]],[164,[17,60,149]],[165,[2,9,37]],[166,[7,40,132]],[167,[53,111,128]],[168,[55,128,145]],[169,[1,39,156]],[170,[24,60,150]],[171,[35,61,88]],[172,[66,122,150]],[173,[55,84,87]],[174,[1,134,147]],[175,[44,52,142]],[176,[0,42,115]],[177,[35,72,133]],[178,[41,112,119]],[179,[17,47,126]],[180,[45,138,154]],[181,[28,149,151]],[182,[13,86,131]],[183,[144,145,150]],[184,[9,41,74]],[185,[4,18,39]],[186,[32,49,121]],[187,[123,134,139]],[188,[96,113,114]],[189,[55,109,116]],[190,[41,65,158]],[191,[4,59,121]],[192,[46,86,144]],[193,[7,40,101]],[194,[15,42,120]],[195,[9,39,154]],[196,[70,111,142]],[197,[8,141,154]],[198,[19,56,102]],[199,[20,80,126]],[200,[28,52,97]],[201,[7,76,114]],[202,[87,114,157]],[203,[39,48,107]],[204,[24,66,112]],[205,[35,48,149]],[206,[1,47,66]],[207,[78,88,158]],[208,[38,119,122]],[209,[41,61,113]],[210,[45,55,107]],[211,[62,93,131]],[212,[29,77,113]],[213,[48,56,111]],[214,[41,78,149]],[215,[46,121,137]],[216,[15,102,158]],[217,[35,49,105]],[218,[123,133,144]],[219,[15,97,125]],[220,[25,49,139]],[221,[28,154,158]],[222,[59,61,67]],[223,[4,49,87]],[224,[9,124,147]],[225,[22,125,146]],[226,[37,46,149]],[227,[0,112,117]],[228,[28,39,154]],[229,[47,109,154]],[230,[7,87,114]],[231,[2,32,120]],[232,[22,44,131]],[233,[28,72,127]],[234,[45,82,111]],[235,[41,61,134]],[236,[69,126,143]],[237,[28,84,113]],[238,[49,151,156]],[239,[4,57,88]],[240,[6,54,117]],[241,[17,39,50,124]],[242,[8,19,105,158]],[243,[13,41,79,157]],[244,[4,14,95,122]],[245,[28,104,129,157]],[246,[1,27,38,45]],[247,[13,56,100,126]],[248,[8,69,133,146]],[249,[32,53,58,124]],[250,[57,64,99,110]],[251,[30,54,105,157]],[252,[12,13,68,119]],[253,[55,62,151,157]],[254,[1,38,76,135]],[255,[13,57,115,158]],[256,[48,63,103,158]],[257,[16,60,121,139]],[258,[35,44,76,122]],[259,[55,119,123,156]],[260,[10,48,88,99]],[261,[30,39,115,156]],[262,[12,41,71,106]],[263,[19,44,87,157]],[264,[1,17,89,117]],[265,[10,56,93,130]],[266,[16,41,96,100]],[267,[46,61,100,121]],[268,[4,13,109,110]],[269,[13,35,139,158]],[270,[12,38,79,106]],[271,[25,114,119,132]],[272,[39,63,87,113]],[273,[0,34,78,154]],[274,[64,73,120,138]],[275,[18,53,84,147]],[276,[8,42,90,158]],[277,[9,24,76,130]],[278,[46,58,106,125]],[279,[13,48,53,129]],[280,[12,107,135,147]],[281,[39,100,114,122]],[282,[12,51,114,136]],[283,[20,35,97,116]],[284,[11,56,99,125]],[285,[4,19,64,87]],[286,[19,60,118,127]],[287,[8,57,111,115]],[288,[61,83,147,158]],[289,[55,91,127,130]],[290,[37,39,107,114]],[291,[91,99,114,115]],[292,[39,44,50,53]],[293,[13,87,94,102]],[294,[38,46,106,113]],[295,[46,54,121,130]],[296,[38,49,82,157]],[297,[19,61,79,127]],[298,[13,55,64,158]],[299,[23,48,104,122]],[300,[7,46,87,115]],[301,[16,41,96,139]],[302,[46,53,110,122]],[303,[40,64,109,154]],[304,[32,46,73,100]],[305,[44,56,70,87]],[306,[55,100,103,110]],[307,[22,133,139,151]],[308,[3,21,65,114]],[309,[47,62,127,128]],[310,[38,44,76,109]],[311,[29,46,89,91]],[312,[19,61,94,123]],[313,[22,54,105,158]],[314,[8,32,126,152]],[315,[7,38,47,137]],[316,[33,103,149,150]],[317,[43,53,55,87]],[318,[80,108,125,132]],[319,[13,56,61,106]],[320,[5,38,104,112]],[321,[4,38,109,113]],[322,[16,27,137,142]],[323,[45,70,84,158]],[324,[29,120,139,154]],[325,[12,40,59,132]],[326,[38,64,90,92]],[327,[8,13,53,134]],[328,[27,62,86,101]],[329,[46,134,151,157]],[330,[52,110,113,119]],[331,[23,130,138,149]],[332,[5,21,109,125]],[333,[19,55,114,121]],[334,[42,76,90,122]],[335,[33,61,149,157]],[336,[8,32,39,108]],[337,[37,135,148,158]],[338,[28,60,125,134]],[339,[49,65,112,127]],[340,[64,99,154,158]],[341,[7,106,109,112]],[342,[1,46,77,109]],[343,[19,41,81,128]],[344,[45,126,139,158]],[345,[32,110,116,142]],[346,[24,87,91,95]],[347,[93,99,123,136]],[348,[52,106,109,151]]]};
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
