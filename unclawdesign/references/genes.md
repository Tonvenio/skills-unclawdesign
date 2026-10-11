# Gene recipes — how to build each rolled gene

Read the sections for the genes your chosen genome actually has. `tokens.css` already sets radii, borders, shadows, motion and texture utilities; this file covers the composition moves that tokens can't express.

## Contents
1. Hero archetypes
2. Grid systems
3. Motifs (the signature device)
4. Imagery treatments
5. Color use strategies
6. Alignment, density, scale
7. Motion personalities
8. Combining genes without chaos

---

## 1. Hero archetypes

Every hero must answer within ~5 seconds: what is this, why should I care, what do I do next. The archetype decides *how*, not *whether*.

| gene | build it like this | never |
|---|---|---|
| split-asymmetric | `grid-template-columns: 7fr 5fr` (or 8/4). Copy column top-aligned to the visual's optical center. Visual bleeds off one edge. | 50/50 with a stock photo |
| poster-type | Headline at `--step-6` or larger (`clamp(4rem, 14vw, 13rem)`), leading 0.85–0.95, tracking −0.03 to −0.05em. Let a word break the container or crop at the viewport edge. Subline small and far away (scale contrast is the point). | Gradient text; accenting one word |
| centered-statement | Only when the message is ONE line. Max 18ch measure, one action. Give it a stage: a frame, a ground color, an object. | Centered + pill badge + two buttons + logo row (the template) |
| full-bleed-image | `min-height: 82svh` (not 100). Copy sits on the calm third of the image or in a solid caption block attached to an edge. Use a gradient scrim only on that third. | Text over a busy area; flat 50% black overlay |
| editorial-cover | Masthead (site name huge), issue/date line, 2–4 cover lines placed around one dominant image, a short deck. | Hairline-ruled broadsheet columns (unless paradigm is broadsheet) |
| bento-hero | 4–6 tiles, `grid-auto-flow: dense`; ONE tile is 2×2 with the headline; others each show a real facet (UI crop, number with source, photo, quote). | Emoji + label tiles |
| product-demo | The real UI, cropped tight and scaled 1.1–1.3× so details read. Optionally animate one real interaction (typing, a toggle). | Fake dashboards with lorem numbers |
| split-screen | Two full-height halves with contrasting grounds (accent ground vs photo). Mobile: stack, ground half first. | Equal visual weight on both halves |
| index-list | A large typographic list (`--step-3`–`--step-5`) of works/items; hover reveals thumbnail following cursor or in a fixed slot; numbers/years in tabular figures. | Tiny thumbnails grid |
| horizontal-scroll | `display: grid; grid-auto-flow: column; overflow-x: auto; scroll-snap-type: x mandatory`; visible affordance (cut-off item). Keyboard scrollable. | Hijacking vertical scroll |
| collage | 4–8 layered pieces (cutouts, notes, photos) with `position:absolute` on desktop, rotated ±2–6°; rebuild as an ordered stack on mobile. Headline is one of the pieces. | Random rotation without a visual anchor |
| kinetic-marquee | 1–2 bands of very large type moving at 20–40s per loop; duplicated content for seamless loop; pause on hover/focus; static under reduced motion. | More than 2 moving bands |
| interactive-object | One manipulable thing: a dial, slider, configurator, playable toy, draggable sticker. It must demonstrate the product or idea. | Decorative 3D blob that spins |
| data-wall | Real numbers with labels and sources in tabular figures, a sparkline or two, live-looking timestamps. | Big number + small label + gradient accent (the default stat block) |
| letter-intro | 2–4 short paragraphs at `--step-2`/`--step-3`, generous leading, signed. No image. | A wall of marketing adjectives |

## 2. Grid systems

- **asymmetric-12**: `grid-template-columns: repeat(12, minmax(0,1fr))`, spans like 2/6/4 or 1–5 / 7–12. Leave columns empty on purpose.
- **modular**: define a module (e.g. `--m: clamp(64px, 9vw, 120px)`) and size blocks in whole modules; gutters equal everywhere.
- **narrow-column**: `max-width: 65ch` main column, everything else (images, quotes) may break out to `min(100%, 1100px)`.
- **editorial-margins**: `grid-template-columns: [full-start] 1fr [main-start] minmax(0, 40rem) [main-end] minmax(10rem, 16rem) [full-end]`; captions, notes and pull quotes go in the margin column (`grid-column: main-end / full-end`).
- **bento**: `repeat(6, 1fr)` with tiles spanning 2–4 cols / 1–2 rows; container queries on tiles.
- **broken-overlap**: assign two items the same `grid-area` rows/cols partly; use `z-index` and margin offsets; keep reading order logical in the DOM.
- **swiss-hangline**: every section's first line starts at the same y (a common top hang line); a big left margin (2 empty columns); flush-left, ragged-right.
- **alternating-bands**: full-width sections alternate between `--c-bg`, `--c-surface-2`, an accent ground, or the opposite variant (wrap a section in `data-theme="dark"`).
- **horizontal**: see horizontal-scroll; ideal for catalogs and portfolios.
- **sidebar-doc**: `grid-template-columns: 16rem minmax(0, 1fr)`; sticky nav; reading column ≤ 72ch; on-page TOC on the right at ≥ 1280px.

## 3. Motifs (the signature device)

The motif is the one memorable thing. Use it 3–5 times down the page at different scales, never as wallpaper.

- **circle**: a large circle as image mask or color field; small circles as bullets/markers; a circle that moves between sections.
- **arch**: arch-topped images, arched buttons/tabs, an arch window framing the hero subject.
- **diagonal**: `clip-path: polygon(0 0, 100% 0, 100% 88%, 0 100%)` section edges; rotated bands of text (−6° to −12°).
- **stripes**: 3–5 parallel stripes (racing or rainbow) as a dividing band or behind headlines.
- **sticker**: 1–3 circular/star stickers rotated −8° to 12°, with short copy ("new", a price, a promise). Hard shadow or thick outline.
- **scribble**: hand-drawn SVG underline/circle around ONE phrase per screen; animate stroke-dashoffset once.
- **frame-box**: content in boxed frames with visible borders; frames align to the grid.
- **numerals**: oversized numerals only for actual steps, chapters, years or data.
- **cutout**: subjects without background breaking out of their container (overflow visible, negative margin top).
- **primitives**: circle/square/triangle in palette colors as compositional blocks.
- **rules**: thick and thin horizontal rules structuring sections (rule above section title, hairline between items).
- **stamp**: a seal/stamp (circle text via SVG `textPath`) used near the CTA or signature.
- **tape-scraps**: translucent tape on photo corners, torn-paper edges between sections.
- **registration-marks**: crop marks at section corners, registration crosshair near headings — print production feel.
- **blob-wave**: one blob family + one wave divider style; same curvature language.
- **tile-pattern**: a small repeating SVG pattern (terrazzo, checker, squiggle) used in bands and backgrounds of 1–2 sections.
- **outline-type**: `-webkit-text-stroke: 2px var(--c-text); color: transparent` for one huge word or a marquee band; never for body.
- **starburst**: SVG starburst behind a price/claim or as a section badge.
- **pixel**: pixel corners on cards (box-shadow steps), pixel dividers, pixel cursor.
- **ornament**: fleurons, deco fans, period corners — small, at section openings.
- **orbit-lines**: concentric ellipses/orbits behind the hero object; dotted orbit as section divider.
- **none**: no device — then type scale, spacing and photography must carry the identity. Usually pair with poster-type or editorial heroes.

## 4. Imagery treatments

- Use one treatment throughout; the brief's real images beat everything.
- No real images available → choose `typographic-only`, `generative-svg`, `flat-illustration` (built in SVG), or `product-ui` (built in HTML), never stock-photo placeholders. A gray box labeled with what the image should show is acceptable in a prototype.
- **duotone-photo**: `filter: grayscale(1) contrast(1.1)` on the image + a wrapper with `background: var(--c-accent)` and the image at `mix-blend-mode: multiply` (or screen for light ink).
- **halftone-photo**: apply `.halftone-img` mask from tokens or an SVG filter.
- **cutout-photo**: transparent PNG/SVG subject with a soft ground shadow; overlap section edges.
- **generative-svg**: shapes computed from data or a seed (circles packing, stripes, grids) in palette colors — great for abstract briefs.

## 5. Color use strategies

- **neutral-plus-accent**: accent only on primary action, active state, one highlight per view (~10% of pixels max).
- **color-blocking**: whole sections or tiles in `--c-accent`, `--c-accent-2`, `--c-accent-3` with their `-ink` text tokens. Never put muted text on color blocks.
- **monochrome**: one hue family; hierarchy from lightness and type only.
- **duotone**: two inks (accent + accent-2) for all illustration and photo treatment; overprint (multiply) where they meet.
- **inverted-bands**: alternate light and dark sections by wrapping sections in `data-theme="light|dark"` (tokens.css defines both).
- **full-ground**: the saturated `color` variant is the page; white/ink text; the derived light variant is used for dense content areas like forms or tables.

## 6. Alignment, density, scale

- **flush-left** is the default for anything longer than two lines. **centered** only for short statements and symmetric paradigms (deco, statement heroes). **justified-blocks** requires `hyphens: auto` and `lang` on `<html>`; only in print-like paradigms and never on narrow mobile columns (switch to left below 600px).
- **density** sets section padding and body size in tokens. Dense ≠ cramped: keep the spacing proximity rule (inside group < between groups < between sections).
- **scale** ratio: 1.2 product UI; 1.25–1.333 marketing & editorial; 1.5–1.618 expressive brand; 2.0 poster. Use at most ~6 steps on one page.

## 7. Motion personalities

- One orchestrated entrance per page at most (hero sequence ≤ 900ms total). Everything else animates only in response to the user.
- **snappy/playful**: spring easing from tokens; press = scale(.97) or hard-offset collapse.
- **kinetic-type**: marquees, variable-font axis changes on scroll (`animation-timeline: view()` with a fallback), split-letter reveals for ONE headline.
- **cinematic**: clip-path reveals on images, slow parallax on one layer only, scroll-snap chapters.
- **mechanical**: `steps()` easing, typewriter reveals, ticking counters with tabular numerals.
- Always wrap non-essential motion in `@media (prefers-reduced-motion: no-preference)` or rely on the tokens' reduced-motion reset.

## 8. Combining genes without chaos

- Spend boldness in ONE place: if the hero is poster-type, keep the grid calm; if the motif is loud, keep texture `none`.
- Texture never sits under body text at more than 8% opacity.
- Edge + elevation must agree: thick-ink pairs with hard-offset or flat; hairline pairs with tonal or soft-layered; never thick-ink + soft blurred shadow.
- Shape + motif must agree: organic shapes with blob/arch motifs; sharp shapes with rules/primitives/diagonals.
- If two genes fight the brief (e.g. playful motif for a solemn subject), re-roll that gene: lock everything else with `--paradigm/--palette/--fonts` and roll again.
