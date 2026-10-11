# Color system

Read when applying palette tokens, building from a brand color, or doing dark mode.

## Token semantics (every library palette and every `colorlib.py brand` output)
| token | use | guarantee |
|---|---|---|
| `--c-bg` | page ground | — |
| `--c-surface` | raised: cards, popovers, inputs | text ≥ 7:1 |
| `--c-surface-2` | sunken/alternate sections, table zebra, code blocks | text ≥ 7:1, muted ≥ 4.5:1 |
| `--c-border` | dividers, card outlines (decorative) | subtle by design |
| `--c-border-strong` | input outlines, focus-adjacent, essential UI boundaries | ≥ 3:1 on bg (WCAG 1.4.11) |
| `--c-text` | all primary text | ≥ 7:1 on bg/surfaces |
| `--c-text-muted` | secondary text, captions, meta | ≥ 4.5:1 on bg/surfaces |
| `--c-accent` | primary button fill, selected state, key highlight | ≥ 3:1 on bg |
| `--c-accent-hover` | hover/pressed fill | — |
| `--c-accent-ink` | text/icons on accent fills | ≥ 4.5:1 on accent |
| `--c-accent-text` | links and accent-colored text | ≥ 4.5:1 on bg/surfaces |
| `--c-accent-soft` | tinted callouts, selection, subtle highlight backgrounds | text readable on it |
| `--c-accent-2/3` + `-ink` | secondary fills: color blocks, illustration, data series | ink ≥ 4.5:1 on the fill; NOT for text on bg unless checked |
| `--c-focus` | focus ring | ≥ 3:1 on bg and surface |

Rules: never invent a hex value in the build — if you need a new shade, derive it with `color-mix(in oklch, var(--c-…) N%, …)` and run `colorlib.py contrast` when it carries text.

## Proportion
- neutral-plus-accent: ~60–75% bg/surfaces, ~20–30% text and borders, ≤ 10% accent.
- Icons neutral unless they are status; red only for destructive/error (if the palette accent is red, use `--c-text` + an icon for errors and keep red for the brand moment — or roll a different palette for apps with heavy error states).
- Status colors for product UI: derive success/warning/danger with `python3 scripts/colorlib.py brand "#hex"` on fixed hues (≈ 150 green, 75 amber, 25 red in OKLCH) and use their `accent`/`accent-ink`/`accent-soft` roles. Always pair color with an icon or text (color-blind safety).

## Dark mode
- Every palette ships both variants. Dark is designed, not inverted: surfaces get lighter as they rise, lightness steps are wider, text is off-white, the accent is lifted to its lighter step, borders brighter.
- If the design's identity depends on its mode (dark-luxury, full-ground color, terminal), emit fixed tokens: `roll.py css N --fixed -o tokens.css`, and say so.
- Section-level inversion: wrap a section in `data-theme="dark"` or `"light"` to use the opposite variant (inverted-bands gene).

## From a brand color
`python3 scripts/colorlib.py brand "#0a7cff" [--accent2 "#ff6a3d"] [--mode light|dark|color] --css`
outputs a full contrast-checked light+dark token set with neutrals tinted toward the brand hue. The brand color may be shifted in lightness to pass contrast — keep the original for logos and large fills, use the token for UI and text.

## Contrast references
- WCAG 2.x: 4.5:1 body, 3:1 large text (≥ 24px or ≥ 18.66px bold) and UI components.
- APCA (WCAG 3 draft) as a second opinion for dark mode and thin fonts: |Lc| ≥ 75 body, ≥ 60 large/medium text, ≥ 45 large headlines and UI. `colorlib.py contrast` prints both.
- Thin display weights (≤ 300) need more contrast than the ratio suggests — prefer `--c-text` over muted for them.

## Gradients, glows, transparency
- Gradients only inside one object (a hero shape, an illustration, a product render), built from palette tokens, with grain to avoid banding. Never a page-wide indigo→purple wash.
- Glows only on one or two elements in glow-elevation genomes.
- Transparent overlays over images: use a scrim gradient on the calm third, not a full flat overlay.
