/* Cherry to Cup — one scroll-driven journey. GSAP ScrollTrigger pins one stage per chapter and scrubs its timeline;
   Lenis smooths wheel scrolling (touch stays native). Reduced motion gets the still story: no pins, no parallax, no autoplay. */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = !rm.matches && hasGsap;
  if (!motion) root.classList.remove('motion');
  try { rm.addEventListener('change', () => location.reload()); } catch (e) {}

  /* ── plans: the story's ending ─────────────────────────────── */
  const form = $('#plans'), cups = $('.cups'), result = $('.result');
  const syncPlan = () => { cups.dataset.plan = form.elements.plan.value; };
  form.addEventListener('change', syncPlan); syncPlan();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const two = form.elements.plan.value === 'two', g = form.elements.grind.value;
    const grind = g === 'whole bean' ? 'as whole beans' : 'ground for ' + g;
    result.textContent = (two ? 'Two bags, both coffees, ' : 'One bag, alternating between the coffees, ') + grind + ': ' +
      (two ? '€26' : '€14') + ' a month, starting with batch 041 on Monday 12 October. This is a demo page, so nothing has been ordered.';
  });

  /* ── water loop: plays only while visible, always pausable ─── */
  const vid = $('.water-vid'), vbtn = $('.vid-toggle');
  let userPaused = !motion;
  const setBtn = () => { const on = !vid.paused; vbtn.dataset.paused = on ? 'false' : 'true'; $('.vt-txt', vbtn).textContent = on ? 'Pause the water' : 'Play the water'; };
  vbtn.removeAttribute('aria-pressed');
  vid.addEventListener('play', setBtn); vid.addEventListener('pause', setBtn); setBtn();
  vbtn.addEventListener('click', () => {
    if (vid.paused) { userPaused = false; vid.play().catch(() => {}); } else { userPaused = true; vid.pause(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !userPaused) vid.play().catch(() => {}); else if (!en.isIntersecting) vid.pause();
    }, { threshold: 0.2 }).observe($('#washing .stage'));
  }

  /* ── trail: progress + chapter navigation ──────────────────── */
  const trail = $('.trail'), links = $$('.trail a'), chapters = links.map(a => $(a.hash));
  const tones = { picking: 'deep', washing: 'light', drying: 'light', route: 'dark', roasting: 'deep', letterbox: 'light', cup: 'light' };
  let current = -2;
  function setActive(i) {
    if (i === current) return; current = i;
    links.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
    trail.dataset.tone = i < 0 ? 'light' : tones[chapters[i].id];
  }
  setActive(-1);

  let lenis = null;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    const focusTarget = t.matches('form') ? t : (t.querySelector('h2') || t);
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    const done = () => focusTarget.focus({ preventScroll: true });
    if (lenis) lenis.scrollTo(t, { duration: 1.6, onComplete: done });
    else { t.scrollIntoView({ behavior: 'auto' }); done(); }
  });

  function navTriggers() {
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => trail.style.setProperty('--p', s.progress.toFixed(4)) });
    const dawnState = s => { const on = s.scroll() < s.end; trail.classList.toggle('is-dawn', on); if (on) setActive(-1); };
    ScrollTrigger.create({ trigger: '#dawn', start: 0, end: 'bottom 50%', onUpdate: dawnState, onRefresh: dawnState, onLeave: dawnState, onEnterBack: dawnState });
    chapters.forEach((sec, i) => ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && setActive(i) }));
  }

  if (!hasGsap) return;
  if (!motion) { gsap.registerPlugin(ScrollTrigger); navTriggers(); return; }

  /* ── motion ────────────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const rand = gsap.utils.random;
  function pinTL(sec, len) {
    return gsap.timeline({ defaults: { ease: 'none', duration: 1 }, scrollTrigger: {
      trigger: $('.stage', sec), start: 'top top', end: () => '+=' + Math.round(innerHeight * len),
      pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
  }
  function splitOnEnter(sel) {
    SplitText.create(sel, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self =>
      gsap.from(self.lines, { yPercent: 108, duration: .8, ease: 'expo.out', stagger: .07,
        scrollTrigger: { trigger: sel, start: 'top 92%', toggleActions: 'play none none reverse' } }) });
  }

  // opening: the one orchestrated entrance (≈ 0.9 s)
  SplitText.create('#h-dawn', { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self =>
    gsap.from(self.lines, { yPercent: 108, duration: .9, ease: 'expo.out', stagger: .08, delay: .15 }) });
  gsap.from('.lede, .dawn-skip', { opacity: 0, y: 14, duration: .7, ease: 'power2.out', delay: .55, stagger: .08 });
  gsap.from('.sun', { y: 70, duration: 1.6, ease: 'power3.out' });
  gsap.fromTo('.cue-line', { scaleY: 0 }, { scaleY: 1, duration: .9, ease: 'power2.inOut', delay: .9 });

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 761px)', mob: '(max-width: 760px)' }, ctx => {
    const D = ctx.conditions.desk, k = D ? 1 : 0.62;

    /* 0 — dawn: eight depth layers, far ones barely move; the near ridge rises to become the next ground */
    pinTL($('#dawn'), D ? 1.6 : 1.05)
      .to('.L2', { yPercent: -5 }, 0).to('.L4', { yPercent: -11 }, 0).to('.L5', { yPercent: -20 }, 0)
      .to('.L7', { yPercent: -14, duration: .5 }, 0).to('.L7', { yPercent: -46, duration: .5, ease: 'power1.in' }, .5)
      .to('.L8', { yPercent: -8, duration: .5 }, 0).to('.L8', { yPercent: -84, duration: .5, ease: 'power1.in' }, .5)
      .to('.L9', { yPercent: D ? -75 : -95, xPercent: 8, scale: 1.3, transformOrigin: '100% 0%' }, 0)
      .to('.L1', { yPercent: -24 }, 0)
      .to('.m1', { xPercent: -7, yPercent: -55, opacity: .3 }, 0)
      .to('.m2', { xPercent: 9, yPercent: -90, opacity: .15 }, 0)
      .to('.sky-day', { opacity: 1 }, 0)
      .to('.dawn-copy', { yPercent: -45, opacity: 0, ease: 'power1.in', duration: .42 }, 0)
      .to('.dawn-top', { opacity: 0, duration: .2 }, .04)
      .to('.cue', { opacity: 0, duration: .12 }, 0);

    /* 1 — picking: cherries ripen in a wave; only the red ones are picked */
    {
      const sec = $('#picking'), svg = $(D ? '.pick-wide' : '.pick-tall', sec);
      const cherries = $$('.cherry', svg), reds = cherries.filter(c => !c.dataset.late);
      const [bx, by, bw] = D ? [760, 884, 200] : [250, 872, 130];
      const tl = pinTL(sec, 1.7 * k);
      gsap.set($$('.cherry .cy, .cherry .cr', svg), { opacity: 0 });
      gsap.set($('.heap', svg), { scale: .3, opacity: 0, transformOrigin: '50% 100%' });
      tl.fromTo($('.br-main', svg), { rotation: -1.4 }, { rotation: 1.2, svgOrigin: D ? '1600 260' : '600 340' }, 0);
      cherries.forEach((c, i) => {
        const t = .03 + (i / cherries.length) * .42;
        tl.to($('.cy', c), { opacity: 1, duration: .08 }, t);
        if (!c.dataset.late) tl.to($('.cr', c), { opacity: 1, duration: .08 }, t + .09);
        if (c.dataset.late === 'g') tl.to($('.cy', c), { opacity: 0, duration: .06 }, t + .1);
      });
      reds.forEach((c, i) => {
        const t = .58 + (i / reds.length) * .27;
        tl.to(c, { x: bx + rand(-bw * .55, bw * .55), y: by - bw * .5, rotation: rand(-120, 120), transformOrigin: '50% 50%', duration: .09, ease: 'power2.in' }, t)
          .to(c, { opacity: 0, duration: .015 }, t + .085);
      });
      tl.to($('.heap', svg), { scale: 1, opacity: 1, duration: .3, ease: 'power2.out' }, .62);
    }

    /* 2 — washing: cherries roll down the channel, under the drum, out as bean pairs */
    {
      const sec = $('#washing'), wcs = $$('.wc', sec), lane = $('.lane', sec);
      const tl = pinTL(sec, 1.5 * k), span = .5;
      gsap.set(wcs, { left: 0 });
      gsap.set($$('.wc-skin', sec), { opacity: 1 });
      wcs.forEach((w, i) => {
        const t0 = i * (1 - span) / (wcs.length - 1);
        const ww = () => w.getBoundingClientRect().width;
        tl.fromTo(w, { x: () => -ww() * 1.3, rotation: 0 }, { x: () => lane.getBoundingClientRect().width + ww() * .3, rotation: 260, duration: span }, t0);
        const ts = t0 + span * .5;
        tl.to($('.wc-l', w), { x: -30, y: 18, rotation: -60, opacity: 0, transformOrigin: '50% 50%', duration: .07 }, ts)
          .to($('.wc-r', w), { x: 30, y: 22, rotation: 60, opacity: 0, transformOrigin: '50% 50%', duration: .07 }, ts);
      });
      tl.to($('.drum svg', sec), { rotation: 540 }, 0).to($('.ripples', sec), { xPercent: -50 }, 0);
    }

    /* 3 — drying: one sun arc stands in for two weeks of days */
    {
      const sec = $('#drying'), v = D ? 'wide' : 'tall', svg = $('.dry-svg:not(.dry-sky).dry-' + v, sec), sky = $('.dry-sky.dry-' + v, sec), arc = $('#sunarc-' + v);
      const tl = pinTL(sec, 1.6 * k), day = { v: 1 }, out = $('.day-n', sec);
      tl.to($('.sun-d', sky), { motionPath: { path: arc, align: arc, alignOrigin: [.5, .5] } }, 0)
        .fromTo($$('.bean-dry', svg), { opacity: 0 }, { opacity: 1, duration: .8 }, .12)
        .fromTo($('.cshadow', svg), { skewX: 22 }, { skewX: -22, transformOrigin: '50% 0%' }, 0)
        .fromTo($('.dry-eve', sec), { opacity: 0 }, { opacity: .85, duration: .3 }, .7)
        .fromTo(day, { v: 1 }, { v: 14, duration: .86, onUpdate: () => { const d = Math.round(day.v); if (d !== day.shown) { day.shown = d; out.textContent = 'Day ' + d; } } }, .06);
    }

    /* 4 — route: two lines drawn across the chart, meeting at the roastery */
    {
      const sec = $('#route'), v = D ? 'wide' : 'tall', svg = $('.route-' + v, sec);
      const ra = $('#ra-' + v), rb = $('#rb-' + v), ta = $('.ta', svg), tb = $('.tb', svg);
      const tl = pinTL(sec, 1.4 * k);
      tl.from($$('.pt-hu, .pt-ki', svg), { scale: 0, transformOrigin: '50% 50%', duration: .08, stagger: .04 }, 0)
        .fromTo([ra, rb], { drawSVG: '0%' }, { drawSVG: '100%', duration: .66, ease: 'power1.inOut' }, .1)
        .set([ta, tb], { opacity: 1 }, .1)
        .to(ta, { motionPath: { path: ra, align: ra, alignOrigin: [.5, .5] }, duration: .66, ease: 'power1.inOut' }, .1)
        .to(tb, { motionPath: { path: rb, align: rb, alignOrigin: [.5, .5] }, duration: .66, ease: 'power1.inOut' }, .1)
        .to([ta, tb], { opacity: 0, duration: .04 }, .76)
        .fromTo($('.pt-pulse', svg), { scale: 1, opacity: .9 }, { scale: 3.6, opacity: 0, transformOrigin: '50% 50%', duration: .2 }, .76);
    }

    /* 5 — roasting: green → yellow → first crack → light (Kiambu) → medium-light (Huila) */
    {
      const sec = $('#roasting'), L = $$('.tray-l', sec), items = $$('.rtrack li', sec), stops = [0, .14, .42, .6, .82];
      let idx = -1;
      const tl = pinTL(sec, 1.7 * k);
      gsap.set(L.slice(1), { opacity: 0 });
      tl.fromTo($('.tray-beans', sec), { rotation: 0 }, { rotation: 80 }, 0)
        .fromTo($('.tray-armw', sec), { rotation: 0 }, { rotation: 320 }, 0)
        .to(L[1], { opacity: 1, duration: .2 }, .12)
        .to(L[2], { opacity: 1, duration: .2 }, .44)
        .to(L[3], { opacity: 1, duration: .2 }, .7)
        .to($('.tray-beans', sec), { keyframes: { scale: [1, 1.04, .985, 1.025, 1] }, duration: .07 }, .43)
        .eventCallback('onUpdate', () => {
          const p = tl.progress(); let n = 0; stops.forEach((s, i) => { if (p >= s) n = i; });
          if (n !== idx) { idx = n; items.forEach((li, i) => { li.classList.toggle('on', i <= n); li.classList.toggle('now', i === n); }); }
        });
      items[0].classList.add('on', 'now');
    }

    /* 6 — letterbox: flap opens, bag slides through, drops on the mat, flap snaps shut */
    {
      const sec = $('#letterbox'), bag = $('.bag', sec), flap = $('.flap', sec);
      const tl = pinTL(sec, 1.4 * k);
      gsap.set(bag, { x: 400, y: 372, rotation: 0, transformOrigin: '50% 50%' });
      tl.to(flap, { scaleY: -.62, transformOrigin: '50% 0%', duration: .12, ease: 'power2.out' }, .08)
        .to(bag, { y: 560, duration: .3, ease: 'power1.inOut' }, .14)
        .to(bag, { y: 836, rotation: -5, duration: .28, ease: 'bounce.out' }, .44)
        .to(flap, { scaleY: 1, duration: .22, ease: 'elastic.out(1, .32)' }, .56)
        .fromTo($('.mat-shadow', sec), { opacity: .25 }, { opacity: 1, duration: .12 }, .62);
    }

    /* 7 — cup: pour, then the steam draws itself */
    gsap.timeline({ scrollTrigger: { trigger: '.cups-art', start: 'top 88%', end: 'center 55%', scrub: .6 } })
      .from('.pour', { scale: .12, transformOrigin: '50% 50%', duration: 1, ease: 'power2.out', stagger: .18 }, 0)
      .fromTo('.st', { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: .7, stagger: .05 }, .35);

    navTriggers();
  });

  splitOnEnter('#h-roast');
  splitOnEnter('#h-cup');
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
