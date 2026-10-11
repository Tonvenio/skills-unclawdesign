# Critique rubric — score before you deliver

Run after the first full build and again after fixes. Score each criterion 0–3 (0 missing · 1 weak · 2 solid · 3 excellent). Ship at ≥ 28/39 with no zeros (the same ~72% bar as the former 26/36). Write the scores down in your working notes (not in the reply unless asked) and fix the two lowest first.

| # | criterion | 3 looks like |
|---|---|---|
| 1 | **Brief fit** | Someone could guess the subject/sector from a blurred screenshot. Visual choices trace back to the subject's world. |
| 2 | **Distinctiveness** | Fails the swap test: you could not swap in a competitor's name and keep the page. Zero items from anti-patterns A/B unless requested. Lint score ≥ 85. |
| 3 | **Hierarchy** | Squint test: one dominant element per view, then a clear secondary and tertiary. The primary action is unmistakable. |
| 4 | **Typography** | Scale has ≤ 6 used steps, measure 45–75ch, display tracking/leading tuned, no orphans in headings, figures tabular where numbers align. |
| 5 | **Color discipline** | Only tokens used. Accent ≤ ~10% except in color-blocking/full-ground genes. Every text pair passes (tokens guarantee this — don't invent colors). |
| 6 | **Layout & rhythm** | Grid gene visible and consistent; section rhythm varies (big/compact, light/dark or ground changes); nothing almost-aligned. |
| 7 | **Signature move** | The motif is present 3–5 times at varied scales and is the thing people would remember. Only one loud idea. |
| 8 | **Content & copy** | Real, specific content; CTAs say verb + outcome; no lorem, fake stats or invented logos; empty/error states written. |
| 9 | **Craft details** | States for hover/focus/active/disabled; nested radii correct; icons one style; images consistent grade; no stray values. |
| 10 | **Responsiveness** | Works at 390px and 1440px; hero still answers the 5-second questions on mobile; no horizontal scroll; tap targets ≥ 24px (44px preferred). |
| 11 | **Accessibility floor** | lang, alt, labels, focus-visible, reduced motion, landmarks, heading order, contrast. |
| 12 | **Restraint** | You removed at least one accessory after the first build (Chanel test). Nothing decorative competes with content. |
| 13 | **Experience & motion** | The structure is the rolled experience, not a hero → features → FAQ skeleton (unless it is landing-classic by choice); its signature moves are present. One motion language from the motion tokens and one orchestrated moment; every movement shows a process, cause or state. **Reduced-motion parity:** the reduced version is designed (stills, stepped sequences) and keeps every piece of content and every action. Pause control for anything moving > 5 s; drag alternatives; focus never hidden; within the experience's perf budget. A score of 0 if the reduced-motion version is missing or loses content. |

## Tests to actually run
- **Lint**: `python3 scripts/lint_design.py page.html` — fix every high, justify every remaining med.
- **Screenshot** (if a headless browser is available): render at 1440×900 and 390×844, look at both. With Playwright: `python3 scripts/shoot.py page.html` (writes PNGs). Fonts from Google may not load in sandboxed shells; judge layout and color there, type in the published artifact.
- **Blur/squint**: describe what you see at a glance in the screenshot — is it the intended dominant element?
- **Swap test**: replace the brand name mentally with a competitor. Still fits? → not distinctive yet; push the motif, type or color use.
- **5-second test**: from the hero alone, state who it's for, the value, and the next step. If you can't, rewrite the hero copy before touching styling.
- **Repeat test**: compare against the last design you made in this conversation/history — if it shares experience + paradigm, or paradigm + palette family + font cluster, re-roll.
- **Skeleton test**: list the page's scenes in order. If the list reads hero → features → social proof → pricing → FAQ → footer and the brief was not strict conversion, the experience was ignored. Rebuild the structure from `data/experiences.json`.
- **Reduced-motion parity test**: emulate `prefers-reduced-motion: reduce` (DevTools Rendering tab, or Playwright `reduced_motion="reduce"`). Nothing pins, parallaxes, smooth-scrolls or autoplays; heavy animation libraries aren't downloaded; every heading, paragraph, image and action from the motion version is still there and reachable.
- **Motion budget test**: 4× CPU throttle, scroll every pinned or scrubbed section with the FPS meter on; canvases stop when off-screen and in hidden tabs; LCP element is HTML or a poster (`references/motion-and-media.md` §6 and §10).
- **Palette test** (pages with the customizer): switch to two very different Wada combinations, light and dark; nothing (SVG, canvas, WebGL, video tint) keeps the old colours.
