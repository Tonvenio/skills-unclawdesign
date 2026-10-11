/* Tidewater, Issue 041: a magazine you turn sideways.
 * Desktop (motion allowed): vertical scroll drives a pinned horizontal track of spreads (GSAP ScrollTrigger + Lenis),
 * per-spread animations use containerAnimation. Mobile: vertical snap pages. Reduced motion: stacked, still.
 */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const H_QUERY = '(min-width: 900px) and (min-height: 520px) and (prefers-reduced-motion: no-preference)';
  const hasGsap = typeof gsap !== 'undefined';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── colour: read tokens, choose which ink is "dark" so media stay positive on any palette ── */
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;
  function rgb(str) {
    probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = (str || '').trim() || '#000';
    probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
  }
  const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const inks = { dark: [0, 0, 0], mid: [1, .4, .2], light: [1, 1, 1] };
  function tones() {
    const cs = getComputedStyle(root);
    const text = rgb(cs.getPropertyValue('--c-text')), bg = rgb(cs.getPropertyValue('--c-bg'));
    const darkGround = lum(bg) < lum(text);
    root.style.setProperty('--tone-dark', darkGround ? 'var(--c-bg)' : 'var(--c-text)');
    root.style.setProperty('--tone-light', darkGround ? 'var(--c-text)' : 'var(--c-bg)');
    root.style.setProperty('--overprint', darkGround ? 'screen' : 'multiply');
    inks.dark = darkGround ? bg : text; inks.light = darkGround ? text : bg;
    const C = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const acc = ['--c-accent', '--c-accent-3', '--c-accent-2'].map(v => [v, rgb(cs.getPropertyValue(v))]);
    const onDark = acc.find(([, c]) => C(c, inks.dark) >= 3);
    root.style.setProperty('--ink-on-dark', onDark ? `var(${onDark[0]})` : 'var(--tone-light)');
    // middle inks for the plates must sit between the two tones, or the picture flattens
    const spread = c => Math.min(C(c, inks.dark), C(c, inks.light));
    const pop = acc.slice().sort((a, b) => spread(b[1]) - spread(a[1]))[0];
    const okMid = c => C(c, inks.dark) >= 2 && C(c, inks.light) >= 1.5;
    inks.mid = null;
    [['--mid-1', '--c-accent'], ['--mid-2', '--c-accent-2'], ['--mid-3', '--c-accent-3']].forEach(([m, v]) => {
      const c = rgb(cs.getPropertyValue(v)), use = okMid(c) ? [v, c] : pop;
      root.style.setProperty(m, `var(${use[0]})`);
      if (!inks.mid) inks.mid = use[1];
    });
    if (cover) cover.draw();
  }

  /* ── cover film: WebGL gradient map (dark → accent → paper) with a soft pointer ripple ── */
  let cover = null;
  function initCover() {
    const el = $('#cover'), canvas = $('#coverGL'), video = $('#coverVideo'), poster = $('.cover__poster'), btn = $('#videoBtn');
    let userPaused = RM.matches, visible = true;
    const setBtn = () => {
      const playing = !userPaused;
      btn.dataset.state = playing ? 'playing' : 'paused';
      $('.lab', btn).textContent = playing ? 'Pause video' : 'Play video';
      btn.setAttribute('aria-pressed', String(!playing));
    };
    const sync = () => {
      if (!userPaused && visible) { const p = video.play(); if (p && p.catch) p.catch(() => {}); loop(); }
      else video.pause();
    };
    if (!RM.matches) video.preload = 'auto';
    btn.addEventListener('click', () => { userPaused = !userPaused; setBtn(); sync(); });
    RM.addEventListener('change', e => { if (e.matches) { userPaused = true; setBtn(); sync(); } });
    setBtn();

    // WebGL
    let gl = null, prog, tex, u = {}, raf = 0, ptr = [0.5, 0.5], ptrAmt = 0, ptrTarget = 0, t0 = performance.now(), lastVT = -1, texReady = false;
    try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (gl) {
      const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
      const fs = `precision mediump float;varying vec2 v;uniform sampler2D T;uniform vec2 R,V,F,P;uniform vec3 D,M,L;uniform float A,t;
        vec2 cov(vec2 q){float rs=R.x/R.y,rv=V.x/V.y;vec2 s=rs>rv?vec2(1.,rv/rs):vec2(rs/rv,1.);vec2 o=clamp(F-.5*s,vec2(0.),1.-s);return o+q*s;}
        float h(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}
        void main(){vec2 q=v;vec2 d=(q-P)*vec2(R.x/R.y,1.);float r=length(d);
          q+=normalize(d+1e-5)*sin(r*46.-t*3.2)*.0045*A*exp(-r*r*14.);
          float l=texture2D(T,cov(q)).r;
          l=clamp((l-.03)/.9,0.,1.);
          vec3 c=l<.42?mix(D,M,smoothstep(.1,.42,l)):mix(M,L,smoothstep(.42,.86,l));
          c+=(h(gl_FragCoord.xy+fract(t)*91.)-.5)*.045;
          gl_FragColor=vec4(c,1.);}`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      try {
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
        gl.useProgram(prog);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        ['T', 'R', 'V', 'F', 'P', 'D', 'M', 'L', 'A', 't'].forEach(k => (u[k] = gl.getUniformLocation(prog, k)));
        tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
        root.classList.add('has-gl');
      } catch (e) { gl = null; root.classList.remove('has-gl'); }
    }
    const upload = src => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); texReady = true; };
    const size = () => {
      if (!gl) return;
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.round(Math.min(r.width * dpr, 1920))), h = Math.max(2, Math.round(r.width ? w * r.height / r.width : 2));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    };
    const draw = () => {
      if (!gl || !texReady) return;
      const narrow = innerWidth < 900;
      gl.uniform2f(u.R, canvas.width, canvas.height); gl.uniform2f(u.V, 1280, 720);
      gl.uniform2f(u.F, narrow ? 0.70 : 0.5, narrow ? 0.40 : 0.5); gl.uniform2f(u.P, ptr[0], ptr[1]);
      gl.uniform3fv(u.D, inks.dark); gl.uniform3fv(u.M, inks.mid); gl.uniform3fv(u.L, inks.light);
      gl.uniform1f(u.A, ptrAmt); gl.uniform1f(u.t, (performance.now() - t0) / 1000); gl.uniform1i(u.T, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    function frame() {
      raf = 0;
      ptrAmt += (ptrTarget - ptrAmt) * 0.06;
      if (video.readyState >= 2 && video.currentTime !== lastVT) { upload(video); lastVT = video.currentTime; }
      draw();
      if (visible && (!video.paused || Math.abs(ptrTarget - ptrAmt) > 0.002 || ptrAmt > 0.002)) loop();
    }
    function loop() { if (gl && !raf) raf = requestAnimationFrame(frame); }
    if (gl) {
      const first = () => { if (!texReady) { upload(poster); size(); draw(); } };
      if (poster.complete && poster.naturalWidth) first(); else poster.addEventListener('load', first, { once: true });
      video.addEventListener('playing', loop);
      new ResizeObserver(() => { size(); draw(); }).observe(canvas);
      if (!RM.matches) {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          ptr = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; ptrTarget = 1; loop();
        });
        el.addEventListener('pointerleave', () => { ptrTarget = 0; loop(); });
      }
    }
    new IntersectionObserver(([en]) => { visible = en.intersectionRatio > 0.12; sync(); }, { threshold: [0, 0.12, 0.5] }).observe(el);
    return { draw: () => { draw(); }, start: sync };
  }

  /* ── masthead fits the cover width exactly ── */
  function fitMasthead() {
    const m = $('.masthead'); if (!m) return;
    const box = m.parentElement.getBoundingClientRect(), cs = getComputedStyle(m.parentElement);
    const avail = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    m.style.fontSize = ''; const base = parseFloat(getComputedStyle(m).fontSize);
    const w = m.scrollWidth || m.getBoundingClientRect().width;
    if (w > 0) m.style.fontSize = (base * avail / w * 0.995).toFixed(2) + 'px';
  }

  /* ── contents: hover/focus a story to swap the plate ── */
  function initToc() {
    const imgs = $$('.thumb img[data-k]');
    $$('.toc a').forEach(a => {
      const show = () => imgs.forEach(i => i.classList.toggle('on', i.dataset.k === a.dataset.thumb));
      a.addEventListener('pointerenter', show); a.addEventListener('focus', show);
    });
  }

  /* ── marquee band (velocity aware), pausable ── */
  let marquee = null, bandPaused = false;
  function initBand() {
    const btn = $('#bandBtn'), track = $('.band__track');
    const set = () => { btn.dataset.state = bandPaused ? 'paused' : 'playing'; $('.lab', btn).textContent = bandPaused ? 'Play ticker' : 'Pause ticker'; btn.setAttribute('aria-pressed', String(bandPaused)); };
    btn.addEventListener('click', () => { bandPaused = !bandPaused; set(); if (marquee) marquee.paused(bandPaused); });
    set();
    if (!hasGsap || RM.matches) return;
    marquee = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
    new IntersectionObserver(([en]) => { if (!bandPaused) marquee.paused(!en.isIntersecting); }).observe(track.parentElement);
  }

  /* ── coupon ── */
  function initCoupon() {
    const f = $('#order'), out = $('#result'), stamp = $('.coupon__stamp');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const plan = f.plan.value, grind = f.grind.value;
      out.textContent = `Noted: ${plan.toLowerCase()}, ${grind}. This is a demo issue, so nothing is ordered or charged. In a real one, your first bag would be roasted on Monday 12 October and ship by Wednesday 14 October.`;
      stamp.classList.add('is-on');
      if (hasGsap && !RM.matches) gsap.fromTo(stamp, { scale: 1.9, rotate: -50, opacity: 0 }, { scale: 1, rotate: -16, opacity: 1, duration: .5, ease: 'back.out(2.4)' });
    });
  }

  /* ── scroll velocity, shared by kinetic type and marquee ── */
  let vel = 0, vS = 0, lastY = scrollY, lastT = performance.now(), dir = 1;
  function tickVelocity() {
    const now = performance.now(), dt = Math.max(1, now - lastT), y = scrollY;
    const v = (y - lastY) / dt * 1000; lastY = y; lastT = now;
    vel += (v - vel) * 0.25;
    if (Math.abs(v) > 30) dir = v > 0 ? 1 : -1;
    const target = clamp(Math.abs(vel) / 2400, 0, 1);
    vS += (target - vS) * (target > vS ? 0.2 : 0.06);
    if (marquee && !bandPaused) marquee.timeScale(dir * (1 + vS * 5));
  }

  /* ── kinetic brew words: wdth/wght driven by velocity + entry ── */
  const words = $$('.m-word').map(w => ({ el: w, wd: +w.dataset.wd, wt: +w.dataset.wt, to: +w.dataset.to, last: -1 }));
  let brewEntry = 1, brewActive = false;
  // on phones the words must stay inside the page: find the widest wdth each word can take
  function fitWords() {
    const narrow = innerWidth < 900;
    words.forEach(w => {
      w.max = 150; w.last = -1;
      if (!narrow) return;
      const avail = w.el.parentElement.getBoundingClientRect().width;
      const measure = wd => { w.el.style.setProperty('--wd', wd); return w.el.scrollWidth || w.el.getBoundingClientRect().width; };
      const a = measure(50), b = measure(150);
      w.max = clamp(50 + 100 * (avail - a) / Math.max(1, b - a), 50, 150);
      w.el.style.setProperty('--wd', Math.min(w.wd, w.max));
    });
  }
  function tickWords() {
    if (!brewActive || RM.matches) return;
    const mix = clamp(Math.max(1 - brewEntry, vS), 0, 1);
    words.forEach((w, i) => {
      const k = Math.round(mix * 100) / 100;
      if (k === w.last) return; w.last = k;
      w.el.style.setProperty('--wd', Math.min(w.max || 150, w.wd + (w.to - w.wd) * k).toFixed(1));
      w.el.style.setProperty('--wt', (w.wt + ((i % 2 ? 900 : 200) - w.wt) * k * 0.7).toFixed(0));
    });
  }

  /* ── navigation helpers ── */
  let lenis = null, hTween = null, hST = null, navigating = false, navTimer = 0;
  const step = () => innerWidth / 2;
  const maxX = () => { const t = $('#track'); return Math.max(0, t.scrollWidth - innerWidth); };
  function trackOffset(el) {
    const t = $('#track'); const tr = t.getBoundingClientRect(), r = el.getBoundingClientRect();
    return r.left - tr.left;
  }
  function goX(x, dur = 1.1) {
    if (!hST) return;
    x = clamp(Math.round(x / step()) * step(), 0, maxX());
    if (lenis && Math.abs(lenis.targetScroll - (hST.start + x)) < 2 && lenis.isScrolling) return;
    const y = hST.start + x;
    navigating = true; clearTimeout(navTimer);
    const done = () => { navigating = false; };
    navTimer = setTimeout(done, dur * 1000 + 600);   // safety net if the scroll is interrupted
    if (lenis) lenis.scrollTo(y, { duration: dur, easing: t => 1 - Math.pow(1 - t, 3), onComplete: done }); else { scrollTo(0, y); done(); }
  }
  function currentX() { return hST ? clamp(scrollY - hST.start, 0, maxX()) : 0; }
  function initNav() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const target = document.getElementById(a.getAttribute('href').slice(1)); if (!target) return;
      e.preventDefault();
      if (hST) goX(trackOffset(target));
      else target.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.replaceState(null, '', '#' + target.id);
    });
    document.addEventListener('keydown', e => {
      if (!hST || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goX(currentX() + step(), .8); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goX(currentX() - step(), .8); }
    });
    // keep keyboard focus visible: bring its page into view on the horizontal track
    document.addEventListener('focusin', e => {
      if (!hST || navigating || !e.target.closest('#track')) return;
      const r = e.target.getBoundingClientRect();
      if (r.left >= 0 && r.right <= innerWidth) return;
      goX(Math.floor(trackOffset(e.target) / step() + 0.01) * step(), .5);
    });
  }
  const scrubLinks = $$('.scrub a');
  const spreads = $$('#track > .spread');
  function updateScrub(p) {
    $('.scrub__bar').style.setProperty('--p', p.toFixed(4));
    const mid = currentX() + innerWidth / 2;
    let idx = 0; spreads.forEach((s, i) => { if (s.offsetLeft <= mid) idx = i; });
    scrubLinks.forEach((a, i) => (i === idx ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }

  /* ── animations ── */
  function splitReveal(el, st) {
    const split = SplitText.create(el, { type: 'lines,chars', mask: 'lines', linesClass: 'ln' });
    return gsap.from(split.chars, { yPercent: 108, duration: .8, ease: 'expo.out', stagger: { each: .018 }, scrollTrigger: st });
  }
  function registration(el, st) {
    gsap.fromTo(el, { '--rx': '.16em', '--ry': '.1em' }, { '--rx': '.04em', '--ry': '.026em', ease: 'none', scrollTrigger: st });
  }
  function introCover() {
    const m = $('.masthead');
    const split = SplitText.create(m, { type: 'chars', charsClass: 'ch' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(split.chars, { yPercent: 70, opacity: 0, duration: .7, stagger: .04 })
      .from('.cover-lines li', { clipPath: 'inset(0 100% 0 0)', duration: .55, stagger: .08, ease: 'power3.inOut' }, .15)
      .from('.cover__stamp', { scale: 1.8, rotate: -60, opacity: 0, duration: .45, ease: 'back.out(2.2)' }, .5);
    tl.add(() => gsap.set('.cover-lines li', { clearProps: 'clipPath' }));
  }

  function horizontal(ctx) {
    root.classList.add('is-h');
    const track = $('#track');
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.4 });
    const raf = t => lenis.raf(t * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);

    hTween = gsap.to(track, { x: () => -maxX(), ease: 'none' });
    hST = ScrollTrigger.create({ trigger: '#issue', pin: true, start: 'top top', end: () => '+=' + maxX(), animation: hTween, scrub: true, invalidateOnRefresh: true, onUpdate: s => updateScrub(s.progress) });
    const C = { containerAnimation: hTween };

    // settle on page boundaries after scrolling stops: two pages always face you
    let snapTimer = 0;
    lenis.on('scroll', () => { clearTimeout(snapTimer); snapTimer = setTimeout(() => {
      if (!hST || navigating || (lenis && lenis.isScrolling) || scrollY < hST.start - 2 || scrollY > hST.end + 2) return;
      const x = currentX(), target = clamp(Math.round(x / step()) * step(), 0, maxX());
      if (Math.abs(target - x) > 3) lenis.scrollTo(hST.start + target, { duration: .7, easing: t => 1 - Math.pow(1 - t, 3) });
    }, 160); });

    // cover: the film drifts and the masthead lags behind as you turn
    gsap.to('.masthead', { xPercent: 14, ease: 'none', scrollTrigger: { trigger: '#cover', ...C, start: 'left left', end: 'right left', scrub: true } });
    gsap.to('.cover__media', { scale: 1.12, xPercent: 6, ease: 'none', scrollTrigger: { trigger: '#cover', ...C, start: 'left left', end: 'right left', scrub: true } });
    gsap.to('.cover__stamp', { rotate: 40, ease: 'none', scrollTrigger: { trigger: '#cover', ...C, start: 'left left', end: 'right left', scrub: true } });

    // contents rows roll in like ink off a press roller
    gsap.from('.toc li', { clipPath: 'inset(0 100% 0 0)', ease: 'power2.out', stagger: .12, scrollTrigger: { trigger: '#contents', ...C, start: 'left 85%', end: 'left 15%', scrub: true } });
    registration($('.toc-title'), { trigger: '#contents', ...C, start: 'left right', end: 'left 20%', scrub: true });

    // kiambu opener: plate settles, title sets, inks come into register
    gsap.fromTo('.k-open .plate img', { scale: 1.22, xPercent: -6 }, { scale: 1, xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.k-open', ...C, start: 'left right', end: 'left left', scrub: true } });
    gsap.to('.k-open .plate img', { xPercent: 8, ease: 'none', scrollTrigger: { trigger: '.k-open', ...C, start: 'left left', end: 'right left', scrub: true } });
    splitReveal($('#k-h'), { trigger: '.k-open', ...C, start: 'left 55%', toggleActions: 'play none none reverse' });
    registration($('#k-h'), { trigger: '.k-open', ...C, start: 'left 60%', end: 'left left', scrub: true });
    gsap.fromTo('.pull mark', { '--hl': '0%' }, { '--hl': '100%', ease: 'none', scrollTrigger: { trigger: '.k-c', ...C, start: 'left 80%', end: 'left 30%', scrub: true } });
    gsap.from('.k-c__stamp', { scale: 1.7, rotate: -50, opacity: 0, duration: .45, ease: 'back.out(2.2)', scrollTrigger: { trigger: '.k-c', ...C, start: 'left 45%', toggleActions: 'play none none reverse' } });

    // huila photo essay: plates drift at their own depths across the broken grid
    splitReveal($('#h-h'), { trigger: '#huila', ...C, start: 'left 60%', toggleActions: 'play none none reverse' });
    registration($('#h-h'), { trigger: '#huila', ...C, start: 'left right', end: 'left left', scrub: true });
    $$('.huila .fig[data-speed]').forEach(f => {
      const s = +f.dataset.speed;
      gsap.fromTo(f, { x: () => -s * innerWidth }, { x: () => s * innerWidth, ease: 'none', scrollTrigger: { trigger: f, ...C, start: 'left right', end: 'right left', scrub: true, invalidateOnRefresh: true } });
      gsap.fromTo($('img', f), { scale: 1.16, xPercent: 5 }, { scale: 1.16, xPercent: -5, ease: 'none', scrollTrigger: { trigger: f, ...C, start: 'left right', end: 'right left', scrub: true } });
    });
    gsap.fromTo('.f-rake img', { scale: 1.2, xPercent: 7 }, { scale: 1.2, xPercent: -7, ease: 'none', scrollTrigger: { trigger: '.h-d', ...C, start: 'left right', end: 'right right', scrub: true } });
    gsap.fromTo('.ruler', { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '#huila', ...C, start: 'left left', end: 'right right', scrub: true } });
    gsap.from('.h-c__card .stamp', { scale: 1.7, rotate: -60, opacity: 0, duration: .45, ease: 'back.out(2.2)', scrollTrigger: { trigger: '.h-c', ...C, start: 'left 50%', toggleActions: 'play none none reverse' } });

    // brew gatefold: lines slide at different rates; wdth/wght respond to scroll velocity
    registration($('#b-h'), { trigger: '#brew', ...C, start: 'left right', end: 'left 30%', scrub: true });
    $$('.methods li').forEach((li, i) => {
      gsap.fromTo(li, { x: () => (i % 2 ? 1 : -1) * innerWidth * 0.09 }, { x: () => (i % 2 ? -1 : 1) * innerWidth * 0.09, ease: 'none', scrollTrigger: { trigger: '#brew', ...C, start: 'left right', end: 'right left', scrub: true, invalidateOnRefresh: true } });
    });
    ScrollTrigger.create({ trigger: '#brew', ...C, start: 'left right', end: 'right left', onToggle: s => (brewActive = s.isActive) });
    ScrollTrigger.create({ trigger: '#brew', ...C, start: 'left 95%', end: 'left 15%', onUpdate: s => (brewEntry = s.progress), onLeave: () => (brewEntry = 1), onLeaveBack: () => (brewEntry = 0) });

    // back cover: the plans print in, roller-wipe
    gsap.from('.plan', { clipPath: 'inset(0 100% 0 0)', ease: 'power2.out', stagger: .2, scrollTrigger: { trigger: '#subscribe', ...C, start: 'left 80%', end: 'left 10%', scrub: true } });
    gsap.from('.coupon', { rotate: 4, yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#subscribe', ...C, start: 'left right', end: 'left left', scrub: true } });

    return () => {
      root.classList.remove('is-h'); clearTimeout(snapTimer);
      gsap.ticker.remove(raf); lenis.destroy(); lenis = null; hTween = null; hST = null;
      $$('.m-word').forEach(w => w.style.removeProperty('--wd'));
    };
  }

  function vertical() {
    // mobile pages: same motion language, driven by native scroll
    $$('.split-me').forEach(h => splitReveal(h, { trigger: h, start: 'top 80%', toggleActions: 'play none none reverse' }));
    $$('.reg:not(.masthead)').forEach(h => registration(h, { trigger: h, start: 'top bottom', end: 'top 40%', scrub: true }));
    ScrollTrigger.create({ trigger: '.methods', start: 'top bottom', end: 'top 30%', onUpdate: s => (brewEntry = s.progress), onLeave: () => (brewEntry = 1), onLeaveBack: () => (brewEntry = 0) });
    gsap.fromTo('.pull mark', { '--hl': '0%' }, { '--hl': '100%', ease: 'none', scrollTrigger: { trigger: '.pull', start: 'top 85%', end: 'top 45%', scrub: true } });
    $$('.huila .plate img, .k-open .plate img').forEach(img => gsap.fromTo(img, { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: 'none', scrollTrigger: { trigger: img.closest('.page'), start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.fromTo('.ruler', { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: '.h-d', start: 'top 80%', end: 'bottom bottom', scrub: true } });
  }

  /* ── boot ── */
  function boot() {
    tones();
    $$('.m-word').forEach(w => { w.style.setProperty('--wd', w.dataset.wd); w.style.setProperty('--wt', w.dataset.wt); });
    cover = initCover();
    initToc(); initBand(); initCoupon(); initNav();
    document.addEventListener('unclaw:palette', () => requestAnimationFrame(tones));
    if (!hasGsap) { cover.start(); return; }
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      fitMasthead(); fitWords();
      const mm = gsap.matchMedia();
      mm.add(H_QUERY, horizontal);
      mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', vertical);
      mm.add('(prefers-reduced-motion: no-preference)', () => { introCover(); gsap.ticker.add(tickVelocity); gsap.ticker.add(tickWords); brewActive = true; brewEntry = 1;
        return () => { gsap.ticker.remove(tickVelocity); gsap.ticker.remove(tickWords); }; });
      cover.start();
      let rw = innerWidth;
      addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; fitMasthead(); fitWords(); } });
      tones();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  addEventListener('load', () => tones());
})();
