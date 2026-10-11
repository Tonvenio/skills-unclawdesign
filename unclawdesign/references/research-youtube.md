# Research digest: rules from web/UI design YouTube creators

Read this when you need the evidence behind a rule, or a concrete number for spacing, type, color, hero or conversion decisions. Every rule is paraphrased and tagged with its source. Sources were read as auto-caption transcripts via mirror sites (YouTube itself was not fetchable), so treat numbers as strong heuristics, not law.

Creators covered: Flux Academy (Ran Segall, Matt Jumper), Kole Jain, Sajid, Malewicz, Jesse Showalter, Tim Gabe, Wes McDowell, Kevin Powell, Juxtopposed, DesignCourse (Gary Simon), Learn UI Design (Erik Kennedy), Self-Made Web Designer (Chris Misterek), The Futur, Mizko, Hyperplexed.

## Contents
1. Layout & grid
2. Spacing & whitespace
3. Typography
4. Color
5. Hierarchy & contrast
6. Hero & above the fold
7. Section rhythm & storytelling
8. Imagery & illustration
9. Motion & interaction
10. Conversion & copy
11. Polish details
12. Amateur mistakes
13. Where creators disagree (and how this skill resolves it)
14. Source list

## 1. Layout & grid
- 12 columns desktop / 8 tablet / 4 mobile, but most sections use only 1–3 visual columns. [Flux "Intro to Layout"; Kole Jain "Every UI/UX Concept"; Self-Made Web Designer "50 Tips"]
- Container max-width ≈ 960–1200px for content (Apple-style showcase up to ~1400px). Never let text or cards run edge-to-edge on wide screens. [Flux; Tim Gabe "Design Better Than 99%"]
- Size columns to content instead of 50/50 — try 2/3 + 1/3 or 9 + 3. [Flux "details that make or break"; Jesse Showalter "Hero Sections"]
- Everything sits on a grid line or shared edge. A grid-break must be an obviously deliberate offset, never "almost aligned". [The Futur critique; Kole Jain "weirdly perfect UI"]
- One alignment axis per block, left by default. Don't mix centered headings with left body text in one group. [Gary Simon "7 Fundamentals"; Flux "5 Beginner Mistakes"]
- Label/value rows, pricing and tables: labels left, numbers right so digits line up (use tabular figures). [Kole Jain]

## 2. Spacing & whitespace
- One scale for spacing, sizes and radii: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128. No one-offs like 13px or 27px. [Flux; Malewicz "Ultimate Guide"]
- Spacing encodes relationship: 8–16px inside a group, 24–32px between groups, ~2× the in-group gap before a button. [Malewicz; Tim Gabe]
- Nesting rule: container padding ≥ gap between groups ≥ gap inside a group. Card padding ≈ gap between cards. [Sajid "Perfect Spacing"]
- Desktop marketing sections: ~96–160px vertical padding; ≥80px between a text group and an adjacent image. [Tim Gabe]
- Button padding: horizontal ≈ 2× vertical (e.g. 0.7em × 2em). [Kevin Powell; Gary Simon; Malewicz]
- Hero stack: ~12px eyebrow→headline (if an eyebrow is truly needed), ~8px headline→subtext, ~32px subtext→buttons. [Kole Jain]
- Prose rhythm in em (headings hug their content); components in rem + `gap`. [Kevin Powell]

## 3. Typography
- Start with one family; add a second only when it expresses a different brand trait. [Jesse Showalter; Erik Kennedy "Pairing fonts the EASY way"]
- ≤ ~6 sizes per landing page, 3–4 per section. Body 16–18px; nothing under 12px. [Kole Jain; Malewicz; Juxtopposed]
- Step sizes by ~1.25–2×; H1 can reach 4–6× body. Strong scale contrast reads intentional. [Flux "Massive Text"; Erik Kennedy]
- Tracking: large headlines −1% to −4% (≈ −0.02em typical); small caps labels +0.04–0.1em; body 0. [Flux; Erik Kennedy; Kole Jain]
- Line-height: display 0.95–1.2, body 1.4–1.65; smaller text needs relatively more. [Flux; Jesse Showalter; Kevin Powell]
- Measure: 50–75 characters (≈ 600px max for body). [Tim Gabe; Wes McDowell]
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs. [Kevin Powell]
- Fluid display type with `clamp()` that includes a rem term; never raw `vw` for body. [Kevin Powell]
- No thin/light weights for UI text. [Malewicz; Flux]

## 4. Color
- Neutrals + one accent; accent ≈ 10% of surface, reserved for primary CTA and active states. Icons neutral; red only for destructive/error. [Malewicz; Sajid; Kole Jain "7 Color Mistakes"]
- Marketing page: 3–5 neutral steps. Product UI: ~4 surface layers, 1–2 border tones, 3 text tones. [Kole Jain "60-30-10 is ruining"]
- Text tiers by lightness: headings ≈ L 11–15%, body ≈ 15–25%, secondary ≈ 35–45% (still ≥ 4.5:1). [Kole Jain; Material 87/60 opacity via Self-Made Web Designer]
- Tint neutrals toward the brand hue (OKLCH chroma ~0.005–0.02) instead of pure gray. Borders as light tints, not dark hairlines. [Kole Jain; Flux]
- Work in OKLCH/HSL; UI chroma ≤ ~0.15–0.2. Extra hues: fix L and C, rotate hue ~25–30°. Accent is a scale (base / hover / link steps). [Sajid "Pick UI Colors"; Kole Jain]
- Dark mode is its own palette: surfaces get lighter as they rise, lightness gaps ~2× wider than light mode, body text below pure white, brand color shifted to its lighter step. [Sajid; Kole Jain]
- Tone-match: palette colors share similar saturation/brightness; avoid both pastel mush and full saturation. [Flux "Select Colors"; Malewicz]
- WCAG AA: 4.5:1 body, 3:1 large text and UI components. [Gary Simon]

## 5. Hierarchy & contrast
- Each section has one dominant, one secondary, one tertiary element. [Flux; The Futur]
- One entry point per view: one element bold, one in accent, everything else muted. [Sajid "Biggest Lie in UI Design"; Kole Jain]
- One primary CTA, at most one secondary (outline/ghost). Primary is never ghost. [Flux Ep 12; Self-Made Web Designer]
- Never style information like a button; interactive things are unmistakable (fill/stroke, pointer, visible hover). [Flux "4 Mistakes"]
- 5-second scan test per section: what is it, why should I care, what next. [Kole Jain "Captivating Sections"; Tim Gabe]

## 6. Hero & above the fold
- Answer within ~5 seconds: who is this, what's in it for me, what do I do next. [Flux "Good Hero"; Wes McDowell]
- Headline = outcome in ≤ ~7 words; subhead = how, ≈ 14 words. [Kole Jain; Wes McDowell; Flux]
- Hero visual = the real product or outcome (cropped UI, live demo, actual result), not decorative stock. [Kole Jain "4 Levels"; Sajid; Flux]
- Conversion pages: copy left, visual right is the safe default; centered stacks are for single strong statements. [Wes McDowell; Sajid]
- Social proof in or right under the hero, with a named source. [Flux; Wes McDowell]
- Hero shorter than 100vh so the next section peeks (avoid the "false floor"). [Jesse Showalter; Websites Decoded]
- Text over images only on calm areas; fade/progressive blur rather than a flat full-bleed overlay. [Flux Ep 12; Kole Jain]
- Desktop nav visible, ≤ 5 items; the rest goes to the footer. [Flux; Wes McDowell]

## 7. Section rhythm & storytelling
- Conversion default order: hero → proof strip → benefits → features with product visuals → testimonials → how it works → offer/pricing → FAQ (objections) → final CTA → footer. [Flux; Wes McDowell; Tim Gabe]
- Section anatomy: outcome headline, a fresh-angle line, product visual, proof point, CTA. [Tim Gabe]
- Vary rhythm: alternate large and compact sections; break the image-left/text-right zigzag at least once. [Kole Jain; Tim Gabe]
- Replace emoji-in-rounded-square feature cards with tiles showing real pieces of the product. [Sajid; Kole Jain]
- Pick one motif (shape, texture, metaphor) as the star and echo it in small ways down the page. [Erik Kennedy; Self-Made Web Designer]
- A CTA within ~one scroll of any point; repeat it after the FAQ. [Flux; Wes McDowell]

## 8. Imagery & illustration
- One visual language: one illustration style, consistent photo light/grade/angle, image radii matching the shape system. [Flux "Fixing in 5 minutes"; Kole Jain]
- Real people/products, natural expressions; gaze toward the headline or CTA. [Wes McDowell; Self-Made Web Designer]
- One icon set, one style, ~1.5px stroke, sized to line-height. Never emoji as UI icons. [Malewicz; Flux; Kole Jain "Vibe Code mistakes"]
- Decorative shapes lower in contrast so they never compete with content. [Flux]

## 9. Motion & interaction
- Animate to direct attention or explain the product — not by default. Prefer settle/pop reveals over uniform fades. [Kole Jain]
- State transitions 200–300ms, ease-out or spring; press = slight scale-down. 3D tilt: perspective ≈ 800px. [Sajid "Web Animations"; Kole Jain "11 Micro Animations"]
- Every interactive element: default, hover, pressed, focus-visible, disabled, loading. [Kole Jain]
- Avoid fixed-attachment backgrounds, busy video behind text, particle backgrounds. [Gary Simon; DesignCourse]

## 10. Conversion & copy
- CTA names the action + outcome ("Book a free consultation"), never "Submit", "Click here", bare "Learn more". One CTA per view converts best (Tim Gabe cites 13.5% → 11.9% → 10.5% for 1/2/3 CTAs). [Wes McDowell; Tim Gabe]
- Outcomes over specs; clear over clever; real copy, never lorem ipsum, fake logos or invented stats. [Kole Jain; Wes McDowell; Sajid; Juxtopposed]
- Write for skimmers: 2–3-sentence paragraphs, a few key phrases bold. [Wes McDowell]
- Forms: single column, visible labels (not placeholder-only), minimum fields, mark the optional ones. [Malewicz; DesignCourse]

## 11. Polish details ("why it looks premium")
- Shadows: low opacity, large blur, one light source; layer a short tight shadow with a long soft one. If you notice the shadow first, it's wrong. [Kole Jain; Jesse Showalter; Sajid]
- Depth through light: 1px top inner highlight on raised elements; elevation via lighter surfaces; secondary elements tinted with the accent at ~5%. [Erik Kennedy; Sajid; Tim Gabe]
- Texture: subtle grain (SVG feTurbulence at low opacity) on gradients/backgrounds; glow from a scaled, blurred copy of a hero shape; glass ≈ 20% fill + backdrop blur. [Juxtopposed "grainy textures"; Kole Jain; Erik Kennedy]
- Radii by tier; nested radius: outer = inner + padding. [Kole Jain; Kevin Kwok]

## 12. Amateur mistakes
- Too many fonts; nav links as big as the logo; inconsistent casing. [Flux]
- "Vibe-coded" tells: emoji icons, indigo→purple gradients, gradient-circle letter avatars, repeated identical KPI blocks, 5+ competing accents, harsh default shadows. [Kole Jain "5 SaaS mistakes"; Sajid]
- Everything the same size/weight; minimalism with no context. [Flux]
- Pure-black body text on pure white, mid-gray page backgrounds, centered paragraphs longer than 3 lines, white text on busy light photos. [Jesse Showalter; Gary Simon; Flux]

## 13. Where creators disagree — and the resolution this skill uses
1. **60-30-10 vs. layered neutrals.** Resolution: neutrals + scarce accent always; a "30% secondary color" only when the paradigm calls for it (e.g. Bauhaus, Memphis, Pop).
2. **One family vs. a pairing.** Resolution: product UI → one family (or superfamily); brand-led marketing → a pair whose faces express *different* traits.
3. **Conventional vs. expressive hero.** Resolution: the brief's *job* decides — lead-gen/service/SaaS conversion pages use the conservative structure; launches, studios, portfolios, culture may go expressive. The genome's `hero` gene is filtered by this.
4. **8pt vs. 4pt vs. rem.** Resolution: any consistent scale; this skill uses a 4px base with an 8-step-dominant scale in rem.
5. **Minimal vs. rich.** Resolution: richness is allowed when it serves hierarchy; decoration must never compete with content. Spend boldness in one place.
6. **Hero CTA and height.** Resolution: specific primary CTA + hero that does not fill exactly 100vh.

## 14. Source list (abridged)
Flux Academy: Creating a Good Hero (Ep 10); Intro to Layout (Ep 6); UX/UI Best Practices (Ep 12); The details that make or break your web design; Why Web Designers Use Massive Text; Perfect Landing Page Design Explained; 4 Web Design Mistakes; 5 Common Beginner Mistakes; Fixing web designs in 5 minutes; How To Select Colors.
Kole Jain: 7 UI/UX mistakes that scream beginner; The 7 Color Mistakes; Why the 60-30-10 Rule is Ruining Your UI; The secret behind weirdly perfect UI; Formula Behind Captivating UI Sections; Stupid simple way to learn UI/UX; 5 SaaS mistakes that scream vibe code; Every UI/UX Concept in 10 Minutes; 11 Micro Animations; 4 UI Design Hacks; 3 Dashboard UI flaws; The 4 Levels of Landing Page Design.
Sajid: The Biggest Lie in UI Design; Design Premium Websites; Pick Perfect Spacing; Pick UI Colors; Fix Boring UIs; Web Animations.
Malewicz: 5 Quick UI/UX Tips; Ultimate Guide to UI Design.
Jesse Showalter: 5 Tips; 5 More Tips; 10 Tips for Better Hero Sections.
Tim Gabe: Design Better Than 99%; Boost Your Website Conversions; 9 Secrets to Beautiful Landing Pages.
Wes McDowell: Why Is This the Perfect Website Layout?; Proven Website Formula; 7 Things to Remove; Copy This Landing Page; These New Website Layouts; 8 Keys to a Highly Effective Website.
Kevin Powell: Margin and Padding Deep Dive; Responsive Typography; One line of CSS for better typography; Strategies for Margins, Padding, Gaps.
Juxtopposed: World's shortest UI/UX course; Grainy textures for a week; Stop "Learning" Design.
DesignCourse / Gary Simon: 20 Tips; 7 Fundamentals (Scrimba); Reviewing Your Website Designs Live.
Learn UI Design (Erik Kennedy): Top 8 Advanced UI Tips; Pairing Fonts the Easy Way; 3 Tips from a Gorgeous Landing Page.
Self-Made Web Designer: 50 Tips; 6 Easy Tips to 10x Any Site; 11 Years in 7 Minutes.
