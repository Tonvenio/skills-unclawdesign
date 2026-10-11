/* The Roast — scroll-scrubbed bean sequence, self-drawing roast curve, phase beats, and the landing in the niche.
 * Progressive enhancement: without JS or with reduced motion the page stays a static, stepped sequence.
 * Per animation frame: one smoothed progress value -> transforms, one SVG path, text only when a value changes,
 * canvas drawImage only when the frame index changes. Layout is measured on refresh, never per frame. */
(function () {
  'use strict';
  var doc = document.documentElement;
  if (!doc.classList.contains('motion')) return;
  var D = window.ROAST, gsap = window.gsap, ST = window.ScrollTrigger;
  var canvas = document.querySelector('canvas.bean');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!D || !gsap || !ST || !ctx) { doc.classList.remove('motion'); return; }
  gsap.registerPlugin(ST);

  var mq = matchMedia('(prefers-reduced-motion: reduce)');
  var onMq = function (e) { if (e.matches) location.reload(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);

  /* ── data ── */
  var KEYS = D.keys, BT = D.bt, EV = D.events, PH = D.phases, T_END = 580, T_MIN = 95, T_MAX = 204;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function tOfP(p) {
    for (var i = 1; i < KEYS.length; i++) {
      var a = KEYS[i - 1], b = KEYS[i];
      if (p <= b[0]) return b[0] === a[0] ? b[1] : lerp(a[1], b[1], (p - a[0]) / (b[0] - a[0]));
    }
    return KEYS[KEYS.length - 1][1];
  }
  function btOf(t) { t = clamp(t, 0, T_END); var f = t / 5, i = Math.min(Math.floor(f), BT.length - 2); return lerp(BT[i], BT[i + 1], f - i); }
  function mmss(t) { var s = Math.round(t); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  /* ── elements ── */
  var roast = document.getElementById('roast');
  var stage = roast.querySelector('.stage');
  var svg = roast.querySelector('svg.chart');
  var beats = Array.prototype.slice.call(roast.querySelectorAll('.beat'));
  var live = document.getElementById('phase-live');
  var roTime = roast.querySelector('[data-ro="time"]'), roTemp = roast.querySelector('[data-ro="temp"]');
  var slot = document.querySelector('.slot');
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ── frame sets (desktop 140 × 1200 px, mobile 71 × 640 px) ── */
  var SETS = { d: { n: 140, dir: 'media/d/' }, m: { n: 71, dir: 'media/m/' } };
  var FS = (Math.min(innerWidth, screen.width || innerWidth) < 760) ? SETS.m : SETS.d;
  var imgs = new Array(FS.n), inflight = new Uint8Array(FS.n), order = [], seen = new Uint8Array(FS.n);
  function frameOf(p) { return FS === SETS.d ? Math.round(p * 139) : Math.min(70, Math.round(p * 139 / 2)); }
  (function () {
    function push(i) { if (i >= 0 && i < FS.n && !seen[i]) { seen[i] = 1; order.push(i); } }
    push(0); push(FS.n - 1);
    [32, 16, 8, 4, 2, 1].forEach(function (s) { for (var i = 0; i < FS.n; i += s) push(i); });
  })();
  var nextIdx = 0, active = 0, wanted = 0;
  function src(i) { return FS.dir + 'f' + String(i).padStart(3, '0') + '.webp'; }
  function fetchFrame(i) {
    inflight[i] = 1; active++;
    var im = new Image();
    im.decoding = 'async';
    im.src = src(i);
    var p = im.decode ? im.decode() : new Promise(function (res, rej) { im.onload = res; im.onerror = rej; });
    p.then(function () { imgs[i] = im; if (Math.abs(i - wanted) <= 6) dirty = true; },
           function () { inflight[i] = 0; })
     .then(function () { active--; pump(); });
  }
  function pump() {
    while (active < 6) {
      if (!imgs[wanted] && !inflight[wanted]) { fetchFrame(wanted); continue; }   // what the viewer needs now wins
      while (nextIdx < order.length && (imgs[order[nextIdx]] || inflight[order[nextIdx]])) nextIdx++;
      if (nextIdx >= order.length) return;
      fetchFrame(order[nextIdx++]);
    }
  }
  function nearest(i) {
    if (imgs[i]) return i;
    for (var d = 1; d < FS.n; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }

  /* ── layout (measured on refresh only) ── */
  var L = {}, drawn = -1, dirty = true;
  function yOf(T) { return L.yBot - (T - T_MIN) / (T_MAX - T_MIN) * (L.yBot - L.yTop); }

  function measure() {
    var vw = doc.clientWidth, vh = stage.clientHeight || innerHeight;
    var narrow = vw < 760;
    L.vw = vw; L.vh = vh; L.narrow = narrow;
    if (narrow) {
      L.beanX = vw * 0.53; L.S = Math.min(vw * 0.68, vh * 0.38);
      L.yTop = vh * 0.275; L.yBot = vh * 0.44; L.axisY = vh * 0.505; L.trail = 150; L.left = vw * 0.035;
    } else {
      L.beanX = vw * (vw < 1100 ? 0.39 : 0.44); L.S = Math.min(vh * 0.64, vw * (vw < 1100 ? 0.46 : 0.5));
      L.yTop = vh * 0.335; L.yBot = vh * 0.715; L.axisY = vh * 0.875; L.trail = 240; L.left = vw * 0.04;
    }
    L.kR = (L.beanX - L.left) / L.trail;
    L.kO = (L.beanX - L.left * 1.4) / T_END;
    var sy = window.scrollY;
    var rr = roast.getBoundingClientRect();
    L.roastTop = rr.top + sy; L.roastEnd = L.roastTop + roast.offsetHeight - vh;
    if (slot) {
      var r = slot.getBoundingClientRect();
      L.slotX = r.left + r.width / 2; L.slotY = r.top + sy + r.height / 2; L.slotW = r.width;
      L.flightEnd = Math.max(L.roastEnd + vh * 0.35, L.slotY - vh * 0.52);
    }
    // canvas: full viewport, DPR-aware; the frame is drawn once at (beanX, vh/2) and moved by transform
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    canvas.style.transformOrigin = L.beanX + 'px ' + (vh / 2) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    drawn = -1;
    if (L.builtFor !== vw + 'x' + vh) { buildChart(); L.builtFor = vw + 'x' + vh; }   // keep the entrance from restarting
    dirty = true;
  }

  /* ── chart: built in pixel space, updated with attributes/transforms ── */
  var C = {};
  var EVTS = [
    ['charge', 'Charge'], ['turning', 'Turning point'], ['dry_end', 'Dry end'], ['first_crack', 'First crack'], ['drop', 'Drop']
  ];
  function buildChart() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + L.vw + ' ' + L.vh);
    var g = el('g', {}, svg);
    C.rules = [[150, EV.dry_end], [196, EV.first_crack], [204, EV.drop]].map(function (r) {
      var y = yOf(r[0]);
      var line = el('line', { class: 'rule', x1: 0, x2: L.vw, y1: y, y2: y }, g);
      var lab = el('text', { class: 'rule-l', x: L.vw - (L.narrow ? 16 : 24), y: r[0] === 196 ? y + 15 : y - 7, 'text-anchor': 'end' }, g);
      lab.textContent = r[0] + ' °C';
      return { line: line, t: r[1], hit: false };
    });
    C.axis = el('line', { class: 'axis', y1: L.axisY, y2: L.axisY, x1: 0, x2: 0 }, g);
    C.ticks = [];
    for (var m = 0; m <= 10; m++) {
      var tg = el('g', { class: 'ev' }, g);
      el('line', { class: 'tick', x1: 0, x2: 0, y1: L.axisY - 5, y2: L.axisY + 5 }, tg);
      var tl = el('text', { class: 'tick-l', x: 0, y: L.axisY + 21, 'text-anchor': 'middle' }, tg);
      tl.textContent = m + ':00';
      C.ticks.push({ g: tg, t: m * 60, label: tl, on: null, show: null });
    }
    C.trail = el('path', { class: 'trail', d: '' }, g);
    C.evs = EVTS.map(function (e) {
      var t = EV[e[0]], y = yOf(btOf(t));
      var eg = el('g', { class: 'ev' }, g);
      el('line', { class: 'ev-line', x1: 0, x2: 0, y1: y + 7, y2: L.axisY - 8 }, eg);
      el('circle', { class: 'ev-dot', cx: 0, cy: y, r: 4.5 }, eg);
      var lab = el('text', { class: 'ev-l', x: 6, y: L.axisY - 12 }, eg);
      lab.textContent = e[1];
      return { g: eg, t: t, label: lab, w: e[1].length * 6.6 + 12, on: null, show: null };
    });
    C.pings = [0, 1].map(function () { return el('circle', { class: 'ping', cx: L.beanX, cy: 0, r: 10 }, g); });
    C.lastD = '';
  }

  function updateChart(p, t, T) {
    var z = sstep(0.87, 0.955, p);
    var k = lerp(L.kR, L.kO, z), bx = L.beanX;
    function x(ti) { return bx - (t - ti) * k; }
    // the trail: everything up to now, emerging from behind the bean
    var d = '', first = true, n = Math.floor(t / 5);
    for (var i = 0; i <= n; i++) {
      var xi = x(i * 5);
      if (xi < -40 && x((i + 1) * 5) < -40) continue;
      d += (first ? 'M' : 'L') + xi.toFixed(1) + ' ' + yOf(BT[i]).toFixed(1);
      first = false;
    }
    if (t > 0) d += (first ? 'M' : 'L') + bx.toFixed(1) + ' ' + yOf(T).toFixed(1);
    if (d !== C.lastD) { C.trail.setAttribute('d', d); C.lastD = d; }
    C.axis.setAttribute('x1', Math.max(0, x(0)).toFixed(1));
    C.axis.setAttribute('x2', t > 0 ? bx.toFixed(1) : Math.max(0, x(0)).toFixed(1));
    // minute ticks (past only); thin the labels out when the paper is zoomed out
    var every = k * 60 < 22 ? 5 : k * 60 < 44 ? 2 : 1;
    C.ticks.forEach(function (tk, j) {
      var on = tk.t <= t + 0.01 && x(tk.t) > -20 && p > 0.071;
      if (on !== tk.on) { tk.g.classList.toggle('on', on); tk.on = on; }
      if (on) tk.g.setAttribute('transform', 'translate(' + x(tk.t).toFixed(1) + ' 0)');
      var show = j % every === 0;
      if (show !== tk.show) { tk.label.style.display = show ? '' : 'none'; tk.show = show; }
    });
    // events: appear when reached; labels hide if the next one would collide
    var nextX = Infinity;
    for (var e = C.evs.length - 1; e >= 0; e--) {
      var ev = C.evs[e], on = ev.t <= t + 0.01 && (ev.t > 0 || p > 0.071), ex = x(ev.t);
      if (on !== ev.on) { ev.g.classList.toggle('on', on); ev.on = on; }
      if (!on) continue;
      ev.g.setAttribute('transform', 'translate(' + ex.toFixed(1) + ' 0)');
      var show = ex + ev.w < nextX && ex > -10;
      if (show !== ev.show) { ev.label.style.display = show ? '' : 'none'; ev.show = show; }
      if (show) nextX = ex;
    }
    C.rules.forEach(function (r) { var hit = t >= r.t; if (hit !== r.hit) { r.line.classList.toggle('hit', hit); r.hit = hit; } });
    // first crack: two thin rings spread from behind the bean, scrubbed by scroll (never a flash)
    C.pings.forEach(function (c, j) {
      var u = (p - 0.585 - j * 0.02) / 0.05;
      if (u > 0 && u < 1) {
        c.setAttribute('cy', yOf(T).toFixed(1));
        c.setAttribute('r', (L.S * (0.34 + (L.narrow ? 0.36 : 0.5) * u)).toFixed(1));
        c.style.opacity = (Math.sin(Math.PI * u) * (1 - u) * 0.9).toFixed(3);
      } else if (c.style.opacity !== '0') c.style.opacity = '0';
    });
  }

  /* ── beats + live region ── */
  var phase = -1, sayTimer = 0;
  function setPhase(i) {
    if (i === phase) return;
    phase = i;
    beats.forEach(function (b, j) {
      b.classList.toggle('is-on', j === i);
      b.classList.toggle('is-before', j < i);
      b.classList.toggle('is-after', j > i);
    });
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { live.textContent = beats[i].getAttribute('data-say') || ''; }, 700);
  }
  function phaseOf(p) { for (var i = 0; i < PH.length; i++) if (p < PH[i].p1) return i; return PH.length - 1; }

  /* ── per-frame render ── */
  var target = 0, cur = 0, lastSy = -1, lastTime = '', lastTemp = '', landed = null, lastTf = '', holdTemp = false;
  function render(sy) {
    var p = cur, t = tOfP(p), T = btOf(t);
    var fi = frameOf(p);
    wanted = fi;
    if (!imgs[fi] && !inflight[fi]) pump();
    var j = nearest(fi);
    if (j >= 0 && j !== drawn) {
      ctx.clearRect(L.beanX - L.S / 2 - 2, L.vh / 2 - L.S / 2 - 2, L.S + 4, L.S + 4);
      ctx.drawImage(imgs[j], L.beanX - L.S / 2, L.vh / 2 - L.S / 2, L.S, L.S);
      drawn = j;
    }
    updateChart(p, t, T);
    var ts = mmss(t), te = String(Math.round(T));
    if (ts !== lastTime) { roTime.textContent = ts; lastTime = ts; }
    if (te !== lastTemp && !holdTemp) { roTemp.textContent = te; lastTemp = te; }
    setPhase(phaseOf(p));

    // bean pose: rides the curve tip while pinned, then flies to the Kiambu niche and hands over to the <img>
    var tipY = yOf(T), x = L.beanX, y = tipY, s = 1, isLanded = false;
    if (slot && sy > L.roastEnd) {
      // the bean detaches from the stage as it scrolls away, hovers, then glides into the niche
      var q = clamp((sy - L.roastEnd) / (L.flightEnd - L.roastEnd), 0, 1), e = ease(q);
      var y1 = L.slotY - sy;
      x = lerp(L.beanX, L.slotX, e);
      y = lerp(tipY, y1, e);
      s = lerp(1, L.slotW / L.S, e);
      isLanded = q >= 1;
    }
    if (isLanded !== landed) { doc.classList.toggle('landed', isLanded); landed = isLanded; }
    var tf = 'translate3d(' + (x - L.beanX).toFixed(2) + 'px,' + (y - L.vh / 2).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    if (tf !== lastTf) { canvas.style.transform = tf; lastTf = tf; }
  }

  function tick() {
    var sy = window.scrollY;
    var dt = gsap.ticker.deltaRatio(60);
    var moved = false;
    if (Math.abs(target - cur) > 1e-5) {
      cur += (target - cur) * (1 - Math.pow(1 - 0.16, dt));
      if (Math.abs(target - cur) < 1e-5) cur = target;
      moved = true;
    }
    if (moved || dirty || sy !== lastSy) { lastSy = sy; dirty = false; render(sy); }
  }

  ST.addEventListener('refreshInit', measure);
  var trig = ST.create({
    trigger: roast, start: 'top top', end: 'bottom bottom',
    onUpdate: function (self) { target = self.progress; },
    onRefresh: function (self) { target = self.progress; dirty = true; }
  });
  measure();
  target = cur = trig.progress;               // a reload mid-page starts where the reader is, without a replay
  if (cur < 0.02) {                            // the one entrance: the drum comes up to temperature
    var pre = { v: 20 };
    holdTemp = true;
    gsap.to(pre, { v: 200, duration: 1.2, ease: 'power2.out', delay: 0.15,
      onUpdate: function () { roTemp.textContent = String(Math.round(pre.v)); },
      onComplete: function () { holdTemp = false; lastTemp = ''; dirty = true; } });
    roTemp.textContent = '20';
  }
  setPhase(phaseOf(cur));
  pump();
  gsap.ticker.add(tick);
  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  document.addEventListener('unclaw:palette', function () { dirty = true; });   // chart colours are CSS tokens; just repaint
})();

/* plan picker: a demo, so it confirms the choice instead of taking an order */
(function () {
  var form = document.getElementById('pick');
  if (!form) return;
  var out = document.getElementById('done');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var plan = form.elements.plan.value, grind = form.elements.grind.value;
    var what = plan === 'two' ? 'Two bags, €26 a month' : 'One bag, €14 a month';
    var how = grind === 'Whole bean' ? 'whole bean' : 'ground for ' + grind.toLowerCase();
    out.textContent = 'Demo only, nothing was ordered. You chose: ' + what + ', ' + how + '. Batch 041 roasts Monday 12 October and ships Wednesday 14 October.';
  });
})();
