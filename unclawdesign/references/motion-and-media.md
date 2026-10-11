# Motion and media: the rules for pages that move

Read this before building any experience other than a still landing page, and again before shipping. Sources: the Oct 2026 research notes (W3C WCAG 2.2 Understanding docs, NN/g, web.dev, MDN, Chrome/WebKit, vendor docs; summarised in `research-creative-web.md`) and what the six reference builds needed. The commands in §8 were run with ffmpeg 6.1, numpy and Pillow 12.

## Contents
1. [Motion personality → durations and easings](#1-motion-personality--durations-and-easings)
2. [One orchestrated moment](#2-one-orchestrated-moment)
3. [Scroll-jacking and experimental navigation](#3-scroll-jacking-and-experimental-navigation)
4. [WCAG 2.2 motion checklist](#4-wcag-22-motion-checklist)
5. [Reduced motion: reduce, replace, remove](#5-reduced-motion-reduce-replace-remove)
6. [Performance budgets](#6-performance-budgets)
7. [Video and image rules](#7-video-and-image-rules)
8. [Procedural media cookbook](#8-procedural-media-cookbook)
9. [Licensing: stock, AI and code](#9-licensing-stock-ai-and-code)
10. [Release checklist](#10-release-checklist)

---

## 1. Motion personality → durations and easings
The genome's `motion` gene sets `--dur-fast / --dur / --dur-slow / --ease` in `tokens.css`. Use them everywhere: CSS transitions, GSAP tweens and scroll mappings. A page has one motion language.

| gene | fast / base / slow | `--ease` | GSAP equivalent | scroll mapping |
|---|---|---|---|---|
| still | 0 / 120 ms / 0 | ease | none | no scrubbed motion; state changes only |
| subtle | 150 / 220 / 600 ms | cubic-bezier(.2,.7,.2,1) | `power3.out` | scrub 0.5 s, small travel (≤ 40 px) |
| snappy | 120 / 180 / 320 ms | cubic-bezier(.34,1.56,.64,1) | `back.out(1.7)` | scrub `true` or 0.3 s; snaps allowed |
| kinetic-type | 150 / 250 / 900 ms | cubic-bezier(.65,0,.35,1) | `power2.inOut` | type axes and masks on scroll; stagger 0.05–0.08 s |
| playful | 140 / 260 / 500 ms | cubic-bezier(.34,1.8,.64,1) | `back.out(2.2)`, `elastic.out(1,.3)` sparingly | physics and springs carry it |
| cinematic | 200 / 400 / 1200 ms | cubic-bezier(.16,1,.3,1) | `expo.out` | scrub 0.6–1 s, long pins, slow parallax on one layer group |
| mechanical | 80 / 120 / 400 ms | steps(6, end) | `steps(6)` | stepped counters, typewriter, no easing curves |

Use the token curve in GSAP exactly (CustomEase ships free with GSAP since 3.13):
```js
const css = getComputedStyle(document.documentElement), m = css.getPropertyValue('--ease').match(/cubic-bezier\(([^)]+)\)/);
if (m) { gsap.registerPlugin(CustomEase); CustomEase.create('token', m[1]); }        // then ease: 'token'
const dur = (name) => parseFloat(css.getPropertyValue(name)) / (css.getPropertyValue(name).includes('ms') ? 1000 : 1);
```
Scrubbed timelines use `ease: 'none'` on the tween (the scroll is the easing). Smooth the *progress* (lerp 0.1–0.16 per frame, or `scrub: 0.6`), never hijack the scroll itself. Durations scale with distance: small UI 120–250 ms, panels 300–500 ms, full-screen moves 600–1200 ms. Exits are about 70% of entrances.

## 2. One orchestrated moment
- One entrance per page: the hero sequence, ≤ 900 ms in total (a loading animation that is the only content may run longer). Everything else responds to the user or to scroll.
- One loud motion idea per experience: the depth parallax, *or* the scrubbed object, *or* the physics, not all three. Supporting motion (line reveals, drawn paths) shares the same easing and stays quiet.
- No fade-and-slide-up on every section (anti-pattern A8). Sections either belong to the experience's choreography or simply appear.
- Motion must mean something: it shows a process, a cause, a hierarchy or a state change. Ask NN/g's question: "what is lost if we remove it?" If nothing is, remove it.
- Never animate before content is readable. Text appears at once or within the entrance; nothing waits on a preloader.

## 3. Scroll-jacking and experimental navigation
NN/g (2023) defines scroll-jacking as any change to the expected input-tied speed or direction of vertical scroll. In testing, most participants were at least mildly disoriented and felt a loss of control. Some mistook long scroll-jacks for bugs, and some thought the page had ended. Task-oriented users left. It was worst when text had to be read inside the altered scroll, and worse on mobile. Desktop horizontal scrolling is poorly discovered and costly to operate (NN/g 2014). In the one controlled parallax study (JUS 2015, n = 86), parallax raised perceived fun but not usability, satisfaction or appeal, and made 2 participants motion-sick.

So an experiential section is acceptable only when all of these hold:
1. **Purpose:** it shows something (a process, a reveal, a before/after); it isn't novelty.
2. **Mode:** the visitor is exploring (brand, launch, portfolio), not doing a task (pricing, docs, checkout).
3. **Placement:** the primary message and action exist in normal HTML above or beside it. Pins sit below the hero, or the hero is a short pin with a skip link.
4. **Length:** each pinned segment is ≤ ~1.7 viewport heights; normal-scroll sections sit between pins; direction stays vertical (horizontal tracks are driven *by* vertical scroll and expose arrows and contents links).
5. **Escape:** persistent navigation or a chapter trail, visible progress, and a skip link to the action.
6. **No critical text** inside a hijacked region. Captions are fine; instructions and prices are not.
7. **Fallbacks:** native scroll on phones where pins get awkward, and always under reduced motion; Space, PageUp/PageDown, Home/End and arrows keep working.
8. **Testing:** the scroll rate is tried on trackpad, mouse wheel and touch.

Smooth-scroll libraries (Lenis) keep native scroll position, anchors and sticky, but they still change how the wheel feels: a mild form. Skip them on content pages and drop them under reduced motion. Snapping, rate changes and full-page "one wheel = one section" are the strong forms. A page that suppresses native scrolling and implements its own (drag canvases, wheel-hijack) loses the browser exemption in WCAG 2.5.7.

## 4. WCAG 2.2 motion checklist
WCAG 2.2 (Recommendation, 12 Dec 2024) is the binding baseline. WCAG 3 is a Working Draft (10 Sep 2026) that includes "No visual motion" under "Avoid physical harm". Design to 2.2 now and treat 3 as direction.

- [ ] **2.2.2 Pause, Stop, Hide (A).** Anything that moves, blinks or scrolls by itself for more than 5 s alongside other content has a visible, keyboard-operable pause control: ambient video, WebGL loops, marquees, particle fields, physics rain. Motion set off by scrolling into view counts as "starting automatically". Pausing only while hovered or focused does not qualify. One page-wide control is recommended. Auto-updating content has no 5 s grace. Reduced-motion support does *not* replace this control.
- [ ] **2.3.1 Three Flashes or Below Threshold (A).** No more than 3 general or red flashes in any second, or flashes small enough (≈ 341×256 CSS px at 1024×768 is the 10° reference). Audit glitch shaders, beat-synced visuals, impacts and caustic glints. Test with PEAT or Harding FPA when in doubt.
- [ ] **2.3.3 Animation from Interactions (AAA, but adopt it).** Motion triggered by interaction, including parallax and scroll-linked movement, can be turned off. `prefers-reduced-motion` (technique C39 in CSS, SCR40 in JS) or an on-site setting satisfies it. Colour and opacity changes are not "motion".
- [ ] **2.5.4 Motion Actuation (A).** Tilt or shake features (DeviceOrientation gravity, gyro parallax) have a UI alternative and can be switched off; make them opt-in.
- [ ] **2.5.7 Dragging Movements (AA).** Everything done by dragging also works with single clicks or taps: window move and resize (arrow keys, zoom button), card piles (next button), sliders (track click), maps and canvases (pan buttons), orbit (buttons). Swipe alone isn't an alternative (it fails 2.5.1), and keyboard alone doesn't satisfy 2.5.7.
- [ ] **2.4.11 Focus Not Obscured, Minimum (AA).** Sticky headers, chapter trails, fixed canvases, cookie bars and price bars never fully cover the focused element. Use `scroll-padding-top/bottom` (technique C43) and test by tabbing through pinned sections.
- [ ] Also: **1.4.2** no audio over 3 s without pause/stop or its own volume (default: no autoplay sound); **2.1.1 / 2.1.2** everything works by keyboard and focus can always leave; **2.5.1** path gestures have single-pointer alternatives; **2.5.8** targets ≥ 24×24 CSS px; **1.4.10** reflow at 320 px (horizontal experiences need their vertical version); **1.2.2 / 1.2.3 / 1.2.5** captions and audio description for video with meaning (decorative loops are `aria-hidden`).

## 5. Reduced motion: reduce, replace, remove
About a third of US adults over 40 have some vestibular dysfunction (NHANES 2001–04). The triggers are large-area motion, zooming or scaling, and multi-speed parallax. `prefers-reduced-motion` has been supported everywhere since 2020 and maps to the OS settings.

| Remove under `reduce` | Replace | Keep |
|---|---|---|
| parallax and multi-speed layers | slide-ins and zooms → opacity crossfades (≈ 200 ms) | opacity and colour transitions |
| pins, scroll-jacking, smooth-scroll libraries (back to native scroll) | page and route transitions → crossfade or cut | short micro-feedback (a few px) |
| camera fly-throughs, orbiting cameras | animated hero → its composed end state or a still frame | progress indicators |
| large zoom and scale | video autoplay → click-to-play behind the poster | user-started playback |
| autoplaying video and animated images | continuous WebGL → one rendered still (capture it) | |
| animated gradients and ambient loops | physics → bodies placed at rest, reward behind a button | |

**Mandatory parity:** the reduced version contains every piece of content, every action and every state the motion version has. It is designed (composed stills, stepped sequences), not a frozen mid-frame. In the rubric this is the "reduced-motion parity" check.

**Implementation (as in all six builds):**
```html
<script>/* in <head>, before CSS paints: one source of truth for CSS and JS */
try { const s = localStorage.getItem('motion');
  if ((s ?? (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on')) === 'on') document.documentElement.classList.add('motion');
} catch (e) { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion'); }</script>
<button role="switch" aria-checked="true" id="motion-switch">Motion</button>   <!-- site header, early in tab order -->
```
```js
const root = document.documentElement, sw = document.getElementById('motion-switch');
sw.setAttribute('aria-checked', String(root.classList.contains('motion')));
sw.addEventListener('click', () => {                 // the site setting wins over the OS in both directions
  const on = !root.classList.contains('motion');
  try { localStorage.setItem('motion', on ? 'on' : 'off'); } catch (e) {}
  location.reload();                                  // simplest way to rebuild or skip timelines and canvases
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { try { if (!localStorage.getItem('motion')) location.reload(); } catch (e) { location.reload(); } });
```
- Write motion CSS as `html.motion .x { … }`. The base styles *are* the reduced version (no-motion-first: less code, fails safe). The token stylesheet's `prefers-reduced-motion` kill switch stays as a backstop.
- Gate heavy libraries *before* loading them: `if (root.classList.contains('motion')) import('./scene.js')`, or inject the GSAP/Lenis/three `<script>` tags from JS. Reduced-motion and Save-Data users shouldn't download them (check the Network panel).
- In GSAP, put every timeline inside `gsap.matchMedia()` conditions that include `(prefers-reduced-motion: no-preference)`, or check `root.classList.contains('motion')` first.
- `prefers-reduced-transparency` (limited support) and `forced-colors` are additive: give glass and blur an opaque fallback, and remember canvas pixels ignore forced colours. Don't rely on `prefers-reduced-data` (no browser supports it); use the `Save-Data` header or `navigator.connection.saveData` where present.

## 6. Performance budgets
Core Web Vitals in 2026 are unchanged: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1** at the 75th percentile, mobile and desktop separately. Scroll doesn't count toward INP, so measure frame rate separately (DevTools FPS meter, 4× CPU throttle).

How motion-heavy pages fail: big JS or 3D bundles block the hero (LCP); scroll and pointer handlers and busy rAF loops hold the main thread (INP); entrance animations that reflow, unreserved canvas or media boxes, and font swaps shift layout (CLS).

**Rules:**
1. The LCP element is HTML: headline text, or a hero/poster image with `fetchpriority="high"`. Never a canvas frame, a video's first frame or a preloader.
2. Initial JS (gzipped) before LCP: ≤ 50 KB for landing-classic, ≤ 80 KB for experiences. Measured: GSAP core 28 KB + ScrollTrigger 18 KB + SplitText 4 KB; Lenis 5 KB; Matter.js 26 KB; Draggable + Inertia 17 KB. Three.js and other 3D bundles load after `load` or on idle and visibility (vendor estimate: three core ≈ 600 KB minified; with drei, post-processing and a model, often over 3 MB).
3. One animation loop (`gsap.ticker`, or one rAF that also drives Lenis). Read layout first, then write. Never read rects in `pointermove` or scroll handlers; cache them on resize.
4. Animate `transform` and `opacity` (and individual `translate/rotate/scale`). In web.dev's demo, top/left lost ~50% of frames and transform ~1%. Blur, `backdrop-filter`, big `clip-path` and font-axis animation are the hidden costs. `will-change` only temporarily.
5. Gate rendering: canvases and WebGL run only while visible (IntersectionObserver) and while the tab is visible (`visibilitychange`), and stop when idle (physics asleep, sim calm).
6. DPR caps: 2 for UI canvases and sequences; 1.5 for full-screen shaders; 1 for background noise. Step down when the frame time stays high.
7. Reserve every box: `width`/`height` or `aspect-ratio` on images, video and canvas; `min-height` on lazy sections; pins must not push content after load. Fonts: preload the display face; use `font-display: optional` or a metric-matched fallback.
8. `content-visibility: auto` + `contain-intrinsic-size: auto 800px` on long sections that aren't animating (Baseline since Sep 2025; initial render 232 → 30 ms in web.dev's demo; content stays accessible).
9. Mobile 3D: < 100 draw calls, < 100k vertices, textures ≤ 2048 px in KTX2, ≤ 3 dynamic lights, post-processing at half resolution, meshopt/Draco geometry.

**Per-archetype budgets** (full numbers in `data/experiences.json → perf_budget`; showcase figures are measured):

| experience | initial JS gz | media desktop / mobile | notes |
|---|---|---|---|
| landing-classic | 50 KB | 400 / 250 KB | LCP ≤ 2.0 s |
| parallax-scrollytelling | 70 KB | 900 / 600 KB | ≤ 10 moving layers per pin |
| scroll-scrubbed-sequence | 55 KB | 2.5 MB / 1 MB | 140 × 1200 px / 71 × 640 px WebP |
| physics-playground | 75 KB | ~0 | 180 / 90 bodies, ≤ 50 DOM bodies |
| os-desktop | 80 KB | 600 KB | lazy-load the screensaver engine |
| webgl-liquid | 30 KB | 300 KB stills | DPR ≤ 1.5, adaptive |
| horizontal-magazine | 60 KB | 2.5 / 1.5 MB | cover loop VP9 ≈ 400 KB |
| 3D world / scene / game | 60–80 KB + deferred 0.5–1.5 MB | posters | < 100 draw calls on phones |
| kinetic-poster | 35 KB | ≤ 60 KB texture | LCP ≤ 1.8 s, CLS ≤ 0.05 |

## 7. Video and image rules

### Ambient / hero video
```html
<div class="loop">
  <video muted loop playsinline preload="none" poster="loop-poster.webp" width="1280" height="720" aria-hidden="true" tabindex="-1">
    <source src="loop.av1.mp4" type='video/mp4; codecs="av01.0.05M.08"'>
    <source src="loop.webm" type="video/webm">
    <source src="loop.mp4" type="video/mp4">
  </video>
  <button class="loop-toggle" type="button">Pause video</button>
</div>
```
```js
document.querySelectorAll('.loop').forEach((box) => {
  const v = box.querySelector('video'), btn = box.querySelector('.loop-toggle');
  let held = !document.documentElement.classList.contains('motion');   // reduced motion: waits for a click
  let seen = false;
  const sync = () => (seen && !held ? v.play().catch(() => {}) : v.pause());   // a rejected play() (Low Power Mode) keeps the poster
  const label = () => { btn.textContent = held ? 'Play video' : 'Pause video'; };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(v);
  btn.addEventListener('click', () => { held = !held; label(); sync(); }); label();
});
```
- Muted, inline, audio-less video autoplays in every major browser; `playsinline` stops iPhone fullscreen; WebKit pauses off-screen autoplay. Still design for no playback: iOS Low Power Mode and data savers block it, and `play()` rejects. The poster must be a good still on its own.
- The poster is the LCP candidate for a hero video (whichever comes first, poster or first frame). Make it a small AVIF/WebP (≤ 60–100 KB) and preload it with `fetchpriority="high"`. Don't lazy-load an LCP video; below the fold use `preload="none"` (or `loading="lazy"` where supported) plus IntersectionObserver.
- Strip audio (`-an`; about 20% of bytes). Encode at the rendered size (720p, or 1080p only for full-bleed desktop). Loops of 5–20 s; aim for a few hundred KB to ~3 MB. Showcase: a 5 s 1280×360 water loop is 316 KB H.264 / 241 KB VP9; a 10 s 1280×720 cover is 1.5 MB H.264 / 403 KB VP9.
- Codecs: AV1 first (Chrome 70+, Firefox 67+, Edge 121+; Safari 17+ only with hardware AV1: M3 Macs, iPhone 15 Pro and later), VP9 WebM next, H.264 MP4 last (universal; `-pix_fmt yuv420p` or Safari may show black). HEVC only for alpha on Apple. Check the AV1 `codecs` level with `ffprobe -show_entries stream=profile,level` (level 5 → `av01.0.05M.08`).
- Long-form video (minutes): HLS/adaptive streaming. Chrome began shipping native HLS in late 2025 and had an early playback bug, so keep hls.js/MSE as the fallback.
- Video with meaning needs captions (1.2.2) and audio description or a transcript (1.2.3/1.2.5). Decorative loops are `aria-hidden` with the pause button still present.

### Scroll-scrubbed media: which technique
| | canvas image sequence | all-intra video (`currentTime`) | WebCodecs decode |
|---|---|---|---|
| smoothness | excellent | good if `-g 1`; normal encodes snap to keyframes | best |
| bytes / requests | heavy: 100–200 requests; showcase 2.3 MB desktop / 0.9 MB mobile | one file, 4–8× a normal encode (test: 153 KB → 1.24 MB) | one short-GOP file |
| reverse scrub | free | ok | needs a keyframe seek and decode forward |
| iOS Low Power Mode | works | fails (no workaround per ScrollyVideo) | Safari support unclear |
| use when | short, art-directed objects; transparency | long or filmed sequences | Chromium-heavy audiences, long 1080p |

Frames: 100–150 at 24–30 fps covers 4–7 s across 3–6 viewport heights. A decoded RGBA frame costs w × h × 4 bytes (1920×1080 ≈ 8.3 MB), so keep a sliding window and never hold a whole 1080p sequence as ImageBitmaps.

### Images
- Formats (Oct 2026): AVIF and WebP everywhere. JPEG XL decodes in Chrome/Edge 155 and Safari 17+; Firefox is not shipped yet. JXL beats AVIF on large photos (~20% smaller in Cloudinary's tests) and AVIF wins on graphics, alpha and very low bitrates. Offer JXL only as an optional first `<source>` for big photographic heroes.
- Hero markup: `<picture>` with `<source type="image/jxl">`, `image/avif`, `image/webp`, then `<img src=jpg srcset sizes width height fetchpriority="high" alt>`. Use `<source media>` for art-directed mobile crops. Put the hero in the HTML (not a CSS background or JS-injected); never lazy-load it; mark at most 1–2 images high priority (Google Flights: LCP 2.6 → 1.9 s).
- Everything below the fold gets `loading="lazy" decoding="async"`, explicit dimensions, and AVIF at 2–3 widths. Thumbnails ≤ 40 KB, heroes ≤ 150–250 KB at 1600 px.
- Placeholders: a dominant-colour or CSS-only LQIP background. Low-entropy placeholders are excluded from LCP, so they never fake a good score.
- One treatment for all images (consistent grade, crop ratios and grain). Image CDNs with `Vary: Accept` can negotiate formats.

## 8. Procedural media cookbook
When the brief brings no footage or photos, generate media from code instead of reaching for stock. Everything stays on-brand and token-tintable, with no licensing or AI-provenance questions. Keep generator scripts with the project.

**a. Seamless grayscale loop → video.** Every moving term uses integer multiples of one loop phase, so frame N equals frame 0. Normalise with a fixed range, not per frame (per-frame min/max flickers).
```python
import numpy as np, subprocess                      # loop.py → loop.mp4 (5 s, 1280×720, ~150 KB)
W, H, N, FPS = 1280, 720, 120, 24
x = np.linspace(0, 2 * np.pi, W, endpoint=False)[None, :]
y = np.linspace(0, 2 * np.pi * H / W, H, endpoint=False)[:, None]
def frame(t):
    v = np.sin(3 * x + np.cos(2 * y + t)) + np.sin(2 * y + 2 * np.sin(x - t)) + 0.5 * np.sin(5 * x + 4 * y + 2 * t)
    return (np.clip((v + 2.5) / 5.0, 0, 1) * 255).astype(np.uint8)
assert np.array_equal(frame(0), frame(2 * np.pi))  # the seam check
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", str(FPS),
    "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", "loop.mp4"],
    stdin=subprocess.PIPE)
for i in range(N): ff.stdin.write(frame(2 * np.pi * i / N).tobytes())
ff.stdin.close(); ff.wait()
```
Richer loops: periodic FFT noise (random spectrum → `ifftn`, which tiles in space and time; limit temporal frequencies to a few cycles per loop), textures with N-fold symmetry rotated by 360°/N over the loop, and water caustics from iterated sin/cos with integer time multipliers (all used in the showcase). Lower-rate renders can be blended up: `-r 15` input with `-vf framerate=fps=30`.

**b. Encode the set** (tested sizes for the 5 s loop above: H.264 153 KB, VP9 130 KB, AV1 55 KB):
```sh
ffmpeg -i loop.mp4 -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -an loop.webm
ffmpeg -i loop.mp4 -c:v libsvtav1 -crf 40 -preset 8 -an -movflags +faststart loop.av1.mp4
ffmpeg -ss 0 -i loop.mp4 -frames:v 1 -c:v libwebp -quality 70 loop-poster.webp          # poster (7 KB here)
ffmpeg -i loop.mp4 -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 34 loop-poster.avif   # or AVIF
ffmpeg -i in.mp4 -an -c:v copy out.mp4                                                       # strip audio only
```
**c. All-intra for scrubbing,** every frame a keyframe (verify with ffprobe):
```sh
ffmpeg -i src.mp4 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -g 1 -crf 23 -pix_fmt yuv420p -movflags +faststart scrub.mp4
ffmpeg -i src.mp4 -an -vf "scale=1280:-2,fps=30" -c:v libvpx-vp9 -g 1 -crf 32 -b:v 0 -row-mt 1 scrub.webm
ffprobe -v error -select_streams v:0 -show_entries frame=key_frame -of csv=p=0 scrub.mp4 | sort | uniq -c
```
A cheaper middle ground: keyframes every 5–10 frames (`-x264-params keyint=10:scenecut=0`) made files about 5× larger instead of 8× in one test.

**d. Image sequence as transparent WebP** (desktop set plus every-other-frame mobile set; the stand-in disc renderer produced 2.3 MB / 0.7 MB):
```python
from PIL import Image                                # inside your per-frame loop; im is RGBA from your renderer
im.save(f"media/d/f{i:03d}.webp", quality=82, alpha_quality=85, method=6)
if i % 2 == 0 or i == N - 1:
    im.resize((640, 640), Image.LANCZOS).save(f"media/m/f{(i + 1) // 2:03d}.webp", quality=80, alpha_quality=85, method=6)
```
Renderers that work with no 3D software: numpy ray-casting of ellipsoids or SDFs with noise bump and three-light shading (the showcase bean), PIL drawing, or headless three.js captures. Write `frames.json` with the counts so the page doesn't hard-code them.

**e. Token tinting: grey media, brand colour at runtime.** Render media in greyscale so the palette (and the customiser) colours it:
- *CSS blend:* the video at `mix-blend-mode: multiply` with `filter: grayscale(1)` on an accent ground (white takes the ink, black stays black), or `screen` on a dark ground for light ink. A mid-grey loop (luma ≈ 0.5 at rest) under `soft-light` only modulates whatever token colour is behind it (journey's water band). Wrap the pair in `isolation: isolate`.
- *SVG duotone* for images: `<filter id="duo" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="r0 r1"/><feFuncG …/><feFuncB …/></feComponentTransfer></filter>`. JS writes `tableValues` from the token RGB (dark ink → light ink) on load and on `unclaw:palette`. Test SVG filters on HTML/video in Safari; blend modes or WebGL are the safer route there.
- *WebGL gradient map:* upload the video frame as a texture and map luma through three token colours (dark → accent → paper) in the fragment shader, with uniforms refreshed on `unclaw:palette` (`x/issue/` cover; recipe B8).

**f. Seamless texture tile** (grain, paper, halftone base; FFT noise wraps at the edges):
```python
import numpy as np; from PIL import Image
n, rng = 256, np.random.default_rng(7)
k = np.hypot(*np.meshgrid(np.fft.fftfreq(n) * n, np.fft.fftfreq(n) * n))
v = np.real(np.fft.ifft2((rng.standard_normal((n, n)) + 1j * rng.standard_normal((n, n))) / np.maximum(k, 1) ** 1.2))
Image.fromarray((np.clip(0.5 + 0.18 * (v - v.mean()) / v.std(), 0, 1) * 255).astype(np.uint8), "L").save("grain.webp", quality=80)  # ≈ 21 KB
```
**g. Ambient sound loop** (audio-reactive pages; always opt-in): choose partial frequencies with whole cycles per loop (f × T an integer), add low-passed noise, write a WAV with `wave`, then `ffmpeg -i hum.wav -c:a libopus -b:a 64k hum.opus` (8 s ≈ 60 KB) plus `-c:a aac -b:a 96k hum.m4a` for Safari.

**h. Size targets:** poster/still ≤ 60–100 KB; ambient loop ≤ 1 MB per 10 s at 720p (VP9/AV1), H.264 fallback ≤ 3 MB; sequence frames ≈ 15–20 KB each at 1200 px transparent WebP; texture tiles ≤ 30 KB; hero photo AVIF ≤ 250 KB at 1600 px.

## 9. Licensing: stock, AI and code
Not legal advice. Keep a provenance note per asset (source, licence, date, prompt or edit record).
- **Stock.** Unsplash and Pexels: free commercial use without attribution; no reselling unaltered copies, no competing libraries; Pexels also forbids implying endorsement and showing identifiable people offensively. Coverr: free and irrevocable, but no resale, no use in builders or editors, and **no AI training or datasets**; it passes on no model or property releases and holds none for brands or landmarks. Mixkit: the licence differs per asset type, so check each item. NASA media: generally not copyrighted in the US, but credit NASA, never imply endorsement, never use the logos, and never place NASA insignia in AI imagery.
- **AI images and video.** Midjourney (ToS May 2026): companies over $1M revenue must be on Pro or Mega to own outputs; content is public by default; Midjourney keeps a broad licence to inputs and outputs. FLUX [dev]: weights are non-commercial, while outputs may be used commercially (not to train competing models). Google Veo 3.x: 4–8 s clips at 24 fps, always with native audio (strip it), SynthID watermark. OpenAI Sora: app closed 26 Apr 2026, API 24 Sep 2026. Runway and Kling: free tiers are watermarked and personal-use only according to third-party summaries; read the primary terms before using free-tier output.
- **Copyright and disclosure.** US Copyright Office (Jan 2025): prompts alone don't make an output copyrightable; human selection, arrangement and modification can be protected. EU AI Act Art. 50 (from 2 Aug 2026): providers must mark synthetic media machine-readably; deployers must disclose deepfakes (realistic people, places, events) at first exposure; evidently artistic or satirical work needs only a light notice.
- **Code.** Shadertoy shaders are commonly CC BY-NC-SA 3.0 (explicit on popular ones such as Inigo Quilez's; community statements treat it as the default; check shadertoy.com/terms). For client work, re-implement the technique; don't paste the code. GSAP 3.13+ is free, but its licence is proprietary (no competing no-code animation builders). Motion and Anime.js v4 are MIT, Lenis MIT, Matter.js MIT, three.js MIT, OGL Unlicense. Bruno Simon's folio source is MIT and worth studying.
- Procedural media sidesteps all of this, which is why §8 comes first.

## 10. Release checklist
1. **Field/lab:** LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on a throttled mobile profile; no long tasks > 50 ms during hero load; the hero text paints before any canvas.
2. **Frames:** DevTools Performance at 4× CPU, scroll through every pin and scrubbed section: no sustained drops; paint flashing shows no full-viewport repaints.
3. **Gating:** canvases stop off-screen and in hidden tabs; WebGL disabled or context lost → the poster version works.
4. **Reduced motion:** emulate `prefers-reduced-motion: reduce` → no parallax, pins, smooth scroll or autoplay; heavy libraries not downloaded; every piece of content and every action still there (parity); the on-site switch works and persists.
5. **Keyboard:** Tab reaches everything; Space/PageDown/Home/End scroll even through custom sections; focus is visible and never hidden behind sticky or canvas layers; the pause control comes early.
6. **Pointer:** every drag has a click/tap alternative; targets ≥ 24 px.
7. **Media:** pause controls on all autoplay; captions where speech matters; no flashes over 3 per second.
8. **Screen readers:** headings and landmarks follow the story; decorative canvases are hidden; live regions don't chatter during scroll.
9. **Responsive:** 320 px reflow with no 2D scrolling; horizontal experiences become vertical stacks.
10. **SEO:** the rendered HTML contains the H1, the copy and the links; key states (configurations, items) have URLs.
