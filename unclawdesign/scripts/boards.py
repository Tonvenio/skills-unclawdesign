#!/usr/bin/env python3
"""
boards.py — render the last roll's candidates as side-by-side "direction boards" (one self-contained HTML page).

  python3 boards.py --title "Your real headline" [--sub "Real subline"] [-o boards.html] [--roll path/to/last_roll.json]

Each board shows the genome live: display + body type with the tuned treatment, palette swatches with contrast,
buttons and a card using the rolled shape/edge/elevation, the motif, the texture, and the gene list.
"""
import argparse, html, json, os, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from tokens import genome_css
from colorlib import contrast

DATA = HERE.parent / "data"
def _load(n): return json.load(open(DATA / n, encoding="utf-8"))

def motif_svg(m):
    A, B, T = "var(--c-accent)", "var(--c-accent-2, var(--c-accent-soft))", "var(--c-text)"
    s = {
     "circle": f'<circle cx="70" cy="60" r="46" fill="{A}"/><circle cx="140" cy="78" r="22" fill="{B}"/>',
     "arch": f'<path d="M30 110V60a40 40 0 0 1 80 0v50z" fill="{A}"/><path d="M125 110V75a22 22 0 0 1 44 0v35z" fill="{B}"/>',
     "diagonal": f'<polygon points="0,90 200,30 200,70 0,130" fill="{A}"/><polygon points="0,60 200,0 200,14 0,74" fill="{B}"/>',
     "stripes": "".join(f'<rect x="0" y="{20 + i * 18}" width="200" height="10" fill="{A if i % 2 == 0 else B}"/>' for i in range(5)),
     "sticker": f'<g transform="rotate(-10 100 60)"><polygon points="{star(100, 60, 50, 38, 14)}" fill="{A}"/><text x="100" y="66" text-anchor="middle" font-size="16" font-weight="700" fill="var(--c-accent-ink)" font-family="var(--font-body)">NEW</text></g>',
     "scribble": f'<text x="12" y="70" font-size="34" fill="{T}" font-family="var(--font-display)">signal</text><path d="M10 84 C 50 74, 90 92, 130 80 S 180 78, 190 84" stroke="{A}" stroke-width="5" fill="none" stroke-linecap="round"/>',
     "frame-box": f'<rect x="20" y="15" width="160" height="90" fill="none" stroke="{T}" stroke-width="3"/><rect x="34" y="29" width="70" height="40" fill="{A}"/>',
     "numerals": f'<text x="10" y="100" font-size="96" fill="{A}" font-family="var(--font-display)" font-weight="800">3</text><text x="80" y="100" font-size="20" fill="{T}" font-family="var(--font-body)">steps, real ones</text>',
     "cutout": f'<ellipse cx="100" cy="112" rx="70" ry="8" fill="{T}" opacity=".15"/><path d="M70 110 C60 60, 80 20, 105 20 S 150 60, 135 110 z" fill="{A}"/>',
     "primitives": f'<circle cx="45" cy="70" r="32" fill="{A}"/><rect x="85" y="38" width="62" height="62" fill="{B}"/><polygon points="160,100 195,100 177,62" fill="{T}"/>',
     "rules": f'<rect x="0" y="30" width="200" height="6" fill="{T}"/><rect x="0" y="46" width="200" height="1" fill="{T}"/><rect x="0" y="80" width="140" height="1" fill="{T}"/><rect x="0" y="96" width="170" height="1" fill="{T}"/>',
     "stamp": f'<circle cx="100" cy="60" r="48" fill="none" stroke="{A}" stroke-width="4"/><circle cx="100" cy="60" r="36" fill="{A}"/><text x="100" y="67" text-anchor="middle" font-size="20" fill="var(--c-accent-ink)" font-family="var(--font-display)">印</text>',
     "tape-scraps": f'<rect x="40" y="25" width="120" height="80" fill="var(--c-surface)" stroke="var(--c-border)" transform="rotate(-4 100 65)"/><rect x="70" y="14" width="60" height="18" fill="{B}" opacity=".7" transform="rotate(6 100 22)"/>',
     "registration-marks": f'<circle cx="100" cy="60" r="22" fill="none" stroke="{T}" stroke-width="1.5"/><path d="M100 26v68M66 60h68" stroke="{T}" stroke-width="1.5"/><path d="M10 10h20M10 10v20M190 110h-20M190 110v-20" stroke="{A}" stroke-width="2"/>',
     "blob-wave": f'<path d="M60 20c30-10 70 10 70 40s-30 50-60 45S20 80 25 55 40 27 60 20z" fill="{A}"/><path d="M0 100 q25 -16 50 0 t50 0 t50 0 t50 0 V120 H0z" fill="{B}"/>',
     "tile-pattern": "".join(f'<rect x="{x * 25}" y="{y * 25}" width="25" height="25" fill="{A if (x + y) % 2 else B}"/>' for x in range(8) for y in range(5)),
     "outline-type": f'<text x="8" y="92" font-size="92" fill="none" stroke="{T}" stroke-width="2" font-family="var(--font-display)" font-weight="800">Aa</text>',
     "starburst": f'<polygon points="{star(100, 60, 56, 30, 18)}" fill="{A}"/>',
     "pixel": "".join(f'<rect x="{30 + x * 14}" y="{18 + y * 14}" width="14" height="14" fill="{A}"/>' for x, y in [(0,2),(1,1),(2,0),(3,1),(4,2),(5,1),(6,0),(7,1),(8,2),(2,3),(6,3),(4,4)]),
     "ornament": f'<g fill="{A}"><path d="M100 20 l12 40 l-12 40 l-12 -40z"/><circle cx="60" cy="60" r="6"/><circle cx="140" cy="60" r="6"/></g><path d="M20 60h28M152 60h28" stroke="{A}" stroke-width="2"/>',
     "orbit-lines": f'<ellipse cx="100" cy="60" rx="90" ry="26" fill="none" stroke="{T}" stroke-width="1.2"/><ellipse cx="100" cy="60" rx="60" ry="44" fill="none" stroke="{T}" stroke-width="1.2" transform="rotate(30 100 60)"/><circle cx="100" cy="60" r="16" fill="{A}"/>',
     "none": f'<text x="0" y="80" font-size="44" fill="{T}" font-family="var(--font-display)">type only</text>',
    }
    return f'<svg viewBox="0 0 200 120" role="img" aria-label="motif: {m}" class="motif">{s.get(m, s["none"])}</svg>'

def star(cx, cy, ro, ri, n):
    import math
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.pi * i / n - math.pi / 2
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)

def board(i, g, title, sub):
    pars = {p["id"]: p for p in _load("paradigms.json")["paradigms"]}
    pals = {p["id"]: p for p in _load("palettes.json")["palettes"] + _load("palettes-wada.json")["palettes"]}
    fonts = _load("fonts.json"); fps = {f["id"]: f for f in fonts["pairs"] + fonts.get("fontshare_pairs", [])}
    par, pal, fp = pars[g["paradigm"]], pals[g["palette"]], fps[g["fonts"]]
    css, head = genome_css(g, fixed=True)
    root = re.search(r":root \{(.*?)\n\}", css, re.S).group(1)
    tex = re.findall(r"^\.(?:tex|mesh|riso)[^\n]*$", css, re.M)
    t = pal["variants"][g["variant"]]
    scoped = f".b{i} {{{root}\n}}\n" + "\n".join(x.replace(".tex", f".b{i}.tex").replace(".mesh", f".b{i} .mesh").replace(".riso", f".b{i} .riso") for x in tex)
    sw = []
    for k in ("bg", "surface", "text", "text-muted", "accent", "accent-2", "accent-3"):
        if k in t:
            ref = t["accent-ink"] if k == "accent" else t.get(k + "-ink", t["text"]) if k.startswith("accent-") else (t["bg"] if k.startswith("text") else t["text"])
            sw.append(f'<li><span class="chip" style="background:{t[k]}"></span><span>{k}<br><code>{t[k]}</code></span></li>')
    genes = " · ".join(f"<b>{k}</b> {html.escape(str(g[k]))}" for k in ("hero", "grid", "shape", "edge", "elevation", "texture", "motif", "imagery", "motion", "scale", "color_use", "density"))
    exps = {e["id"]: e for e in _load("experiences.json")["experiences"]} if (DATA / "experiences.json").exists() else {}
    ex = exps.get(g.get("experience"))
    exp_html = (f'<p class="exp"><b>{html.escape(ex["name"])}</b> · effort {ex["effort"]} · {html.escape(ex["essence"])}'
                f'<br><span class="muted">{html.escape(" → ".join(ex["structure"][:5]))}</span></p>') if ex else ""
    letter = "ABC"[i - 1] if i <= 3 else str(i)
    return head, scoped, f"""
<section class="board b{i} tex" aria-labelledby="h{i}">
  <header class="bhead"><span class="tag">Direction {letter}</span><span class="names">{(html.escape(ex['name']) + ' · ') if ex else ''}{html.escape(par['name'])} × {html.escape(pal['name'])} ({g['variant']}) × {html.escape(fp['name'])}</span></header>
  <h2 id="h{i}" class="bdisplay">{html.escape(title)}</h2>
  <p class="bsub">{html.escape(sub or par['essence'])}</p>
  <div class="bact"><a class="bbtn" href="#">Primary action</a><a class="bbtn quiet" href="#">Secondary</a></div>
  <div class="brow">
    <div class="bcard"><p class="kicker">{html.escape(fp['display']['family'])} / {html.escape(fp['body']['family'])}</p>
      <p>{html.escape(fp.get('contrast_logic', ''))}</p><p class="muted">{html.escape(pal['story'])}</p></div>
    <figure class="bmotif">{motif_svg(g['motif'])}<figcaption>motif · {g['motif']}</figcaption></figure>
  </div>
  <ul class="swatches">{''.join(sw)}</ul>
  {exp_html}
  <p class="genes">{genes}</p>
  <p class="risk"><b>Watch out:</b> {html.escape('; '.join(par['risks']))}</p>
</section>"""

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Direction Boards</title>
{heads}
<style>
:root {{ --page-bg: #f3f4f6; --page-ink: #15171a; color-scheme: light dark; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --page-bg: #17191c; --page-ink: #eceef1; }} }}
:root[data-theme="dark"] {{ --page-bg: #17191c; --page-ink: #eceef1; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--page-bg); color: var(--page-ink); font: 15px/1.5 system-ui, sans-serif; }}
.top {{ padding: 24px clamp(16px, 4vw, 40px) 8px; }} .top h1 {{ margin: 0 0 4px; font-size: 20px; }} .top p {{ margin: 0; opacity: .75; }}
.grid {{ display: grid; gap: 20px; padding: 16px clamp(16px, 4vw, 40px) 40px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); }}
.board {{ background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); padding: clamp(20px, 3vw, 32px); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; gap: 16px; }}
.bhead {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; font-size: 13px; color: var(--c-text-muted); }}
.tag {{ background: var(--c-accent); color: var(--c-accent-ink); padding: 2px 10px; border-radius: var(--r-control); font-weight: 600; }}
.bdisplay {{ font-family: var(--font-display); font-weight: var(--display-weight); letter-spacing: var(--display-tracking); line-height: var(--display-leading);
  text-transform: var(--display-case); font-size: clamp(2.2rem, 5vw, 3.6rem); margin: 6px 0 0; text-wrap: balance; overflow-wrap: anywhere; }}
.bsub {{ margin: 0; max-width: 46ch; color: var(--c-text-muted); font-size: 1.05rem; }}
.bact {{ display: flex; gap: 10px; flex-wrap: wrap; }}
.bbtn {{ padding: .7em 1.3em; border-radius: var(--r-control); background: var(--c-accent); color: var(--c-accent-ink); text-decoration: none; font-weight: 600;
  border: var(--border-w) var(--border-style) transparent; box-shadow: var(--shadow-1); }}
.bbtn.quiet {{ background: transparent; color: var(--c-text); border: max(1px, var(--border-w)) solid var(--c-border-strong); box-shadow: none; }}
.bbtn:focus-visible {{ outline: 3px solid var(--c-focus); outline-offset: 3px; }}
.brow {{ display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; align-items: stretch; }}
@media (max-width: 520px) {{ .brow {{ grid-template-columns: 1fr; }} }}
.bcard {{ background: var(--c-surface); border-radius: var(--r-md); box-shadow: var(--shadow-2); padding: 16px; border: var(--border-w) var(--border-style) var(--c-border); }}
.bcard p {{ margin: 0 0 8px; font-size: 14px; }} .kicker {{ font-family: var(--font-display); font-size: 18px !important; }} .muted {{ color: var(--c-text-muted); }}
.bmotif {{ margin: 0; background: var(--c-surface-2); border-radius: var(--r-md); padding: 10px; display: grid; }}
.bmotif figcaption {{ font-size: 12px; color: var(--c-text-muted); }} .motif {{ width: 100%; height: auto; }}
.swatches {{ list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--c-text-muted); }}
.swatches li {{ display: flex; gap: 6px; align-items: center; }} .chip {{ width: 26px; height: 26px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--c-border); }}
code {{ font-family: ui-monospace, monospace; }}
.genes, .risk, .exp {{ font-size: 12.5px; margin: 0; color: var(--c-text-muted); }} .exp b {{ color: var(--c-text); font-weight: 600; }} .genes b, .risk b {{ color: var(--c-text); font-weight: 600; }}
{scoped}
</style></head><body>
<div class="top"><h1>Direction boards</h1><p>{n} rolled genomes for one brief — pick one, or combine dimensions and re-roll.</p></div>
<main class="grid">{boards}</main></body></html>"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="A headline in your real words"); ap.add_argument("--sub", default="")
    ap.add_argument("-o", default="boards.html")
    ap.add_argument("--roll", default=str(Path(os.environ.get("UNCLAW_HOME", Path.home() / ".unclawdesign")) / "last_roll.json"))
    a = ap.parse_args()
    roll = json.load(open(a.roll))
    heads, scopes, boards = [], [], []
    for i, g in enumerate(roll["candidates"], 1):
        h, s, b = board(i, g, a.title, a.sub)
        if h not in heads: heads.append(h)
        scopes.append(s); boards.append(b)
    Path(a.o).write_text(PAGE.format(heads="\n".join(heads), scoped="\n".join(scopes), boards="\n".join(boards), n=len(boards)), encoding="utf-8")
    print("wrote", a.o)

if __name__ == "__main__":
    main()
