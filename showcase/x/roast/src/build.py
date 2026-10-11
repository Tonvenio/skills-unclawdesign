"""Build index.html from index.src.html: inject the static overview chart (no-JS / reduced motion) and the roast data."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from story import bt, KEYS, PHASES, EVENTS

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "index.html")


def mmss(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"


def overview_svg():
    X0, X1, Y0, Y1 = 64, 900, 36, 392
    def X(t): return X0 + (X1 - X0) * t / 600
    def Y(T): return Y1 - (Y1 - Y0) * (T - 80) / (215 - 80)
    o = ['<svg class="ov" viewBox="0 0 1000 480" role="img" aria-labelledby="ov-title ov-desc">',
         '<title id="ov-title">Roast curve of batch 041 (illustration)</title>',
         '<desc id="ov-desc">Bean temperature starts at 200 °C at charge, falls to 95 °C at 1:05, reaches 150 °C at 4:20, '
         'first crack at 196 °C at 8:10 and drop at 204 °C at 9:40.</desc>']
    for T, name in ((150, "end of drying"), (196, "first crack"), (204, "drop")):
        o.append(f'<line class="ov-rule" x1="{X0}" x2="{X1 + 8}" y1="{Y(T):.1f}" y2="{Y(T):.1f}"/>')
        dy = -6 if T != 196 else 15
        o.append(f'<text class="ov-num" x="{X1 + 14}" y="{Y(T) + (4 if T != 196 else 12):.1f}">{T} °C</text>')
    o.append(f'<line class="ov-axis" x1="{X0}" x2="{X1}" y1="{Y1 + 26}" y2="{Y1 + 26}"/>')
    for m in range(0, 11):
        x = X(m * 60)
        o.append(f'<line class="ov-tick" x1="{x:.1f}" x2="{x:.1f}" y1="{Y1 + 20}" y2="{Y1 + 32}"/>')
        o.append(f'<text class="ov-num ov-t" x="{x:.1f}" y="{Y1 + 52}" text-anchor="middle">{m}:00</text>')
    spans = [("Drying", 0, 260), ("Maillard", 260, 490), ("Dev.", 490, 580)]
    for name, a, b in spans:
        o.append(f'<line class="ov-span" x1="{X(a) + 3:.1f}" x2="{X(b) - 3:.1f}" y1="{Y1 + 70}" y2="{Y1 + 70}"/>')
        o.append(f'<text class="ov-lab" x="{(X(a) + X(b)) / 2:.1f}" y="{Y1 + 86}" text-anchor="middle">{name}</text>')
    pts = " ".join(f"{X(t):.1f},{Y(bt(t)):.1f}" for t in range(0, 581, 5))
    o.append(f'<polyline class="ov-curve" points="{pts}"/>')
    labels = {"charge": ("Charge", 12, -10, "start"), "turning": ("Turning point", 12, 22, "start"),
              "dry_end": ("Dry end", 12, 20, "start"), "first_crack": ("First crack", -12, -12, "end"),
              "drop": ("Drop", 12, 20, "start")}
    for k, t in EVENTS.items():
        x, y = X(t), Y(bt(t))
        name, dx, dy, anc = labels[k]
        o.append(f'<circle class="ov-dot" cx="{x:.1f}" cy="{y:.1f}" r="5"/>')
        o.append(f'<text class="ov-lab ov-ev" x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{anc}">{name}, {mmss(t)}</text>')
    o.append("</svg>")
    return "\n".join(o)


def data():
    d = {"keys": KEYS, "phases": [dict(id=a, p0=c, p1=e) for a, b, c, e in PHASES],
         "events": EVENTS, "bt": [round(bt(t), 2) for t in range(0, 581, 5)]}
    return json.dumps(d, separators=(",", ":"))


if __name__ == "__main__":
    src = open(os.path.join(HERE, "index.src.html")).read()
    src = src.replace("<!--OVERVIEW-->", overview_svg()).replace("/*ROASTDATA*/", "window.ROAST=" + data() + ";")
    open(OUT, "w").write(src)
    print("wrote", os.path.abspath(OUT), len(src) // 1024, "KB")
