---
name: unclawdesign
description: Systematic, library-driven design for websites, landing pages, app screens, dashboards and any HTML/CSS artifact that must look distinctive, not like default AI output, and different on every run. Rolls the page's structure and interaction (scrollytelling, scroll-scrubbed sequence, physics toy, OS desktop, WebGL material, magazine, game, radio dial, configurator, …) together with a design paradigm, a Wada or generated palette, a font pair and visual genes, then builds, animates and critiques it. Use whenever the user asks to design, build, mock up, restyle or redesign a page, site or UI, wants it premium, creative, playful, animated, parallax, not generic or not AI-looking, asks for directions, variants to pick from or another version, or invokes /unclawdesign. Prefer it over frontend-design for aesthetic decisions.
---

# unclawdesign

A design process that replaces "pick something tasteful" (which collapses to the same few looks, and to the same landing-page skeleton) with a **rolled design genome**: experience × paradigm × palette × font pair × 14 visual genes, drawn from verified libraries, weighted by fit to the brief, pushed apart for variety, and checked against a catalogue of AI-default tells.

What's in the box:
- `data/experiences.json` — 20 experience archetypes: the page's structure and interaction model (classic landing, parallax scrollytelling, scroll-scrubbed sequence, physics playground, OS desktop, WebGL liquid, horizontal magazine, scroll-driven 3D world, explorable 3D scene, playable game, infinite canvas, interactive comic/documentary, generative/data, audio-reactive, cursor instrument, configurator, chat/terminal, fictional-product campaign, digital archive, kinetic poster). Each has structure, signature moves, techniques, library versions, procedural media recipes, mobile and reduced-motion versions, WCAG 2.2 requirements, performance budgets, compatible paradigms, verified real-world examples and novelty risk. Six have reference builds in the `showcase/` folder of the skills-unclawdesign repo (the "Tidewater" showcase: `x/journey/`, `x/roast/`, `x/playground/`, `x/os/`, `x/crema/`, `x/issue/`); six more were applied to a real German site (jurasongs.de: comic feed, karaoke stage, law commentary, record crate, pixel world map, radio dial), all without libraries and with self-hosted fonts.
- `data/paradigms.json` — 41 design paradigms (Swiss, Bauhaus, Constructivist, Art Deco, Memphis, Riso, Solarpunk, Terminal, Dark Luxury, …) with traits, CSS moves, risks and allowed gene values.
- `data/palettes.json` + `data/palettes-wada.json` — 54 generated palettes plus **Sanzo Wada's 348 historical combinations** (A Dictionary of Color Combinations), each turned into full light + dark (+ saturated-ground) token sets in OKLCH. Every text/background pair passes WCAG (text ≥ 7:1, muted ≥ 4.5:1, accent ≥ 3:1, ink on accent ≥ 4.5:1); screened against the cream/terracotta, near-black/acid and purple-gradient defaults.
- `data/fonts.json` — 77 Google Fonts pairs in 16 mood clusters (every family verified against Google's own font metadata) + 11 Fontshare pairs for real projects; tuned display treatment for each; list of overused faces.
- `data/genes.json` — the visual gene vocabulary (shape, edge, elevation, texture, hero, grid, motif, imagery, icons, motion, density, align, scale, color use).
- `assets/palette-engine.js` + `assets/customizer.js` — runtime palette engine (JS port of colorlib: contrast-safe token sets from 1–4 colours) and a drop-in palette panel with all 348 Wada combinations, custom colours and light/dark/colour grounds.
- `scripts/roll.py` (genome engine), `tokens.py` (genome → complete token stylesheet), `boards.py` (side-by-side direction boards), `colorlib.py` (OKLCH, WCAG + APCA, brand and combo palettes), `lint_design.py` (AI-tell + quality-floor detector), `shoot.py` (screenshots), `getfont.py` (self-hosted WOFF2 subsets of any Google Fonts family, with licence and @font-face CSS).
- `references/` — experience recipes with tested code, motion and media rules, gene recipes, typography, color, layout & UX laws, anti-patterns, critique rubric, research digests.

All scripts are plain Python 3 without dependencies, except `getfont.py` (`pip install fonttools brotli`). Run them from the skill folder: `python3 scripts/roll.py …` (adjust the path to wherever the skill is installed).

**If those folders are missing next to this file** (an install that kept only SKILL.md), get the full bundle before step 2: it is the `unclawdesign/` folder of the private repo github.com/Tonvenio/skills-unclawdesign (on Marc's Macs `~/GitHub/skills-unclawdesign/unclawdesign/`). Without the libraries the process below still applies, but say that palettes and fonts were chosen by hand rather than rolled.

## The process

### 1. Write the design brief card (silently, unless something essential is missing)
Extract or infer and state in one compact block:
- **Subject & audience** — what it is, for whom, in their vocabulary.
- **Job** — one of `conversion | brand | editorial | portfolio | product-ui | dashboard | docs | event | ecommerce`.
- **The one action** the page must drive.
- **Tone** — 3–5 words from the mood vocabulary (`python3 scripts/roll.py list moods`): e.g. `calm, trustworthy, precise`.
- **Sector** — a few words, e.g. `legal tech`, `coffee roastery`. It is matched against paradigm and experience "fits".
- **Ambition** — `classic` (strict conversion, tiny budget, task-first visitors), `standard`, or `experiential` (the user asks for creative, playful, animated, immersive, "not a typical landing page", award-level; or the job is a launch, campaign, portfolio or event).
- **Fixed constraints** — brand colors/fonts/logo, required mode, existing design system, content that must appear.
- **Content and media inventory** — what real content and media exist; what you will write (real, specific, no lorem, no invented stats); what you will generate procedurally.

If the subject or job is genuinely unknown, ask one short question; otherwise proceed and state your reading.

**The brief's own words always win.** If the user asks for a specific look, structure, font or color, lock it (`--experience`, `--paradigm`, `--palette`, `--fonts`, or `colorlib.py brand|combo`) and roll only the rest.

### 2. Roll divergent genomes
```
python3 scripts/roll.py --job brand --tone "warm,crafted,natural" --sector "coffee roastery" --count 3
```
Options: `--mode light|dark|color`, `--wild 0–3` (higher = more surprising), `--avoid id,id` (any dimension, experiences too), `--experience/--paradigm/--palette/--fonts id` to lock a dimension, `--structure landing|experiential`, `--bold`, `--palette-source wada|library`, `--fontshare` for real projects outside claude.ai artifacts, `--seed` to reproduce.

The engine returns 3 candidates that fit the brief but differ maximally from each other and from recently used genomes (history in `~/.unclawdesign/`). Each card lists the experience (structure, signature moves, techniques, libraries, mobile and reduced-motion versions, reference build), then paradigm, palette tokens, type pair with tuned treatment, all genes, the signature move and the paradigm's risks.

**Choosing:**
- If the user is present and the work is substantial, show the directions visually: `python3 scripts/boards.py --title "<real headline>" -o boards.html` and publish/send it; let them pick (or combine: "candidate 2's palette with candidate 1's structure" → re-roll with locks).
- Otherwise pick the candidate with the best brief fit yourself, and say in one line which direction you took and why.
- Reject a candidate whose paradigm `risks` or experience `avoid_when` hit the brief (e.g. "reads as broken to mainstream users" for a bank). Re-roll instead of patching.

### 3. Choose the experience
The roll now includes an **experience archetype**: the page's structure and interaction model, chosen to fit the job, the tone, the sector and the rolled paradigm (`python3 scripts/roll.py list experiences`). It is the answer to "it still looks like a typical landing page": the palette and type can be perfect and the page still reads as a template if its skeleton is hero → features → proof → pricing → FAQ.

- **Keep `landing-classic`** when the brief is strict conversion (lead gen, sign-up, pricing), the visitor arrives with a task (docs, dashboards, support), the sector is high-trust and conservative, or the effort budget is very small. Make it well: the genome's motif at 3–5 scales, real product imagery, CSS-only motion. Lock with `--structure landing`.
- **Go experiential** for brand, launch, campaign, portfolio, editorial and event briefs, and whenever the user asks for creative, playful, animated, parallax, immersive or award-level work. Use `--structure experiential` to rule the classic page out, `--bold` to prefer ambitious archetypes (effort M/L, low novelty risk), `--experience <id>` to lock one (e.g. `--experience scroll-scrubbed-sequence` for a product with a physical hero object).
- **Check the fit before committing:** the experience's `needs` must be met by the brief (a configurator needs real options; a scrubbed sequence needs a physical object; a magazine needs editorial content). Read its `avoid_when` and `novelty_risk`. High novelty risk (OS desktop, infinite canvas, chat/terminal) means it only works if executed better than the Framer templates that now sell it, with the client's own content as the apps, tiles or answers.
- **Combine freely:** the experience sets structure and interaction, and the genome sets the look. A Swiss parallax journey and a riso parallax journey are different pages. The rolled `hero` gene shapes the experience's first scene.
- Then read the archetype's recipe in `references/experiences.md`, and open its reference build if it has one (the card's `showcase` path, inside the repo's `showcase/` folder; serve that folder with any static server). Those six pages were built with this skill for one brief and show the patterns in production form: pinned chapter timelines, frame sequences, DOM-synced physics, accessible windows, WebGL fluid with token uniforms, containerAnimation magazines, each with its reduced-motion version.

### 4. Commit and generate tokens
```
python3 scripts/roll.py commit 2
python3 scripts/roll.py css 2 -o tokens.css        # add --fixed to drop the alternate light/dark variant
```
`tokens.css` contains every color (both variants, `prefers-color-scheme` + `data-theme`), the font stacks and display treatment, a fluid type scale from the genome's ratio, spacing, radii, borders, shadows, motion tokens (`--dur-fast/--dur/--dur-slow/--ease` from the motion gene; the roll keeps that gene coherent with the experience), the texture utility, and a base layer (body, headings, links, focus ring, buttons, cards, reduced motion). It prints the `<link>` tags for the fonts. Inline it into single-file artifacts.

Then read `references/genes.md` for your hero, grid and motif genes, and skim the paradigm's `css_moves` in `data/paradigms.json`.

### 5. Plan before code
Write (in your notes) a short plan:
- **Scenes in order**: start from the experience's `structure`, adapted to the content. Each scene gets its purpose, its ground (bg / surface-2 / accent / inverted) and its size. See `references/layout-and-ux.md`.
- ASCII wireframes for desktop and 390px mobile for the first scene and one key interactive scene.
- **The signature move**: the motif + hero combination and the experience's signature moves, and where each appears.
- **The motion map**: the one orchestrated entrance (≤ 900 ms), what each scroll range or interaction drives, the motion gene's durations and easing, and the pause controls needed (anything > 5 s).
- **The reduced-motion version**: one line per scene saying what it becomes (still, stepped sequence, crossfade). It must keep every piece of content and every action.
- **The media plan**: each image, video, sequence or texture, and whether it is supplied, procedural (numpy/PIL/ffmpeg/SVG/shader) or a placeholder, with its size budget.
- **Deliberately not used**: the anti-patterns this brief would tempt (see `references/anti-patterns.md`).
- Copy: headline = outcome in ≤ ~8 words; subline = how, ≈ 15 words; CTA = verb + outcome.

Review the plan against the brief: if any part would appear in a similar plan for a different client, change it.

### 6. Build
- Use only tokens. No new hex values, font sizes, radii or shadows; derive with `color-mix()` and check text contrast with `python3 scripts/colorlib.py contrast "#fg" "#bg"`. This includes SVG fills (`var(--c-*)`), canvas and WebGL (read tokens at runtime and re-read them on the `unclaw:palette` event; recipe B8).
- Semantic HTML, landmarks, one h1, logical heading order; real content; descriptive alt text. Text never lives only in a canvas.
- Implement each gene as specified; keep loudness in ONE place (see genes.md §8).
- Mobile and desktop both designed, not just "responsive". No horizontal scroll; 16px min gutter. Experiences have their own mobile version (see the archetype's `mobile_strategy`).
- States for every interactive element.
- **Motion and media** (rules in `references/motion-and-media.md`, code in `references/experiences.md` Part B):
  - One motion language from the motion tokens, and one orchestrated moment. Everything else answers the user or the scroll. Smooth progress, never hijack scroll; experimental navigation only where the checklist in §3 of that file holds.
  - **The reduced-motion version is mandatory and designed**: no parallax, pins, smooth scroll or autoplay; composed stills instead; full content and action parity. Plus a visible pause control for anything that moves by itself for more than 5 s (WCAG 2.2.2), drag alternatives (2.5.7) and unobscured focus (2.4.11).
  - **No assets? Generate them.** Seamless loops from numpy into ffmpeg, frame sequences as transparent WebP, noise tiles, SVG layers, live shaders. Render media in greyscale and tint it with tokens so the palette (and the customiser) colours it. Use stock or AI media only with the licence notes in §9 of that file.
  - **Budgets:** LCP ≤ 2.5 s with HTML text or a poster as the LCP element; INP ≤ 200 ms; CLS ≤ 0.1; the experience's `perf_budget` for JS and media; canvases paused off-screen; DPR capped.
  - Load libraries at exact versions (GSAP 3.15.0, Lenis 1.3.26, Matter.js 0.20.0, three r186; URLs in recipe B0) and only the plugins you use. Skip them entirely under reduced motion.
- When the output is a claude.ai artifact, also follow the artifact contract of the host (title, theming, allowed CDNs — Google Fonts only, so no Fontshare pairs).
- For a real site (especially in the EU, where a Google Fonts request at page load is a GDPR issue), self-host the pair: `python3 scripts/getfont.py "Family" -o fonts --css fonts.css [--italic] [--pin opsz=14]` fetches it from github.com/google/fonts, subsets it to Latin and writes WOFF2, licence and @font-face rules. Keep fonts ≤ ~300 KB.

### 7. Critique loop (do not skip)
1. `python3 scripts/lint_design.py page.html` — fix every `high`; justify or fix each `med`.
2. Screenshots if a headless browser exists: `python3 scripts/shoot.py page.html` → look at the 1440px and 390px PNGs. For experiences, also capture mid-scroll states and the reduced-motion version (emulate `prefers-reduced-motion: reduce`).
3. Score with `references/critique-rubric.md`; fix the two lowest criteria; then remove one accessory.
4. Repeat until rubric ≥ 28/39 with no zero and lint ≥ 85 (or every remaining flag is requested by the brief).

### 8. Deliver
One line on the direction (e.g. "Parallax scrollytelling × Swiss International × Hanko palette × Archivo superfamily, seven pinned chapters with a seal-red stamp motif"), the file/artifact, and an offer to roll a completely different direction or structure. Don't recap the steps.

## Palette customisation
Every page built with this skill can carry a live palette panel, so the user (or their client) can try other colours without a rebuild:
```html
<script src="palette-engine.js"></script><script src="customizer.js"></script>   <!-- from assets/, at the end of <body> -->
```
- The panel offers Sanzo Wada's 348 combinations, custom colours (1–4) and light/dark/colour grounds; every set it generates is contrast-checked the same way as the libraries. The choice persists in the URL (`?pal=…`) and in localStorage, shared by every page on the origin. Put `<div id="dock"></div>` in your header to host its button; otherwise it floats.
- It works only if **every colour is token-driven**. CSS, inline SVG and icons use `var(--c-*)`. Canvas, WebGL and generated sprites read the tokens at runtime and listen for `document.addEventListener('unclaw:palette', …)` (the event fires after new tokens are applied; `detail.tokens` holds them) to redraw, rebuild sprites or update uniforms. Greyscale media tinted by tokens (blend modes, SVG duotone, gradient-map shaders) recolour for free. Test it: switch to two very different combinations and look for anything that stayed put.
- For a single-file claude.ai artifact, inline both scripts (or publish them as files next to the page).
- User-supplied colours at build time: `python3 scripts/colorlib.py combo "#hex" "#hex" ["#hex" "#hex"] [--mode color|light|dark] --css` keeps them exact as fills and builds the safe token set around them. Want a historical combination from the start? `roll.py --palette-source wada`.

## Variety rules
- Never reuse the previous genome's experience, paradigm, palette or font pair in the same conversation unless asked. "Another version" → `roll.py … --avoid <previous experience>,<paradigm>,<palette>,<fonts>`.
- Experiences are a variety dimension weighted like paradigms: two candidates in one roll rarely share a structure, and the history penalises recently used experiences like everything else. Exception: strict conversion briefs, where several well-made classic landings in different genomes are the right answer.
- "Keep the vibe, change X" → lock the other dimensions with `--experience/--paradigm/--palette/--fonts` and roll; for a single gene, edit that gene in `roll.py show N` output and regenerate tokens. "Same look, more creative" → lock paradigm, palette and fonts and roll with `--structure experiential --bold`.
- Raise `--wild` (2–3) when the user asks for something bold, surprising or award-style; lower it (0–0.5) for conservative clients.
- In claude.ai the history folder resets between conversations; randomness still guarantees variety. In Claude Code it persists across sessions.

## When the user brings their own system
- Brand color → `python3 scripts/colorlib.py brand "#hex" --css` gives contrast-safe light/dark tokens around it; roll with `--palette` omitted and replace the color block. Several brand colours → `colorlib.py combo`.
- Brand fonts → keep them; roll for experience, paradigm and genes; use the rolled pair only as treatment reference.
- Existing design system/components → keep components; use the genome for experience, composition, motif, imagery and rhythm only.

## Several directions for an existing site
When the user wants to choose between redesigns of a real site:
- Leave the live pages alone; build the variants beside them (e.g. `variants/<name>/`), reading the site's own data files so every variant shows the real content.
- Write one small shared core first (data with corrected paths, media player and state, helpers, the draft banner), so each variant only designs. Test the core once on the servers the user actually uses (with and without HTTP byte ranges).
- Roll all variants centrally before building, so they differ on every axis: different experience, paradigm, palette family, font cluster and mode. Lock each with `--experience --paradigm --palette --fonts --mode` and write `tokens.css` into its folder; then build them, in parallel if you can.
- Finish with a picker page: a screenshot of each variant at desktop and phone size, its idea in two sentences, an honest one-line trade-off, and links to each page type. The user compares, then picks or combines.

## Reference map
| need | read |
|---|---|
| which structure/interaction archetype fits, and its data | `python3 scripts/roll.py list experiences`, `data/experiences.json` |
| how to build an archetype; tested code for pins, horizontal tracks, Lenis, CSS scroll-driven, image sequences, Matter.js ↔ DOM, accessible windows, token shaders, View Transitions, font axes, SplitText | `references/experiences.md` |
| motion tokens, scroll-jacking rules, WCAG 2.2 motion checklist, reduced motion, budgets, video/image rules, procedural media commands, licensing | `references/motion-and-media.md` |
| how to build a rolled hero / grid / motif | `references/genes.md` |
| type details, scale, pairing, brand fonts | `references/typography.md` |
| token meanings, dark mode, brand color, contrast | `references/color.md` |
| section planning, composition, UX laws, forms | `references/layout-and-ux.md` |
| what to avoid and how to fix it | `references/anti-patterns.md` |
| scoring before delivery | `references/critique-rubric.md` |
| evidence & numbers behind the rules | `references/research-creative-web.md`, `references/research-youtube.md`, `references/research-canon.md` |
| live palette panel on any page | `assets/palette-engine.js` + `assets/customizer.js` (see "Palette customisation") |
| browse the libraries | `python3 scripts/roll.py list paradigms|palettes|fonts|genes|moods|experiences` |
| validate edits to the experience library | `python3 scripts/roll.py check` |
