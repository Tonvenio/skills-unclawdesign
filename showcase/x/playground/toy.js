/* Tidewater Bean Box — the toy.
   Matter.js rigid bodies for beans, headline words and the full stop; beans are drawn on a canvas from
   token-coloured sprites, words are real DOM text synced to their bodies. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var still = doc.classList.contains('still');
  var stage = document.getElementById('toy');
  if (!stage) return;
  var canvas = stage.querySelector('canvas.beans');
  var ctx = canvas.getContext('2d');
  var h1 = document.getElementById('headline');
  var wordEls = Array.prototype.slice.call(h1.querySelectorAll('.w'));
  var dotEl = stage.querySelector('.dotball');
  var slab = stage.querySelector('.slab');
  var legEls = Array.prototype.slice.call(slab.querySelectorAll('.leg'));
  var grinderEl = stage.querySelector('.grinder');
  var ramp = stage.querySelector('.ramp');
  var numEl = stage.querySelector('.grinder__num');
  var statusEl = document.getElementById('toy-status');
  var topbar = document.querySelector('.topbar');
  var btnDrop = document.getElementById('drop');
  var btnRestack = document.getElementById('restack');
  var btnPause = document.getElementById('pause');
  var btnTilt = document.getElementById('tilt');
  var reward = document.getElementById('reward');
  var rewardTitle = document.getElementById('reward-title');
  var M = window.Matter;
  var coarse = matchMedia('(pointer: coarse)').matches;

  /* ── colour from tokens ─────────────────────────── */
  var probe = document.createElement('canvas').getContext('2d');
  function tok(n) {
    var v = getComputedStyle(doc).getPropertyValue('--c-' + n).trim();
    probe.fillStyle = '#000'; if (v) probe.fillStyle = v; return probe.fillStyle;
  }
  function rgb(c) {
    if (c.charAt(0) === '#') { var n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    var m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')'; }

  /* ── shared state ─────────────────────────── */
  var W = 0, H = 0, dpr = 1, beanL = 30, cap = 120;
  var sprites = [];
  var count = 0, nextReward = 15;
  var rand = Math.random;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rectOf(el) {
    var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    var x = r.left - s.left - stage.clientLeft, y = r.top - s.top - stage.clientTop;
    return { x: x, y: y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2 };
  }
  function say(t) { statusEl.textContent = ''; setTimeout(function () { statusEl.textContent = t; }, 30); }
  function numWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n); }

  function measureStage() {
    W = stage.clientWidth; H = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    beanL = clamp(W * 0.024, 24, 36);
    cap = W < 600 ? 90 : W < 1100 ? 140 : 180;
    stage.style.setProperty('--slab-h', slab.offsetHeight + 'px');
  }

  /* ── bean sprites (re-drawn when the palette changes) ─────────────────────────── */
  function drawBeanSprite(fill, ink, hi) {
    var L = beanL * 1.12, B = L * 0.68, pad = 3;
    var c = document.createElement('canvas');
    c.width = Math.ceil((L + pad * 2) * dpr); c.height = Math.ceil((B + pad * 2) * dpr);
    var g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(L / 2 + pad, B / 2 + pad);
    var grad = g.createRadialGradient(-L * 0.16, -B * 0.26, B * 0.04, 0, 0, L * 0.58);
    grad.addColorStop(0, mix(fill, hi, 0.5)); grad.addColorStop(0.42, fill); grad.addColorStop(1, mix(fill, ink, 0.55));
    g.beginPath(); g.ellipse(0, 0, L / 2, B / 2, 0, 0, Math.PI * 2);
    g.fillStyle = grad; g.fill();
    g.lineWidth = Math.max(1.4, L * 0.05); g.strokeStyle = ink; g.stroke();
    function crease(dy) { g.beginPath(); g.moveTo(-L * 0.4, B * 0.07 + dy); g.bezierCurveTo(-L * 0.12, -B * 0.3 + dy, L * 0.12, B * 0.3 + dy, L * 0.4, -B * 0.07 + dy); }
    g.lineCap = 'round';
    crease(-B * 0.07); g.strokeStyle = mix(fill, hi, 0.38); g.lineWidth = B * 0.07; g.stroke();
    crease(0); g.strokeStyle = mix(fill, ink, 0.8); g.lineWidth = B * 0.13; g.stroke();
    g.beginPath(); g.ellipse(-L * 0.2, -B * 0.27, L * 0.13, B * 0.07, -0.25, 0, Math.PI * 2);
    g.globalAlpha = 0.6; g.fillStyle = mix(fill, hi, 0.8); g.fill(); g.globalAlpha = 1;
    return { c: c, w: L + pad * 2, h: B + pad * 2 };
  }
  function buildSprites() {
    var base = tok('accent-3'), ink = tok('text'), hi = tok('surface-2');
    sprites = [mix(base, hi, 0.3), base, mix(base, ink, 0.28)].map(function (f) { return drawBeanSprite(f, ink, hi); });
  }

  /* ── grinder geometry (viewBox 0 0 200 300, mirrored by static bodies) ─────────────────────────── */
  var G = null;
  function grinderGeo() {
    var r = rectOf(grinderEl), kx = r.w / 200, ky = r.h / 300;
    return { r: r, kx: kx, ky: ky, P: function (x, y) { return { x: r.x + x * kx, y: r.y + y * ky }; } };
  }
  function inHopper(p) {
    var lx = (p.x - G.r.x) / G.kx, ly = (p.y - G.r.y) / G.ky;
    if (ly < 30 || ly > 120) return false;
    var t = Math.min(ly, 112) / 110;
    return lx > 2 + 66 * t + 4 && lx < 198 - 66 * t - 4;
  }

  /* ── reward + counter ─────────────────────────── */
  function setCount(n) {
    count = n;
    numEl.textContent = String(n);
    grinderEl.style.setProperty('--fill', String(Math.min(1, (n % 15 === 0 && n > 0 ? 15 : n % 15) / 15)));
    if (n >= nextReward) {
      var cups = Math.floor(n / 15);
      nextReward = (cups + 1) * 15;
      rewardTitle.innerHTML = (cups * 15) + '&#8239;g. Enough for ' + numWord(cups) + ' cup' + (cups > 1 ? 's' : '') + '.';
      openReward();
      say((cups * 15) + ' grams ground. Enough for ' + numWord(cups) + ' cup' + (cups > 1 ? 's' : '') + '. The recipe is open.');
    } else if (n % 5 === 0) {
      say(n + ' grams in the grinder. ' + (nextReward - n) + ' to go.');
    }
  }
  var rewardFromKeyboard = false;
  function openReward() {
    var was = !reward.hidden;
    reward.hidden = false;
    if (!was && !still && window.gsap) gsap.fromTo(reward, { scale: 0.4, rotation: -8, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' });
    if (rewardFromKeyboard) rewardTitle.focus({ preventScroll: true });
  }
  reward.querySelector('.reward__x').addEventListener('click', function () {
    var inside = reward.contains(document.activeElement);
    reward.hidden = true;
    if (inside) btnDrop.focus();
  });
  reward.addEventListener('keydown', function (e) { if (e.key === 'Escape') reward.querySelector('.reward__x').click(); });
  reward.querySelectorAll('input[name="brew"]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      reward.querySelectorAll('.recipe').forEach(function (r) { r.hidden = r.getAttribute('data-brew') !== inp.value; });
    });
  });

  /* ═════════════ reduced motion: one composed still ═════════════ */
  if (still || !M) {
    var drawStill = function () {
      measureStage(); buildSprites(); G = grinderGeo();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      var s = rectOf(slab), legs = legEls.filter(function (l) { return l.offsetWidth; }).map(rectOf);
      var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      var pieces = [], L0 = beanL, B0 = beanL * 0.68;
      var under = s.y + s.h + 6;                          // the counter's underside
      function mound(cx, hw, hmax, lo, hi) {
        for (var row = 0, y = H - B0 * 0.42; row < 40; row++, y -= B0 * 0.62) {
          var h = H - y; if (h > hmax) break;
          var half = hw * (1 - h / hmax) * (0.92 + rnd() * 0.12);
          for (var x = cx - half + rnd() * L0 * 0.5; x < cx + half; x += L0 * (0.78 + rnd() * 0.22)) {
            if (x < lo || x > hi) continue;
            if (x > s.x && x < s.x + s.w && y - B0 < under) continue;
            if (legs.some(function (l) { return x + L0 * 0.5 > l.x && x - L0 * 0.5 < l.x + l.w; })) continue;
            pieces.push({ x: x + (rnd() - 0.5) * 4, y: y + (rnd() - 0.5) * 5, a: (rnd() - 0.5) * 1.3 + (rnd() < 0.15 ? 1.4 : 0), s: 0.9 + rnd() * 0.2, v: Math.floor(rnd() * 3) });
          }
        }
      }
      var narrow = W < 760, lim = G.r.x - L0 * 0.4;
      if (narrow) { mound(W * 0.55, W * 0.3, Math.min(96, H - under - 70), L0 * 0.5, lim); }
      else {
        mound(s.x * 0.4, Math.max(260, s.w * 0.36), H - under - 4, L0 * 0.5, lim);
        mound(s.x + s.w * 0.84, s.w * 0.13, (H - under) * 0.45, L0 * 0.5, lim);
      }
      // a few resting on the tile tops, like the live version after the rain
      var tiles = Array.prototype.map.call(h1.querySelectorAll('.w'), rectOf);
      var firstRow = Math.min.apply(null, tiles.map(function (r) { return r.y; }));
      tiles.forEach(function (r, i) {
        if (r.y > firstRow + r.h * 0.5) return;
        var n = narrow ? 1 + (i % 2) : 2 + (i % 3);
        for (var k = 0; k < n; k++) {
          var x = r.x + r.w * (0.15 + 0.7 * rnd());
          pieces.push({ x: x, y: r.y - B0 * 0.36, a: (rnd() - 0.5) * 0.5, s: 0.92 + rnd() * 0.14, v: Math.floor(rnd() * 3), top: true });
        }
      });
      pieces.forEach(function (p) { blit(p.v, p.x, p.y, p.a, p.s); });
      // a few that already made it into the hopper
      for (var i = 0; i < Math.min(count, 6); i++) { var q = G.P(100 + (i % 3 - 1) * 26, 96 - Math.floor(i / 3) * 16); blit(i % 3, q.x, q.y, i * 0.7, 0.95); }
    };
    var blit = function (v, x, y, a, s) {
      var sp = sprites[v], c = Math.cos(a) * dpr, si = Math.sin(a) * dpr;
      ctx.setTransform(c, si, -si, c, x * dpr, y * dpr);
      ctx.drawImage(sp.c, -sp.w * s / 2, -sp.h * s / 2, sp.w * s, sp.h * s);
    };
    var ready = function () { drawStill(); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
    btnDrop.addEventListener('click', function (e) { rewardFromKeyboard = e.detail === 0; setCount(count + 1); drawStill(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawStill, 150); });
    document.addEventListener('unclaw:palette', function () { requestAnimationFrame(drawStill); });
    return;
  }

  /* ═════════════ the live toy ═════════════ */
  h1.classList.add('is-live');
  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite, Sleeping = M.Sleeping;
  var engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 });
  engine.gravity.y = 1; engine.gravity.scale = 0.0013;
  var world = engine.world;
  var statics = [], beans = [], wordBodies = [], dotBody = null;
  var grinding = [];          // beans on their way into the burrs
  var drags = new Map();      // pointerId → { c: constraint, b: body }
  var timers = [];            // pending intro drops
  var pending = 0;
  var guides = [];            // gentle settling help for freshly dropped words
  var rainLeft = 0, rainAt = 0, rainGap = 14;
  var paused = false, onScreen = true, started = false, raf = 0, lastT = 0, acc = 0, quiet = 0;
  var STEP = 1000 / 60;
  var staticOpts = function () { return { isStatic: true, friction: 0.7, restitution: 0.08, label: 'static' }; };

  function seg(a, b, t) {
    var dx = b.x - a.x, dy = b.y - a.y, o = staticOpts();
    o.angle = Math.atan2(dy, dx);
    return Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(dx, dy), t, o);
  }
  function buildStatics() {
    if (statics.length) Composite.remove(world, statics);
    var T = 400;
    statics = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, staticOpts()),
      Bodies.rectangle(-T / 2, H / 2 - 1500, T, H + 3000, staticOpts()),
      Bodies.rectangle(W + T / 2, H / 2 - 1500, T, H + 3000, staticOpts())
    ];
    var s = rectOf(slab);
    statics.push(Bodies.rectangle(s.cx, s.cy - 6, s.w, s.h + 12, staticOpts()));
    var lip = slab.querySelector('.slab__lip');
    if (lip && lip.offsetWidth) { var lr = rectOf(lip); statics.push(Bodies.rectangle(lr.cx, lr.cy, lr.w, lr.h, staticOpts())); }
    legEls.forEach(function (l) { if (!l.offsetWidth) return; var r = rectOf(l); statics.push(Bodies.rectangle(r.cx, r.cy, r.w, r.h, staticOpts())); });
    G = grinderGeo();
    var P = G.P, t = Math.max(8, G.kx * 9);
    statics.push(seg(P(2, 2), P(68, 112), t), seg(P(198, 2), P(132, 112), t));
    var b0 = P(42, 112), b1 = P(158, 300);
    statics.push(Bodies.rectangle((b0.x + b1.x) / 2, (b0.y + b1.y) / 2 + 6, b1.x - b0.x, b1.y - b0.y + 12, staticOpts()));
    if (ramp && ramp.offsetWidth) {
      var rr = rectOf(ramp), ro = staticOpts();
      ro.position = { x: 0, y: 0 };
      ro.vertices = [{ x: rr.x, y: rr.y }, { x: rr.x + rr.w, y: rr.y + rr.h }, { x: rr.x, y: rr.y + rr.h }];
      var rb = Body.create(ro);
      Body.setPosition(rb, M.Vertices.centre(ro.vertices));
      statics.push(rb);
    }
    var c0 = P(2, 2), c1 = P(198, 2), co = staticOpts();
    statics.push(Bodies.circle(c0.x, c0.y, t * 0.6, co), Bodies.circle(c1.x, c1.y, t * 0.6, staticOpts()));
    Composite.add(world, statics);
  }

  /* beans */
  function beanBody(x, y) {
    var sc = 0.88 + rand() * 0.22, L = beanL * sc, B = L * 0.68, verts = [];
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; verts.push({ x: Math.cos(a) * L / 2, y: Math.sin(a) * B / 2 }); }
    var b = Body.create({ position: { x: x, y: y }, vertices: verts, label: 'bean', density: 0.0016, friction: 0.42, frictionStatic: 0.8,
      restitution: 0.22, frictionAir: 0.011, slop: 0.03, sleepThreshold: 45 });
    b.plugin = { v: Math.floor(rand() * 3), s: sc };
    Body.setAngle(b, rand() * Math.PI * 2);
    return b;
  }
  function spawnBean(x, y, vx, vy) {
    var b = beanBody(x, y);
    Body.setVelocity(b, { x: vx || (rand() - 0.5) * 1.5, y: vy || 2 + rand() * 4 });
    Body.setAngularVelocity(b, (rand() - 0.5) * 0.25);
    beans.push(b); Composite.add(world, b);
    return b;
  }
  var wallLandAt = 0;
  function rainX(now) {
    var s = rectOf(slab), wl = s.x + s.w * 0.2, wr = s.x + s.w * 0.8;
    if (plan) { wl = Infinity; wr = -Infinity; plan.items.forEach(function (it) { wl = Math.min(wl, it.tx - it.w / 2); wr = Math.max(wr, it.tx + it.w / 2); }); }
    var z = [], add = function (a, b, wgt) { if (b - a > beanL * 0.9) z.push({ a: a, b: b, w: wgt }); };
    add(beanL * 0.55, s.x - beanL * 0.15, 0.42);                 // a stream down the left end, into the space under the counter
    if (now >= wallLandAt) add(s.x + 6, wl - 6, 0.06);
    if (now >= wallLandAt) add(wl + beanL * 0.5, wr - (wr - wl) * (W < 760 ? 0.45 : 0.25), 0.42);   // sprinkle the headline once it has landed
    if (now >= wallLandAt) add(wr + 6, s.x + s.w - beanL * 3.2, 0.1);   // never near the grinder: you feed it, not the rain
    if (!z.length) return s.x + rand() * s.w * 0.6;
    var tot = z.reduce(function (a, q) { return a + q.w; }, 0), r = rand() * tot;
    for (var i = 0; i < z.length; i++) { r -= z[i].w; if (r <= 0) return z[i].a + rand() * (z[i].b - z[i].a); }
    return z[0].a;
  }
  function removeBean(b) {
    var i = beans.indexOf(b); if (i >= 0) beans.splice(i, 1);
    drags.forEach(function (d, id) { if (d.b === b) { Composite.remove(world, d.c); drags.delete(id); } });
    Composite.remove(world, b);
  }

  /* headline words */
  var plan = null;
  function measureWords(F) {
    h1.style.setProperty('--wf', F + 'px');
    return wordEls.map(function (el) { return { w: el.offsetWidth, h: el.offsetHeight }; });
  }
  // reading quality of a line break after word i: never split "the | week", avoid stranding "it."
  var BREAK_PEN = [0, 0, 0.3, 0, 0.1, 0.16], BREAK_PEN_NARROW = [0, 0, 0.06, 0, 0.05, 0.1];
  function planWall() {
    var s = rectOf(slab), tb = topbar ? topbar.offsetHeight : 60;
    var maxW = s.w - Math.max(24, s.w * 0.05), maxH = s.y - tb - Math.max(14, H * 0.03);
    var target = W < 760 ? 4 : 3;
    var base = measureWords(100);
    var fmax = W < 760 ? 72 : 190, fmin = 26, best = null;
    for (var F = fmax; F >= fmin; F -= 2) {
      var k = F / 100, sizes = base.map(function (b) { return { w: b.w * k, h: b.h * k }; });
      var gap = Math.max(5, F * 0.07), dd = sizes[0].h * 0.42;
      for (var mask = 0; mask < 64; mask++) {
        var rows = [[0]];
        for (var i = 1; i < 7; i++) { if (mask & (1 << (i - 1))) rows.push([i]); else rows[rows.length - 1].push(i); }
        var rowH = sizes[0].h, totalH = rows.length * rowH;
        if (totalH > maxH) continue;
        var ok = true, laid = [];
        for (var r = 0; r < rows.length && ok; r++) {
          var items = rows[r].map(function (wi) { return { i: wi, w: sizes[wi].w }; });
          if (r === rows.length - 1) items.push({ i: 'dot', w: dd });
          var rw = items.reduce(function (a, it) { return a + it.w; }, 0) + gap * (items.length - 1);
          if (rw > maxW) { ok = false; break; }
          var x = s.cx - rw / 2;
          items.forEach(function (it) { it.x0 = x; it.x1 = x + it.w; x += it.w + gap; });
          laid.push(items);
        }
        if (!ok) continue;
        var minM = Infinity;
        for (r = 0; r < laid.length - 1; r++) {
          laid[r].forEach(function (it) {
            var lo = Infinity, hiX = -Infinity;
            laid[r + 1].forEach(function (u) { if (u.i === 'dot') return; var a = Math.max(it.x0, u.x0), b = Math.min(it.x1, u.x1); if (b > a) { lo = Math.min(lo, a); hiX = Math.max(hiX, b); } });
            var c = (it.x0 + it.x1) / 2, m = lo === Infinity ? -1 : Math.min(c - lo, hiX - c) / it.w;
            minM = Math.min(minM, m);
          });
        }
        if (laid.length === 1) minM = 0.5;
        if (minM < 0) continue;
        var pen = 0, BP = W < 760 ? BREAK_PEN_NARROW : BREAK_PEN;
        for (var bi = 0; bi < 6; bi++) if (mask & (1 << bi)) pen += BP[bi];
        var score = F * (0.85 + Math.min(minM, 0.4) * 0.375) * (1 - pen) - Math.abs(laid.length - target);
        if (!best || score > best.score) best = { score: score, F: F, rows: rows, laid: laid };
      }
    }
    if (!best) best = { F: fmin, rows: [[0, 1, 2, 3, 4, 5, 6]] };
    // exact measurement at the chosen size
    var exact = measureWords(best.F), gapE = Math.max(5, best.F * 0.07), rowH = Math.max.apply(null, exact.map(function (e) { return e.h; }));
    var dD = Math.round(rowH * 0.42);
    dotEl.style.setProperty('--dd', dD + 'px');
    var out = [], y = s.y - 1;
    for (var r2 = best.rows.length - 1; r2 >= 0; r2--) {
      var its = best.rows[r2].map(function (wi) { return { i: wi, w: exact[wi].w, h: exact[wi].h }; });
      if (r2 === best.rows.length - 1) its.push({ i: 'dot', w: dD, h: dD });
      var rw2 = its.reduce(function (a, it) { return a + it.w; }, 0) + gapE * (its.length - 1), x2 = s.cx - rw2 / 2;
      its.forEach(function (it) { out.push({ i: it.i, w: it.w, h: it.h, tx: x2 + it.w / 2, ty: y - it.h / 2, row: best.rows.length - 1 - r2 }); x2 += it.w + gapE; });
      y -= rowH;
    }
    return { F: best.F, items: out, top: y, s: s };
  }
  /* each landed word is held to its spot by a soft spring (applied only while it is displaced, so it can sleep);
     yank it far enough and the spring lets go */
  function anchor(b, q) { b.plugin.anchored = true; b.plugin.home = { x: q.tx, y: q.ty }; }
  function unanchor(b) { b.plugin.anchored = false; }
  function springs() {
    var list = dotBody ? wordBodies.concat([dotBody]) : wordBodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i], p = b.plugin;
      if (!p.anchored || b.isSleeping || p.held) continue;
      var dx = p.home.x - b.position.x, dy = p.home.y - b.position.y;
      if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2 && Math.abs(b.angle) < 0.012) continue;
      Body.setVelocity(b, { x: b.velocity.x * 0.9 + dx * 0.018, y: b.velocity.y * (dy < 0 ? 0.92 : 1) + dy * 0.012 });
      if (b.label === 'word') Body.setAngularVelocity(b, b.angularVelocity * 0.88 - b.angle * 0.03);
    }
  }
  function clearWords() {
    timers.forEach(clearTimeout); timers = []; pending = 0;
    wordBodies.forEach(function (b) { Composite.remove(world, b); });
    if (dotBody) Composite.remove(world, dotBody);
    drags.forEach(function (d, id) { if (d.b.label !== 'bean') { Composite.remove(world, d.c); drags.delete(id); } });
    wordBodies = []; dotBody = null; guides = [];
    wordEls.forEach(function (el) { el.classList.remove('is-in'); });
    dotEl.classList.remove('is-in');
  }
  function makeWordBody(it) {
    if (it.i === 'dot') {
      var d = Bodies.circle(it.tx, it.ty, it.w / 2, { label: 'dot', density: 0.004, restitution: 0.42, friction: 0.9, frictionStatic: 1.2, frictionAir: 0.02, sleepThreshold: 40 });
      Body.setInertia(d, Infinity);
      d.plugin = { el: dotEl, w: it.w, h: it.h };
      return d;
    }
    var b = Bodies.rectangle(it.tx, it.ty, it.w, it.h, { label: 'word', chamfer: { radius: 2 }, density: 0.006, restitution: 0.04,
      friction: 0.95, frictionStatic: 1.4, frictionAir: 0.016, sleepThreshold: 40 });
    b.plugin = { el: wordEls[it.i], w: it.w, h: it.h };
    return b;
  }
  function dropWords(instant) {
    clearWords();
    plan = planWall();
    var order = plan.items.slice().sort(function (a, b) { return a.row - b.row || a.tx - b.tx; });
    order.forEach(function (it, n) {
      var go = function () {
        var b = makeWordBody(it);
        if (!instant) {
          var lift = H * 0.15 + it.h + n * 6;
          Body.setPosition(b, { x: it.tx + (rand() - 0.5) * 10, y: -lift });
          Body.setAngle(b, (rand() - 0.5) * (it.i === 'dot' ? 0 : 0.34));
          Body.setVelocity(b, { x: 0, y: 6 });
          Body.setAngularVelocity(b, (rand() - 0.5) * 0.03);
        }
        if (it.i === 'dot') dotBody = b; else wordBodies.push(b);
        b.plugin.el.classList.add('is-in');
        Composite.add(world, b);
        guides.push({ b: b, tx: it.tx, ty: it.ty, until: performance.now() + (instant ? 400 : 2600) });
        kick();
      };
      if (instant) go(); else { pending++; timers.push(setTimeout(function () { pending--; go(); }, 140 + n * 150)); }
    });
  }
  function sweepWallArea() {
    if (!plan) return;
    var s = plan.s, top = plan.top - 20, l = s.x, r = s.x + s.w;
    beans.forEach(function (b) {
      if (b.position.y < s.y + 2 && b.position.y > top - 200 && b.position.x > l && b.position.x < r) {
        Sleeping.set(b, false);
        var dir = b.position.x < s.cx ? -1 : 1;
        Body.setVelocity(b, { x: dir * (4 + rand() * 7), y: -6 - rand() * 7 });
      }
    });
  }

  /* ── the loop ─────────────────────────── */
  function kick() { quiet = 0; if (!raf && !paused && onScreen && !document.hidden && started) { lastT = 0; raf = requestAnimationFrame(frame); } }
  function beforeStep(now) {
    // rain
    if (rainLeft > 0 && now >= rainAt) {
      var n = Math.min(rainLeft, W < 600 ? 1 : 2);
      for (var i = 0; i < n; i++) if (beans.length < cap + 12) spawnBean(rainX(now), -20 - rand() * 80);
      rainLeft -= n; rainAt = now + rainGap;
    }
    // drags follow pointers
    drags.forEach(function (d) { Sleeping.set(d.b, false); });
    springs();
    // settling guides
    for (var g = guides.length - 1; g >= 0; g--) {
      var q = guides[g], b = q.b;
      if (now > q.until || q.grabbed) { guides.splice(g, 1); if (!q.grabbed) anchor(b, q); continue; }
      var dx = q.tx - b.position.x;
      if (Math.abs(q.ty - b.position.y) < b.plugin.h * 0.2 && Math.abs(b.velocity.y) < 1.2 && Math.abs(dx) < 6) { q.until = Math.min(q.until, now + 250); }
      Body.setVelocity(b, { x: b.velocity.x * 0.9 + dx * 0.03, y: b.velocity.y });
      if (b.label !== 'dot' && q.ty - b.position.y < b.plugin.h * 1.6) Body.setAngularVelocity(b, b.angularVelocity * 0.85 - b.angle * 0.04);
    }
  }
  function afterStep() {
    for (var i = beans.length - 1; i >= 0; i--) {
      var b = beans[i];
      if (b.isSleeping) continue;
      if (inHopper(b.position)) { catchBean(b); continue; }
      // clamp throws so nothing tunnels through the counter
      var v = b.velocity, sp = Math.hypot(v.x, v.y);
      if (sp > 38) Body.setVelocity(b, { x: v.x / sp * 38, y: v.y / sp * 38 });
      if (b.position.y > H + 200 || b.position.x < -300 || b.position.x > W + 300) { removeBean(b); rainLeft++; }
    }
  }
  var introUntil = 0, played = false;   // the grinder counts what *you* feed it
  function catchBean(b) {
    var throat = G.P(100, 118);
    grinding.push({ silent: performance.now() < introUntil || !played, x: b.position.x, y: b.position.y, a: b.angle, v: b.plugin.v, s: b.plugin.s, tx: throat.x, ty: throat.y, t0: performance.now() });
    removeBean(b);
  }
  function frame(t) {
    raf = 0;
    if (paused || !onScreen || document.hidden) return;
    var dt = lastT ? Math.min(t - lastT, 50) : STEP; lastT = t; acc += dt;
    var steps = 0;
    while (acc >= STEP && steps < 3) { beforeStep(t); Engine.update(engine, STEP); afterStep(); acc -= STEP; steps++; }
    if (steps === 3) acc = 0;
    draw(t);
    var busy = drags.size || grinding.length || rainLeft > 0 || pending > 0 || guides.length;
    var awake = beans.some(function (b) { return !b.isSleeping; }) || wordBodies.some(function (b) { return !b.isSleeping; }) || (dotBody && !dotBody.isSleeping);
    quiet = busy || awake ? 0 : quiet + 1;
    if (quiet < 20) raf = requestAnimationFrame(frame);
  }
  function blit(v, x, y, a, s) {
    var sp = sprites[v], c = Math.cos(a) * dpr, si = Math.sin(a) * dpr;
    ctx.setTransform(c, si, -si, c, x * dpr, y * dpr);
    ctx.drawImage(sp.c, -sp.w * s / 2, -sp.h * s / 2, sp.w * s, sp.h * s);
  }
  function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < beans.length; i++) { var b = beans[i]; blit(b.plugin.v, b.position.x, b.position.y, b.angle, b.plugin.s); }
    for (var j = grinding.length - 1; j >= 0; j--) {
      var gq = grinding[j], k = Math.min(1, (now - gq.t0) / 260), e = k * k;
      blit(gq.v, gq.x + (gq.tx - gq.x) * e, gq.y + (gq.ty - gq.y) * e, gq.a + k * 5, gq.s * (1 - 0.7 * e));
      if (k >= 1) { grinding.splice(j, 1); if (gq.silent) { rainLeft++; } else ground(); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    syncDom(wordBodies); if (dotBody) syncDom([dotBody]);
  }
  function syncDom(list) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i], p = b.plugin;
      if (b.isSleeping && p.done) continue;
      p.el.style.transform = 'translate3d(' + (b.position.x - p.w / 2).toFixed(2) + 'px,' + (b.position.y - p.h / 2).toFixed(2) + 'px,0) rotate(' + b.angle.toFixed(4) + 'rad)';
      p.done = b.isSleeping;
    }
  }
  var grindTimer = 0;
  function ground() {
    grinderEl.classList.remove('is-grinding'); void grinderEl.offsetWidth; grinderEl.classList.add('is-grinding');
    clearTimeout(grindTimer); grindTimer = setTimeout(function () { grinderEl.classList.remove('is-grinding'); }, 400);
    setCount(count + 1);
    setTimeout(function () { rainLeft++; kick(); }, 900);
  }

  /* ── pointer: grab, drag, throw ─────────────────────────── */
  function pt(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function bodyAt(p, touch) {
    var list = wordBodies.concat(dotBody ? [dotBody] : [], beans);
    var hit = M.Query.point(list, p)[0];
    if (hit || !touch) return hit || null;
    var best = null, bd = 18 * 18;
    beans.forEach(function (b) { var dx = b.position.x - p.x, dy = b.position.y - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = b; } });
    return best;
  }
  function grab(id, b, p) {
    var c = M.Constraint.create({ pointA: { x: p.x, y: p.y }, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y },
      length: 0.01, stiffness: b.label === 'bean' ? 0.22 : 0.09, damping: 0.08 });
    Composite.add(world, c);
    drags.set(id, { c: c, b: b });
    b.plugin.held = true;
    Sleeping.set(b, false);
    guides.forEach(function (q) { if (q.b === b) q.grabbed = true; });
    canvas.classList.add('is-grabbing'); canvas.style.cursor = 'grabbing';
    kick();
  }
  function release(id) {
    var d = drags.get(id); if (!d) return;
    Composite.remove(world, d.c); drags.delete(id);
    d.b.plugin.held = false;
    var v = d.b.velocity, sp = Math.hypot(v.x, v.y), lim = d.b.label === 'bean' ? 34 : 22;
    if (sp > lim) Body.setVelocity(d.b, { x: v.x / sp * lim, y: v.y / sp * lim });
    if (!drags.size) canvas.style.cursor = '';
    kick();
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (paused || e.button > 0) return;
    var p = pt(e), b = bodyAt(p, e.pointerType !== 'mouse');
    if (!b) return;
    e.preventDefault(); played = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    grab(e.pointerId, b, p);
  });
  canvas.addEventListener('pointermove', function (e) {
    var d = drags.get(e.pointerId), p = pt(e);
    if (d) {
      d.c.pointA = p; Sleeping.set(d.b, false);
      var hm = d.b.plugin.home;
      if (d.b.plugin.anchored && hm && Math.hypot(d.b.position.x - hm.x, d.b.position.y - hm.y) > d.b.plugin.h * 0.55) { unanchor(d.b); say('You pulled a word off the counter. Restack the headline to put it back.'); }
      kick(); return;
    }
    if (e.pointerType === 'mouse' && !paused) canvas.style.cursor = bodyAt(p, false) ? 'grab' : '';
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { canvas.addEventListener(ev, function (e) { release(e.pointerId); }); });
  // Only claim a touch (and stop the page scrolling) when it lands on a bean or a word.
  canvas.addEventListener('touchstart', function (e) {
    if (paused) return;
    var t = e.changedTouches[0], r = canvas.getBoundingClientRect();
    if (bodyAt({ x: t.clientX - r.left, y: t.clientY - r.top }, true)) e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { if (drags.size) e.preventDefault(); }, { passive: false });

  /* ── controls ─────────────────────────── */
  btnDrop.addEventListener('click', function (e) {
    rewardFromKeyboard = e.detail === 0; played = true;
    if (paused) { setPaused(false); }
    var top = G.P(100 + (rand() - 0.5) * 50, 0);
    spawnBean(top.x, Math.max(-30, top.y - Math.min(220, top.y + 30)), (rand() - 0.5) * 0.6, 3);
    kick();
  });
  btnRestack.addEventListener('click', function () {
    if (paused) setPaused(false);
    sweepWallArea();
    pending++; timers.push(setTimeout(function () { pending--; dropWords(false); }, 260));
    say('Restacking the headline.');
    kick();
  });
  function setPaused(v) {
    paused = v; btnPause.setAttribute('aria-pressed', String(v));
    if (v) { drags.forEach(function (d, id) { release(id); }); say('Beans paused.'); }
    else { say('Beans moving again.'); kick(); }
  }
  btnPause.addEventListener('click', function () { setPaused(!paused); });

  /* tilt: gravity follows the phone (iOS asks permission from this click) */
  var tiltOn = false, lastWake = 0;
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    var ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
    var gx = Math.sin(e.gamma * Math.PI / 180), gy = Math.sin(e.beta * Math.PI / 180);
    var x = gx * Math.cos(ang) + gy * Math.sin(ang), y = -gx * Math.sin(ang) + gy * Math.cos(ang);
    var m = Math.hypot(x, y);
    if (m < 0.35) { if (m < 0.01) { x = 0; y = 0.35; } else { x = x / m * 0.35; y = y / m * 0.35; } }
    var nx = engine.gravity.x + (x - engine.gravity.x) * 0.25, ny = engine.gravity.y + (y - engine.gravity.y) * 0.25;
    var moved = Math.abs(nx - engine.gravity.x) + Math.abs(ny - engine.gravity.y);
    engine.gravity.x = nx; engine.gravity.y = ny;
    var now = performance.now();
    if (moved > 0.004 && now - lastWake > 180) {
      lastWake = now;
      beans.concat(wordBodies, dotBody ? [dotBody] : []).forEach(function (b) { Sleeping.set(b, false); });
      kick();
    }
  }
  if (coarse && 'DeviceOrientationEvent' in window) {
    btnTilt.hidden = false;
    btnTilt.addEventListener('click', function () {
      if (tiltOn) {
        tiltOn = false; window.removeEventListener('deviceorientation', onOrient);
        engine.gravity.x = 0; engine.gravity.y = 1; btnTilt.setAttribute('aria-pressed', 'false');
        beans.forEach(function (b) { Sleeping.set(b, false); }); kick();
        say('Tilt off. Gravity points down again.'); return;
      }
      var go = function () {
        tiltOn = true; played = true; window.addEventListener('deviceorientation', onOrient);
        btnTilt.setAttribute('aria-pressed', 'true');
        say('Tilt on. Tip your phone to pour beans toward the grinder.');
      };
      var DOE = window.DeviceOrientationEvent;
      if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission().then(function (s) { if (s === 'granted') go(); else say('Motion access was declined, so tilting stays off.'); })
          .catch(function () { say('Motion access is not available here.'); });
      } else go();
    });
  }

  /* ── visibility: stop when nobody can see it ─────────────────────────── */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { ioVisible = en[0].isIntersecting; onScreenSet(); }, { threshold: 0.02 }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  // once the card table has slid over the box, nobody can see the beans: stop
  var zone = document.getElementById('box'), covered = false;
  addEventListener('scroll', function () {
    var c = zone.getBoundingClientRect().top <= 0;
    if (c !== covered) { covered = c; onScreenSet(); }
  }, { passive: true });
  var ioVisible = true;
  function onScreenSet() { onScreen = ioVisible && !covered; if (onScreen) kick(); }

  /* ── palette: recolour the beans live ─────────────────────────── */
  document.addEventListener('unclaw:palette', function () {
    requestAnimationFrame(function () { buildSprites(); draw(performance.now()); });
  });

  /* ── resize: rebuild the box, keep the beans ─────────────────────────── */
  var lastW = 0, lastH = 0, rz;
  function rebuild(first) {
    measureStage(); buildSprites(); buildStatics();
    if (!first) {
      beans.slice().forEach(function (b) {
        var p = b.position, bad = M.Query.point(statics, p).length || p.x < 0 || p.x > W || p.y > H;
        if (bad) { removeBean(b); rainLeft++; }
        else Sleeping.set(b, false);
      });
      dropWords(true);
    }
    lastW = W; lastH = H;
  }
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (Math.abs(stage.clientWidth - lastW) < 2 && Math.abs(stage.clientHeight - lastH) < 100) return;
      rebuild(false); kick();
    }, 180);
  });

  /* ── start once the display face is in ─────────────────────────── */
  var t0Start = 0;
  function start() {
    if (started) return; started = true; t0Start = performance.now();
    rebuild(true);
    dropWords(false);
    wallLandAt = performance.now() + 140 + 150 * 8 + 900;
    rainLeft = cap; rainAt = performance.now() + 500; rainGap = Math.max(10, 2300 / (cap / (W < 600 ? 1 : 2)));
    introUntil = performance.now() + 7000;
    kick();
  }
  var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('800 100px "Funnel Display"'), document.fonts.ready]) : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(start, start);

  // debugging/testing hook (no UI depends on it)
  window.__beanBox = { get plan() { return plan && plan.items.map(function (i) { return [i.i, i.row, Math.round(i.tx), Math.round(i.ty), Math.round(i.w)]; }); }, get F() { return plan && plan.F; }, get count() { return count; }, get running() { return !!raf; }, get awake() { return beans.filter(function (b) { return !b.isSleeping; }).length; }, beanAt: function (i) { var b = beans.filter(function (x) { return x.isSleeping; })[i] || beans[i]; return b ? [b.position.x, b.position.y] : null; }, hopper: function () { var q = G.P(100, 20); return [q.x, q.y]; }, wordAt: function (i) { var b = wordBodies[i]; return [b.position.x, b.position.y]; }, get beans() { return beans.length; }, get words() { return wordBodies.map(function (b) { return [Math.round(b.position.x), Math.round(b.position.y), +b.angle.toFixed(2)]; }); }, engine: engine };
})();
