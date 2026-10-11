# Layout, composition and UX laws

Read when planning the page structure (step 3) and when critiquing hierarchy or usability.

## Page planning — content first
1. List the content you actually have (or can truthfully write): claims, proof, product facts, people, numbers with sources, FAQs, legal bits.
2. Decide the **job** of the page and the ONE action. Everything is ordered to make that action obvious.
3. Choose section order by job:
   - conversion: hero (value + action) → proof strip → problem/outcome → how it works (real sequence) → product detail with visuals → proof (testimonials with names, results) → offer/pricing → objections (FAQ) → final action → footer.
   - brand/portfolio: hero statement → work (the thing itself, big) → approach/values → people → contact.
   - editorial: cover → lead story → secondary stories in varied spans → newsletter/next.
   - product UI/dashboard: navigation model → primary task surface → secondary panels → empty/loading/error states.
   - docs: sidebar navigation → reading column → on-page TOC → next/previous.
4. Vary rhythm: alternate large and compact sections; change ground (bg / surface-2 / accent / inverted band) at least twice per page; break the zigzag image-left/text-right pattern at least once.
5. Sketch an ASCII wireframe for desktop and mobile before writing code.

## Composition
- One dominant, one secondary, one tertiary element per view (squint test).
- Proximity encodes relationship: inside group < between groups < between sections (tokens: `--space-*`, `--gap`, `--section-pad`).
- Align to the grid or break it obviously (≥ one column or ≥ 48px) — never "almost aligned".
- Give images and type room to breathe; whitespace is a material, not leftover.
- Center content in a container (`--container`) but let images, color bands and display type bleed when the paradigm wants energy.
- Labels left, numbers right, decimals aligned; tabular figures.

## UX laws translated into instructions (Laws of UX, NN/g)
- **Jakob's law**: keep conventions where users expect them (logo top-left links home, nav top, cart top-right, search findable). Be distinctive in visuals, conventional in navigation.
- **Fitts's law**: primary actions large and near the thumb/eye path; targets ≥ 24px (WCAG 2.2), prefer 44px on touch.
- **Hick's law**: one primary action per view; ≤ 5–7 nav items; progressive disclosure for options.
- **Miller / chunking**: group information in chunks of 3–5 (lists, steps, pricing tiers).
- **Von Restorff**: the thing that must be remembered is the one thing that looks different (motif, accent).
- **Serial position**: put key information first and last (hero and final CTA carry the message).
- **Peak-end**: design one delightful peak (the signature move) and a clean ending (final CTA/footer).
- **Goal-gradient**: show progress in multi-step flows; start progress bars with a head start.
- **Doherty threshold**: respond to input within 400ms; show skeletons/optimistic UI.
- **Aesthetic-usability effect**: polish raises perceived usability — but never at the cost of clarity.
- **Tesler's law**: absorb complexity into the system (smart defaults, prefilled fields), not onto the user.
- **Gestalt (proximity, similarity, common region, Prägnanz)**: use spacing before borders, consistent styling for same-function items, containers only where grouping is unclear, simple shapes.
- **NN/g heuristics**: visible system status, match the real world in language, user control (undo, cancel), consistency, error prevention, recognition over recall, flexibility (shortcuts), minimalist design, helpful error messages, help where needed.
- **Scanning patterns**: people scan in F/layer-cake patterns — front-load headings and first words; make headings descriptive, not clever.

## Forms and product UI
- Single column, labels above fields, helper text below, errors inline with how to fix, mark optional fields.
- Every interactive element has default, hover, active, focus-visible, disabled, loading.
- Empty states invite action; errors explain and direct; success confirms with the same verb as the action ("Publish" → "Published").
- Keyboard: logical tab order, visible focus, Esc closes overlays, shortcuts for power users in product paradigms.

## Responsive
- Design mobile and desktop deliberately: decide what the hero becomes at 390px (often: headline + action first, visual second, cropped).
- Use container queries for components (bento tiles, cards) and fluid tokens for type/space.
- Collage/broken-overlap layouts become ordered stacks on mobile; marquees slow down; horizontal sections become native swipe.
- No horizontal page scroll; 16px minimum side gutter.
