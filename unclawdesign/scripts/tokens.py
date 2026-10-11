#!/usr/bin/env python3
"""tokens.py — turn a genome into a complete token stylesheet + base layer (colors, type, space, shape, depth, texture, motion)."""
import json, math
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
def _load(n): return json.load(open(DATA / n, encoding="utf-8"))

def _by(items, i): return next(x for x in items if x["id"] == i)

def _fluid(min_px, max_px, vmin=360, vmax=1440):
    slope = (max_px - min_px) / (vmax - vmin)
    inter = min_px - slope * vmin
    return f"clamp({min_px / 16:.3f}rem, {inter / 16:.3f}rem + {slope * 100:.3f}vw, {max_px / 16:.3f}rem)"

RADII = {
 "sharp": dict(sm="0", md="0", lg="0", ctl="0"),
 "crisp": dict(sm="2px", md="3px", lg="4px", ctl="3px"),
 "soft": dict(sm="6px", md="10px", lg="14px", ctl="8px"),
 "round": dict(sm="12px", md="20px", lg="28px", ctl="999px"),
 "pill-controls": dict(sm="4px", md="4px", lg="6px", ctl="999px"),
 "tiered": dict(sm="4px", md="12px", lg="28px", ctl="10px"),
 "organic": dict(sm="10px", md="22px", lg="62% 38% 46% 54% / 50% 40% 60% 50%", ctl="999px"),
 "chamfered": dict(sm="0", md="0", lg="0", ctl="0"),
 "arched": dict(sm="6px", md="10px", lg="999px 999px 0 0", ctl="999px"),
}
SHADOWS = {
 "flat": ("none", "none"), "tonal": ("none", "none"),
 "soft-layered": ("0 1px 2px color-mix(in oklch, var(--c-text) 8%, transparent), 0 4px 12px color-mix(in oklch, var(--c-text) 6%, transparent)",
                  "0 2px 4px color-mix(in oklch, var(--c-text) 8%, transparent), 0 18px 40px color-mix(in oklch, var(--c-text) 10%, transparent)"),
 "hard-offset": ("4px 4px 0 var(--c-text)", "8px 8px 0 var(--c-text)"),
 "emboss": ("inset 0 1px 0 color-mix(in oklch, white 55%, transparent), inset 0 -2px 0 color-mix(in oklch, var(--c-text) 10%, transparent), 0 2px 6px color-mix(in oklch, var(--c-text) 10%, transparent)",
            "inset 0 1px 0 color-mix(in oklch, white 60%, transparent), inset 0 -3px 0 color-mix(in oklch, var(--c-text) 12%, transparent), 0 12px 28px color-mix(in oklch, var(--c-text) 14%, transparent)"),
 "glow": ("0 0 0 1px color-mix(in oklch, var(--c-accent) 45%, transparent), 0 0 18px color-mix(in oklch, var(--c-accent) 30%, transparent)",
          "0 0 0 1px color-mix(in oklch, var(--c-accent) 55%, transparent), 0 0 48px color-mix(in oklch, var(--c-accent) 38%, transparent)"),
 "paper-stack": ("0 1px 2px color-mix(in oklch, var(--c-text) 12%, transparent)",
                 "0 1px 2px color-mix(in oklch, var(--c-text) 12%, transparent), 6px 6px 0 -1px var(--c-surface), 6px 6px 0 0 var(--c-border)"),
}
BORDERS = {"none": ("0", "solid"), "hairline": ("1px", "solid"), "thick-ink": ("3px", "solid"), "double": ("6px", "double"),
           "dashed": ("1.5px", "dashed"), "inset-frame": ("1px", "solid")}
MOTION = {"still": ("0ms", "120ms", "0ms", "ease"), "subtle": ("150ms", "220ms", "600ms", "cubic-bezier(.2,.7,.2,1)"),
          "snappy": ("120ms", "180ms", "320ms", "cubic-bezier(.34,1.56,.64,1)"), "kinetic-type": ("150ms", "250ms", "900ms", "cubic-bezier(.65,0,.35,1)"),
          "playful": ("140ms", "260ms", "500ms", "cubic-bezier(.34,1.8,.64,1)"), "cinematic": ("200ms", "400ms", "1200ms", "cubic-bezier(.16,1,.3,1)"),
          "mechanical": ("80ms", "120ms", "400ms", "steps(6, end)")}
DENSITY = {"airy": (_fluid(80, 176), _fluid(24, 40), 18), "balanced": (_fluid(64, 128), _fluid(20, 32), 17), "dense": (_fluid(40, 72), _fluid(14, 24), 16)}

GRAIN = ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E"
         "%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E"
         "%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")")
TEXTURE = {
 "none": "",
 "grain": f".tex {{ position: relative; isolation: isolate; }}\n.tex::after {{ content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-image: {GRAIN}; opacity: .07; mix-blend-mode: multiply; }}",
 "paper": f".tex {{ position: relative; isolation: isolate; }}\n.tex::after {{ content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-image: {GRAIN}, radial-gradient(ellipse at center, transparent 55%, color-mix(in oklch, var(--c-text) 7%, transparent)); opacity: .09; mix-blend-mode: multiply; }}",
 "halftone": ".tex { background-image: radial-gradient(color-mix(in oklch, var(--c-text) 18%, transparent) 1.2px, transparent 1.4px); background-size: 7px 7px; }\n.halftone-img { mask-image: radial-gradient(#000 1.6px, transparent 1.8px); mask-size: 5px 5px; }",
 "dot-grid": ".tex { background-image: radial-gradient(color-mix(in oklch, var(--c-text) 16%, transparent) 1px, transparent 1.2px); background-size: 22px 22px; }",
 "graph-grid": ".tex { background-image: linear-gradient(color-mix(in oklch, var(--c-text) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--c-text) 7%, transparent) 1px, transparent 1px), linear-gradient(color-mix(in oklch, var(--c-text) 13%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--c-text) 13%, transparent) 1px, transparent 1px); background-size: 8px 8px, 8px 8px, 40px 40px, 40px 40px; }",
 "scanlines": ".tex { position: relative; }\n.tex::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, color-mix(in oklch, var(--c-text) 5%, transparent) 0 1px, transparent 1px 3px); }",
 "mesh-gradient": ".mesh { background: radial-gradient(60% 60% at 25% 30%, var(--c-accent) 0, transparent 60%), radial-gradient(50% 50% at 75% 60%, var(--c-accent-2, var(--c-accent-soft)) 0, transparent 60%), var(--c-surface); filter: saturate(1.05); }  /* ONE object only, never the page */",
 "riso-misregister": ".riso { text-shadow: 3px 2px 0 color-mix(in oklch, var(--c-accent-2, var(--c-accent)) 85%, transparent); }\n.riso-layer { mix-blend-mode: multiply; }",
 "noise-gradient": f".tex {{ background-image: {GRAIN}, linear-gradient(160deg, var(--c-surface), var(--c-surface-2)); background-blend-mode: soft-light, normal; }}",
}

def genome_css(g, fixed=False):
    pal = _by(_load("palettes.json")["palettes"] + _load("palettes-wada.json")["palettes"], g["palette"])
    fonts = _load("fonts.json")
    fp = _by(fonts["pairs"] + fonts.get("fontshare_pairs", []), g["fonts"])
    variant = g["variant"]
    t = pal["variants"][variant]
    other = {"light": "dark", "dark": "light", "color": "light"}[variant]
    t2 = None if fixed else pal["variants"].get(other)
    dt = fp["display_treatment"]
    ratio = float(g["scale"])
    sec_pad, gap, body_px = DENSITY[g["density"]]
    rmin = min(ratio, 1.2)  # small screens always get a gentler ratio so display sizes shrink on phones
    caps = {1: 30, 2: 46, 3: 66, 4: 96, 5: 132, 6: 176}
    steps = []
    for i in range(-2, 7):
        if i < 0:
            rn = min(ratio, 1.2)
            mn = mx = max(12.0, body_px * (rn ** i))
            mn = max(12.0, (body_px - 1) * (rn ** i))
        else:
            mx = min(body_px * (ratio ** i), caps.get(i, 1e9)) if i else body_px
            mn = min((body_px - 1) * (rmin ** i), mx)
        steps.append(f"  --step-{i}: {_fluid(round(mn, 2), round(mx, 2))};".replace("--step--", "--step-m"))
    r = RADII[g["shape"]]; s1, s2 = SHADOWS[g["elevation"]]; bw, bs = BORDERS[g["edge"]]
    fast, base, slow, ease = MOTION[g["motion"]]
    def colors(tok, indent="  "): return "\n".join(f"{indent}--c-{k}: {v};" for k, v in tok.items())
    head = (f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{fp["google_css"]}">' if fp.get("google_css") else f'<link rel="stylesheet" href="{fp["fontshare_css"]}">')
    css = f"""/* unclawdesign tokens — {g['paradigm']} × {pal['id']} ({variant}) × {fp['id']}
   genes: {', '.join(f'{k}={g[k]}' for k in ('shape','edge','elevation','texture','hero','grid','motif','imagery','icons','motion','density','align','scale','color_use'))} */
:root {{
{colors(t)}
  color-scheme: {'dark' if variant == 'dark' else 'light'};

  --font-display: {fp['display']['stack']};
  --font-body: {fp['body']['stack']};
  --font-mono: {fp['mono']['stack'] if fp.get('mono') else "ui-monospace, 'SFMono-Regular', Menlo, monospace"};
  --display-weight: {dt['weight']};
  --display-tracking: {dt['tracking_em']}em;
  --display-leading: {dt['line_height']};
  --display-case: {'uppercase' if dt['case'] == 'upper' else 'lowercase' if dt['case'] == 'lower' else 'none'};
  --body-leading: {1.65 if fp['body'].get('category') == 'serif' else 1.55};
  --measure: {'68ch' if fp['body'].get('category') == 'serif' else '64ch'};
  /* type scale: ratio {ratio}, fluid 360→1440px */
{chr(10).join(steps)}

  /* space (4px base) */
  --space-3xs: .25rem; --space-2xs: .5rem; --space-xs: .75rem; --space-s: 1rem; --space-m: 1.5rem;
  --space-l: 2rem; --space-xl: 3rem; --space-2xl: 4rem; --space-3xl: 6rem; --space-4xl: 8rem;
  --section-pad: {sec_pad};
  --gap: {gap};
  --container: {'1120px' if g['density'] != 'airy' else '1200px'};

  /* shape ({g['shape']}) */
  --r-sm: {r['sm']}; --r-md: {r['md']}; --r-lg: {r['lg']}; --r-control: {r['ctl']};
  --chamfer: {'12px' if g['shape'] == 'chamfered' else '0px'};
  --border-w: {bw}; --border-style: {bs};
  /* depth ({g['elevation']}) */
  --shadow-1: {s1};
  --shadow-2: {s2};
  /* motion ({g['motion']}) */
  --dur-fast: {fast}; --dur: {base}; --dur-slow: {slow}; --ease: {ease};
}}
"""
    if t2:
        css += f"""@media (prefers-color-scheme: {other if other != 'color' else 'light'}) {{
  :root:not([data-theme]) {{
{colors(t2, '    ')}
    color-scheme: {'dark' if other == 'dark' else 'light'};
  }}
}}
:root[data-theme="{other}"] {{
{colors(t2)}
  color-scheme: {'dark' if other == 'dark' else 'light'};
}}
:root[data-theme="{variant}"] {{
{colors(t)}
  color-scheme: {'dark' if variant == 'dark' else 'light'};
}}
"""
    css += f"""
/* ── base layer ── */
*, *::before, *::after {{ box-sizing: border-box; }}
html {{ -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }}
body {{ margin: 0; background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); font-size: var(--step-0);
  line-height: var(--body-leading); font-kerning: normal; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }}
h1, h2, h3, .display {{ font-family: var(--font-display); font-weight: var(--display-weight); letter-spacing: var(--display-tracking);
  line-height: var(--display-leading); text-transform: var(--display-case); text-wrap: balance; margin: 0; }}
h1 {{ font-size: var(--step-6); }} h2 {{ font-size: var(--step-4); }} h3 {{ font-size: var(--step-2); line-height: 1.15; }}
p, li {{ text-wrap: pretty; max-width: var(--measure); }}
small, .meta {{ font-size: var(--step-m1); color: var(--c-text-muted); }}
a {{ color: var(--c-accent-text); text-underline-offset: .18em; text-decoration-thickness: .06em; }}
a:hover {{ text-decoration-thickness: .12em; }}
:focus-visible {{ outline: 3px solid var(--c-focus); outline-offset: 3px; border-radius: 2px; }}
::selection {{ background: var(--c-accent-soft); color: var(--c-text); }}
img, svg, video {{ max-width: 100%; height: auto; display: block; }}
table {{ font-variant-numeric: tabular-nums; }}
.container {{ width: min(100% - 2 * clamp(1rem, 4vw, 3rem), var(--container)); margin-inline: auto; }}
.section {{ padding-block: var(--section-pad); }}
.btn {{ display: inline-flex; align-items: center; gap: .5em; padding: .75em 1.4em; border-radius: var(--r-control);
  background: var(--c-accent); color: var(--c-accent-ink); font: 600 var(--step-0)/1 var(--font-body); text-decoration: none;
  border: var(--border-w) var(--border-style) {'var(--c-text)' if g['edge'] == 'thick-ink' else 'transparent'}; box-shadow: var(--shadow-1);
  transition: transform var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease); cursor: pointer; }}
.btn:hover {{ background: var(--c-accent-hover); }}
.btn:active {{ transform: {'translate(3px, 3px)' if g['elevation'] == 'hard-offset' else 'scale(.97)'}; {'box-shadow: none;' if g['elevation'] == 'hard-offset' else ''} }}
.btn--quiet {{ background: transparent; color: var(--c-text); border: var(--border-w, 1px) solid var(--c-border-strong); box-shadow: none; }}
.card {{ background: var(--c-surface); border-radius: var(--r-md); box-shadow: var(--shadow-1);
  border: {'var(--border-w) var(--border-style) ' + ('var(--c-text)' if g['edge'] == 'thick-ink' else 'var(--c-border)') if g['edge'] not in ('none', 'inset-frame') else '0'};
  {"clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));" if g['shape'] == 'chamfered' else ''} }}
{'.frame { outline: 1px solid var(--c-border-strong); outline-offset: -12px; }' if g['edge'] == 'inset-frame' else ''}
{'.arch { border-radius: var(--r-lg); overflow: hidden; }' if g['shape'] == 'arched' else ''}
{'.organic { border-radius: var(--r-lg); overflow: hidden; }' if g['shape'] == 'organic' else ''}
{TEXTURE.get(g['texture'], '')}
@media (prefers-reduced-motion: reduce) {{
  *, *::before, *::after {{ animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }}
}}
"""
    return css, head

if __name__ == "__main__":
    import sys
    g = json.load(open(sys.argv[1]))
    css, head = genome_css(g)
    print(head); print(css)
