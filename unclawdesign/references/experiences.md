# Experience recipes: how to build each archetype

The roll picks an **experience**: the page's structure and interaction model, separate from its look. This file says how to build each one well (Part A) and gives short, tested code for the moves they share (Part B). Facts, versions and examples come from the Oct 2026 research notes (`research-creative-web.md`) and the six Tidewater reference builds. Motion, accessibility, video and image rules live in `motion-and-media.md`. Read that before shipping anything that moves.

**Reference builds** (same brief, the fictional roastery "Tidewater"), served from the showcase site at `x/<slug>/`: `journey` (parallax scrollytelling), `roast` (scroll-scrubbed sequence), `playground` (physics), `os` (OS desktop), `crema` (WebGL liquid), `issue` (horizontal magazine). When an archetype has one, open its source before you start. Each was built with every rule below, including the reduced-motion version.

## Contents
- [Rules for every archetype](#rules-for-every-archetype)
- **Part A. Archetypes:** [landing-classic](#landing-classic) · [parallax-scrollytelling](#parallax-scrollytelling) · [scroll-scrubbed-sequence](#scroll-scrubbed-sequence) · [physics-playground](#physics-playground) · [os-desktop](#os-desktop) · [webgl-liquid](#webgl-liquid) · [horizontal-magazine](#horizontal-magazine) · [scroll-3d-world](#scroll-3d-world) · [explorable-3d-scene](#explorable-3d-scene) · [playable-game](#playable-game) · [infinite-canvas](#infinite-canvas) · [scroll-comic](#scroll-comic) · [generative-data](#generative-data) · [audio-reactive](#audio-reactive) · [cursor-instrument](#cursor-instrument) · [configurator](#configurator) · [chat-terminal](#chat-terminal) · [fictional-campaign](#fictional-campaign) · [digital-archive](#digital-archive) · [kinetic-poster](#kinetic-poster)
- **Part B. Shared recipes:** [B0 Loading libraries](#b0-loading-libraries) · [B1 Pinned chapter timeline](#b1-gsap-scrolltrigger-pin--scrub-chapter-timeline) · [B2 Horizontal track](#b2-horizontal-track-with-containeranimation) · [B3 Lenis](#b3-lenis--scrolltrigger-and-when-to-skip-lenis) · [B4 CSS scroll-driven](#b4-css-scroll-driven-animation-with-a-fallback) · [B5 Image sequence](#b5-canvas-image-sequence-scrubbing) · [B6 Matter.js ↔ DOM](#b6-matterjs-bodies-synced-to-dom-elements) · [B7 Windows](#b7-accessible-draggable-windows) · [B8 Token shader](#b8-full-screen-fragment-shader-with-token-uniforms) · [B9 View Transitions](#b9-view-transitions) · [B10 Font axes](#b10-variable-font-axes-via-registered-custom-properties) · [B11 SplitText](#b11-splittext-with-a-reduced-motion-guard)

## Rules for every archetype
1. **HTML first.** Headline, copy, links and the action are server-rendered DOM. Canvas, WebGL and video only enhance. The LCP is HTML text or a poster image, never a canvas frame or a preloader.
2. **Two versions are designed, not one.** The motion version and the reduced-motion version are both composed layouts. The reduced version is a page in its own right, not the motion version frozen mid-way.
3. **One motion language.** Durations and easings come from the motion tokens (`--dur-*`, `--ease`). There is one orchestrated entrance (≤ 900 ms); everything else answers the user or the scroll.
4. **Every colour is a token.** SVG fills use `var(--c-*)`; canvas and WebGL read tokens at runtime and re-read them on `unclaw:palette` (B8). The palette customiser must recolour the whole experience live.
5. **An escape route at all times.** A skip link to the action, visible chapter or index navigation, and a pause control for anything that moves by itself for more than 5 s (WCAG 2.2.2).
6. **Budgets before effects.** Pick the experience's `perf_budget` from `data/experiences.json` and design inside it.
7. **Layers, not archetypes:** sound (opt-in), light shared presence (counters, moderated notes; never shared physics) and an assistant can sit on top of any archetype. Add at most one, and only when the subject calls for it.

---

# Part A. Archetypes

### landing-classic
- **Structure:** a hero that answers what, why and next; proof; how it works; objections; the offer; FAQ; closing action. Vary section grounds and sizes. Don't repeat the same card block.
- **What matters:** (1) the genome's motif at 3–5 scales, which is all the signature this archetype gets; (2) a real product image or UI in the hero, cropped tight; (3) CSS-only motion: B4 reveals plus View Transitions (B9) for tabs and plan toggles.
- **Pitfalls:** the anti-patterns catalogue in full (pill badge, three icon cards, stats strip, fade-up on every section). This archetype is exactly what the client called "a typical landing page", so the genome has to carry the identity.
- **Mobile:** design the 390 px hero first. **Reduced motion:** reveals become instant and hover lifts become colour changes.

### parallax-scrollytelling
- **Structure:** opening tableau, then 4–7 pinned chapters with normal-scroll breathers between them, the turn, the action. Showcase: `x/journey/`.
- **What matters:** (1) one GSAP timeline per chapter, pinned and scrubbed (B1); (2) 8–10 SVG layers whose travel scales with depth: far layers move ~5%, near ones 40–85%, and the near ridge rises to become the next chapter's ground; (3) one object carried through every chapter. Draw paths (routes, steam) with DrawSVG; move objects with MotionPath.
- **Pitfalls:** important text inside a pin (NN/g: the worst case for scroll-jacking); pins longer than ~1.7 viewport heights; no way out. Add a chapter trail with `aria-current="step"` and a skip link to the action. Ambient video plays only while visible and has a pause button.
- **Mobile:** separate portrait artboards (`.pick-wide` / `.pick-tall`), pins ~60% as long via `gsap.matchMedia()`, touch scroll left native. **Reduced motion:** no pins at all. Each chapter's end state is a still with its caption, and the trail still navigates.

### scroll-scrubbed-sequence
- **Structure:** static hero (poster frame = LCP); a sticky stage 3–6 viewports tall with phase beats; specs; action. Showcase: `x/roast/`.
- **What matters:** (1) canvas image sequence with progressive loading and drawing only when the index changes (B5); (2) the overlay is driven by the subject's data (the roast curve the bean rides), not decoration; (3) a hand-off: the object flies to a slot in the next section and an `<img>` takes over.
- **Encoding choice:** image sequence (robust everywhere, many requests) vs all-intra video (`-g 1`, one file, 4–8× a normal encode, fails in iOS Low Power Mode) vs WebCodecs (smoothest, more code, needs a sliding frame window). Default to the image sequence for art-directed objects.
- **Pitfalls:** 1080p frames held decoded (w × h × 4 bytes each); an action buried under the stage; the bean "just spinning". **Mobile:** half-size frames, every other one. **Reduced motion:** 4–6 key frames as `<img>` with their beat text, plus the full chart as one SVG.

### physics-playground
- **Structure:** the toy as hero (the headline falls in as bodies and settles readable); a goal with a payoff; a row of real buttons (drop, restack, pause, tilt); calm content below. Showcase: `x/playground/`.
- **What matters:** (1) DOM text as bodies, synced by transform (B6); small things on one sprite canvas; (2) a fixed-step loop that stops when everything sleeps and when the stage is off-screen; (3) a reward that teaches the product (15 beans fill the grinder → a recipe opens).
- **Pitfalls:** Matter's `MouseConstraint` listens to wheel events and can block page scroll, so write your own pointer constraint. Claiming every touch kills page scroll on phones: call `preventDefault` only when the touch lands on a body. Words must settle into a line people can read.
- **Mobile:** about half the body count and a larger touch hit radius; tilt-as-gravity behind a button (iOS asks permission on click). **Reduced motion:** one composed still at the settled positions, and the reward behind a plain button.

### os-desktop
- **Structure:** a short skippable boot; desktop, menubar and icons; a Welcome window open by default; apps as content types; Trash, Control Panel and a screensaver; a phone home-screen shell. Showcase: `x/os/`.
- **What matters:** (1) windows that work as dialogs, by keyboard too (B7); (2) a menubar with real menu semantics (`role="menu"`, roving tabindex, arrows, Escape); (3) apps that only make sense here (a Trash you restore from, a brew calculator).
- **Pitfalls:** novelty risk is high (Framer sells RetroOS and PixelOS), so the apps must be the client's own tools. Content hidden in client-only apps hurts SEO, so keep every window's content in the HTML. Sound stays off by default.
- **Mobile:** a home screen with an app grid and a dock; apps open as full-screen sheets; `history.pushState` makes Back close them. **Reduced motion:** windows open instantly; no wallpaper parallax; a still screensaver.

### webgl-liquid
- **Structure:** the material at rest with type inside it; stirring by pointer or touch; content panels on scrims; page choices feed the simulation; the action. Showcase: `x/crema/`.
- **What matters:** (1) WebGL2 stable fluids with ping-pong targets: advect → curl/vorticity → divergence → Jacobi pressure → gradient subtract. Velocity runs at low resolution (112–144 px), dye at 640–1152; (2) display words drawn into a texture atlas from the DOM glyph rects, while the DOM text stays in place for SEO and screen readers; (3) token colours as uniforms, re-read on `unclaw:palette` (B8).
- **Pitfalls:** fill rate. Cap DPR at 1.5; Jacobi iterations are the cost dial (20 desktop, 10 phone, 6 software rendering); step DPR down when the frame-time average stays above ~26 ms. Shadertoy code is usually CC BY-NC-SA, so rewrite techniques rather than port them.
- **Mobile:** small tier, splats only inside the stage, controls in the thumb zone. **Reduced motion and no WebGL:** still images captured from the simulation itself (seeded random, capture mode), with the same type and scrims. On `webglcontextlost`, switch to the stills.

### horizontal-magazine
- **Structure:** cover; contents; 2–4 feature spreads; a gatefold; back cover with the offer; colophon. Showcase: `x/issue/`.
- **What matters:** (1) a pinned track plus `containerAnimation` for per-spread motion (B2); (2) print logic in CSS: misregistered second ink (`::before` copy in `--ink2`, `mix-blend-mode: multiply`, or `screen` on dark grounds), folios, crop marks; (3) a settle to page boundaries after scrolling stops (debounce ~160 ms, then `lenis.scrollTo`).
- **Pitfalls:** NN/g finds horizontal scrolling poorly discovered and costly, so contents links, arrow keys and a progress ruler are mandatory. No long reading text on the moving track. Font-axis animation reflows text, so keep it to a few words.
- **Mobile:** vertical scroll-snap pages, no pin; fit each display word by measuring it at wdth 50 and 150. **Reduced motion:** spreads stacked as one long page, no velocity type, the cover video behind a play button.

### scroll-3d-world
- **Structure:** an arrival shot (HTML headline over a poster; the canvas fades in after LCP); 4–6 stations on a camera spline; a portal between acts; one interactive station; exit into normal HTML.
- **What matters:** (1) `CatmullRomCurve3.getPointAt(progress)` for the position and a second curve for the look-at target, with progress from ScrollTrigger (scrub ≈ 1) or Lenis; (2) an asset pipeline of Blender → glTF → `gltf-transform optimize` (meshopt, KTX2, ≤ 2048 px), baked lighting, instancing, ≤ ~3 dynamic lights; (3) quality tiers: `detect-gpu` (its data stopped updating in Dec 2025) plus a live frame-time monitor that steps DPR.
- **Pitfalls:** text only in WebGL; shader compilation on first scroll (pre-compile while loading); continuous rendering when off-screen. Under reduced motion, fly-throughs are removed outright.
- **Mobile:** low preset (no post-processing, smaller shadows, DPR 1–1.5); tier-0 GPUs get the poster story. **Reduced motion:** a still frame per station next to its DOM card.

### explorable-3d-scene
- **Structure:** the scene at rest plus a "list view" toggle; objects are sections; selecting one moves the camera and opens a DOM panel; each object has a URL.
- **What matters:** (1) raycast against invisible low-poly proxies, never against render meshes; (2) DOM buttons positioned over the objects, used for focus, labels and screen readers; (3) GSAP tweens between saved camera poses, rendering on demand when nothing moves.
- **Pitfalls:** free orbit on phones; no list view; camera flights under reduced motion. **Mobile:** fixed poses, 44 px DOM targets, list view as the default below 600 px. **Reduced motion:** cuts instead of flights.

### playable-game
- **Structure:** a title screen with the controls and "skip to content"; one-verb tutorial; a world with 4–8 content points; light goals; the pause menu is the site menu; an HTML index.
- **What matters:** (1) a fixed-timestep loop and one input layer (keys, touch stick, gamepad); (2) Rapier physics with colliders authored by Blender object names (Bruno Simon's method), its ~1.4 MB WASM loaded after the title screen; (3) multiplayer only as light presence (counters, moderated notes). Shared physics is costly and easy to disrupt.
- **Pitfalls:** no keyboard path; flashes from impacts (WCAG 2.3.1); audio on by default; no lite mode. **Mobile:** touch controls designed, not ported; low preset. **Reduced motion:** fixed camera, no shake, the index as the entry.

### infinite-canvas
- **Structure:** a canvas or loop with a one-line intro; drag or scroll; a tile opens its detail; a canvas ↔ index toggle; about in a corner.
- **What matters:** (1) virtualise: render only the wrapped window, `offset = ((x % period) + period) % period`; (2) drag with inertia via GSAP Draggable + InertiaPlugin, or Observer for wheel and touch intent, with arrow keys panning too; (3) tile → detail as a shared-element View Transition (B9).
- **Pitfalls:** novelty is high (sold as Framer components); infinite wrap gives no sense of completion; once the page runs its own scrolling it loses the user-agent exemption in WCAG 2.5.7, so it needs buttons and an index view. **Mobile:** vertical native scroll through a two-column loop. **Reduced motion:** a static grid with native scrolling and crossfades.

### scroll-comic
- **Structure:** a title page; full-bleed chapter openers; panel sequences; inserts (a map that draws, a chart that builds, a muted clip); credits and sources; action.
- **What matters:** (1) `scroll-snap-type: y proximity` scoped to the story section; never `mandatory` on phones; (2) speech and captions as DOM text positioned over the art, so they translate, scale and reach screen readers; (3) panel reveals with B4, and clips and maps played and paused by IntersectionObserver or ScrollTrigger `toggleActions`.
- **Pitfalls:** text baked into images; no chapter index; clips without captions (1.2.2). **Mobile:** one panel per screen, captions above the art. **Reduced motion:** panels appear in place, clips are click-to-play, maps render complete.

### generative-data
- **Structure:** the generated piece with a one-line reading guide; a key; controls mirrored in the URL; 3–5 annotated findings; method and sources; action.
- **What matters:** (1) a seeded PRNG from a URL parameter, so every version can be shared and rebuilt; (2) SVG up to roughly a thousand marks, canvas or PixiJS v8 beyond; precompute layouts in Python; (3) a text alternative that states the finding, plus a data table.
- **Pitfalls:** hue-only encodings (1.4.1); nondeterministic model output (cache it); motion that hides the data. **Mobile:** fewer, larger marks; annotations as a stepper. **Reduced motion:** instant redraws.

### audio-reactive
- **Structure:** a silent hero that already works; a clear "Turn sound on"; the track drives one or two bands; scored interactions; release or tour action.
- **What matters:** (1) create or resume the `AudioContext` inside the click handler (autoplay policy); `AnalyserNode.getByteFrequencyData()` once per frame in the shared loop; (2) smooth each band (`v += (raw - v) * 0.15`) and map one band to one parameter so cause and effect read; (3) a designed silent mode, driven by noise or scroll.
- **Pitfalls:** beat-synced flashes above 3 per second (2.3.1); audio that starts by itself (1.4.2); downloading the track before opt-in. **Mobile:** `fftSize` 256, lighter visual, pause when hidden. **Reduced motion:** colour and opacity response only.

### cursor-instrument
- **Structure:** a quiet stage; the reveal (light, loupe, x-ray, expanding type); 3–6 focusable hotspots; a calm section; action.
- **What matters:** (1) write `--mx`/`--my` from one pointer listener and use them in `radial-gradient` lighting or `clip-path: circle(… at var(--mx) var(--my))`; (2) `gsap.quickTo()` for any follow motion, gated by `(hover: hover) and (pointer: fine)`; (3) hotspots trigger the same reveal on focus and on tap.
- **Pitfalls:** hiding the native cursor; reading layout in `pointermove` (cache rects on `pointerenter` and resize); hover-only content (1.4.13). **Mobile:** tap-and-hold or a toggle reveals at the tapped point. **Reduced motion:** the reveal jumps to place, with no lag.

### configurator
- **Structure:** default product, price and "start"; 3–6 option groups; live preview and running price; summary with share link; checkout; specs.
- **What matters:** (1) one state object, then the URL (`?size=…&finish=…`), then the preview, so every configuration can be shared and indexed; (2) a cheap preview first: layered transparent WebP per option, 3D only if rotation sells the product; (3) INP: option handlers under 50 ms, preloading only the next likely option.
- **Pitfalls:** custom widgets instead of fieldsets and radios; drag-only rotation (2.5.7); unexplained disabled options. **Mobile:** sticky preview (≤ 45% of height), option chips, a sticky price bar that never covers focus. **Reduced motion:** swaps as crossfades of at most 200 ms.

### chat-terminal
- **Structure:** a prompt with visible suggestions; answers as rich cards; help or index; an HTML mirror of all content; contact as a command and a button.
- **What matters:** (1) a labelled `<input>` and output in `role="log"` (`aria-live="polite"`); (2) commands answered from a fixed content set, with any model only behind retrieval over that set; (3) typewriter output that a key or click skips, and that is instant under reduced motion.
- **Pitfalls:** the blank prompt (users don't know what to ask); content crawlers can't see; invented facts. Novelty is high (Chatfolio and CLIfolio templates). **Mobile:** suggestion chips above the keyboard. **Reduced motion:** instant output, no blinking cursor.

### fictional-campaign
- **Structure:** a launch pastiche (hero film or render, feature reveal, founder note, obviously fictional proof), then the real payload and a press kit.
- **What matters:** (1) reuse the scroll-scrubbed-sequence or scroll-3d-world recipe at full craft; (2) deadpan copy that follows launch conventions exactly; (3) a disclosure on the page. In the EU, realistic AI-made people or places need a notice (AI Act Art. 50, applies from 2 Aug 2026).
- **Pitfalls:** imitating a real person, brand or record (don't); a joke that needs explaining; anything a visitor could actually buy by mistake. **Mobile and reduced motion:** as the borrowed archetype; the punchline stays in the first screen.

### digital-archive
- **Structure:** the list as hero; filters, search and sort in the URL; list ↔ grid ↔ timeline; consistent item pages; compact about.
- **What matters:** (1) a server-rendered list with filters as progressive enhancement over query parameters; (2) view switches that morph items (same-document View Transitions with `view-transition-name: match-element`, or GSAP Flip); (3) typographic structure from tabular figures, counts and years.
- **Pitfalls:** hover-only thumbnails (show them on focus too, 1.4.13); single-key shortcuts that fire while typing (2.1.4); losing filter state on Back. **Mobile:** list first with small inline images, filters in a sheet. **Reduced motion:** instant or crossfaded view changes.

### kinetic-poster
- **Structure:** one screen: the message as moving type, small fixed facts, one action; an optional second screen of plain text.
- **What matters:** (1) axis animation through registered custom properties (B10); (2) masked line reveals that settle into a still, legible poster within 1.5 s (B11); (3) at most two marquee bands, with a real pause button (hover-pause doesn't satisfy 2.2.2).
- **Pitfalls:** animating axes on long text (it reflows every frame); `text-wrap: balance` on split text; a non-variable face. **Mobile:** recompose for portrait with a narrower wdth. **Reduced motion:** the final poster frame, static.

---

# Part B. Shared recipes

All sketches assume tokens from `roll.py css` and plain `<script>` tags (no bundler). They were checked against the six builds and the library docs cited in the research. Keep one animation loop per page: `gsap.ticker` when GSAP is present, otherwise one `requestAnimationFrame`.

### B0. Loading libraries
Exact versions, verified against the npm tarballs on 2026-10-11 (jsdelivr serves npm paths). Load only the plugins you use, with `defer`, after the content:
```html
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>          <!-- 28 KB gz -->
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script> <!-- 18 KB gz -->
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js"></script>     <!-- 4 KB gz; also Draggable, InertiaPlugin, DrawSVGPlugin, MotionPathPlugin, Flip, Observer -->
<script defer src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>        <!-- 5 KB gz; plus dist/lenis.css -->
<script defer src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>  <!-- 26 KB gz -->
```
GSAP has been free with all plugins since 3.13 under Webflow's "Standard No-Charge License". It allows commercial and client work. It forbids building a no-code visual animation tool that competes with Webflow; for that, use Motion or Anime.js v4 (both MIT). For three.js use the ES module build (npm `three@0.186.x`, r186) through an import map. Under reduced motion, skip loading heavy libraries at all (`motion-and-media.md` §5).

### B1. GSAP ScrollTrigger pin + scrub chapter timeline
```js
gsap.registerPlugin(ScrollTrigger);
const mm = gsap.matchMedia();
mm.add({ desk: '(min-width: 761px) and (prefers-reduced-motion: no-preference)',
         mob: '(max-width: 760px) and (prefers-reduced-motion: no-preference)' }, (ctx) => {
  const { desk } = ctx.conditions;
  document.querySelectorAll('.chapter').forEach((ch) => {
    const tl = gsap.timeline({ defaults: { ease: 'none', duration: 1 }, scrollTrigger: {
      trigger: ch.querySelector('.stage'), start: 'top top',
      end: () => '+=' + Math.round(innerHeight * (desk ? 1.6 : 1)),   // pin length in viewports
      pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
    const layers = ch.querySelectorAll('.layer');                       // ordered far → near
    tl.to(layers, { yPercent: (i) => -4 - i * 9 }, 0)                   // depth-weighted travel
      .fromTo(ch.querySelector('.caption'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.1);
  });
});   // under reduce neither condition matches: nothing pins, and CSS shows each chapter's end state
document.fonts?.ready.then(() => ScrollTrigger.refresh());              // positions depend on text height
```
Rules: never animate the pinned element itself (animate its children); create triggers top to bottom; a timeline's total duration is normalised to the scroll distance, so place tweens at 0–1 positions. `scrub: true` locks to the scrollbar; a number adds catch-up seconds.

### B2. Horizontal track with containerAnimation
```js
const track = document.querySelector('.track');
const dist = () => Math.max(0, track.scrollWidth - innerWidth);
const hTween = gsap.to(track, { x: () => -dist(), ease: 'none' });         // must be linear
ScrollTrigger.create({ trigger: '.h-wrap', pin: true, start: 'top top', end: () => '+=' + dist(),
                       animation: hTween, scrub: true, invalidateOnRefresh: true });
gsap.utils.toArray('.spread').forEach((sp) => {
  gsap.from(sp.querySelector('h2'), { yPercent: 100, autoAlpha: 0, scrollTrigger: {
    trigger: sp, containerAnimation: hTween, start: 'left 70%', toggleActions: 'play none none reverse' } });
});
// keyboard: map ArrowLeft/Right to the vertical scroll that drives the track (2.1.1)
addEventListener('keydown', (e) => {
  const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d || e.target.closest('input, textarea')) return;
  e.preventDefault(); scrollBy({ top: d * innerWidth / 2 });
});
```
Limits (GSAP docs): triggers that use `containerAnimation` can't pin or snap, and the trigger element must not be animated horizontally by another tween. Wrap the whole block in `mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', …)` so phones and reduced motion get stacked spreads.

### B3. Lenis + ScrollTrigger, and when to skip Lenis
```js
const lenis = new Lenis({ lerp: 0.09, anchors: true });   // touch stays native (syncTouch defaults to false)
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));              // one loop for scroll, triggers and canvas
gsap.ticker.lagSmoothing(0);
```
Lenis (npm `lenis`; `@studio-freight/lenis` is deprecated) keeps native scrolling, so sticky, anchors and assistive tech still work. `respectReducedMotion` defaults to true. Mark modals and inner scrollers `data-lenis-prevent`. Scroll programmatically with `lenis.scrollTo(target, { onComplete })`, then move focus to the target heading.
**Skip Lenis** for content and conversion pages, pages that use CSS scroll-snap (unsupported together), pages with iframes (wheel events stop over them), and under reduced motion (don't even load it). It earns its place when a canvas or WebGL scene must follow scroll exactly, or a storytelling page needs a consistent weighted wheel feel. Lenis is capped at 60 fps on Safari and 30 in low-power mode.

### B4. CSS scroll-driven animation with a fallback
```css
/* base styles ARE the end state; motion is layered on only where it is supported and wanted */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 35%; }
    .layer  { animation: drift linear both; animation-timeline: view(); }
    .progress { animation: grow linear both; animation-timeline: scroll(root); transform-origin: 0 50%; }
  }
}
@keyframes reveal { from { opacity: 0; translate: 0 2rem; } }
@keyframes drift  { from { translate: 0 calc(var(--depth, 1) * -40px); } to { translate: 0 calc(var(--depth, 1) * 40px); } }
@keyframes grow   { from { scale: 0 1; } }
```
Support (MDN BCD, Oct 2026): Chrome/Edge 115+, Safari 26+; Firefox only in preview builds, where users see the static end state. Pitfalls: the `animation` shorthand resets `animation-timeline`, so declare the timeline after it. An ancestor with `overflow: hidden` becomes the scroller; use `overflow: clip`. Ranges come from the untransformed box. Without `animation-range`, the element animates for its entire time on screen. For pure "play once on enter", use IntersectionObserver; Chrome's `animation-trigger` (146+) is Chrome-only.

### B5. Canvas image-sequence scrubbing
Frames `media/d/f000.webp…f139.webp` (1200 px) and `media/m/f000.webp…f070.webp` (640 px, every other frame). Markup: `<section id="seq" style="height:400vh"><div class="stage" style="position:sticky;top:0;height:100svh"><canvas class="seq" aria-hidden="true"></canvas></div></section>`.
```js
const canvas = document.querySelector('canvas.seq'), ctx = canvas.getContext('2d');
const SET = matchMedia('(max-width: 759px)').matches ? { n: 71, dir: 'media/m/' } : { n: 140, dir: 'media/d/' };
const imgs = new Array(SET.n), asked = new Uint8Array(SET.n);
const order = [...new Set([0, SET.n - 1, ...[32, 16, 8, 4, 2, 1].flatMap((s) =>
  Array.from({ length: Math.ceil(SET.n / s) }, (_, k) => k * s))])];          // coarse → fine
let want = 0, next = 0, active = 0, drawn = -1, W = 0, H = 0, target = 0, cur = 0;
function load(i) {
  asked[i] = 1; active++;
  const im = new Image(); im.decoding = 'async';
  im.src = `${SET.dir}f${String(i).padStart(3, '0')}.webp`;
  im.decode().then(() => { imgs[i] = im; drawn = -1; }, () => {})   // a failed frame is skipped, never retried in a loop
    .finally(() => { active--; pump(); });
}
function pump() {                                    // what the reader needs now wins, then fill in
  while (active < 6) {
    let i = asked[want] ? -1 : want;
    while (i < 0 && next < order.length) { if (!asked[order[next]]) i = order[next]; next++; }
    if (i < 0) return; load(i);
  }
}
function nearest(i) { for (let d = 0; d < SET.n; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; } return -1; }
function size() {                                    // measure on resize only, never per frame
  const dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawn = -1;
}
ScrollTrigger.create({ trigger: '#seq', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { target = s.progress; } });
gsap.ticker.add(() => {
  cur += (target - cur) * 0.16;                     // smooth the progress, never the scroll
  want = Math.round(cur * (SET.n - 1)); if (!asked[want]) pump();
  const j = nearest(want); if (j < 0 || j === drawn) return;
  const s = Math.min(W, H) * 0.8;                   // square frames, centred
  ctx.clearRect(0, 0, W, H); ctx.drawImage(imgs[j], (W - s) / 2, (H - s) / 2, s, s); drawn = j;
});
addEventListener('resize', size); size(); pump();
```
Put the beats beside the stage as real text and announce phase changes through a polite live region, debounced. Under reduced motion, don't run this at all: render the stepped `<img>` sequence.

### B6. Matter.js bodies synced to DOM elements
Markup: `.stage { position: relative; overflow: clip }` containing `<h1>` whose words are `<span class="w">` (`position: absolute; left: 0; top: 0`). The text stays one `h1` in reading order.
```js
const { Engine, Bodies, Composite, Constraint, Query, Sleeping } = Matter;
const stage = document.querySelector('.stage'), els = [...stage.querySelectorAll('.w')];
const engine = Engine.create({ enableSleeping: true }), STEP = 1000 / 60;
const W = stage.clientWidth, H = stage.clientHeight, wall = { isStatic: true };
Composite.add(engine.world, [Bodies.rectangle(W / 2, H + 50, W * 2, 100, wall),
  Bodies.rectangle(-50, H / 2, 100, H * 3, wall), Bodies.rectangle(W + 50, H / 2, 100, H * 3, wall)]);
const bodies = els.map((el, i) => {
  const w = el.offsetWidth, h = el.offsetHeight;
  const b = Bodies.rectangle(w / 2 + Math.random() * (W - w), -h * (i + 1), w, h,
    { restitution: 0.25, friction: 0.6, chamfer: { radius: Math.min(8, h / 4) } });
  b.plugin = { el, w, h }; return b;
});
Composite.add(engine.world, bodies);
let raf = 0, last = 0, acc = 0, quiet = 0, visible = true, drag = null;
function frame(t) {
  raf = 0; if (!visible || document.hidden) return;
  acc += last ? Math.min(t - last, 50) : STEP; last = t;
  for (let n = 0; acc >= STEP && n < 3; n++) { Engine.update(engine, STEP); acc -= STEP; }
  for (const b of bodies) {                          // write transforms only for moving bodies
    const p = b.plugin; if (b.isSleeping && p.done) continue;
    p.el.style.transform = `translate(${b.position.x - p.w / 2}px,${b.position.y - p.h / 2}px) rotate(${b.angle}rad)`;
    p.done = b.isSleeping;
  }
  quiet = drag || bodies.some((b) => !b.isSleeping) ? 0 : quiet + 1;
  if (quiet < 20) raf = requestAnimationFrame(frame);  // stop when everything sleeps
}
function kick() { quiet = 0; if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
// own pointer constraint: Matter's MouseConstraint listens to wheel and can block page scroll
const pt = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
stage.addEventListener('pointerdown', (e) => {
  const p = pt(e), b = Query.point(bodies, p)[0]; if (!b) return;   // touches elsewhere keep scrolling the page
  e.preventDefault(); stage.setPointerCapture(e.pointerId); Sleeping.set(b, false);   // sleeping bodies ignore constraints
  drag = Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: 0.1, length: 0 });
  Composite.add(engine.world, drag); kick();
});
stage.addEventListener('touchstart', (e) => {        // claim a touch only when it lands on a body
  if (Query.point(bodies, pt(e.touches[0])).length) e.preventDefault(); }, { passive: false });
stage.addEventListener('pointermove', (e) => { if (drag) { drag.pointA = pt(e); Sleeping.set(drag.bodyB, false); kick(); } });
const drop = () => { if (drag) { Composite.remove(engine.world, drag); drag = null; kick(); } };
stage.addEventListener('pointerup', drop); stage.addEventListener('pointercancel', drop);
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(stage);
document.addEventListener('visibilitychange', kick);
kick();
```
Pair it with real buttons ("Restack", "Pause") for 2.5.7 and 2.2.2. For many small things, draw them on one canvas from sprites coloured by tokens, and rebuild the sprites on `unclaw:palette`. Under reduced motion, place the words in their settled layout with CSS and don't create the engine.

### B7. Accessible draggable windows
```html
<button class="icon" data-open="notes">Notes</button>
<section class="win" id="win-notes" role="dialog" aria-labelledby="t-notes" tabindex="-1" hidden>
  <div class="win-bar"><h2 id="t-notes">Notes</h2><button class="wb-close" aria-label="Close Notes"></button></div>
  <div class="win-body">…</div>
  <button class="win-grip" aria-label="Resize Notes with the arrow keys"></button>
</section>
```
```js
let z = 10; const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function openWin(win, opener) { win.hidden = false; win.style.zIndex = ++z; win._opener = opener; win.focus(); }
function closeWin(win) { win.hidden = true; win._opener?.focus(); }    // focus returns to the opener (2.4.3)
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openWin(document.getElementById('win-' + b.dataset.open), b)));
document.querySelectorAll('.win').forEach((win) => {
  const bar = win.querySelector('.win-bar'), place = (x, y) => {
    win.style.left = clamp(x, 0, innerWidth - 120) + 'px'; win.style.top = clamp(y, 0, innerHeight - 40) + 'px'; };
  win.addEventListener('pointerdown', () => { win.style.zIndex = ++z; }, true);
  win.querySelector('.wb-close').addEventListener('click', () => closeWin(win));
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const dx = e.clientX - win.offsetLeft, dy = e.clientY - win.offsetTop;
    bar.setPointerCapture(e.pointerId);
    const move = (ev) => place(ev.clientX - dx, ev.clientY - dy);
    const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  });
  win.addEventListener('keydown', (e) => {          // move without dragging (2.1.1, 2.5.7)
    if (e.key === 'Escape') { e.stopPropagation(); return closeWin(win); }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || e.target !== win) return;              // only when the window itself has focus
    e.preventDefault(); const n = e.shiftKey ? 64 : 16;
    place(win.offsetLeft + d[0] * n, win.offsetTop + d[1] * n);
  });
});
```
Windows are non-modal dialogs (no `aria-modal`). A true alert uses `aria-modal="true"`, traps Tab and closes on Escape. Add a "Window" menu listing open windows, and give the grip the same arrow-key treatment (resize in 16 px steps). On phones, make windows full-screen sheets: `history.pushState({ win: id }, '')` on open, close on `popstate`. Under reduced motion, open and close without zoom effects.

### B8. Full-screen fragment shader with token uniforms
```html
<div class="hero-bg"><img src="poster.webp" alt="" fetchpriority="high"><canvas aria-hidden="true"></canvas></div>
<button class="pause" aria-pressed="false">Pause background</button>
```
```js
const root = document.documentElement, canvas = document.querySelector('.hero-bg canvas'), btn = document.querySelector('.pause');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gl = !reduce && canvas.getContext('webgl2', { antialias: false, alpha: false });
const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
function tok(name) {                                 // any CSS colour (hex, oklch, color-mix) → [r, g, b] in 0..1
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000';
  probe.fillStyle = getComputedStyle(root).getPropertyValue('--c-' + name).trim() || '#000';
  probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
}
if (gl) {
  const src = (type, s) => { const sh = gl.createShader(type); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  const prog = gl.createProgram();
  gl.attachShader(prog, src(gl.VERTEX_SHADER, `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`));
  gl.attachShader(prog, src(gl.FRAGMENT_SHADER, `#version 300 es
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uBg, uInk, uAccent; out vec4 o;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.02; a *= 0.5; } return s; }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y; float t = uTime * 0.04;
  float v = fbm(uv * 2.5 + fbm(uv * 2.5 + t));                        // domain warp
  vec3 c = mix(uBg, uAccent, smoothstep(0.35, 0.75, v));
  o = vec4(mix(c, uInk, smoothstep(0.78, 0.95, v) * 0.5), 1.0);
}`));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one big triangle
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['uRes', 'uTime', 'uBg', 'uInk', 'uAccent'].map((k) => [k, gl.getUniformLocation(prog, k)]));
  let raf = 0, last = 0, time = 0, visible = true, paused = false;
  const draw = () => { gl.uniform1f(u.uTime, time); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const palette = () => { gl.uniform3fv(u.uBg, tok('bg')); gl.uniform3fv(u.uInk, tok('text')); gl.uniform3fv(u.uAccent, tok('accent')); draw(); };
  const size = () => { const dpr = Math.min(devicePixelRatio || 1, 1);   // backgrounds: DPR 1 is enough
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u.uRes, canvas.width, canvas.height); draw(); };
  const frame = (now) => { raf = 0; if (!visible || document.hidden || paused) { last = 0; return; }
    time += last ? (now - last) / 1000 : 0; last = now; draw(); raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && visible && !document.hidden && !paused) raf = requestAnimationFrame(frame); };
  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(canvas);
  document.addEventListener('visibilitychange', start);
  document.addEventListener('unclaw:palette', () => requestAnimationFrame(palette));     // customiser changed tokens
  new MutationObserver(() => requestAnimationFrame(palette)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => requestAnimationFrame(palette));
  btn.addEventListener('click', () => { paused = !paused; btn.setAttribute('aria-pressed', String(paused)); start(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.remove(); btn.hidden = true; });
  palette(); size(); start(); canvas.classList.add('is-live');                 // CSS fades the canvas in over the poster
} else { btn.hidden = true; }                        // reduced motion or no WebGL2: the poster stays
```
Colours mix in sRGB here, which is fine for a background. Convert to linear space before you light anything (as `x/crema/` does). Keep the poster image as the LCP and the no-WebGL view. Never put text only in the canvas. Iterate on effects in Shadertoy if you like, but re-implement the technique rather than paste the code: most Shadertoy code is CC BY-NC-SA.

### B9. View Transitions
```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const go = (update) => (!document.startViewTransition || reduce.matches) ? update() : document.startViewTransition(update);
grid.addEventListener('click', (e) => {               // tile → detail as a shared element
  const tile = e.target.closest('a.tile'); if (!tile) return; e.preventDefault();
  const thumb = tile.querySelector('img'); thumb.style.viewTransitionName = 'hero';
  go(() => { thumb.style.viewTransitionName = ''; showDetail(tile.dataset.id); detailImg.style.viewTransitionName = 'hero'; });
});
```
```css
@view-transition { navigation: auto; }                   /* MPA: both pages, same origin */
.card { view-transition-name: match-element; view-transition-class: card; }   /* list ↔ grid reorders */
::view-transition-group(*) { animation-duration: var(--dur-slow); animation-timing-function: var(--ease); }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }
```
Support (BCD, Oct 2026): same-document transitions are Baseline since Firefox 144 (Oct 2025); `match-element` and `view-transition-class` work in all three engines; cross-document `@view-transition` works in Chrome 126+ and Safari 18.2+ but not Firefox (normal navigation there; swup 4.10 if you must). Names must be unique at capture time, or the transition is skipped. Size changes animate as a scale: set `height: 100%` on the group's images if content distorts.

### B10. Variable-font axes via registered custom properties
```css
@property --wght { syntax: '<number>'; inherits: true; initial-value: 400; }
@property --wdth { syntax: '<number>'; inherits: true; initial-value: 100; }
.kinetic { font-variation-settings: 'wght' var(--wght), 'wdth' var(--wdth);   /* list every axis you use */
  transition: --wght var(--dur) var(--ease), --wdth var(--dur) var(--ease); }
.kinetic:hover, .kinetic:focus-visible { --wght: 900; --wdth: 125; }
@supports (animation-timeline: view()) { @media (prefers-reduced-motion: no-preference) {
  .kinetic { animation: swell linear both; animation-timeline: view(); animation-range: cover 15% cover 55%; } } }
@keyframes swell { to { --wght: 900; --wdth: 150; } }
```
Velocity-driven (as in `x/issue/`): keep one smoothed velocity per frame and write `el.style.setProperty('--wdth', v.toFixed(1))` only when the rounded value changes. Load the axes you need from Google Fonts, e.g. `family=Anybody:wdth,wght@50..150,100..900`. `font-variation-settings` replaces all axes at once, so drive each through its own variable. `@property` works in Chrome 85, Safari 16.4 and Firefox 128. Axis animation reflows text, so keep it to headlines. On phones, measure each word at its narrowest and widest width and clamp `--wdth` so it never overflows.

### B11. SplitText with a reduced-motion guard
```css
.split { text-wrap: wrap; }                      /* tokens.css balances h1/h2; balance breaks split lines */
html.motion .split:not(.is-split) { visibility: hidden; }   /* no flash before the split */
```
```html
<script>try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion'); } catch (e) {}</script>
```
```js
gsap.registerPlugin(SplitText);
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  SplitText.create('.split', { type: 'lines', mask: 'lines', autoSplit: true,   // re-splits on font load and resize
    onSplit(self) {
      self.elements.forEach((el) => el.classList.add('is-split'));
      return gsap.from(self.lines, { yPercent: 105, duration: 0.8, ease: 'expo.out', stagger: 0.08 });  // returned so a re-split resumes
    } });
});
setTimeout(() => document.querySelectorAll('.split').forEach((el) => el.classList.add('is-split')), 2500);  // never stay hidden
```
SplitText (rewritten in 3.13) sets `aria-label` on the parent and `aria-hidden` on the pieces by default (`aria: 'auto'`). Because it is created inside `matchMedia`, it reverts if the preference changes. Split only what animates; it can't split SVG `<text>`. For a one-time reveal, `revert()` after the tween so the DOM is clean again.
