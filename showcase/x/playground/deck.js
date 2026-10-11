/* Tidewater Bean Box — the card pile. GSAP Draggable + InertiaPlugin for flicks; buttons do everything a flick does. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var still = doc.classList.contains('still');
  var deck = document.getElementById('deck');
  if (!deck) return;
  var cards = Array.prototype.slice.call(deck.querySelectorAll('.card'));
  var N = cards.length;
  var names = ['Kiambu, Kenya', 'Huila, Colombia', 'Roast week', 'Questions', 'Plans'];
  var posEl = document.getElementById('deck-pos');
  var prevBtn = document.getElementById('prev'), nextBtn = document.getElementById('next');
  var idxBtns = Array.prototype.slice.call(document.querySelectorAll('.deck-index button'));
  var how = document.querySelector('.deck-intro__how');
  var zone = document.getElementById('box');

  /* plan form: honest demo confirmation */
  var form = document.getElementById('plan-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var plan = form.elements.plan.value, grind = form.elements.grind.value;
    var what = plan === 'two' ? 'two bags (2 × 250 g, €26 a month)' : 'one bag (250 g, €14 a month)';
    var g = grind === 'whole bean' ? 'whole bean' : 'ground for ' + grind;
    document.getElementById('plan-note').textContent = 'You picked ' + what + ', ' + g + '. This is a demo, so nothing is ordered.';
  });

  var goPlans = function (e) {
    e.preventDefault();
    var target = document.getElementById('box');
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    if (!still && api) setTimeout(function () { api.goTo(4); }, 450);
    else document.getElementById('plans').scrollIntoView({ block: 'start' });
  };
  var api = null;
  document.querySelectorAll('[data-goto="plans"]').forEach(function (a) { a.addEventListener('click', goPlans); });

  if (still || !window.gsap || !window.Draggable) {
    if (how) how.textContent = 'Five cards: the two October lots, roast week, questions, and the plans.';
    return;
  }

  gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger);

  /* the box lags behind as the card table slides over it */
  var toy = document.getElementById('toy');
  if (toy) gsap.to(toy, { yPercent: 38, ease: 'none', scrollTrigger: { trigger: toy, start: 'top top', end: 'bottom top', scrub: true } });
  deck.classList.add('deck--stack');
  var coarse = matchMedia('(pointer: coarse)').matches;
  var order = cards.map(function (c, i) { return i; });
  var busy = false;
  var REST = [{ x: 0, y: 0, r: 0 }, { x: 12, y: 14, r: 2.6 }, { x: -14, y: 26, r: -3.4 }, { x: 16, y: 36, r: 4 }, { x: -9, y: 44, r: -2.2 }];

  function sizeDeck() {
    cards.forEach(function (c) { c.style.height = ''; });
    var h = Math.max.apply(null, cards.map(function (c) { return c.offsetHeight; }));
    deck.style.setProperty('--deck-h', (h + 46) + 'px');
    cards.forEach(function (c) { c.style.height = h + 'px'; });
  }
  function rest(d) { return REST[Math.min(d, REST.length - 1)]; }
  function layout(dur, except) {
    order.forEach(function (ci, d) {
      var c = cards[ci], r = rest(d);
      c.style.zIndex = String(N - d);
      c.classList.toggle('is-top', d === 0);
      if (d === 0) c.removeAttribute('inert'); else c.setAttribute('inert', '');
      if (c === except) return;
      gsap.to(c, { x: r.x, y: r.y, rotation: r.r, scale: 1 - d * 0.018, duration: dur, ease: 'back.out(1.5)', overwrite: 'auto' });
    });
    drags.forEach(function (dr, i) { if (i === order[0]) dr.enable(); else dr.disable(); });
    var top = order[0];
    posEl.textContent = 'Card ' + (top + 1) + ' of ' + N + ': ' + names[top];
    idxBtns.forEach(function (b, i) { if (i === top) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }

  /* throw the top card off, then tuck it under the pile */
  function fling(vx, vy, dur) {
    var ci = order[0], c = cards[ci];
    var m = Math.hypot(vx, vy) || 1, far = Math.max(innerWidth, innerHeight) * 1.15;
    var tx = gsap.getProperty(c, 'x') + vx / m * far, ty = gsap.getProperty(c, 'y') + vy / m * far * 0.6;
    busy = true;
    c.setAttribute('inert', '');
    gsap.to(c, { x: tx, y: ty, rotation: '+=' + (vx >= 0 ? 24 : -24), duration: dur || 0.42, ease: 'power2.in', overwrite: true, onComplete: function () {
      order.push(order.shift());
      c.style.zIndex = '0';
      layout(0.45, c);
      var r = rest(N - 1);
      gsap.fromTo(c, { x: vx >= 0 ? -innerWidth * 0.2 : innerWidth * 0.2, y: r.y + 60, rotation: vx >= 0 ? -10 : 10 },
        { x: r.x, y: r.y, rotation: r.r, scale: 1 - (N - 1) * 0.018, duration: 0.6, ease: 'power3.out', onComplete: function () { busy = false; } });
    } });
  }
  function next() { if (!busy) fling(-1, -0.12, 0.38); }
  function prev() {
    if (busy) return;
    busy = true;
    var ci = order.pop(), c = cards[ci];
    order.unshift(ci);
    gsap.to(c, { x: Math.min(innerWidth * 0.6, 520), y: 40, rotation: 14, duration: 0.28, ease: 'power2.out', overwrite: true, onComplete: function () {
      c.style.zIndex = String(N + 1);
      layout(0.5, c);
      gsap.to(c, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)', onComplete: function () { busy = false; } });
    } });
  }
  function goTo(i) {
    var k = order.indexOf(i);
    if (k <= 0 || busy) return;
    busy = true;
    var flung = order.slice(0, k);
    flung.forEach(function (ci, n) {
      var c = cards[ci];
      c.setAttribute('inert', '');
      gsap.to(c, { x: (n % 2 ? 1 : -1) * innerWidth, y: -80 - n * 30, rotation: (n % 2 ? 1 : -1) * 30, duration: 0.34, delay: n * 0.08, ease: 'power2.in', overwrite: true });
    });
    gsap.delayedCall(0.34 + (k - 1) * 0.08 + 0.02, function () {
      order = order.slice(k).concat(flung);
      flung.forEach(function (ci) { cards[ci].style.zIndex = '0'; });
      layout(0.55);
      gsap.delayedCall(0.55, function () { busy = false; });
    });
  }
  api = { goTo: goTo, next: next, prev: prev };

  /* dragging */
  var drags = cards.map(function (c, i) {
    InertiaPlugin.track(c, 'x,y');
    var grabTop = true;
    return Draggable.create(c, {
      type: coarse ? 'x' : 'x,y', zIndexBoost: false, minimumMovement: 5, allowContextMenu: true,
      clickableTest: function (el) { return !!(el.closest && el.closest('a,button,input,select,textarea,label,[data-clickable]')); },
      onPress: function () { if (busy) { this.endDrag(); return; } gsap.killTweensOf(c); var b = c.getBoundingClientRect(); grabTop = this.pointerY < b.top + b.height / 2; },
      onDragStart: function () { c.classList.add('is-dragging'); },
      onDrag: function () { gsap.set(c, { rotation: this.x * 0.05 * (grabTop ? 1 : -1) }); },
      onRelease: function () {
        c.classList.remove('is-dragging');
        if (busy) return;
        var vx = InertiaPlugin.getVelocity(c, 'x') || 0, vy = InertiaPlugin.getVelocity(c, 'y') || 0;
        var dx = this.x, dy = this.y, dist = Math.hypot(dx, dy), sp = Math.hypot(vx, vy);
        if (dist > c.offsetWidth * 0.28 || (sp > 700 && dist > 24)) {
          var ux = sp > 700 ? vx : dx, uy = sp > 700 ? vy : dy;
          fling(ux, uy, Math.max(0.22, Math.min(0.45, 900 / Math.max(sp, 900) * 0.42)));
        } else {
          gsap.to(c, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.55)' });
        }
      }
    })[0];
  });

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  idxBtns.forEach(function (b, i) { b.addEventListener('click', function () { goTo(i); }); });
  zone.addEventListener('keydown', function (e) {
    if (e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  sizeDeck();
  layout(0);

  /* deal the pile onto the table once, when it scrolls into view */
  var dealt = false;
  gsap.set(cards, { opacity: 0 });
  ScrollTrigger.create({ trigger: deck, start: 'top 82%', once: true, onEnter: function () {
    dealt = true;
    var seq = order.slice().reverse();
    seq.forEach(function (ci, n) {
      var c = cards[ci], d = order.indexOf(ci), r = rest(d);
      gsap.fromTo(c, { opacity: 1, x: r.x + (n % 2 ? 1 : -1) * 220, y: r.y - innerHeight * 0.55, rotation: (n % 2 ? 1 : -1) * 28 },
        { x: r.x, y: r.y, rotation: r.r, duration: 0.7, delay: n * 0.09, ease: 'back.out(1.3)' });
    });
  } });
  setTimeout(function () { if (!dealt && deck.getBoundingClientRect().top < innerHeight) { gsap.set(cards, { opacity: 1 }); } }, 2500);

  var lw = innerWidth, rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (Math.abs(innerWidth - lw) < 2) return; lw = innerWidth; sizeDeck(); layout(0); ScrollTrigger.refresh(); }, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sizeDeck(); ScrollTrigger.refresh(); });
})();
