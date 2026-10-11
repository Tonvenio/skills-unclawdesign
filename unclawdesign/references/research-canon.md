# Research digest: the written canon behind the rules

Read when you need the source or reasoning behind a rule in this skill, or want to cite it to the user.

| area | source | what this skill takes from it |
|---|---|---|
| UI craft | *Refactoring UI* — Adam Wathan & Steve Schoger (refactoringui.com) | Hierarchy via weight and color before size; start with too much whitespace; constrain choices with systems (type scale, spacing scale, shades); two-part shadows; never gray text on colored backgrounds — tint toward the ground instead; labels are a last resort; emphasize by de-emphasizing. |
| UX psychology | *Laws of UX* — Jon Yablonski (lawsofux.com) | Jakob, Fitts, Hick, Miller, Doherty, Aesthetic-Usability, Von Restorff, Serial Position, Peak-End, Goal-Gradient, Tesler, Gestalt laws — translated in `layout-and-ux.md`. |
| Usability | Nielsen Norman Group — 10 Usability Heuristics; F-pattern and layer-cake scanning; banner blindness (nngroup.com) | Front-load headings, descriptive labels, visible status, error prevention and recovery, conventional navigation. |
| Typography | *Practical Typography* — Matthew Butterick (practicaltypography.com) | Body size and measure, line spacing 120–145% for text, real quotes/dashes, no fake small caps, underlines and emphasis discipline. |
| Typography | *The Elements of Typographic Style* — Robert Bringhurst | Modular scales from musical intervals (minor third 1.2 … octave 2.0), 45–75 character measure, leading and rhythm, figures and ligatures. |
| Fluid systems | Utopia — James Gilbertson & Trys Mudford (utopia.fyi) | Fluid type and space scales interpolated between a min and max viewport with `clamp()`; implemented in `tokens.py`. |
| Layout | *Every Layout* — Heydon Pickering & Andy Bell (every-layout.dev) | Intrinsic layout primitives (stack, cluster, sidebar, switcher, cover, grid), `ch`-based measure, avoiding breakpoint soup. |
| Grids | *Grid Systems in Graphic Design* — Josef Müller-Brockmann | Modular and hang-line grids, asymmetric balance, objective typography (the Swiss paradigm). |
| Color | OKLCH in CSS Color 4; Radix Colors 12-step scale semantics (radix-ui.com/colors); Material 3 tonal palettes | Perceptual lightness for generating scales; role-based tokens (bg, surface, border, text, solid, solid-text); dark mode as its own scale. |
| Contrast | WCAG 2.2 (w3.org/TR/WCAG22); APCA (git.apcacontrast.com) | 4.5:1 / 3:1 / non-text 3:1, focus visible, target size ≥ 24px; APCA Lc as a second opinion for dark mode and thin type. |
| Color perception | *Interaction of Color* — Josef Albers | Colors change with their neighbors; test palettes in place, not as isolated swatches. |
| Motion | WCAG 2.3.3 / `prefers-reduced-motion`; Material motion; Apple HIG | Motion explains change; durations 100–300ms for UI; one orchestrated moment; respect reduced motion. |
| AI-design tells | Kole Jain, "5 SaaS UI/UX mistakes that scream you vibe code"; The Fountain Institute, "7 Tells that a UI is AI-Generated"; CodeMySpec, "How to keep your website from looking like every other vibe-coded website"; Prg.sh, "Why your AI keeps building the same purple gradient website"; Anthropic's own frontend-design guidance on Claude's defaults | The anti-pattern catalogue and `lint_design.py`. |
| Video creators | See `research-youtube.md` (Flux Academy, Kole Jain, Sajid, Malewicz, Jesse Showalter, Tim Gabe, Wes McDowell, Kevin Powell, Juxtopposed, DesignCourse, Learn UI Design, Self-Made Web Designer, The Futur) | Concrete numbers for spacing, type, hero and conversion structure. |
| Design history | Movement histories for the 41 paradigms (Bauhaus, Constructivism, Art Deco, Swiss Style, Memphis, Emigre/Ray Gun, Y2K, Frutiger Aero, Solarpunk, …) | Defining traits and CSS translations in `data/paradigms.json`. |

## Method notes
- Fonts: every Google family in `data/fonts.json` was verified against `google/fonts` METADATA.pb (name, styles, weights, axes); CSS URLs are generated from that metadata, not typed by hand.
- Palettes: seeds were hand-chosen in OKLCH; all tokens were generated and verified by `scripts/colorlib.py` (WCAG ratios + APCA), and screened against known AI-default combinations.
- YouTube: transcripts were read via mirror sites (YouTube itself was not fetchable); numbers were kept only when clearly stated or confirmed by several creators.
