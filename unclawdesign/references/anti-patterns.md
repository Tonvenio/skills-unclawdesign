# Anti-patterns — the "default AI design" catalogue

Read before planning (to avoid) and before delivering (to audit). `scripts/lint_design.py` detects most of these automatically. Every item is legitimate when the brief explicitly asks for it — then do it on purpose and say so.

## A. The Claude-specific defaults
These are the looks Claude itself converges on. They are the first thing this skill exists to escape.
1. Warm cream background (≈ #F4F1EA) + high-contrast serif display + terracotta/clay accent (≈ #D97757 — Anthropic's own accent).
2. Near-black (#0B0B0B, #111) + one acid-green or vermilion accent.
3. Broadsheet layout: hairline rules, zero radius, dense newspaper columns, small-caps kickers.
4. The SaaS card kit: identical rounded cards, one radius everywhere, the same rgba(0,0,0,.1) shadow, gradient washes.
5. Template chrome on every heading: tracked ALL-CAPS eyebrow, meta strings joined with " · ", "WORD — fragment" labels with spaced em dash, a monospace face for tiny data labels, "→" appended to every link and button.
6. Accenting one word in the headline (italic, bold, gradient or accent color).
7. Numbered markers 01 / 02 / 03 on content that is not a sequence.
8. A fade-and-slide-up entrance on every section; hover lift on every card.
9. Big number + tiny label + gradient accent as the "stats" block.

## B. The vibe-coded web at large (2024–26)
Sources: Kole Jain "5 SaaS UI/UX mistakes that scream vibe code"; Sajid "Design Premium Websites"; The Fountain Institute "7 Tells that a UI is AI-Generated"; CodeMySpec "vibe-coded websites look the same"; Prg.sh "Why your AI keeps building the same purple gradient website".
1. Blue→indigo→purple gradients on hero, buttons, headings; colored glow shadows.
2. Aurora/radial glow blobs behind the hero; dark mode glow for mood with no function.
3. Inter (or Poppins/Space Grotesk/DM Sans) for everything.
4. Centered hero + small pill badge ("✨ Introducing…") + two buttons + logo row.
5. Three identical feature cards with a centered emoji/icon in a rounded square.
6. Emoji as icons, bullets and decoration.
7. Glassmorphism cards on everything; nested cards inside cards.
8. 5+ saturated accent colors with no hierarchy; rainbow side-stripes on cards; status dots everywhere.
9. Identical section order on every page: hero → features → social proof → pricing → FAQ → footer, with the same visual weight per section.
10. Generic copy: "Get started", "Learn more", "Supercharge / Elevate / Unlock / Seamless / Empower / Revolutionize", invented stats, fake testimonials, fake logos.
11. Gradient-circle letter avatars; repeated identical KPI tiles.
12. Hero exactly 100vh (false floor).

## C. Classic amateur mistakes
1. Too many typefaces or sizes; no scale.
2. Everything the same weight; no dominant/secondary/tertiary element.
3. Pure black body text on pure white at large sizes for long reading (prefer the generated `--c-text`).
4. Mid-grey text on colored grounds; gray text on saturated backgrounds.
5. Centered paragraphs longer than 3 lines; lines longer than ~75 characters.
6. Placeholder-only form labels; tiny tap targets (< 24px).
7. Text over busy image areas; flat 50% black overlays.
8. Decoration that competes with the content.
9. Inconsistent radii, shadows and icon styles.
10. No focus styles; motion without reduced-motion handling.

## D. Fix table
| tell | do instead |
|---|---|
| purple gradient | a palette from the library; gradients only inside one object, built from palette tokens |
| Inter everywhere | a rolled font pair; if a neutral sans is truly right, pick a characterful one (Hanken Grotesk, Host Grotesk, Instrument Sans, Geist, Onest) |
| identical cards | vary tile sizes (bento), or drop cards: use rules, columns, or list layouts |
| eyebrow labels | delete them; let the heading say it. Keep at most one meaningful label system (e.g. chapter numbers in an editorial) |
| emoji icons | one icon set in one style, or geometric glyphs, or no icons |
| glow blobs | one motif from the genome, used 3–5 times |
| fade-up everywhere | one orchestrated moment; responsive motion for interactions |
| generic CTA | verb + outcome: "Book a 20-minute review", "See your fund structure" |
| 01/02/03 | real sequences only; otherwise headings |
| cream + terracotta | any other palette — the library screens these out automatically |
