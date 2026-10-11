# Typography system

Read when setting type for the build, choosing between pairs manually, or when the user supplies brand fonts.

## Choosing and using the pair
- The rolled pair's `contrast_logic` explains why it works. Keep that logic: display carries personality, body carries reading. If you override, the two faces must differ in at least one of: classification (serif/sans/mono), width, contrast, or era — and must not fight in x-height.
- One family (superfamily) is right for product UI and Swiss/utilitarian paradigms; a pair is right for brand-led marketing. Mono appears only for code, data, measurements or a deliberate terminal paradigm — never as decorative micro-labels.
- Load only the weights you use. Variable fonts: request the range once (the library URLs already do this).
- Overused families (Inter, Roboto, Poppins, Montserrat, Space Grotesk, Playfair Display, Fraunces, Instrument Serif, DM Sans/Serif, Cormorant Garamond, Lora, Merriweather, IBM Plex, JetBrains Mono) are excluded as display faces. Use them only when the brand already owns them.

## Scale and size
- tokens.css provides `--step-m2 … --step-6`, fluid between 360px and 1440px, from the genome's ratio. Map roles once and stick to them:
  - body `--step-0` (16–18px), small/meta `--step-m1` (never below 12px), h3 `--step-2`, h2 `--step-4`, h1/display `--step-5`–`--step-6`, poster heroes may go beyond with an explicit clamp.
- Use ≤ 6 steps on a page and ≤ 4 within a section.
- Big scale contrast reads intentional; timid scale (h1 only 1.5× body) reads templated — except in product UI (ratio 1.2).

## Measure, leading, tracking
- Measure 45–75 characters (`max-width: 64ch` sans, `68ch` serif). Hero sublines ≈ the headline's width.
- Leading: display 0.85–1.1 (tighter as size grows), headings 1.1–1.25, body 1.5–1.7 (serif bodies more), small text relatively more.
- Tracking: display −0.01 to −0.05em (more negative as size grows); uppercase labels +0.04 to +0.1em; body 0. The pair's `display_treatment` gives a tuned start value.
- `text-wrap: balance` on headings; `text-wrap: pretty` on paragraphs; avoid single-word last lines in headlines by editing copy, not only CSS.

## Details that separate pros from templates
- `font-variant-numeric: tabular-nums` for tables, prices, timers, stats; `oldstyle-nums` in serif running text where the font supports it.
- Real quotes and apostrophes (“ ” ‘ ’), en dash for ranges (2019–2026), em dash without spaces in English (with spaces in German typesetting convention: Gedankenstrich – mit Leerzeichen), non-breaking space before units and in names.
- `hanging-punctuation: first` for pull quotes (Safari) and optical outdent of opening quotes.
- Drop caps with `initial-letter: 3` (with a fallback) only in editorial paradigms.
- Italic for emphasis inside running text; never italicize a single word of a headline for decoration.
- Underlines: `text-underline-offset: .18em; text-decoration-thickness: .06em` — thicker on hover.
- Language: set `<html lang>`; for German, `hyphens: auto` helps long compounds in narrow columns.

## Display type as image
- When a paradigm wants type as the visual (poster-type, kinetic, Swiss): set one word or line enormous, crop it with the viewport edge or the container, overlap an image, or run it vertically (`writing-mode: vertical-rl`) — but keep the full sentence readable in the DOM.
- Outline type (`-webkit-text-stroke`) only for very large single words.
- Variable axes are expressive tools: `wdth` (Archivo, Anybody, Bricolage), `opsz` (Newsreader, Bodoni Moda, Bricolage), `YEAR` (Climate Crisis), `ROTA` (Tilt Warp), `BNCE` (Shantell Sans), `slnt` (Gluten). Animate an axis once for a signature moment.

## Brand fonts supplied by the user
Use them. Find the closest library cluster to the brand face (e.g. a geometric sans → geometric-modern), roll with `--fonts` disabled and `--avoid` nothing, then replace the rolled family names in tokens.css with the brand stack while keeping the rolled treatment numbers as a starting point.
